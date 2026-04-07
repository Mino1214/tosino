import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/** Bull 작업 이름 — SyncProcessor에서 분기 */
export const ODDS_ALL_PLATFORMS_JOB = 'odds-all-platforms';

@Injectable()
export class SyncSchedulerService implements OnModuleInit {
  private readonly log = new Logger(SyncSchedulerService.name);

  constructor(
    @InjectQueue('sync') private readonly syncQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const raw = this.config.get<string>('ODDS_SYNC_CRON');
      const cron = raw?.trim();
      const repeatables = await this.syncQueue.getRepeatableJobs();
      for (const r of repeatables) {
        if (r.name === ODDS_ALL_PLATFORMS_JOB) {
          await this.syncQueue.removeRepeatableByKey(r.key);
        }
      }
      if (
        !cron ||
        cron === 'false' ||
        cron === 'off' ||
        cron === '0' ||
        cron === 'disabled'
      ) {
        this.log.log(
          'ODDS_SYNC_CRON 비활성 — 주기 ODDS 동기화 안 함 (.env에 cron 설정 시 등록)',
        );
        return;
      }
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
    } catch (e) {
      this.log.warn(
        `주기 ODDS 등록 실패(Redis 등 확인): ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
