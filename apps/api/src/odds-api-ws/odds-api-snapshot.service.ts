import { Injectable } from '@nestjs/common';
import { readOddsApiConfig, type OddsApiConfig } from '@tosino/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  OddsApiAggregatorService,
  type MatchStatus,
  type MatchesResponse,
} from './odds-api-aggregator.service';

export const ODDS_API_LIVE_SNAPSHOT_FEED_ID = 'odds-api-live';
export const ODDS_API_PREMATCH_SNAPSHOT_FEED_ID = 'odds-api-prematch';

type SnapshotPayload = MatchesResponse & {
  fetchedAt: string;
  filters: {
    sports: string[];
    bookmakers: string[];
    matchLimit: number;
    cacheTtlSeconds: number;
  };
};

@Injectable()
export class OddsApiSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: OddsApiAggregatorService,
  ) {}

  async refreshPlatform(platformId: string): Promise<{
    enabled: boolean;
    liveCount: number;
    prematchCount: number;
    fetchedAt: string;
    filters: {
      sports: string[];
      bookmakers: string[];
      matchLimit: number;
      cacheTtlSeconds: number;
    } | null;
  }> {
    const config = await this.getPlatformConfig(platformId);
    const now = new Date();
    if (!config?.enabled) {
      await this.saveSnapshot(
        platformId,
        ODDS_API_LIVE_SNAPSHOT_FEED_ID,
        this.buildEmptyPayload('live', config, now),
        now,
      );
      await this.saveSnapshot(
        platformId,
        ODDS_API_PREMATCH_SNAPSHOT_FEED_ID,
        this.buildEmptyPayload('prematch', config, now),
        now,
      );
      return {
        enabled: false,
        liveCount: 0,
        prematchCount: 0,
        fetchedAt: now.toISOString(),
        filters: null,
      };
    }

    const live =
      config.status === 'prematch'
        ? this.buildEmptyPayload('live', config, now)
        : this.aggregator.listMatches({
            status: 'live',
            sports: config.sports,
            bookmakers: config.bookmakers,
            limit: config.matchLimit,
          });
    const prematch =
      config.status === 'live'
        ? this.buildEmptyPayload('prematch', config, now)
        : this.aggregator.listMatches({
            status: 'prematch',
            sports: config.sports,
            bookmakers: config.bookmakers,
            limit: config.matchLimit,
          });

    const livePayload = this.attachMeta(live, config, now);
    const prematchPayload = this.attachMeta(prematch, config, now);

    await this.saveSnapshot(
      platformId,
      ODDS_API_LIVE_SNAPSHOT_FEED_ID,
      livePayload,
      now,
    );
    await this.saveSnapshot(
      platformId,
      ODDS_API_PREMATCH_SNAPSHOT_FEED_ID,
      prematchPayload,
      now,
    );

    return {
      enabled: true,
      liveCount: live.matches.length,
      prematchCount: prematch.matches.length,
      fetchedAt: now.toISOString(),
      filters: livePayload.filters,
    };
  }

  async getPlatformConfig(platformId: string): Promise<OddsApiConfig | null> {
    const row = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { integrationsJson: true },
    });
    if (!row) return null;
    return readOddsApiConfig(row.integrationsJson);
  }

  async getMatches(
    platformId: string,
    status: MatchStatus | 'all',
  ): Promise<SnapshotPayload> {
    const config = await this.getPlatformConfig(platformId);
    if (!config?.enabled) {
      return this.buildEmptyPayload(status, config, new Date());
    }
    if (status === 'all') {
      const [live, prematch] = await Promise.all([
        this.readSnapshot(platformId, ODDS_API_LIVE_SNAPSHOT_FEED_ID),
        this.readSnapshot(platformId, ODDS_API_PREMATCH_SNAPSHOT_FEED_ID),
      ]);
      const mergedMatches = [
        ...(live?.matches ?? []),
        ...(prematch?.matches ?? []),
      ].sort((a, b) => b.lastUpdatedMs - a.lastUpdatedMs);
      return {
        status: 'all',
        sport: null,
        total: mergedMatches.length,
        matches: mergedMatches,
        fetchedAt:
          live?.fetchedAt ?? prematch?.fetchedAt ?? new Date().toISOString(),
        filters: this.filtersFromConfig(config),
      };
    }
    const ref =
      status === 'prematch'
        ? ODDS_API_PREMATCH_SNAPSHOT_FEED_ID
        : ODDS_API_LIVE_SNAPSHOT_FEED_ID;
    return (
      (await this.readSnapshot(platformId, ref)) ??
      this.buildEmptyPayload(status, config, new Date())
    );
  }

  async getSnapshotMeta(platformId: string) {
    const [config, live, prematch] = await Promise.all([
      this.getPlatformConfig(platformId),
      this.prisma.sportsOddsSnapshot.findUnique({
        where: {
          platformId_sourceFeedId: {
            platformId,
            sourceFeedId: ODDS_API_LIVE_SNAPSHOT_FEED_ID,
          },
        },
        select: { fetchedAt: true },
      }),
      this.prisma.sportsOddsSnapshot.findUnique({
        where: {
          platformId_sourceFeedId: {
            platformId,
            sourceFeedId: ODDS_API_PREMATCH_SNAPSHOT_FEED_ID,
          },
        },
        select: { fetchedAt: true },
      }),
    ]);

    return {
      config,
      liveFetchedAt: live?.fetchedAt?.toISOString() ?? null,
      prematchFetchedAt: prematch?.fetchedAt?.toISOString() ?? null,
    };
  }

  private async saveSnapshot(
    platformId: string,
    sourceFeedId: string,
    payload: SnapshotPayload,
    fetchedAt: Date,
  ) {
    await this.prisma.sportsOddsSnapshot.upsert({
      where: {
        platformId_sourceFeedId: { platformId, sourceFeedId },
      },
      create: {
        platformId,
        sourceFeedId,
        sportLabel: 'odds-api',
        market: payload.status,
        payloadJson: payload as object,
        fetchedAt,
      },
      update: {
        sportLabel: 'odds-api',
        market: payload.status,
        payloadJson: payload as object,
        fetchedAt,
      },
    });
  }

  private async readSnapshot(
    platformId: string,
    sourceFeedId: string,
  ): Promise<SnapshotPayload | null> {
    const row = await this.prisma.sportsOddsSnapshot.findUnique({
      where: {
        platformId_sourceFeedId: { platformId, sourceFeedId },
      },
      select: { payloadJson: true, fetchedAt: true },
    });
    if (!row || !row.payloadJson || typeof row.payloadJson !== 'object') {
      return null;
    }
    const payload = row.payloadJson as Partial<SnapshotPayload>;
    return {
      status: payload.status ?? 'all',
      sport: payload.sport ?? null,
      total: Array.isArray(payload.matches) ? payload.matches.length : 0,
      matches: Array.isArray(payload.matches) ? payload.matches : [],
      fetchedAt: row.fetchedAt.toISOString(),
      filters:
        payload.filters && typeof payload.filters === 'object'
          ? {
              sports: Array.isArray(payload.filters.sports)
                ? payload.filters.sports
                : [],
              bookmakers: Array.isArray(payload.filters.bookmakers)
                ? payload.filters.bookmakers
                : [],
              matchLimit:
                typeof payload.filters.matchLimit === 'number'
                  ? payload.filters.matchLimit
                  : 120,
              cacheTtlSeconds:
                typeof payload.filters.cacheTtlSeconds === 'number'
                  ? payload.filters.cacheTtlSeconds
                  : 30,
            }
          : { sports: [], bookmakers: [], matchLimit: 120, cacheTtlSeconds: 30 },
    };
  }

  private attachMeta(
    data: MatchesResponse,
    config: OddsApiConfig,
    fetchedAt: Date,
  ): SnapshotPayload {
    return {
      ...data,
      fetchedAt: fetchedAt.toISOString(),
      filters: this.filtersFromConfig(config),
    };
  }

  private buildEmptyPayload(
    status: MatchStatus | 'all',
    config: OddsApiConfig | null,
    fetchedAt: Date,
  ): SnapshotPayload {
    return {
      status,
      sport:
        config?.sports && config.sports.length === 1 ? config.sports[0] : null,
      total: 0,
      matches: [],
      fetchedAt: fetchedAt.toISOString(),
      filters: this.filtersFromConfig(config),
    };
  }

  private filtersFromConfig(config: OddsApiConfig | null) {
    return {
      sports: config?.sports ?? [],
      bookmakers: config?.bookmakers ?? [],
      matchLimit: config?.matchLimit ?? 120,
      cacheTtlSeconds: config?.cacheTtlSeconds ?? 30,
    };
  }
}
