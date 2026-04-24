import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CRAWLER_MATCHER_QUEUE,
  MATCHER_JOB_MANUAL,
  MATCHER_JOB_PERIODIC,
  type CrawlerMatcherJobPayload,
} from './crawler-matcher.queue';
import {
  chainCrawlerMatcherAfterBootOddsEnabled,
  runCrawlerMatcherOnBootEnabled,
  runOddsIngestOnBootEnabled,
  schedulerUsesDevDefaults,
} from '../common/scheduler-env.util';

function readTickMs(config: ConfigService): number {
  const raw =
    config.get<string>('CRAWLER_MATCHER_TICK_MS')?.trim() ??
    process.env.CRAWLER_MATCHER_TICK_MS ??
    '';
  if (['0', 'false', 'off', 'disabled'].includes(raw.toLowerCase())) {
    return 0;
  }
  if (!raw) {
    /** 비프로덕션·스케줄 개발 프로필: 미설정 시 약 7분(자원 보수적). 운영은 ecosystem 에서 ms 명시. */
    return schedulerUsesDevDefaults() ? 420_000 : 0;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(3_600_000, Math.max(5_000, n)) : 0;
}

function readBatchLimit(config: ConfigService): number {
  const raw =
    config.get<string>('CRAWLER_MATCHER_BATCH_LIMIT')?.trim() ??
    process.env.CRAWLER_MATCHER_BATCH_LIMIT ??
    '220';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(20, Math.min(2000, n)) : 220;
}

@Injectable()
export class CrawlerMatcherSchedulerService implements OnModuleInit {
  private readonly log = new Logger(CrawlerMatcherSchedulerService.name);

  constructor(
    @InjectQueue(CRAWLER_MATCHER_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  /**
   * 개발 스케줄 프로필 기본 on. 끄기: RUN_CRAWLER_MATCHER_ON_BOOT=0.
   * 운영만 켜기: =1 (로컬이 NODE_ENV=production 이면 TOSINO_LOCAL_SCHEDULERS=1)
   * 기동 ODDS( boot-odds ) 끝난 뒤 체인이 켜져 있으면 타이머 1회는 생략(SyncProcessor가 큐잉).
   */
  private shouldRunMatcherOnBoot(): boolean {
    return runCrawlerMatcherOnBootEnabled();
  }

  /** true면 scheduleBootMatcherJob 타이머를 쓰지 않고, 첫 boot-odds 스냅샷 뒤 API가 매처 잡을 넣음. */
  private skipBootMatcherTimerForChainAfterOdds(): boolean {
    if (!chainCrawlerMatcherAfterBootOddsEnabled()) {
      return false;
    }
    if (!runOddsIngestOnBootEnabled()) {
      return false;
    }
    return true;
  }

  private readBootMatcherDelayMs(): number {
    const raw = (
      this.config.get<string>('RUN_CRAWLER_MATCHER_ON_BOOT_DELAY_MS') ??
      process.env.RUN_CRAWLER_MATCHER_ON_BOOT_DELAY_MS ??
      '4000'
    ).trim();
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? Math.min(120_000, n) : 4000;
  }

  private scheduleBootMatcherJob(batchLimit: number): void {
    if (!this.shouldRunMatcherOnBoot()) {
      this.log.log(
        '기동 시 크롤러 매처 1회 스킵 (운영 스케줄 프로필이거나 RUN_CRAWLER_MATCHER_ON_BOOT=0)',
      );
      return;
    }
    if (this.skipBootMatcherTimerForChainAfterOdds()) {
      this.log.log(
        '기동 시 크롤러 매처 타이머 생략 — RUN_ODDS_INGEST_ON_BOOT 1회 끝난 직후 SyncProcessor가 manual 잡 큐잉 (CRAWLER_MATCHER_BOOT_CHAIN_AFTER_FIRST_ODDS=1)',
      );
      return;
    }
    const delayMs = this.readBootMatcherDelayMs();
    const bootLimit = Math.min(2000, Math.max(batchLimit, 200));
    const t = setTimeout(() => {
      void this.enqueueBootMatcher(bootLimit);
    }, delayMs);
    if (typeof (t as NodeJS.Timeout).unref === 'function') {
      (t as NodeJS.Timeout).unref();
    }
    this.log.log(
      `기동 후 ${delayMs}ms 에 크롤러 매처 manual 잡 1회 큐잉 예약 (limit=${bootLimit})`,
    );
  }

  private async enqueueBootMatcher(bootLimit: number): Promise<void> {
    const payload: CrawlerMatcherJobPayload = {
      limit: bootLimit,
      onlyStatuses: ['pending'],
      onlyWithoutStoredCandidates: true,
    };
    try {
      await this.queue.add(MATCHER_JOB_MANUAL, payload, {
        jobId: `boot-matcher-${Date.now()}`,
        removeOnComplete: 25,
        removeOnFail: 15,
        priority: 10,
      });
      this.log.log('기동 시 크롤러 매처 manual 잡 1회 큐잉 완료');
    } catch (e) {
      this.log.warn(
        `기동 시 크롤러 매처 큐잉 실패(Redis 확인): ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  async onModuleInit() {
    const batchLimit = readBatchLimit(this.config);
    try {
      const tickMs = readTickMs(this.config);

      const repeatables = await this.queue.getRepeatableJobs();
      for (const row of repeatables) {
        if (row.name === MATCHER_JOB_PERIODIC) {
          await this.queue.removeRepeatableByKey(row.key);
        }
      }

      if (tickMs <= 0) {
        this.log.log(
          '크롤러 매처 주기 잡 비활성(CRAWLER_MATCHER_TICK_MS=0). 수동·기동 1회 큐만 사용.',
        );
      } else {
        const payload: CrawlerMatcherJobPayload = {
          limit: batchLimit,
          onlyStatuses: ['pending'],
          onlyWithoutStoredCandidates: true,
        };
        await this.queue.add(MATCHER_JOB_PERIODIC, payload, {
          repeat: { every: tickMs },
          removeOnComplete: 25,
          removeOnFail: 15,
        });
        this.log.log(
          `크롤러 매처 주기 잡 등록: every=${tickMs}ms batchLimit=${batchLimit} onlyUnhinted=true (큐 ${CRAWLER_MATCHER_QUEUE})`,
        );
      }

      this.scheduleBootMatcherJob(batchLimit);
    } catch (e) {
      this.log.warn(
        `크롤러 매처 스케줄 등록 실패(Redis/큐 확인): ${e instanceof Error ? e.message : e}`,
      );
      this.scheduleBootMatcherJob(batchLimit);
    }
  }
}
