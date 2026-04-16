import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PlatformsService } from './platforms.service';
import { COMP_SETTLEMENT_SWEEP_JOB_PREFIX } from './comp-settlement-scheduler.service';

@Processor('comp-settlement')
export class CompSettlementProcessor extends WorkerHost {
  private readonly log = new Logger(CompSettlementProcessor.name);

  constructor(private readonly platforms: PlatformsService) {
    super();
  }

  async process(job: Job<{ platformId?: string }>) {
    if (!job.name.startsWith(`${COMP_SETTLEMENT_SWEEP_JOB_PREFIX}:`)) return;

    const platformId =
      typeof job.data?.platformId === 'string' && job.data.platformId.trim()
        ? job.data.platformId.trim()
        : job.name.slice(`${COMP_SETTLEMENT_SWEEP_JOB_PREFIX}:`.length);

    if (!platformId) return;

    try {
      const result = await this.platforms.runAutoCompSettlementSweep(platformId);
      const createdUsers =
        result.status === 'processed'
          ? Number((result as { createdUsers?: number }).createdUsers ?? 0)
          : 0;
      if (result.status === 'processed' && createdUsers > 0) {
        this.log.log(
          `자동 콤프 정산 완료 platform=${platformId} periods=${result.processedPeriods} users=${createdUsers} amount=${result.createdAmount}`,
        );
      }
    } catch (e) {
      this.log.warn(
        `자동 콤프 정산 실패 platform=${platformId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
