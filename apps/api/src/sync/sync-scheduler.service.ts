import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { schedulerUsesDevDefaults } from '../common/scheduler-env.util';

/** Bull 작업 이름 — SyncProcessor에서 분기 */
export const ODDS_ALL_PLATFORMS_JOB = 'odds-all-platforms';

const CRON_OFF = new Set(['false', 'off', '0', 'disabled', 'no']);

@Injectable()
export class SyncSchedulerService implements OnModuleInit {
  private readonly log = new Logger(SyncSchedulerService.name);

  constructor(
    @InjectQueue('sync') private readonly syncQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  /**
   * ODDS_SYNC_CRON 이 비어 있으면 운영 스케줄 프로필에서만 끔.
   * 개발 스케줄 프로필에서는 로컬에서 odds-api 스냅샷이 바로 쌓이도록 2분 주기를 기본값으로 쓴다.
   * (NODE_ENV=production 인데 로컬만 켜려면 TOSINO_LOCAL_SCHEDULERS=1)
   */
  private resolveEffectiveOddsSyncCron(): string {
    const raw = (
      this.config.get<string>('ODDS_SYNC_CRON') ??
      process.env.ODDS_SYNC_CRON ??
      ''
    ).trim();
    if (raw && CRON_OFF.has(raw.toLowerCase())) {
      return '';
    }
    if (raw) {
      return raw;
    }
    if (schedulerUsesDevDefaults()) {
      return '*/2 * * * *';
    }
    return '';
  }

  /**
   * 기동 직후 전 플랫폼 ODDS ingest 1회 (카탈로그·스냅샷 채움).
   * - 운영 스케줄 프로필: 기본 끔. 켜려면 RUN_ODDS_INGEST_ON_BOOT=1
   * - 개발 스케줄 프로필: 기본 켬. 끄려면 RUN_ODDS_INGEST_ON_BOOT=0
   */
  private shouldRunOddsIngestOnBoot(): boolean {
    const raw = (
      this.config.get<string>('RUN_ODDS_INGEST_ON_BOOT') ??
      process.env.RUN_ODDS_INGEST_ON_BOOT ??
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

  private readBootOddsDelayMs(): number {
    const raw = (
      this.config.get<string>('RUN_ODDS_INGEST_ON_BOOT_DELAY_MS') ??
      process.env.RUN_ODDS_INGEST_ON_BOOT_DELAY_MS ??
      '2500'
    ).trim();
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? Math.min(120_000, n) : 2500;
  }

  private scheduleBootOddsIngest(): void {
    if (!this.shouldRunOddsIngestOnBoot()) {
      this.log.log(
        '기동 시 ODDS 전체 동기화 1회 스킵 (운영 스케줄 프로필이거나 RUN_ODDS_INGEST_ON_BOOT=0)',
      );
      return;
    }
    const delayMs = this.readBootOddsDelayMs();
    const t = setTimeout(() => {
      void this.enqueueBootOddsIngest();
    }, delayMs);
    if (typeof (t as NodeJS.Timeout).unref === 'function') {
      (t as NodeJS.Timeout).unref();
    }
    this.log.log(
      `기동 후 ${delayMs}ms 에 전 플랫폼 ODDS 동기화 1회 큐잉 예약 (RUN_ODDS_INGEST_ON_BOOT)`,
    );
  }

  private async enqueueBootOddsIngest(): Promise<void> {
    try {
      await this.syncQueue.add(
        ODDS_ALL_PLATFORMS_JOB,
        {},
        {
          jobId: `boot-odds-${Date.now()}`,
          removeOnComplete: 50,
          removeOnFail: 25,
        },
      );
      this.log.log('기동 시 전 플랫폼 ODDS 동기화 1회 큐잉 완료');
    } catch (e) {
      this.log.warn(
        `기동 시 ODDS 동기화 큐잉 실패(Redis·sync 워커 확인): ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  async onModuleInit() {
    try {
      const repeatables = await this.syncQueue.getRepeatableJobs();
      for (const r of repeatables) {
        if (r.name === ODDS_ALL_PLATFORMS_JOB) {
          await this.syncQueue.removeRepeatableByKey(r.key);
        }
      }

      const cron = this.resolveEffectiveOddsSyncCron();
      if (!cron) {
        this.log.log(
          !schedulerUsesDevDefaults()
            ? 'ODDS_SYNC_CRON 비활성 — 주기 ODDS 동기화 안 함 (운영 프로필: .env 의 ODDS_SYNC_CRON 으로 켜기. 로컬만 NODE_ENV=production 이면 TOSINO_LOCAL_SCHEDULERS=1)'
            : 'ODDS_SYNC_CRON 비활성 — 주기 ODDS 동기화 안 함 (명시 off/0 등. 비어 두면 개발 프로필에서는 기본 */2; 끄려면 ODDS_SYNC_CRON=off)',
        );
      } else {
        await this.syncQueue.add(
          ODDS_ALL_PLATFORMS_JOB,
          {},
          {
            repeat: { pattern: cron },
            removeOnComplete: 80,
            removeOnFail: 40,
          },
        );
        this.log.log(`주기 ODDS 동기화 등록: ${cron} (모든 플랫폼)`);
      }

      this.scheduleBootOddsIngest();
    } catch (e) {
      this.log.warn(
        `주기 ODDS 등록 실패(Redis 등 확인): ${e instanceof Error ? e.message : e}`,
      );
      this.scheduleBootOddsIngest();
    }
  }
}
