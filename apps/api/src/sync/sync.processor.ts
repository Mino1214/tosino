import { Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { SyncJobType } from '@prisma/client';
import {
  chainCrawlerMatcherAfterBootOddsEnabled,
  runCrawlerMatcherOnBootEnabled,
  runOddsIngestOnBootEnabled,
} from '../common/scheduler-env.util';
import {
  CRAWLER_MATCHER_QUEUE,
  MATCHER_JOB_MANUAL,
  type CrawlerMatcherJobPayload,
} from '../crawler-mappings/crawler-matcher.queue';
import { PrismaService } from '../prisma/prisma.service';
import { OddsIngestService } from './odds-ingest.service';
import {
  ODDS_ALL_PLATFORMS_JOB,
  ODDS_BOOT_ALL_PLATFORMS_DATA,
} from './sync-scheduler.service';

type MarketKey = 'DOMESTIC' | 'EUROPEAN' | 'UNSET';

function sportsFeedSummary(integrations: unknown): {
  feedCount: number;
  labels: string[];
  byMarket: Record<MarketKey, { count: number; sportLabels: string[] }>;
} {
  const emptyMarket = (): Record<
    MarketKey,
    { count: number; sportLabels: string[] }
  > => ({
    DOMESTIC: { count: 0, sportLabels: [] },
    EUROPEAN: { count: 0, sportLabels: [] },
    UNSET: { count: 0, sportLabels: [] },
  });
  if (!integrations || typeof integrations !== 'object') {
    return { feedCount: 0, labels: [], byMarket: emptyMarket() };
  }
  const feeds = (integrations as { sportsFeeds?: unknown }).sportsFeeds;
  if (!Array.isArray(feeds)) {
    return { feedCount: 0, labels: [], byMarket: emptyMarket() };
  }
  const byMarket = emptyMarket();
  const labels = feeds.map((f) => {
    if (!f || typeof f !== 'object') {
      byMarket.UNSET.count += 1;
      byMarket.UNSET.sportLabels.push('?');
      return '?';
    }
    const row = f as { sportLabel?: string; market?: string };
    const sportLabel = row.sportLabel != null ? String(row.sportLabel) : '?';
    const m = row.market;
    const bucket: MarketKey =
      m === 'DOMESTIC' || m === 'EUROPEAN' ? m : 'UNSET';
    byMarket[bucket].count += 1;
    byMarket[bucket].sportLabels.push(sportLabel);
    return sportLabel;
  });
  return { feedCount: feeds.length, labels, byMarket };
}

export interface SyncJobData {
  platformId: string;
  jobType: SyncJobType;
}

@Processor('sync')
export class SyncProcessor extends WorkerHost {
  private readonly log = new Logger(SyncProcessor.name);

  constructor(
    private prisma: PrismaService,
    private oddsIngest: OddsIngestService,
    @InjectQueue(CRAWLER_MATCHER_QUEUE) private readonly matcherQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<SyncJobData | Record<string, never>>): Promise<void> {
    if (job.name === ODDS_ALL_PLATFORMS_JOB) {
      const platforms = await this.prisma.platform.findMany({
        select: { id: true },
      });
      for (const { id } of platforms) {
        await this.runOnePlatformJob(id, SyncJobType.ODDS);
      }
      await this.enqueueBootMatcherIfBootOddsJob(job);
      return;
    }
    const data = job.data as SyncJobData;
    await this.runOnePlatformJob(data.platformId, data.jobType);
  }

  private readMatcherBootBatchLimit(): number {
    const raw = (process.env.CRAWLER_MATCHER_BATCH_LIMIT ?? '220').trim();
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(20, Math.min(2000, n)) : 220;
  }

  /**
   * 기동 1회 전 플랫폼 ODDS 잡(ODDS_BOOT_ALL_PLATFORMS_DATA)이 끝난 뒤에만 크롤러 매처 manual 잡을 넣는다.
   * 주기 repeat 는 data 가 비어 있어 `bootOddsSnapshot` 이 없음.
   */
  private async enqueueBootMatcherIfBootOddsJob(
    job: Job<SyncJobData | Record<string, never>>,
  ): Promise<void> {
    const d = job.data as { bootOddsSnapshot?: boolean };
    if (d?.bootOddsSnapshot !== ODDS_BOOT_ALL_PLATFORMS_DATA.bootOddsSnapshot) {
      return;
    }
    if (!chainCrawlerMatcherAfterBootOddsEnabled()) {
      return;
    }
    if (!runOddsIngestOnBootEnabled()) {
      return;
    }
    if (!runCrawlerMatcherOnBootEnabled()) {
      return;
    }
    const batchLimit = this.readMatcherBootBatchLimit();
    const bootLimit = Math.min(2000, Math.max(batchLimit, 200));
    const payload: CrawlerMatcherJobPayload = {
      limit: bootLimit,
      onlyStatuses: ['pending'],
      onlyWithoutStoredCandidates: true,
    };
    try {
      await this.matcherQueue.add(MATCHER_JOB_MANUAL, payload, {
        jobId: `post-boot-odds-matcher-${Date.now()}`,
        removeOnComplete: 25,
        removeOnFail: 15,
        priority: 10,
      });
      this.log.log(
        `기동 ODDS(boot-odds) 완료 → 크롤러 매처 manual 잡 큐잉 (limit=${bootLimit})`,
      );
    } catch (e) {
      this.log.warn(
        `기동 ODDS 뒤 매처 큐잉 실패(Redis): ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  private async runOnePlatformJob(
    platformId: string,
    jobType: SyncJobType,
  ): Promise<void> {
    const now = new Date();
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { integrationsJson: true },
    });
    let oddsIngestResult: {
      snapshotsWritten: number;
      feedIds: string[];
      sportsLiveGames?: number;
      oddsApiSnapshots?: {
        enabled: boolean;
        liveCount: number;
        prematchCount: number;
        fetchedAt: string;
      };
    } | null = null;
    if (jobType === SyncJobType.ODDS) {
      oddsIngestResult = await this.oddsIngest.ingestPlatformOdds(platformId);
    }
    const integrationsSummary =
      jobType === SyncJobType.ODDS
        ? sportsFeedSummary(platform?.integrationsJson)
        : null;
    const stubPayload = {
      source: 'stub',
      syncedAt: now.toISOString(),
      jobType,
      sampleOdds: [{ market: 'stub', price: 1.95 }],
      ...(oddsIngestResult && {
        oddsIngest: oddsIngestResult,
        note: '스냅샷은 SportsOddsSnapshot에 저장됨. 솔루션은 GET /public/sports-odds·sports-live 로 조회. OddsHost 인플레이 목록은 ODDS 동기화 시 sports-live 에 반영(환경변수 참고).',
      }),
      ...(integrationsSummary && {
        integrationsSummary,
      }),
    };
    await this.prisma.syncState.upsert({
      where: {
        platformId_jobType: { platformId, jobType },
      },
      create: {
        platformId,
        jobType,
        lastRunAt: now,
        lastOkAt: now,
        lastError: null,
        stubPayload,
      },
      update: {
        lastRunAt: now,
        lastOkAt: now,
        lastError: null,
        stubPayload,
      },
    });
  }
}
