import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CRAWLER_MATCHER_QUEUE,
  MATCHER_JOB_PERIODIC,
  type CrawlerMatcherJobPayload,
} from './crawler-matcher.queue';

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

  async onModuleInit() {
    try {
      const tickMs = readTickMs(this.config);
      const batchLimit = readBatchLimit(this.config);

      const repeatables = await this.queue.getRepeatableJobs();
      for (const row of repeatables) {
        if (row.name === MATCHER_JOB_PERIODIC) {
          await this.queue.removeRepeatableByKey(row.key);
        }
      }

      if (tickMs <= 0) {
        this.log.log(
          '크롤러 매처 주기 잡 비활성(CRAWLER_MATCHER_TICK_MS=0). 수동 큐만 사용.',
        );
        return;
      }

      const payload: CrawlerMatcherJobPayload = { limit: batchLimit };
      await this.queue.add(MATCHER_JOB_PERIODIC, payload, {
        repeat: { every: tickMs },
        removeOnComplete: 25,
        removeOnFail: 15,
      });
      this.log.log(
        `크롤러 매처 주기 잡 등록: every=${tickMs}ms batchLimit=${batchLimit} (큐 ${CRAWLER_MATCHER_QUEUE})`,
      );
    } catch (e) {
      this.log.warn(
        `크롤러 매처 스케줄 등록 실패(Redis/큐 확인): ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
