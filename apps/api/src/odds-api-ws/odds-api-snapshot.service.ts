import { Injectable, Logger } from '@nestjs/common';
import { readOddsApiConfig, type OddsApiConfig } from '@tosino/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  OddsApiAggregatorService,
  classifyOddsApiMatchStatus,
  type MatchStatus,
  type MatchesResponse,
  type OddsApiCatalogItem,
} from './odds-api-aggregator.service';
import {
  OddsApiRestService,
  type OddsApiEventItem,
} from './odds-api-rest.service';

export const ODDS_API_LIVE_SNAPSHOT_FEED_ID = 'odds-api-live';
export const ODDS_API_PREMATCH_SNAPSHOT_FEED_ID = 'odds-api-prematch';
export const ODDS_API_REST_CATALOG_FEED_ID = 'odds-api-rest-catalog';

type SnapshotType = 'live' | 'prematch';

type SnapshotFilters = {
  sports: string[];
  bookmakers: string[];
  matchLimit: number;
  cacheTtlSeconds: number;
};

type SnapshotPayload = MatchesResponse & {
  fetchedAt: string;
  filters: SnapshotFilters;
};

type CatalogPayload = {
  fetchedAt: string;
  filters: SnapshotFilters;
  totalItems: number;
  items: OddsApiCatalogItem[];
};

type CatalogSnapshotSummary = {
  id: string;
  fetchedAt: string;
  totalItems: number;
  sports: string[];
  bookmakers: string[];
  matchLimit: number;
  cacheTtlSeconds: number;
};

type ProcessedSnapshotSummary = {
  id: string;
  snapshotType: SnapshotType;
  catalogSnapshotId: string | null;
  fetchedAt: string;
  totalMatches: number;
  sports: string[];
  bookmakers: string[];
  matchLimit: number;
  cacheTtlSeconds: number;
};

@Injectable()
export class OddsApiSnapshotService {
  private readonly log = new Logger(OddsApiSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: OddsApiAggregatorService,
    private readonly rest: OddsApiRestService,
  ) {}

  async refreshPlatform(platformId: string): Promise<{
    enabled: boolean;
    liveCount: number;
    prematchCount: number;
    catalogCount: number;
    fetchedAt: string;
    filters: SnapshotFilters | null;
    catalogSnapshotId: string | null;
    liveSnapshotId: string | null;
    prematchSnapshotId: string | null;
  }> {
    const config = await this.getPlatformConfig(platformId);
    const now = new Date();

    if (!config?.enabled) {
      const emptyCatalog = this.buildEmptyCatalogPayload(config, now);
      const livePayload = this.buildEmptyPayload('live', config, now);
      const prematchPayload = this.buildEmptyPayload('prematch', config, now);
      const [catalogRow, liveRow, prematchRow] = await Promise.all([
        this.insertCatalogSnapshot(platformId, emptyCatalog, now),
        this.insertProcessedSnapshot(
          platformId,
          'live',
          livePayload,
          now,
          null,
        ),
        this.insertProcessedSnapshot(
          platformId,
          'prematch',
          prematchPayload,
          now,
          null,
        ),
      ]);

      return {
        enabled: false,
        liveCount: 0,
        prematchCount: 0,
        catalogCount: 0,
        fetchedAt: now.toISOString(),
        filters: null,
        catalogSnapshotId: catalogRow.id,
        liveSnapshotId: liveRow.id,
        prematchSnapshotId: prematchRow.id,
      };
    }

    const useRestCatalog = this.rest.hasKey() && config.sports.length > 0;
    const catalog = useRestCatalog
      ? await this.buildRestCatalog(config, now)
      : this.buildEmptyCatalogPayload(config, now);

    const live =
      config.status === 'prematch'
        ? this.buildEmptyPayload('live', config, now)
        : useRestCatalog
          ? this.aggregator.listMatchesFromCatalog(catalog.items, {
              status: 'live',
              sports: config.sports,
              bookmakers: config.bookmakers,
              limit: config.matchLimit,
            })
          : this.aggregator.listMatches({
              status: 'live',
              sports: config.sports,
              bookmakers: config.bookmakers,
              limit: config.matchLimit,
            });

    const prematch =
      config.status === 'live'
        ? this.buildEmptyPayload('prematch', config, now)
        : useRestCatalog
          ? this.aggregator.listMatchesFromCatalog(catalog.items, {
              status: 'prematch',
              sports: config.sports,
              bookmakers: config.bookmakers,
              limit: config.matchLimit,
            })
          : this.aggregator.listMatches({
              status: 'prematch',
              sports: config.sports,
              bookmakers: config.bookmakers,
              limit: config.matchLimit,
            });

    const livePayload = this.attachMeta(live, config, now);
    const prematchPayload = this.attachMeta(prematch, config, now);
    const catalogRow = await this.insertCatalogSnapshot(platformId, catalog, now);
    const [liveRow, prematchRow] = await Promise.all([
      this.insertProcessedSnapshot(
        platformId,
        'live',
        livePayload,
        now,
        catalogRow.id,
      ),
      this.insertProcessedSnapshot(
        platformId,
        'prematch',
        prematchPayload,
        now,
        catalogRow.id,
      ),
    ]);

    return {
      enabled: true,
      liveCount: live.matches.length,
      prematchCount: prematch.matches.length,
      catalogCount: catalog.items.length,
      fetchedAt: now.toISOString(),
      filters: livePayload.filters,
      catalogSnapshotId: catalogRow.id,
      liveSnapshotId: liveRow.id,
      prematchSnapshotId: prematchRow.id,
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
    if (status === 'finished' || status === 'unknown') {
      return this.buildEmptyPayload(status, config, new Date());
    }
    if (status === 'all') {
      const [live, prematch] = await Promise.all([
        this.readProcessedSnapshot(platformId, 'live'),
        this.readProcessedSnapshot(platformId, 'prematch'),
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
    const snapshotType: SnapshotType = status === 'prematch' ? 'prematch' : 'live';
    return (
      (await this.readProcessedSnapshot(platformId, snapshotType)) ??
      this.buildEmptyPayload(status, config, new Date())
    );
  }

  async getLatestCatalog(platformId: string): Promise<CatalogPayload | null> {
    const row = await this.prisma.oddsApiCatalogSnapshot.findFirst({
      where: { platformId },
      orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
      select: { payloadJson: true, fetchedAt: true },
    });
    if (row) return this.parseCatalogPayload(row.payloadJson, row.fetchedAt);
    return this.readLegacyCatalogSnapshot(platformId);
  }

  async getCatalogHistory(
    platformId: string,
    take = 10,
  ): Promise<CatalogSnapshotSummary[]> {
    const rows = await this.prisma.oddsApiCatalogSnapshot.findMany({
      where: { platformId },
      orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(take, 1), 50),
      select: {
        id: true,
        fetchedAt: true,
        totalItems: true,
        filtersJson: true,
      },
    });
    return rows.map((row) => this.catalogSummaryFromRow(row));
  }

  async getProcessedHistory(
    platformId: string,
    snapshotType?: SnapshotType,
    take = 20,
  ): Promise<ProcessedSnapshotSummary[]> {
    const rows = await this.prisma.oddsApiProcessedSnapshot.findMany({
      where: {
        platformId,
        ...(snapshotType ? { snapshotType } : {}),
      },
      orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(take, 1), 100),
      select: {
        id: true,
        snapshotType: true,
        catalogSnapshotId: true,
        fetchedAt: true,
        totalMatches: true,
        filtersJson: true,
      },
    });
    return rows.map((row) => this.processedSummaryFromRow(row));
  }

  async getAdminOverview(platformId: string) {
    const [config, latestCatalog, latestLive, latestPrematch, catalogCount, processedCount] =
      await Promise.all([
        this.getPlatformConfig(platformId),
        this.prisma.oddsApiCatalogSnapshot.findFirst({
          where: { platformId },
          orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            fetchedAt: true,
            totalItems: true,
            filtersJson: true,
          },
        }),
        this.prisma.oddsApiProcessedSnapshot.findFirst({
          where: { platformId, snapshotType: 'live' },
          orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            snapshotType: true,
            catalogSnapshotId: true,
            fetchedAt: true,
            totalMatches: true,
            filtersJson: true,
          },
        }),
        this.prisma.oddsApiProcessedSnapshot.findFirst({
          where: { platformId, snapshotType: 'prematch' },
          orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            snapshotType: true,
            catalogSnapshotId: true,
            fetchedAt: true,
            totalMatches: true,
            filtersJson: true,
          },
        }),
        this.prisma.oddsApiCatalogSnapshot.count({ where: { platformId } }),
        this.prisma.oddsApiProcessedSnapshot.count({ where: { platformId } }),
      ]);

    return {
      platformId,
      config,
      latestCatalog: latestCatalog
        ? this.catalogSummaryFromRow(latestCatalog)
        : null,
      latestProcessed: {
        live: latestLive ? this.processedSummaryFromRow(latestLive) : null,
        prematch: latestPrematch
          ? this.processedSummaryFromRow(latestPrematch)
          : null,
      },
      historyCounts: {
        catalog: catalogCount,
        processed: processedCount,
      },
    };
  }

  async getSnapshotMeta(platformId: string) {
    const [config, live, prematch, catalog] = await Promise.all([
      this.getPlatformConfig(platformId),
      this.prisma.oddsApiProcessedSnapshot.findFirst({
        where: { platformId, snapshotType: 'live' },
        orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
        select: { fetchedAt: true },
      }),
      this.prisma.oddsApiProcessedSnapshot.findFirst({
        where: { platformId, snapshotType: 'prematch' },
        orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
        select: { fetchedAt: true },
      }),
      this.prisma.oddsApiCatalogSnapshot.findFirst({
        where: { platformId },
        orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
        select: { fetchedAt: true },
      }),
    ]);

    return {
      config,
      liveFetchedAt: live?.fetchedAt?.toISOString() ?? null,
      prematchFetchedAt: prematch?.fetchedAt?.toISOString() ?? null,
      catalogFetchedAt: catalog?.fetchedAt?.toISOString() ?? null,
    };
  }

  private async buildRestCatalog(
    config: OddsApiConfig,
    fetchedAt: Date,
  ): Promise<CatalogPayload> {
    const sports = uniqClean(config.sports);
    const filters = this.filtersFromConfig(config);
    const fetchedAtIso = fetchedAt.toISOString();

    const eventLists = await Promise.all(
      sports.map(async (sport) => {
        try {
          return await this.rest.listEventsBySport(sport, { limit: 1000 });
        } catch (e) {
          this.log.warn(
            `listEventsBySport(${sport}) 실패: ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
          return [];
        }
      }),
    );

    const liveCandidates: OddsApiEventItem[] = [];
    const prematchCandidates: OddsApiEventItem[] = [];
    const seen = new Set<string>();

    for (const events of eventLists) {
      for (const event of events) {
        if (!event.id || seen.has(event.id)) continue;
        seen.add(event.id);
        const phase = classifyOddsApiMatchStatus({
          eventStatus: event.status,
          startTime: event.date,
        });
        if (phase === 'live') liveCandidates.push(event);
        else if (phase === 'prematch') prematchCandidates.push(event);
      }
    }

    sortEventsByKickoff(liveCandidates);
    sortEventsByKickoff(prematchCandidates);

    const selected = new Map<string, OddsApiEventItem>();
    if (config.status !== 'prematch') {
      for (const event of liveCandidates.slice(0, config.matchLimit)) {
        selected.set(event.id, event);
      }
    }
    if (config.status !== 'live') {
      for (const event of prematchCandidates.slice(0, config.matchLimit)) {
        if (!selected.has(event.id)) selected.set(event.id, event);
      }
    }

    const selectedEvents = [...selected.values()];
    const oddsById = new Map<
      string,
      Awaited<ReturnType<OddsApiRestService['getMultiOdds']>>[number]
    >();

    for (let i = 0; i < selectedEvents.length; i += 10) {
      const chunk = selectedEvents.slice(i, i + 10).map((event) => event.id);
      try {
        const rows = await this.rest.getMultiOdds(chunk, config.bookmakers);
        for (const row of rows) {
          oddsById.set(row.id, row);
        }
      } catch (e) {
        this.log.warn(
          `getMultiOdds(${chunk.join(',')}) 실패: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }

    const items: OddsApiCatalogItem[] = selectedEvents.map((event) => {
      const odds = oddsById.get(event.id);
      return {
        id: event.id,
        sport: event.sport,
        home: odds?.home ?? event.home,
        away: odds?.away ?? event.away,
        league: odds?.league ?? event.league,
        date: odds?.date ?? event.date,
        status: odds?.status ?? event.status,
        scores: odds?.scores ?? null,
        bookmakers: odds?.bookmakers ?? {},
        fetchedAt: fetchedAtIso,
      };
    });

    return {
      fetchedAt: fetchedAtIso,
      filters,
      totalItems: items.length,
      items,
    };
  }

  private async insertCatalogSnapshot(
    platformId: string,
    payload: CatalogPayload,
    fetchedAt: Date,
  ) {
    const row = await this.prisma.oddsApiCatalogSnapshot.create({
      data: {
        platformId,
        filtersJson: payload.filters as object,
        totalItems: payload.totalItems,
        payloadJson: payload as object,
        fetchedAt,
      },
      select: { id: true },
    });
    await this.saveLegacyCatalogSnapshot(platformId, payload, fetchedAt);
    return row;
  }

  private async insertProcessedSnapshot(
    platformId: string,
    snapshotType: SnapshotType,
    payload: SnapshotPayload,
    fetchedAt: Date,
    catalogSnapshotId: string | null,
  ) {
    const row = await this.prisma.oddsApiProcessedSnapshot.create({
      data: {
        platformId,
        catalogSnapshotId,
        snapshotType,
        filtersJson: payload.filters as object,
        totalMatches: payload.total,
        payloadJson: payload as object,
        fetchedAt,
      },
      select: { id: true },
    });
    await this.saveLegacyProcessedSnapshot(
      platformId,
      snapshotType,
      payload,
      fetchedAt,
    );
    return row;
  }

  private async saveLegacyCatalogSnapshot(
    platformId: string,
    payload: CatalogPayload,
    fetchedAt: Date,
  ) {
    await this.prisma.sportsOddsSnapshot.upsert({
      where: {
        platformId_sourceFeedId: {
          platformId,
          sourceFeedId: ODDS_API_REST_CATALOG_FEED_ID,
        },
      },
      create: {
        platformId,
        sourceFeedId: ODDS_API_REST_CATALOG_FEED_ID,
        sportLabel: 'odds-api-rest',
        market: 'catalog',
        payloadJson: payload as object,
        fetchedAt,
      },
      update: {
        sportLabel: 'odds-api-rest',
        market: 'catalog',
        payloadJson: payload as object,
        fetchedAt,
      },
    });
  }

  private async saveLegacyProcessedSnapshot(
    platformId: string,
    snapshotType: SnapshotType,
    payload: SnapshotPayload,
    fetchedAt: Date,
  ) {
    const sourceFeedId =
      snapshotType === 'prematch'
        ? ODDS_API_PREMATCH_SNAPSHOT_FEED_ID
        : ODDS_API_LIVE_SNAPSHOT_FEED_ID;
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

  private async readProcessedSnapshot(
    platformId: string,
    snapshotType: SnapshotType,
  ): Promise<SnapshotPayload | null> {
    const row = await this.prisma.oddsApiProcessedSnapshot.findFirst({
      where: { platformId, snapshotType },
      orderBy: [{ fetchedAt: 'desc' }, { createdAt: 'desc' }],
      select: { payloadJson: true, fetchedAt: true },
    });
    if (row) {
      return this.parseSnapshotPayload(row.payloadJson, row.fetchedAt, snapshotType);
    }
    const legacyFeedId =
      snapshotType === 'prematch'
        ? ODDS_API_PREMATCH_SNAPSHOT_FEED_ID
        : ODDS_API_LIVE_SNAPSHOT_FEED_ID;
    return this.readLegacySnapshot(platformId, legacyFeedId, snapshotType);
  }

  private async readLegacyCatalogSnapshot(
    platformId: string,
  ): Promise<CatalogPayload | null> {
    const row = await this.prisma.sportsOddsSnapshot.findUnique({
      where: {
        platformId_sourceFeedId: {
          platformId,
          sourceFeedId: ODDS_API_REST_CATALOG_FEED_ID,
        },
      },
      select: { payloadJson: true, fetchedAt: true },
    });
    if (!row) return null;
    return this.parseCatalogPayload(row.payloadJson, row.fetchedAt);
  }

  private async readLegacySnapshot(
    platformId: string,
    sourceFeedId: string,
    fallbackStatus: MatchStatus | 'all',
  ): Promise<SnapshotPayload | null> {
    const row = await this.prisma.sportsOddsSnapshot.findUnique({
      where: {
        platformId_sourceFeedId: { platformId, sourceFeedId },
      },
      select: { payloadJson: true, fetchedAt: true },
    });
    if (!row) return null;
    return this.parseSnapshotPayload(row.payloadJson, row.fetchedAt, fallbackStatus);
  }

  private parseCatalogPayload(
    raw: unknown,
    fetchedAt: Date,
  ): CatalogPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw as Partial<CatalogPayload>;
    return {
      fetchedAt: fetchedAt.toISOString(),
      filters: this.normalizeFilters(payload.filters),
      totalItems:
        typeof payload.totalItems === 'number'
          ? payload.totalItems
          : Array.isArray(payload.items)
            ? payload.items.length
            : 0,
      items: Array.isArray(payload.items)
        ? (payload.items as OddsApiCatalogItem[])
        : [],
    };
  }

  private parseSnapshotPayload(
    raw: unknown,
    fetchedAt: Date,
    fallbackStatus: MatchStatus | 'all',
  ): SnapshotPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw as Partial<SnapshotPayload>;
    const matches = Array.isArray(payload.matches) ? payload.matches : [];
    return {
      status: payload.status ?? fallbackStatus,
      sport: payload.sport ?? null,
      total: matches.length,
      matches,
      fetchedAt: fetchedAt.toISOString(),
      filters: this.normalizeFilters(payload.filters),
    };
  }

  private normalizeFilters(raw: unknown): SnapshotFilters {
    if (!raw || typeof raw !== 'object') {
      return {
        sports: [],
        bookmakers: [],
        matchLimit: 120,
        cacheTtlSeconds: 30,
      };
    }
    const filters = raw as Partial<SnapshotFilters>;
    return {
      sports: Array.isArray(filters.sports) ? filters.sports : [],
      bookmakers: Array.isArray(filters.bookmakers) ? filters.bookmakers : [],
      matchLimit:
        typeof filters.matchLimit === 'number' ? filters.matchLimit : 120,
      cacheTtlSeconds:
        typeof filters.cacheTtlSeconds === 'number'
          ? filters.cacheTtlSeconds
          : 30,
    };
  }

  private catalogSummaryFromRow(row: {
    id: string;
    fetchedAt: Date;
    totalItems: number;
    filtersJson: unknown;
  }): CatalogSnapshotSummary {
    const filters = this.normalizeFilters(row.filtersJson);
    return {
      id: row.id,
      fetchedAt: row.fetchedAt.toISOString(),
      totalItems: row.totalItems,
      sports: filters.sports,
      bookmakers: filters.bookmakers,
      matchLimit: filters.matchLimit,
      cacheTtlSeconds: filters.cacheTtlSeconds,
    };
  }

  private processedSummaryFromRow(row: {
    id: string;
    snapshotType: string;
    catalogSnapshotId: string | null;
    fetchedAt: Date;
    totalMatches: number;
    filtersJson: unknown;
  }): ProcessedSnapshotSummary {
    const filters = this.normalizeFilters(row.filtersJson);
    return {
      id: row.id,
      snapshotType:
        row.snapshotType === 'prematch' ? 'prematch' : 'live',
      catalogSnapshotId: row.catalogSnapshotId,
      fetchedAt: row.fetchedAt.toISOString(),
      totalMatches: row.totalMatches,
      sports: filters.sports,
      bookmakers: filters.bookmakers,
      matchLimit: filters.matchLimit,
      cacheTtlSeconds: filters.cacheTtlSeconds,
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

  private buildEmptyCatalogPayload(
    config: OddsApiConfig | null,
    fetchedAt: Date,
  ): CatalogPayload {
    return {
      fetchedAt: fetchedAt.toISOString(),
      filters: this.filtersFromConfig(config),
      totalItems: 0,
      items: [],
    };
  }

  private filtersFromConfig(config: OddsApiConfig | null): SnapshotFilters {
    return {
      sports: config?.sports ?? [],
      bookmakers: config?.bookmakers ?? [],
      matchLimit: config?.matchLimit ?? 120,
      cacheTtlSeconds: config?.cacheTtlSeconds ?? 30,
    };
  }
}

function uniqClean(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function sortEventsByKickoff(events: OddsApiEventItem[]): void {
  events.sort((a, b) => {
    const at = a.date ? Date.parse(a.date) : Number.MAX_SAFE_INTEGER;
    const bt = b.date ? Date.parse(b.date) : Number.MAX_SAFE_INTEGER;
    if (at !== bt) return at - bt;
    return a.id.localeCompare(b.id);
  });
}
