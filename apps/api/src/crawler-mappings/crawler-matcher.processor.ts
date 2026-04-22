import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CrawlerMatcherService } from './crawler-matcher.service';
import type { RunMatcherResult } from './crawler-matcher.service';
import {
  CRAWLER_MATCHER_QUEUE,
  MATCHER_JOB_MANUAL,
  MATCHER_JOB_PERIODIC,
  type CrawlerMatcherJobPayload,
} from './crawler-matcher.queue';

function readBatchLimitPeriodic(): number {
  const raw = process.env.CRAWLER_MATCHER_BATCH_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : 220;
  return Number.isFinite(n) ? Math.max(20, Math.min(2000, n)) : 220;
}

function resolveLimit(
  jobName: string,
  data: CrawlerMatcherJobPayload,
): number {
  if (typeof data.limit === 'number' && data.limit > 0) {
    return Math.max(1, Math.min(5000, Math.trunc(data.limit)));
  }
  if (jobName === MATCHER_JOB_PERIODIC) {
    return readBatchLimitPeriodic();
  }
  return 400;
}

@Processor(CRAWLER_MATCHER_QUEUE, { concurrency: 1 })
export class CrawlerMatcherProcessor extends WorkerHost {
  private readonly log = new Logger(CrawlerMatcherProcessor.name);

  constructor(private readonly matcher: CrawlerMatcherService) {
    super();
  }

  async process(
    job: Job<CrawlerMatcherJobPayload>,
  ): Promise<RunMatcherResult | void> {
    if (job.name !== MATCHER_JOB_PERIODIC && job.name !== MATCHER_JOB_MANUAL) {
      this.log.warn(`알 수 없는 매처 잡 무시 name=${job.name}`);
      return;
    }
    const limit = resolveLimit(job.name, job.data ?? {});
    const sourceSite = job.data?.sourceSite?.trim() || undefined;
    const onlyStatuses = job.data?.onlyStatuses;
    this.log.log(
      `[${job.name}] 시작 limit=${limit} site=${sourceSite ?? '(전체)'}`,
    );
    const out = await this.matcher.run({
      sourceSite,
      limit,
      onlyStatuses,
      onlyWithoutStoredCandidates: job.data?.onlyWithoutStoredCandidates === true,
    });
    this.log.log(
      `[${job.name}] 완료 scanned=${out.scanned} auto=${out.auto} pending=${out.pending} unchanged=${out.unchanged} err=${out.error} ${out.durationMs}ms`,
    );
    return out;
  }
}
