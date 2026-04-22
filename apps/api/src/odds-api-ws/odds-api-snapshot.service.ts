import { Injectable, Logger } from '@nestjs/common';
import { readOddsApiConfig, type OddsApiConfig } from '@tosino/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  OddsApiAggregatorService,
  classifyOddsApiMatchStatus,
  type AggregatedMatch,
  type MatchStatus,
  type MatchesResponse,
  type OddsApiCatalogItem,
} from './odds-api-aggregator.service';
import { OddsApiAliasService } from './odds-api-alias.service';
import {
  OddsApiRestService,
  type OddsApiEventItem,
} from './odds-api-rest.service';
import { OddsApiWhitelistService } from './odds-api-whitelist.service';

export const ODDS_API_LIVE_SNAPSHOT_FEED_ID = 'odds-api-live';
export const ODDS_API_PREMATCH_SNAPSHOT_FEED_ID = 'odds-api-prematch';
export const ODDS_API_FINISHED_SNAPSHOT_FEED_ID = 'odds-api-finished';
export const ODDS_API_REST_CATALOG_FEED_ID = 'odds-api-rest-catalog';

type SnapshotType = 'live' | 'prematch' | 'finished';

/**
 * 종목별 폴링 주기. 5000 req/h budget 내에서 34종목을 모두 커버하기 위해
 * 인기/유동성 기반 4티어로 분류하고 cron tick (= 2분) 단위로 로테이션 한다.
 *
 *  T1=1 → 매 tick (2분) — 메이저
 *  T2=2 → 4분
 *  T3=5 → 10분
 *  T4=15 → 30분 — 마이너 / 라이브 거의 없음
 *
 *  계산 (대략, 1 platform):
 *    listing(per tick): T1 7×3 + T2 7×3/2 + T3 10×3/5 + T4 10×3/15 ≈ 38
 *    multi-odds:        T1 7×60/10 + T2 ≈ 48 + T3 ≈ 12 + T4 ≈ 4    ≈ 64
 *    합계 ~102/tick × 30tick/h = 3060/h  ✔  (5000 한도 안)
 */
const SPORT_TIER: Record<string, number> = {
  football: 1,
  basketball: 1,
  tennis: 1,
  baseball: 1,
  'american-football': 1,
  'ice-hockey': 1,
  esports: 1,

  volleyball: 2,
  handball: 2,
  'mixed-martial-arts': 2,
  boxing: 2,
  rugby: 2,
  cricket: 2,
  'table-tennis': 2,

  darts: 5,
  snooker: 5,
  'water-polo': 5,
  futsal: 5,
  'beach-volleyball': 5,
  'aussie-rules': 5,
  floorball: 5,
  'beach-soccer': 5,
  lacrosse: 5,
  badminton: 5,

  squash: 15,
  curling: 15,
  padel: 15,
  bandy: 15,
  'gaelic-football': 15,
  'beach-handball': 15,
  athletics: 15,
  'cross-country': 15,
  golf: 15,
  cycling: 15,
};

function shouldFetchSportThisTick(sport: string, tickIndex: number): boolean {
  const interval = SPORT_TIER[sport] ?? 5;
  return tickIndex % interval === 0;
}

/** 현재 분(0–59) 을 2분 단위 tickIndex 로 변환. cron 매 2분 tick 과 자연스럽게 정렬된다. */
function currentTickIndex(now: Date = new Date()): number {
  return Math.floor(now.getUTCMinutes() / 2);
}

/** 스냅샷 JSON·DB 값 혼선(숫자/공백) 방지 — eventId / matchId 비교 시 사용 */
export function normalizeOddsEventId(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  return String(v).trim();
}

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

  /** integrationsJson.bookmakers 가 비었을 때 listSelected 결과 캐시(분당 호출 폭주 방지) */
  private restBookmakerFallbackCache: {
    until: number;
    bookmakers: string[];
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: OddsApiAggregatorService,
    private readonly rest: OddsApiRestService,
    private readonly aliases: OddsApiAliasService,
    private readonly whitelist: OddsApiWhitelistService,
  ) {}

  async refreshPlatform(platformId: string): Promise<{
    enabled: boolean;
    liveCount: number;
    prematchCount: number;
    finishedCount: number;
    catalogCount: number;
    fetchedAt: string;
    filters: SnapshotFilters | null;
    catalogSnapshotId: string | null;
    liveSnapshotId: string | null;
    prematchSnapshotId: string | null;
    finishedSnapshotId: string | null;
    sportsFetched: string[];
  }> {
    const config = await this.getPlatformConfig(platformId);
    const now = new Date();

    if (!config?.enabled) {
      const emptyCatalog = this.buildEmptyCatalogPayload(config, now);
      const livePayload = this.buildEmptyPayload('live', config, now);
      const prematchPayload = this.buildEmptyPayload('prematch', config, now);
      const finishedPayload = this.buildEmptyPayload('finished', config, now);
      const [catalogRow, liveRow, prematchRow, finishedRow] = await Promise.all([
        this.insertCatalogSnapshot(platformId, emptyCatalog, now),
        this.insertProcessedSnapshot(platformId, 'live', livePayload, now, null),
        this.insertProcessedSnapshot(
          platformId,
          'prematch',
          prematchPayload,
          now,
          null,
        ),
        this.insertProcessedSnapshot(
          platformId,
          'finished',
          finishedPayload,
          now,
          null,
        ),
      ]);

      return {
        enabled: false,
        liveCount: 0,
        prematchCount: 0,
        finishedCount: 0,
        catalogCount: 0,
        fetchedAt: now.toISOString(),
        filters: null,
        catalogSnapshotId: catalogRow.id,
        liveSnapshotId: liveRow.id,
        prematchSnapshotId: prematchRow.id,
        finishedSnapshotId: finishedRow.id,
        sportsFetched: [],
      };
    }

    const useRestCatalog = this.rest.hasKey() && config.sports.length > 0;
    const built = useRestCatalog
      ? await this.buildRestCatalog(config, now)
      : {
          catalog: this.buildEmptyCatalogPayload(config, now),
          finishedItems: [] as OddsApiCatalogItem[],
          sportsFetched: [] as string[],
        };
    const catalog = built.catalog;
    const finishedItems = built.finishedItems;
    const sportsFetched = built.sportsFetched;

    // 새로 발견된 팀/리그 alias 를 자동 upsert (원본명만 채움 — 관리자가 나중에 한글명/로고 보강).
    if (useRestCatalog) {
      await this.aliases.absorbCatalogItems([
        ...catalog.items,
        ...finishedItems,
      ]);
    }

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

    const finished = useRestCatalog
      ? this.aggregator.listMatchesFromCatalog(finishedItems, {
          status: 'finished',
          sports: config.sports,
          // settled 는 multi-odds 호출 안하므로 bookmaker 필터 무의미. 점수만 노출.
          bookmakers: [],
          limit: config.matchLimit * 2,
          allowEmptyBookies: true,
        })
      : this.buildEmptyPayload('finished', config, now);

    // 한글명/로고 주입 (빈 alias 면 원본명 그대로 유지) + isHidden=true 인 리그 drop.
    let [liveEnriched, prematchEnriched, finishedEnriched] = await Promise.all([
      this.aliases.enrichMatches(live.matches),
      this.aliases.enrichMatches(prematch.matches),
      this.aliases.enrichMatches(finished.matches),
    ]);

    // Phase 3: 스코어 크롤러가 올려둔 display whitelist 가 있으면 그것만 통과.
    //  - platform config.useDisplayWhitelist === true 일 때만 적용.
    //  - 해당 sport 에 대해 whitelist 자체가 비어있으면 필터 off (크롤러 미연결 sport 차단 방지).
    if (config.useDisplayWhitelist) {
      const sportsTouched = Array.from(
        new Set([
          ...liveEnriched.map((m) => m.sport),
          ...prematchEnriched.map((m) => m.sport),
          ...finishedEnriched.map((m) => m.sport),
        ]),
      );
      const filterMap = await this.whitelist.loadFilterSet(sportsTouched);
      const applyFilter = (matches: typeof liveEnriched) =>
        matches.filter((m) => {
          const set = filterMap.get(m.sport);
          if (!set || set.size === 0) return true;
          return set.has(String(m.matchId));
        });
      liveEnriched = applyFilter(liveEnriched);
      prematchEnriched = applyFilter(prematchEnriched);
      finishedEnriched = applyFilter(finishedEnriched);
    }

    const liveMerged = { ...live, matches: liveEnriched, total: liveEnriched.length };
    const prematchMerged = {
      ...prematch,
      matches: prematchEnriched,
      total: prematchEnriched.length,
    };
    const finishedMerged = {
      ...finished,
      matches: finishedEnriched,
      total: finishedEnriched.length,
    };

    const livePayload = this.attachMeta(liveMerged, config, now);
    const prematchPayload = this.attachMeta(prematchMerged, config, now);
    const finishedPayload = this.attachMeta(finishedMerged, config, now);
    const catalogRow = await this.insertCatalogSnapshot(platformId, catalog, now);
    const [liveRow, prematchRow, finishedRow] = await Promise.all([
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
      this.insertProcessedSnapshot(
        platformId,
        'finished',
        finishedPayload,
        now,
        catalogRow.id,
      ),
    ]);

    return {
      enabled: true,
      liveCount: liveMerged.matches.length,
      prematchCount: prematchMerged.matches.length,
      finishedCount: finishedMerged.matches.length,
      catalogCount: catalog.items.length,
      fetchedAt: now.toISOString(),
      filters: livePayload.filters,
      catalogSnapshotId: catalogRow.id,
      liveSnapshotId: liveRow.id,
      prematchSnapshotId: prematchRow.id,
      finishedSnapshotId: finishedRow.id,
      sportsFetched,
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
    if (status === 'unknown') {
      return this.buildEmptyPayload(status, config, new Date());
    }
    if (status === 'all') {
      const [live, prematch, finished] = await Promise.all([
        this.readProcessedSnapshot(platformId, 'live'),
        this.readProcessedSnapshot(platformId, 'prematch'),
        this.readProcessedSnapshot(platformId, 'finished'),
      ]);
      const mergedMatches = [
        ...(live?.matches ?? []),
        ...(prematch?.matches ?? []),
        ...(finished?.matches ?? []),
      ].sort((a, b) => b.lastUpdatedMs - a.lastUpdatedMs);
      return {
        status: 'all',
        sport: null,
        total: mergedMatches.length,
        matches: mergedMatches,
        fetchedAt:
          live?.fetchedAt ??
          prematch?.fetchedAt ??
          finished?.fetchedAt ??
          new Date().toISOString(),
        filters: this.filtersFromConfig(config),
      };
    }
    const snapshotType: SnapshotType =
      status === 'prematch'
        ? 'prematch'
        : status === 'finished'
          ? 'finished'
          : 'live';
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

  /**
   * 플랫폼에 bookmakers 가 비어 있으면 `/v3/odds/multi` 응답의 bookmakers 가 비어
   * catalog 가 전부 필터링되는 문제가 있음 → API `bookmakers/selected` 또는 Bet365 폴백.
   */
  private async resolveOddsApiBookmakersForRest(
    config: OddsApiConfig,
  ): Promise<string[]> {
    const configured = uniqClean(config.bookmakers);
    if (configured.length > 0) {
      return configured.slice(0, 16);
    }
    const now = Date.now();
    const c = this.restBookmakerFallbackCache;
    if (c && now < c.until && c.bookmakers.length > 0) {
      return c.bookmakers;
    }
    try {
      const selected = await this.rest.listSelectedBookmakers();
      const slugs = uniqClean(
        selected.map((b) => (typeof b.slug === 'string' ? b.slug.trim() : '')),
      );
      const out = slugs.length > 0 ? slugs.slice(0, 12) : ['Bet365'];
      if (slugs.length === 0) {
        this.log.warn(
          'odds-api REST: bookmakers 비어 있고 /bookmakers/selected 도 비어 있음 — Bet365 로 multi-odds 호출',
        );
      } else {
        this.log.log(
          `odds-api REST: integrationsJson.bookmakers 비어 있음 — API selected ${out.length}개 사용`,
        );
      }
      this.restBookmakerFallbackCache = { until: now + 60_000, bookmakers: out };
      return out;
    } catch (e) {
      this.log.warn(
        `odds-api REST: listSelectedBookmakers 실패 — Bet365 폴백: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      const out = ['Bet365'];
      this.restBookmakerFallbackCache = { until: now + 60_000, bookmakers: out };
      return out;
    }
  }

  /**
   * REST 카탈로그를 한 번 빌드. 다음을 모두 수행한다:
   *   1) 종목 풀에서 이번 tick 에 다룰 종목만 골라 (티어 로테이션)
   *   2) 종목별로 status=pending(prematch) × bookmaker / status=live / status=settled 분리 호출
   *   3) prematch + live 후보를 합쳐 multi-odds 로 enrich → catalog (북메이커 0개는 drop)
   *   4) settled 는 multi-odds 호출 없이 점수만 finishedItems 에 담아 반환
   */
  private async buildRestCatalog(
    config: OddsApiConfig,
    fetchedAt: Date,
  ): Promise<{
    catalog: CatalogPayload;
    finishedItems: OddsApiCatalogItem[];
    sportsFetched: string[];
  }> {
    const allSports = uniqClean(config.sports);
    const tickIndex = currentTickIndex(fetchedAt);
    const sports = allSports.filter((s) => shouldFetchSportThisTick(s, tickIndex));
    const bookmakers = await this.resolveOddsApiBookmakersForRest(config);
    const filters = this.filtersFromConfig(config);
    const fetchedAtIso = fetchedAt.toISOString();

    // ── 1) prematch (status=pending) 후보: 북메이커 × 종목, 우리 북메이커가 가격 매기는 매치만
    const prematchListings = await Promise.all(
      sports.flatMap((sport) => {
        if (bookmakers.length === 0) {
          return [
            this.rest.listEventsBySport(sport, {
              limit: 1000,
              status: 'pending',
            }),
          ];
        }
        return bookmakers.map((bookmaker) =>
          this.rest.listEventsBySport(sport, {
            limit: 1000,
            bookmaker,
            status: 'pending',
          }),
        );
      }),
    );

    // ── 2) live 후보: status=live 만 한번 (북메이커 분리 불필요)
    const liveListings = await Promise.all(
      sports.map((sport) =>
        this.rest.listEventsBySport(sport, { limit: 1000, status: 'live' }),
      ),
    );

    // ── 3) settled (지난경기): status=settled, 점수만 필요 (multi-odds 안 부름)
    const settledListings = await Promise.all(
      sports.map((sport) =>
        this.rest.listEventsBySport(sport, {
          limit: 100, // 종료 매치는 너무 멀리 가져갈 필요 없음
          status: 'settled',
          ttlMs: 5 * 60_000, // 결과는 자주 안 바뀌니까 5분 캐시
        }),
      ),
    );

    const prematchCandidates: OddsApiEventItem[] = [];
    const liveCandidates: OddsApiEventItem[] = [];
    const seen = new Set<string>();
    for (const events of prematchListings) {
      for (const event of events) {
        if (!event.id || seen.has(event.id)) continue;
        seen.add(event.id);
        prematchCandidates.push(event);
      }
    }
    for (const events of liveListings) {
      for (const event of events) {
        if (!event.id || seen.has(event.id)) continue;
        seen.add(event.id);
        liveCandidates.push(event);
      }
    }

    sortEventsByKickoff(liveCandidates);
    sortEventsByKickoff(prematchCandidates);

    // matchLimit 는 **종목별** 상한으로 적용한다.
    // 예전 구현은 모든 종목을 합쳐 kickoff 오름차순 정렬 후 전역 slice 했는데, 그러면
    // kickoff 이 당장 가까운 테니스/탁구 류가 120 슬롯을 다 먹어 농구/야구/축구 처럼
    // 먼 저녁 경기는 catalog 에 한 건도 안 들어오는 starvation 이 발생한다.
    // → 종목별로 matchLimit 만큼 뽑아 각 종목이 최소한 자기 몫을 확보하도록 한다.
    const selected = new Map<string, OddsApiEventItem>();
    if (config.status !== 'prematch') {
      for (const event of takeTopPerSport(liveCandidates, config.matchLimit)) {
        selected.set(event.id, event);
      }
    }
    if (config.status !== 'live') {
      for (const event of takeTopPerSport(
        prematchCandidates,
        config.matchLimit,
      )) {
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

    const items: OddsApiCatalogItem[] = selectedEvents
      .map((event) => buildCatalogItem(event, oddsById.get(event.id), fetchedAtIso))
      .filter((item) => Object.keys(item.bookmakers).length > 0);

    // ── settled → finishedItems: 점수만, bookmakers={} (catalog 에는 안 들어감)
    const finishedItems: OddsApiCatalogItem[] = [];
    const settledSeen = new Set<string>();
    for (const events of settledListings) {
      for (const event of events) {
        if (!event.id || settledSeen.has(event.id)) continue;
        settledSeen.add(event.id);
        finishedItems.push(buildCatalogItem(event, undefined, fetchedAtIso));
      }
    }
    sortFinishedByKickoff(finishedItems);

    // finished 도 동일 이유로 per-sport cap. 예전엔 `matchLimit*2` 전역 cap 을 썼다.
    const finishedCapped = takeTopPerSport(
      finishedItems,
      config.matchLimit * 2,
    );

    return {
      catalog: {
        fetchedAt: fetchedAtIso,
        filters,
        totalItems: items.length,
        items,
      },
      finishedItems: finishedCapped,
      sportsFetched: sports,
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
        : snapshotType === 'finished'
          ? ODDS_API_FINISHED_SNAPSHOT_FEED_ID
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
        : snapshotType === 'finished'
          ? ODDS_API_FINISHED_SNAPSHOT_FEED_ID
          : ODDS_API_LIVE_SNAPSHOT_FEED_ID;
    return this.readLegacySnapshot(platformId, legacyFeedId, snapshotType);
  }

  /**
   * 플랫폼별 최신 가공 스냅샷(레거시 테이블 폴백 포함)에서 odds-api `matchId` → 배당 payload.
   * 동일 경기가 여러 스냅에 있으면 finished → prematch → live 순으로 덮어, 마지막에 live 가 우선한다.
   */
  async lookupAggregatedMatchesByEventIds(
    platformId: string,
    eventIds: ReadonlySet<string>,
  ): Promise<Map<string, AggregatedMatch>> {
    const out = new Map<string, AggregatedMatch>();
    if (eventIds.size === 0) return out;
    const pid = platformId.trim();
    if (!pid) return out;

    const wanted = new Set<string>();
    for (const id of eventIds) {
      const n = normalizeOddsEventId(id);
      if (n) wanted.add(n);
    }
    if (wanted.size === 0) return out;

    const [finishedPl, prematchPl, livePl] = await Promise.all([
      this.readProcessedSnapshot(pid, 'finished'),
      this.readProcessedSnapshot(pid, 'prematch'),
      this.readProcessedSnapshot(pid, 'live'),
    ]);
    const apply = (payload: SnapshotPayload | null) => {
      if (!payload) return;
      for (const m of payload.matches) {
        const mid = normalizeOddsEventId(m.matchId);
        if (mid && wanted.has(mid)) out.set(mid, m);
      }
    };
    apply(finishedPl);
    apply(prematchPl);
    apply(livePl);

    const missing = [...wanted].filter((id) => !out.has(id));
    if (missing.length > 0) {
      await this.hydrateMissingMatchesFromCatalog(pid, missing, out);
    }
    return out;
  }

  /**
   * 가공 스냅샷(live/prematch/finished)에 아직 없는 eventId(주로 카탈로그 strict 매칭 직후)에 대해
   * 최신 REST 카탈로그 행으로 AggregatedMatch 를 만들어 붙인다.
   */
  private async hydrateMissingMatchesFromCatalog(
    platformId: string,
    missingIds: string[],
    out: Map<string, AggregatedMatch>,
  ): Promise<void> {
    const cap = 120;
    const ids = missingIds.slice(0, cap);
    if (!ids.length) return;

    const config = await this.getPlatformConfig(platformId);
    if (!config?.enabled) return;

    const catalog = await this.getLatestCatalog(platformId);
    if (!catalog?.items?.length) return;

    const want = new Set(ids.map((x) => normalizeOddsEventId(x)).filter(Boolean));
    const picked: OddsApiCatalogItem[] = [];
    for (const it of catalog.items) {
      const id = normalizeOddsEventId(it.id);
      if (id && want.has(id)) picked.push(it);
      if (picked.length >= want.size) break;
    }
    if (!picked.length) return;

    const sportsArg = config.sports?.length ? config.sports : undefined;
    // 스냅샷에 없는 id 보강이므로 prematch 만이 아니라 live / finished 도 포함해야 한다.
    const resp = this.aggregator.listMatchesFromCatalog(picked, {
      status: 'all',
      sports: sportsArg,
      bookmakers: config.bookmakers,
      limit: picked.length,
      allowEmptyBookies: false,
    });
    const enriched = await this.aliases.enrichMatches(resp.matches);
    for (const m of enriched) {
      const mid = normalizeOddsEventId(m.matchId);
      if (mid && want.has(mid) && !out.has(mid)) {
        out.set(mid, m);
      }
    }
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
        row.snapshotType === 'prematch'
          ? 'prematch'
          : row.snapshotType === 'finished'
            ? 'finished'
            : 'live',
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

/**
 * 종목별 상한 적용. 입력 배열의 순서(=kickoff 오름/내림 정렬)는 그대로 유지하면서,
 * 각 종목(event.sport 또는 item.sport)의 처음 `perSportLimit` 개만 통과.
 *
 * 예) 테니스 200개, 농구 75개, 축구 150개, perSportLimit=120
 *     → 테니스 120 + 농구 75 + 축구 120 = 315 개 반환.
 * 이렇게 해야 kickoff 이 먼 종목(저녁 농구 등) 도 starvation 없이 catalog 에 들어온다.
 */
function takeTopPerSport<T extends { sport?: string }>(
  events: T[],
  perSportLimit: number,
): T[] {
  if (perSportLimit <= 0) return [];
  const counts = new Map<string, number>();
  const out: T[] = [];
  for (const event of events) {
    const sport = event.sport ?? 'unknown';
    const n = counts.get(sport) ?? 0;
    if (n >= perSportLimit) continue;
    counts.set(sport, n + 1);
    out.push(event);
  }
  return out;
}

/** 종료된 매치는 최근 종료된 것이 위로 오도록 (=kickoff 시간 내림차순) */
function sortFinishedByKickoff(items: OddsApiCatalogItem[]): void {
  items.sort((a, b) => {
    const at = a.date ? Date.parse(a.date) : 0;
    const bt = b.date ? Date.parse(b.date) : 0;
    if (at !== bt) return bt - at;
    return a.id.localeCompare(b.id);
  });
}

/**
 * /v3/events 의 메타 + (선택) /v3/odds/multi 의 markets 를 합쳐 catalog item 으로.
 * IDs(homeId/awayId/leagueSlug) 는 events 응답의 것을 우선 채택.
 */
function buildCatalogItem(
  event: OddsApiEventItem,
  odds: OddsByEventLike | undefined,
  fetchedAtIso: string,
): OddsApiCatalogItem {
  return {
    id: event.id,
    sport: event.sport,
    home: odds?.home ?? event.home,
    away: odds?.away ?? event.away,
    homeId: event.homeId ?? odds?.homeId ?? null,
    awayId: event.awayId ?? odds?.awayId ?? null,
    league: odds?.league ?? event.league,
    leagueSlug: event.leagueSlug ?? odds?.leagueSlug ?? null,
    date: odds?.date ?? event.date,
    status: odds?.status ?? event.status,
    scores: event.scores ?? odds?.scores ?? null,
    bookmakers: odds?.bookmakers ?? {},
    fetchedAt: fetchedAtIso,
  };
}

type OddsByEventLike = Awaited<
  ReturnType<OddsApiRestService['getMultiOdds']>
>[number];
