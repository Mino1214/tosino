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
  }> {
    const config = await this.getPlatformConfig(platformId);
    const now = new Date();

    if (!config?.enabled) {
      await Promise.all([
        this.saveSnapshot(
          platformId,
          ODDS_API_LIVE_SNAPSHOT_FEED_ID,
          this.buildEmptyPayload('live', config, now),
          now,
        ),
        this.saveSnapshot(
          platformId,
          ODDS_API_PREMATCH_SNAPSHOT_FEED_ID,
          this.buildEmptyPayload('prematch', config, now),
          now,
        ),
        this.saveCatalogSnapshot(
          platformId,
          this.buildEmptyCatalogPayload(config, now),
          now,
        ),
      ]);

      return {
        enabled: false,
        liveCount: 0,
        prematchCount: 0,
        catalogCount: 0,
        fetchedAt: now.toISOString(),
        filters: null,
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

    await Promise.all([
      this.saveCatalogSnapshot(platformId, catalog, now),
      this.saveSnapshot(
        platformId,
        ODDS_API_LIVE_SNAPSHOT_FEED_ID,
        livePayload,
        now,
      ),
      this.saveSnapshot(
        platformId,
        ODDS_API_PREMATCH_SNAPSHOT_FEED_ID,
        prematchPayload,
        now,
      ),
    ]);

    return {
      enabled: true,
      liveCount: live.matches.length,
      prematchCount: prematch.matches.length,
      catalogCount: catalog.items.length,
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
    const [config, live, prematch, catalog] = await Promise.all([
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
      this.prisma.sportsOddsSnapshot.findUnique({
        where: {
          platformId_sourceFeedId: {
            platformId,
            sourceFeedId: ODDS_API_REST_CATALOG_FEED_ID,
          },
        },
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

  private async saveCatalogSnapshot(
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
