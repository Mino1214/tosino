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
import { schedulerUsesDevDefaults } from '../common/scheduler-env.util';

function readTickMs(config: ConfigService): number {
  const raw =
    config.get<string>('CRAWLER_MATCHER_TICK_MS')?.trim() ??
    process.env.CRAWLER_MATCHER_TICK_MS ??
    '45000';
  if (['0', 'false', 'off', 'disabled'].includes(raw.toLowerCase())) {
    return 0;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(3_600_000, Math.max(5_000, n)) : 45_000;
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

  /** 개발 스케줄 프로필 기본 on. 끄기: RUN_CRAWLER_MATCHER_ON_BOOT=0. 운영만 켜기: =1 (로컬이 NODE_ENV=production 이면 TOSINO_LOCAL_SCHEDULERS=1) */
  private shouldRunMatcherOnBoot(): boolean {
    const raw = (
      this.config.get<string>('RUN_CRAWLER_MATCHER_ON_BOOT') ??
      process.env.RUN_CRAWLER_MATCHER_ON_BOOT ??
      ''
    )
      .trim()
      .toLowerCase();
    if (['0', 'false', 'off', 'no', 'disabled'].includes(raw)) {
      return false;
    }
    if (['1', 'true', 'yes', 'on'].includes(raw)) {
      return true;
    }
    return schedulerUsesDevDefaults();
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
      onlyStatuses: ['pending', 'rejected'],
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
        const payload: CrawlerMatcherJobPayload = { limit: batchLimit };
        await this.queue.add(MATCHER_JOB_PERIODIC, payload, {
          repeat: { every: tickMs },
          removeOnComplete: 25,
          removeOnFail: 15,
        });
        this.log.log(
          `크롤러 매처 주기 잡 등록: every=${tickMs}ms batchLimit=${batchLimit} (큐 ${CRAWLER_MATCHER_QUEUE})`,
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
