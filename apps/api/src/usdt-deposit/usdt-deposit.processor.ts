import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { USDT_DEPOSIT_POLL_JOB } from './usdt-deposit-scheduler.service';
import { UsdtDepositService } from './usdt-deposit.service';

@Processor('usdt-deposit')
export class UsdtDepositProcessor extends WorkerHost {
  private readonly log = new Logger(UsdtDepositProcessor.name);

  constructor(private readonly usdtDeposit: UsdtDepositService) {
    super();
  }

  async process(job: Job) {
    if (job.name === USDT_DEPOSIT_POLL_JOB) {
      await this.usdtDeposit.pollAllPlatforms();
    }
  }
}
