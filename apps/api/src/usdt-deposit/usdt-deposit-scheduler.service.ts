import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const USDT_DEPOSIT_POLL_JOB = 'usdt-deposit-poll';

@Injectable()
export class UsdtDepositSchedulerService implements OnModuleInit {
  private readonly log = new Logger(UsdtDepositSchedulerService.name);

  constructor(
    @InjectQueue('usdt-deposit') private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const cron =
        this.config.get<string>('USDT_DEPOSIT_POLL_CRON')?.trim() ||
        '*/1 * * * *'; // 기본 1분 주기

      const repeatables = await this.queue.getRepeatableJobs();
      for (const r of repeatables) {
        if (r.name === USDT_DEPOSIT_POLL_JOB) {
          await this.queue.removeRepeatableByKey(r.key);
        }
      }

      if (['false', 'off', '0', 'disabled'].includes(cron)) {
        this.log.log('USDT_DEPOSIT_POLL_CRON 비활성 — 폴링 안 함');
        return;
      }

      await this.queue.add(
        USDT_DEPOSIT_POLL_JOB,
        {},
        {
          repeat: { pattern: cron },
          removeOnComplete: 20,
          removeOnFail: 10,
        },
      );
      this.log.log(`USDT 입금 폴링 등록: ${cron}`);
    } catch (e) {
      this.log.warn(
        `USDT 폴링 등록 실패(Redis 확인): ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
