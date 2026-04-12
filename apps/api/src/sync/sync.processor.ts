import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SyncJobType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OddsIngestService } from './odds-ingest.service';
import { ODDS_ALL_PLATFORMS_JOB } from './sync-scheduler.service';

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
  constructor(
    private prisma: PrismaService,
    private oddsIngest: OddsIngestService,
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
      return;
    }
    const data = job.data as SyncJobData;
    await this.runOnePlatformJob(data.platformId, data.jobType);
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
