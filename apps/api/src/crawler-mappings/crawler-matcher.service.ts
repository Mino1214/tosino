import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  buildProviderOddsPreview,
  omitRawMatchFromOverlayRow,
  type ProviderOddsPreview,
} from './crawler-odds-preview.util';
import { Prisma } from '@prisma/client';
import { CrawlerMappingsService } from './crawler-mappings.service';
import { resolvePublicMediaUrl } from '../common/utils/media-url.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  OddsApiSnapshotService,
  normalizeOddsEventId,
} from '../odds-api-ws/odds-api-snapshot.service';
import { ratio } from 'fuzzball';
import {
  type ApiMatchInput,
  type ConfirmedTeamNamePair,
  type MatchCandidateResult,
  findTopCandidates,
  normalizeTeamName,
} from './match-candidate-scorer';
import {
  scoreCatalogAgainstRawLoose,
  selectEventsInLooseLeagueBuckets,
  type LooseCatalogScoreRow,
} from './loose-catalog-scorer';
import {
  catalogLeagueSlugMatchesCountryHints,
  collectCountrySlugHints,
  resolveCountryKoFromOddsLeague,
} from './country-ko-resolve';

function toPublicMediaUrl(u: string | null | undefined): string | null {
  if (u == null) return null;
  const t = String(u).trim();
  if (!t) return null;
  return resolvePublicMediaUrl(t);
}

/** `run()` 스캔용 raw — `mapping` + ko↔en 짝 로케일(팀명 교차 조회) */
type RawMatchWithMapping = Prisma.CrawlerRawMatchGetPayload<{
  include: {
    mapping: true;
    pairedRawMatch: {
      select: {
        sourceSportSlug: true;
        sourceLocale: true;
        rawHomeName: true;
        rawAwayName: true;
      };
    };
  };
}>;

/**
 * livesport raw 경기 ↔ odds-api.io 이벤트 매칭.
 *
 * 엄격(strict) 규칙 (기본):
 *   1) raw.rawLeagueSlug 가 CrawlerLeagueMapping(status=confirmed) 로 providerLeagueSlug 로 해결.
 *   2) raw 팀명이 CrawlerTeamMapping(status=confirmed) 로 providerTeamExternalId 로 해결.
 *   3) 최신 카탈로그에서 sport/leagueSlug/homeId/awayId 완전 일치 후보.
 *   4) 후보 1건, kickoff(UTC) ±90분 이내 → status='auto', matchedVia='strict', matchScore=1.0.
 *
 *   2′) **한쪽 팀만** HQ 확정(+externalId)된 경우: 동일 리그에서 해당 id 가 홈/원정 중 한쪽에만
 *   들어가는 카탈로그 행을 모은 뒤, **반대편 팀 표기 ↔ raw 상대 팀명** 퍼지 비율이 기준 이상이고
 *   1위·2위 점수 차가 충분할 때만 `matchedVia='strict-single-team'` 으로 자동 확정.
 *
 * 느슨(loose) 모드: `CRAWLER_MATCHER_LOOSE=1` 일 때 HQ 리그/팀 확정 없이,
 * 종목(sport) 안에서 리그 slug 버킷을 퍼지로 좁힌 뒤 팀명·리그·킥오프로 점수화해 자동/대기 처리.
 * 자동 기준·간격은 `CRAWLER_MATCHER_LOOSE_AUTO_MIN`(기본 76), `CRAWLER_MATCHER_LOOSE_GAP`(기본 6).
 */

export interface RunMatcherResult {
  scanned: number;
  auto: number;
  pending: number;
  unchanged: number;
  error: number;
  durationMs: number;
  reasonBreakdown: Record<string, number>;
}

type CatalogEvent = {
  id: string;
  sport: string;
  leagueSlug: string | null;
  homeId: number | null;
  awayId: number | null;
  home: string | null;
  away: string | null;
  date: string | null;
  status: string | null;
};

/** listMappings 응답에 붙이는 로고 패치 필드. */
type MatchLogoPatch = {
  sourceHomeLogo: string | null;
  sourceAwayLogo: string | null;
  sourceHomeConfirmed: boolean;
  sourceAwayConfirmed: boolean;
  sourceLeagueLogo: string | null;
  sourceCountryFlag: string | null;
  providerHomeLogo: string | null;
  providerAwayLogo: string | null;
  providerHomeKoreanName: string | null;
  providerAwayKoreanName: string | null;
  /** OddsApiLeagueAlias.country 원문(odds-api 카탈로그·HQ 보강) */
  oddsLeagueAliasCountry: string | null;
  /** (sport, leagueSlug) → alias + slug 맵 기반 한글 국가 힌트 — 크롤 raw 보조 */
  providerCountryKo: string | null;
  /** aiscore ko↔en 등: 매칭 raw 의 짝 로케일 한 줄 (HQ 한글 표시용) */
  pairedLocaleRaw: {
    sourceLocale: string;
    rawHomeName: string | null;
    rawAwayName: string | null;
    rawLeagueLabel: string | null;
    rawCountryLabel: string | null;
  } | null;
  /**
   * 솔루션 리그 헤더용: alias 한글 → 짝 로케일 리그명 → 현재 raw 리그명 → 크롤 리그 매핑 라벨 순.
   * (providerOddsPreview.league.name 이 영문·슬러그여도 한글 우선 노출)
   */
  displayLeagueName: string | null;
};

type ConfirmedLeague = {
  id: string;
  sourceSite: string;
  sourceSportSlug: string;
  sourceLeagueSlug: string;
  internalSportSlug: string | null;
  providerName: string | null;
  providerSportSlug: string | null;
  providerLeagueSlug: string | null;
};

type ConfirmedTeam = {
  id: string;
  sourceSite: string;
  sourceSportSlug: string;
  sourceTeamName: string;
  internalSportSlug: string | null;
  providerName: string | null;
  providerSportSlug: string | null;
  providerTeamExternalId: string | null;
  providerTeamName: string | null;
};

@Injectable()
export class CrawlerMatcherService {
  private readonly logger = new Logger(CrawlerMatcherService.name);
  /** kickoff 허용 오차 (초) */
  private readonly KICKOFF_TOLERANCE_SEC = 90 * 60;
  /** strict 한쪽 팀만 HQ 확정: 상대 팀명 vs 카탈로그 상대 표기 fuzzball ratio 하한 (0~100) */
  private static readonly SINGLE_TEAM_MIN_OPPOSITE_RATIO = 72;
  /** 1위·2위 동점에 가까우면 자동 확정하지 않음 */
  private static readonly SINGLE_TEAM_SCORE_GAP = 5;
  /** 최신 Catalog 를 읽어올 때 platform 당 소비할 최대 스냅샷 수 */
  private readonly CATALOG_FRESHNESS_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlerMappings: CrawlerMappingsService,
    private readonly oddsSnapshots: OddsApiSnapshotService,
  ) {}

  /** `CRAWLER_MATCHER_LOOSE=1|true|yes` 이면 strict 대신 loose 경로 */
  private isLooseMatcherMode(): boolean {
    const v = (process.env.CRAWLER_MATCHER_LOOSE ?? '').trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  private looseAutoMinScore(): number {
    const v = Number.parseInt(
      process.env.CRAWLER_MATCHER_LOOSE_AUTO_MIN ?? '76',
      10,
    );
    return Number.isFinite(v) ? Math.max(55, Math.min(95, v)) : 76;
  }

  private looseSecondPlaceGap(): number {
    const v = Number.parseInt(process.env.CRAWLER_MATCHER_LOOSE_GAP ?? '6', 10);
    return Number.isFinite(v) ? Math.max(1, Math.min(30, v)) : 6;
  }

  /** 카탈로그에 행이 있는 sport 슬러그를 internal → provider → source 순으로 고른다. */
  private resolveSportSlugForCatalog(
    raw: RawMatchWithMapping,
    eventsBySport: Map<string, CatalogEvent[]>,
  ): string | null {
    const tries = [
      raw.internalSportSlug,
      raw.providerSportSlug,
      raw.sourceSportSlug,
    ]
      .map((s) => String(s ?? '').trim())
      .filter(Boolean);
    for (const slug of tries) {
      if ((eventsBySport.get(slug)?.length ?? 0) > 0) return slug;
    }
    return tries[0] ?? null;
  }

  /**
   * strict 팀 조회: 현재 raw 홈/원정명으로 먼저 찾고, 없으면 `pairedRawMatch`(다른 로케일)의
   * 같은 홈/원정 슬롯 이름으로 재시도 — aiscore 축구처럼 en raw만 매핑되어도 HQ 가 한글 팀만
   * 확정해 둔 경우에 대응.
   */
  private lookupConfirmedTeam(
    raw: RawMatchWithMapping,
    side: 'home' | 'away',
    teamIdx: Map<string, ConfirmedTeam>,
  ): ConfirmedTeam | undefined {
    const site = raw.sourceSite;
    const sport = (raw.sourceSportSlug || '').trim();
    const primary =
      side === 'home'
        ? (raw.rawHomeName || '').trim()
        : (raw.rawAwayName || '').trim();
    if (!primary) return undefined;

    const tryKey = (name: string, sportSlug: string) => {
      const s = sportSlug.trim();
      const n = name.trim();
      if (!s || !n) return undefined;
      return teamIdx.get(`${site}::${s}::${n}`);
    };

    let t = tryKey(primary, sport);
    if (t) return t;

    const pr = raw.pairedRawMatch;
    if (!pr) return undefined;

    const altName =
      side === 'home'
        ? (pr.rawHomeName || '').trim()
        : (pr.rawAwayName || '').trim();
    const altSport = (pr.sourceSportSlug || '').trim() || sport;

    if (altName && altName !== primary) {
      t = tryKey(altName, altSport);
      if (t) return t;
      if (altSport !== sport) {
        t = tryKey(altName, sport);
        if (t) return t;
      }
    }
    return undefined;
  }

  async run(options?: {
    sourceSite?: string;
    limit?: number;
    onlyStatuses?: Array<'pending' | 'rejected' | 'auto' | 'confirmed' | 'ignored'>;
    /** 후보 JSON 없는 건만(주기·기동 선작업) */
    onlyWithoutStoredCandidates?: boolean;
  }): Promise<RunMatcherResult> {
    const t0 = Date.now();
    const limit = Math.max(1, Math.min(5000, options?.limit ?? 2000));
    const sourceSite = options?.sourceSite?.trim() || undefined;
    const onlyStatuses = options?.onlyStatuses ?? ['pending'];
    const onlyUnhinted = options?.onlyWithoutStoredCandidates === true;

    try {
      const { upserted } =
        await this.crawlerMappings.backfillOrphanCrawlerMatchMappings({
          sourceSite,
          limit,
        });
      if (upserted > 0) {
        this.logger.log(
          `[matcher] backfilled ${upserted} CrawlerMatchMapping rows for raw without mapping`,
        );
      }
    } catch (e) {
      this.logger.warn(
        `[matcher] orphan mapping backfill skipped: ${e instanceof Error ? e.message : e}`,
      );
    }

    // 1) 매처가 볼 raw 경기
    const where: Record<string, unknown> = {};
    if (sourceSite) where.sourceSite = sourceSite;
    if (onlyUnhinted) {
      /**
       * Prisma 는 nullable JSON 필드를 리터럴 `null` 로 필터할 수 없다.
       * `candidatesJson: { equals: Prisma.DbNull }` 로 명시해 준다.
       * (리터럴 null 은 "Argument candidatesJson is missing" 예외로 매처 전체가 stuck 됐음.)
       */
      where.OR = [
        { mapping: { is: null } },
        {
          mapping: {
            is: {
              status: { in: onlyStatuses },
              candidatesJson: { equals: Prisma.DbNull },
            },
          },
        },
      ];
      this.logger.log(
        `[matcher] scan mode=onlyWithoutStoredCandidates statuses=${onlyStatuses.join(',')}`,
      );
    } else {
      where.OR = [
        { mapping: { is: null } },
        { mapping: { is: { status: { in: onlyStatuses } } } },
      ];
    }
    const rawMatches = await this.prisma.crawlerRawMatch.findMany({
      where,
      orderBy: [{ lastSeenAt: 'desc' }],
      take: limit,
      include: {
        mapping: true,
        pairedRawMatch: {
          select: {
            sourceSportSlug: true,
            sourceLocale: true,
            rawHomeName: true,
            rawAwayName: true,
          },
        },
      },
    });

    // 2) 확정된 리그/팀 인덱스 로드
    const confirmedLeagues = await this.loadConfirmedLeagues(sourceSite);
    const confirmedTeams = await this.loadConfirmedTeams(sourceSite);
    const leagueIdx = new Map<string, ConfirmedLeague>();
    for (const l of confirmedLeagues) {
      leagueIdx.set(`${l.sourceSite}::${l.sourceLeagueSlug}`, l);
    }
    const teamIdx = new Map<string, ConfirmedTeam>();
    for (const t of confirmedTeams) {
      teamIdx.set(`${t.sourceSite}::${t.sourceSportSlug}::${t.sourceTeamName}`, t);
    }

    // 3) 최신 catalog events 모으기
    const { eventsBySport, totalEvents } = await this.loadLiveEvents();
    const teamNamePairs = await this.loadConfirmedTeamNamePairs(sourceSite);
    this.logger.log(
      `[matcher] loaded ${totalEvents} live events across ${eventsBySport.size} sports, confirmed: leagues=${confirmedLeagues.length} teams=${confirmedTeams.length} teamNamePairs=${teamNamePairs.length}${this.isLooseMatcherMode() ? ' mode=loose(CRAWLER_MATCHER_LOOSE)' : ''}`,
    );

    const reasonBreakdown: Record<string, number> = {};
    const bump = (key: string) => {
      reasonBreakdown[key] = (reasonBreakdown[key] ?? 0) + 1;
    };

    let auto = 0;
    let pending = 0;
    let unchanged = 0;
    let error = 0;

    for (const raw of rawMatches) {
      try {
        const result = await this.matchOne(
          raw,
          leagueIdx,
          teamIdx,
          eventsBySport,
          teamNamePairs,
        );
        if (result.kind === 'auto') {
          auto++;
          bump('auto');
        } else if (result.kind === 'pending') {
          pending++;
          bump(`pending:${result.reason}`);
        } else {
          unchanged++;
        }
      } catch (e) {
        error++;
        this.logger.warn(
          `[matcher] error on rawMatch id=${raw.id}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    const result: RunMatcherResult = {
      scanned: rawMatches.length,
      auto,
      pending,
      unchanged,
      error,
      durationMs: Date.now() - t0,
      reasonBreakdown,
    };
    this.logger.log(
      `[matcher] done scanned=${result.scanned} auto=${auto} pending=${pending} unchanged=${unchanged} err=${error} in ${result.durationMs}ms`,
    );
    return result;
  }

  // ────────────────────────────────────────────────────────────────────

  /**
   * 이미 pending 으로 제시(reason)까지 된 건은, raw 매칭 키가 같고
   * (리그·팀 미확정 등) 이전과 같은 이유로 막혀 있으면 DB 갱신 없이 건너뛴다.
   * 리그/팀 매핑이 새로 생기면 막힘이 풀린 것이므로 다시 돈다.
   * catalog/strict 단계 이슈는 raw 가 안 바뀌면 자동 재시도하지 않는다(수동 재검·reopen).
   */
  private shouldSkipPendingRematch(
    raw: RawMatchWithMapping,
    leagueIdx: Map<string, ConfirmedLeague>,
    teamIdx: Map<string, ConfirmedTeam>,
    eventsBySport: Map<string, CatalogEvent[]>,
  ): boolean {
    const m = raw.mapping;
    if (!m || m.status !== 'pending' || !String(m.reason ?? '').trim()) {
      return false;
    }
    if (!this.sameRawMatchSnapshot(raw, m)) {
      return false;
    }
    const reasonCode = parseMatcherReasonCode(m.reason);

    // `ingest: …` 는 매처가 한 번도 돌지 않은 초기 상태 — 아래 기본 분기의 `return true`에
    // 걸리면 strict/loose 본문이 영구 스킵되어 providerExternalEventId 가 절대 안 생김.
    if (reasonCode === 'ingest') {
      return false;
    }
    if (reasonCode.startsWith('single-team-')) {
      return false;
    }

    if (this.isLooseMatcherMode()) {
      const strictPrereq = new Set([
        'league-not-confirmed',
        'league-missing-provider',
        'home-team-not-confirmed',
        'away-team-not-confirmed',
        'team-missing-externalId',
      ]);
      if (strictPrereq.has(reasonCode)) {
        return false;
      }
      const looseHold = new Set([
        'loose-no-candidates',
        'loose-ambiguous',
        'loose-low-score',
        'kickoff-out-of-range-loose',
      ]);
      if (looseHold.has(reasonCode)) {
        return true;
      }
    }

    /**
     * [NEW] strict 모드에서도 tryMatchByTeamPair 경로가 선결 pending 들을 통과시킬 수 있다.
     * 리그/팀 HQ 확정 없이도 매칭이 뚫리므로, 매 사이클 재시도 허용.
     * (원래는 mapping 이 추가될 때까지 건너뛰었음)
     */
    const strictPrereqReopen = new Set([
      'league-not-confirmed',
      'league-missing-provider',
      'home-team-not-confirmed',
      'away-team-not-confirmed',
      'team-missing-externalId',
      'team-name-ambiguous',
    ]);
    if (strictPrereqReopen.has(reasonCode)) {
      return false;
    }

    const rawLeagueSlug = (raw.rawLeagueSlug || '').trim();
    const rawHomeName = (raw.rawHomeName || '').trim();
    const rawAwayName = (raw.rawAwayName || '').trim();

    if (reasonCode === 'league-not-confirmed') {
      const league = leagueIdx.get(`${raw.sourceSite}::${rawLeagueSlug}`);
      return !league;
    }
    if (reasonCode === 'league-missing-provider') {
      const league = leagueIdx.get(`${raw.sourceSite}::${rawLeagueSlug}`);
      if (!league) return true;
      const ps = league.providerSportSlug || league.internalSportSlug;
      const pl = league.providerLeagueSlug;
      return !(ps && pl);
    }
    if (reasonCode === 'home-team-not-confirmed') {
      return !this.lookupConfirmedTeam(raw, 'home', teamIdx);
    }
    if (reasonCode === 'away-team-not-confirmed') {
      return !this.lookupConfirmedTeam(raw, 'away', teamIdx);
    }
    if (reasonCode === 'team-missing-externalId') {
      const home = this.lookupConfirmedTeam(raw, 'home', teamIdx);
      const away = this.lookupConfirmedTeam(raw, 'away', teamIdx);
      const stillBroken =
        !home?.providerTeamExternalId || !away?.providerTeamExternalId;
      return stillBroken;
    }
    if (reasonCode === 'missing-raw-fields') {
      return !(rawLeagueSlug && rawHomeName && rawAwayName);
    }
    if (reasonCode === 'no-events-for-sport') {
      const slug = parseSportSlugFromNoEventsReason(m.reason);
      if (slug && (eventsBySport.get(slug)?.length ?? 0) > 0) {
        return false;
      }
    }
    // catalog/strict/kickoff/다중후보 등: 제시만 유지, raw 키 동일하면 자동 재작업 안 함
    return true;
  }

  private sameRawMatchSnapshot(
    raw: RawMatchWithMapping,
    m: NonNullable<RawMatchWithMapping['mapping']>,
  ): boolean {
    const kick = (d: Date | null | undefined) =>
      d == null ? null : d.getTime();
    return (
      (raw.rawLeagueSlug ?? '').trim() === (m.rawLeagueSlug ?? '').trim() &&
      (raw.rawHomeName ?? '').trim() === (m.rawHomeName ?? '').trim() &&
      (raw.rawAwayName ?? '').trim() === (m.rawAwayName ?? '').trim() &&
      raw.sourceSportSlug === m.sourceSportSlug &&
      (raw.internalSportSlug ?? null) === (m.internalSportSlug ?? null) &&
      kick(raw.rawKickoffUtc) === kick(m.rawKickoffUtc)
    );
  }

  private oppositeNameFuzzScore(
    a: string,
    b: string | null | undefined,
  ): number {
    const x = normalizeTeamName(a);
    const y = normalizeTeamName(String(b ?? ''));
    if (!x || !y) return 0;
    return Math.round(ratio(x, y));
  }

  /**
   * `providerTeamExternalId` 가 raw 한쪽에만 있을 때, 리그+팀 id+상대 팀명으로 카탈로그 1건을 고른다.
   */
  private async tryStrictSingleConfirmedTeam(
    raw: RawMatchWithMapping,
    league: ConfirmedLeague,
    providerSportSlug: string,
    providerLeagueSlug: string,
    sportEvents: CatalogEvent[],
    homeTeam: ConfirmedTeam | undefined,
    awayTeam: ConfirmedTeam | undefined,
    homeExt: string | null,
    awayExt: string | null,
  ): Promise<
    { kind: 'auto' } | { kind: 'pending'; reason: string } | { kind: 'noop' }
  > {
    const he = homeExt?.trim() || null;
    const ae = awayExt?.trim() || null;
    const hasHome = !!he;
    const hasAway = !!ae;
    if (hasHome === hasAway) return { kind: 'noop' };

    const knownExt = (he && !ae ? he : ae) as string;
    const knownOnRawHome = !!(he && !ae);
    const rawOpposite = (
      knownOnRawHome ? raw.rawAwayName : raw.rawHomeName
    )?.trim();
    if (!rawOpposite) {
      return this.persistPending(raw, 'single-team-missing-opposite-name', {
        reason: '한쪽 팀만 HQ 확정인데 상대 팀 raw 명이 비어 있음',
      });
    }

    const pool = sportEvents.filter(
      (ev) =>
        (ev.leagueSlug ?? '') === providerLeagueSlug &&
        ev.homeId != null &&
        ev.awayId != null &&
        (String(ev.homeId) === knownExt || String(ev.awayId) === knownExt),
    );
    if (pool.length === 0) {
      return this.persistPending(raw, 'single-team-no-catalog', {
        reason: `league=${providerLeagueSlug} 에서 teamId=${knownExt} 후보 없음`,
      });
    }

    const rawKickoff = raw.rawKickoffUtc;
    const scored: Array<{
      ev: CatalogEvent;
      fuzz: number;
      deltaSec: number | null;
    }> = [];
    for (const ev of pool) {
      const opp =
        String(ev.homeId) === knownExt
          ? ev.away
          : String(ev.awayId) === knownExt
            ? ev.home
            : null;
      const fuzz = this.oppositeNameFuzzScore(rawOpposite, opp);
      let deltaSec: number | null = null;
      const evKick = ev.date ? new Date(ev.date) : null;
      if (rawKickoff && evKick && !Number.isNaN(evKick.getTime())) {
        deltaSec = Math.round(
          Math.abs(rawKickoff.getTime() - evKick.getTime()) / 1000,
        );
        if (deltaSec > this.KICKOFF_TOLERANCE_SEC) continue;
      }
      scored.push({ ev, fuzz, deltaSec });
    }

    if (scored.length === 0) {
      return this.persistPending(raw, 'single-team-kickoff-out-of-range', {
        reason: `teamId=${knownExt} 후보는 있으나 kickoff(±${this.KICKOFF_TOLERANCE_SEC}s) 밖`,
        candidates: pool.slice(0, 12),
      });
    }

    scored.sort((a, b) => {
      if (b.fuzz !== a.fuzz) return b.fuzz - a.fuzz;
      const ad = a.deltaSec ?? Number.MAX_SAFE_INTEGER;
      const bd = b.deltaSec ?? Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

    const best = scored[0];
    const second = scored[1];
    const minR = CrawlerMatcherService.SINGLE_TEAM_MIN_OPPOSITE_RATIO;
    const gap = CrawlerMatcherService.SINGLE_TEAM_SCORE_GAP;
    if (best.fuzz < minR) {
      return this.persistPending(raw, 'single-team-opposite-low-score', {
        reason: `상대 팀명 유사도 ${best.fuzz} < ${minR}`,
        candidates: scored.slice(0, 15).map((s) => s.ev),
      });
    }
    if (second && best.fuzz - second.fuzz < gap) {
      return this.persistPending(raw, 'single-team-ambiguous', {
        reason: `상대 팀명 1위 ${best.fuzz} vs 2위 ${second.fuzz} (간격 < ${gap})`,
        candidates: scored.slice(0, 15).map((s) => s.ev),
      });
    }

    const ev = best.ev;
    const evKick = ev.date ? new Date(ev.date) : null;
    let deltaSec: number | null = null;
    if (rawKickoff && evKick && !Number.isNaN(evKick.getTime())) {
      deltaSec = Math.round(
        Math.abs(rawKickoff.getTime() - evKick.getTime()) / 1000,
      );
    }

    await this.persistAuto(raw, {
      league,
      homeTeam: knownOnRawHome ? (homeTeam ?? null) : null,
      awayTeam: knownOnRawHome ? null : (awayTeam ?? null),
      providerSportSlug,
      providerLeagueSlug,
      event: ev,
      kickoffDeltaSec: deltaSec,
      matchScore: Math.min(0.99, Math.max(0.5, best.fuzz / 100)),
      matchedVia: 'strict-single-team',
    });
    return { kind: 'auto' };
  }

  private async matchOne(
    raw: RawMatchWithMapping,
    leagueIdx: Map<string, ConfirmedLeague>,
    teamIdx: Map<string, ConfirmedTeam>,
    eventsBySport: Map<string, CatalogEvent[]>,
    teamNamePairs: ConfirmedTeamNamePair[],
  ): Promise<
    | { kind: 'auto' }
    | { kind: 'pending'; reason: string; note?: string }
    | { kind: 'unchanged' }
  > {
    if (this.shouldSkipPendingRematch(raw, leagueIdx, teamIdx, eventsBySport)) {
      return { kind: 'unchanged' };
    }

    if (this.isLooseMatcherMode()) {
      return this.matchOneLoose(raw, eventsBySport, teamNamePairs);
    }

    const rawLeagueSlug = raw.rawLeagueSlug || '';
    const rawHomeName = (raw.rawHomeName || '').trim();
    const rawAwayName = (raw.rawAwayName || '').trim();

    if (!rawLeagueSlug || !rawHomeName || !rawAwayName) {
      return this.persistPending(raw, 'missing-raw-fields', {
        reason: '리그/팀 raw 값이 누락',
      });
    }

    /**
     * [NEW] 팀 페어 이름 직접 매칭 경로.
     *
     * HQ 가 아직 리그/팀 매핑을 확정하지 않았어도,
     *  - (rawHomeName, rawAwayName) 또는 pairedRawMatch(ko↔en 짝)의 이름을
     *  - 최신 catalog 이벤트의 (home, away) 와 normalize 해 exact 일치시키고
     *  - kickoff ±tolerance 내에서 유일(또는 delta 로 확연히 선명) 하면
     * `CrawlerLeagueMapping`/`CrawlerTeamMapping` 을 즉시 auto-confirmed 로 upsert 하고
     * `CrawlerMatchMapping` 을 strict-team-name 으로 auto 확정한다.
     * 짝(pairedRawMatch) 쪽에도 동일 eventId 로 전파해 배당 경로가 한 번에 뚫리게 한다.
     */
    const byTeamName = await this.tryMatchByTeamPair(
      raw,
      eventsBySport,
      leagueIdx,
      teamIdx,
    );
    if (byTeamName.kind === 'auto') return byTeamName;
    if (byTeamName.kind === 'pending') return byTeamName;

    const league = leagueIdx.get(`${raw.sourceSite}::${rawLeagueSlug}`);
    if (!league) {
      return this.persistPending(raw, 'league-not-confirmed', {
        reason: `리그 "${rawLeagueSlug}" 미확정`,
      });
    }
    const providerSportSlug =
      league.providerSportSlug || league.internalSportSlug || raw.internalSportSlug;
    const providerLeagueSlug = league.providerLeagueSlug;
    if (!providerSportSlug || !providerLeagueSlug) {
      return this.persistPending(raw, 'league-missing-provider', {
        reason: `리그 매핑에 provider slug 없음`,
      });
    }

    const homeTeam = this.lookupConfirmedTeam(raw, 'home', teamIdx);
    const awayTeam = this.lookupConfirmedTeam(raw, 'away', teamIdx);
    const homeExternalId =
      homeTeam?.providerTeamExternalId?.trim() || null;
    const awayExternalId =
      awayTeam?.providerTeamExternalId?.trim() || null;

    const sportEvents = eventsBySport.get(providerSportSlug) ?? [];
    if (sportEvents.length === 0) {
      return this.persistPending(raw, 'no-events-for-sport', {
        reason: `odds-api.io 이벤트 풀에 sport=${providerSportSlug} 없음`,
      });
    }

    if (homeExternalId && awayExternalId) {
      // strict filter (양쪽 팀 id HQ 확정)
      const candidates = sportEvents.filter(
        (ev) =>
          (ev.leagueSlug ?? '') === providerLeagueSlug &&
          ev.homeId !== null &&
          String(ev.homeId) === homeExternalId &&
          ev.awayId !== null &&
          String(ev.awayId) === awayExternalId,
      );

      if (candidates.length === 0) {
        const reversed = sportEvents.filter(
          (ev) =>
            (ev.leagueSlug ?? '') === providerLeagueSlug &&
            ev.homeId !== null &&
            String(ev.homeId) === awayExternalId &&
            ev.awayId !== null &&
            String(ev.awayId) === homeExternalId,
        );
        if (reversed.length > 0) {
          return this.persistPending(raw, 'teams-reversed', {
            reason: '홈/원정이 뒤집혀 있음 (수동 검수 필요)',
            candidates: reversed,
          });
        }
        return this.persistPending(raw, 'no-strict-event-match', {
          reason: '동일 sport/leagueSlug/homeId/awayId 이벤트 없음',
        });
      }

      if (candidates.length > 1) {
        return this.persistPending(raw, 'multiple-strict-matches', {
          reason: `strict 후보가 ${candidates.length}개`,
          candidates,
        });
      }

      const ev = candidates[0];
      const rawKickoff = raw.rawKickoffUtc;
      const evKickoff = ev.date ? new Date(ev.date) : null;
      let deltaSec: number | null = null;
      if (rawKickoff && evKickoff && !Number.isNaN(evKickoff.getTime())) {
        deltaSec = Math.round(
          Math.abs(rawKickoff.getTime() - evKickoff.getTime()) / 1000,
        );
      }

      if (
        rawKickoff !== null &&
        deltaSec !== null &&
        deltaSec > this.KICKOFF_TOLERANCE_SEC
      ) {
        return this.persistPending(raw, 'kickoff-out-of-range', {
          reason: `kickoff 차이 ${deltaSec}s (허용 ${this.KICKOFF_TOLERANCE_SEC}s)`,
          candidates: [ev],
        });
      }

      await this.persistAuto(raw, {
        league,
        homeTeam: homeTeam ?? null,
        awayTeam: awayTeam ?? null,
        providerSportSlug,
        providerLeagueSlug,
        event: ev,
        kickoffDeltaSec: deltaSec,
      });
      return { kind: 'auto' };
    }

    const single = await this.tryStrictSingleConfirmedTeam(
      raw,
      league,
      providerSportSlug,
      providerLeagueSlug,
      sportEvents,
      homeTeam,
      awayTeam,
      homeExternalId,
      awayExternalId,
    );
    if (single.kind === 'auto') return single;
    if (single.kind === 'pending') return single;

    if (!homeTeam) {
      return this.persistPending(raw, 'home-team-not-confirmed', {
        reason: `홈 팀 "${rawHomeName}" 미확정`,
      });
    }
    if (!awayTeam) {
      return this.persistPending(raw, 'away-team-not-confirmed', {
        reason: `원정 팀 "${rawAwayName}" 미확정`,
      });
    }
    return this.persistPending(raw, 'team-missing-externalId', {
      reason: '팀 매핑에 providerTeamExternalId 누락',
    });
  }

  /**
   * HQ 리그/팀 확정 없이 sport → 리그 slug 버킷(퍼지) → 팀명·킥오프 점수로 매칭.
   */
  private async matchOneLoose(
    raw: RawMatchWithMapping,
    eventsBySport: Map<string, CatalogEvent[]>,
    teamNamePairs: ConfirmedTeamNamePair[],
  ): Promise<
    | { kind: 'auto' }
    | { kind: 'pending'; reason: string }
    | { kind: 'unchanged' }
  > {
    const rawHomeName = (raw.rawHomeName || '').trim();
    const rawAwayName = (raw.rawAwayName || '').trim();
    if (!rawHomeName || !rawAwayName) {
      return this.persistPending(raw, 'missing-raw-fields', {
        reason: '팀 raw 값이 누락 (loose)',
      });
    }

    const sportSlug = this.resolveSportSlugForCatalog(raw, eventsBySport);
    const sportEvents = sportSlug ? (eventsBySport.get(sportSlug) ?? []) : [];
    if (!sportSlug || sportEvents.length === 0) {
      return this.persistPending(raw, 'no-events-for-sport', {
        reason: `odds-api.io 이벤트 풀에 sport=${sportSlug ?? '(슬러그 없음)'} 없음`,
      });
    }

    const narrowed = selectEventsInLooseLeagueBuckets(
      sportEvents,
      raw.rawLeagueLabel ?? null,
      raw.rawLeagueSlug ?? null,
    ) as CatalogEvent[];

    const scored: Array<{ row: LooseCatalogScoreRow; ev: CatalogEvent }> = [];
    for (const ev of narrowed) {
      const row = scoreCatalogAgainstRawLoose(
        {
          rawLeagueLabel: raw.rawLeagueLabel ?? null,
          rawLeagueSlug: raw.rawLeagueSlug ?? null,
          rawHomeName,
          rawAwayName,
          rawKickoffUtc: raw.rawKickoffUtc,
        },
        ev,
        {
          confirmedPairs: teamNamePairs,
          kickoffToleranceSec: this.KICKOFF_TOLERANCE_SEC,
          maxKickoffDisqualifySec: 6 * 3600,
        },
      );
      if (row) scored.push({ row, ev });
    }

    scored.sort((a, b) => {
      if (b.row.score !== a.row.score) return b.row.score - a.row.score;
      return a.ev.id.localeCompare(b.ev.id);
    });

    const toJsonCandidates = (
      slice: Array<{ row: LooseCatalogScoreRow; ev: CatalogEvent }>,
    ): CatalogEvent[] =>
      slice.map(({ row, ev }) => ({
        ...ev,
        looseScore: row.score,
      })) as unknown as CatalogEvent[];

    if (scored.length === 0) {
      return this.persistPending(raw, 'loose-no-candidates', {
        reason:
          '리그 버킷 내 점수 후보 없음(킥오프 6시간 초과 제외 등)',
      });
    }

    const best = scored[0];
    const second = scored[1];
    const autoMin = this.looseAutoMinScore();
    const gapMin = this.looseSecondPlaceGap();

    const rawKickoff = raw.rawKickoffUtc;
    const evKickoff = best.ev.date ? new Date(best.ev.date) : null;
    let kickDelta: number | null = null;
    if (rawKickoff && evKickoff && !Number.isNaN(evKickoff.getTime())) {
      kickDelta = Math.round(
        Math.abs(rawKickoff.getTime() - evKickoff.getTime()) / 1000,
      );
    }

    const canAutoScore =
      best.row.score >= autoMin &&
      (!second || best.row.score - second.row.score >= gapMin);

    if (canAutoScore) {
      if (
        rawKickoff !== null &&
        kickDelta !== null &&
        kickDelta > this.KICKOFF_TOLERANCE_SEC
      ) {
        return this.persistPending(raw, 'kickoff-out-of-range-loose', {
          reason: `loose 점수=${best.row.score} kickoff 차이 ${kickDelta}s (허용 ${this.KICKOFF_TOLERANCE_SEC}s)`,
          candidates: toJsonCandidates(scored.slice(0, 15)),
        });
      }

      await this.persistAutoLoose(raw, {
        providerSportSlug: sportSlug,
        event: best.ev,
        kickoffDeltaSec: kickDelta,
        matchScore: best.row.score / 100,
      });
      return { kind: 'auto' };
    }

    if (best.row.score < 52) {
      return this.persistPending(raw, 'loose-no-candidates', {
        reason: `최고 점수 ${best.row.score} (최소 제시 52 미만)`,
        candidates: toJsonCandidates(scored.slice(0, 15)),
      });
    }

    if (best.row.score < autoMin) {
      return this.persistPending(raw, 'loose-low-score', {
        reason: `최고 ${best.row.score} < 자동 기준 ${autoMin}`,
        candidates: toJsonCandidates(scored.slice(0, 15)),
      });
    }

    return this.persistPending(raw, 'loose-ambiguous', {
      reason: `1위 ${best.row.score} vs 2위 ${second?.row.score ?? '-'} (간격 ${gapMin} 미만)`,
      candidates: toJsonCandidates(scored.slice(0, 15)),
    });
  }

  private async persistAutoLoose(
    raw: {
      id: string;
      sourceSite: string;
      sourceSportSlug: string;
      internalSportSlug: string | null;
      rawLeagueSlug: string | null;
      rawHomeName: string | null;
      rawAwayName: string | null;
      rawKickoffUtc: Date | null;
    },
    args: {
      providerSportSlug: string;
      event: CatalogEvent;
      kickoffDeltaSec: number | null;
      matchScore: number;
    },
  ) {
    const ev = args.event;
    const pls = (ev.leagueSlug ?? '').trim() || null;
    await this.prisma.crawlerMatchMapping.upsert({
      where: { rawMatchId: raw.id },
      create: {
        rawMatchId: raw.id,
        sourceSite: raw.sourceSite,
        sourceSportSlug: raw.sourceSportSlug,
        internalSportSlug: raw.internalSportSlug,
        rawLeagueSlug: raw.rawLeagueSlug,
        rawHomeName: raw.rawHomeName,
        rawAwayName: raw.rawAwayName,
        rawKickoffUtc: raw.rawKickoffUtc,
        leagueMappingId: null,
        homeTeamMappingId: null,
        awayTeamMappingId: null,
        providerName: 'odds-api.io',
        providerSportSlug: args.providerSportSlug,
        providerLeagueSlug: pls,
        providerExternalEventId: ev.id,
        providerHomeExternalId:
          ev.homeId != null ? String(ev.homeId) : null,
        providerAwayExternalId:
          ev.awayId != null ? String(ev.awayId) : null,
        providerHomeName: ev.home ?? null,
        providerAwayName: ev.away ?? null,
        providerKickoffUtc: ev.date ? new Date(ev.date) : null,
        kickoffDeltaSeconds: args.kickoffDeltaSec,
        status: 'auto',
        matchedVia: 'loose',
        matchScore: args.matchScore,
        reason: null,
        candidatesJson: Prisma.JsonNull,
        matchedAt: new Date(),
      },
      update: {
        leagueMappingId: null,
        homeTeamMappingId: null,
        awayTeamMappingId: null,
        providerName: 'odds-api.io',
        providerSportSlug: args.providerSportSlug,
        providerLeagueSlug: pls,
        providerExternalEventId: ev.id,
        providerHomeExternalId:
          ev.homeId != null ? String(ev.homeId) : null,
        providerAwayExternalId:
          ev.awayId != null ? String(ev.awayId) : null,
        providerHomeName: ev.home ?? null,
        providerAwayName: ev.away ?? null,
        providerKickoffUtc: ev.date ? new Date(ev.date) : null,
        kickoffDeltaSeconds: args.kickoffDeltaSec,
        status: 'auto',
        matchedVia: 'loose',
        matchScore: args.matchScore,
        reason: null,
        candidatesJson: Prisma.JsonNull,
        matchedAt: new Date(),
      },
    });
  }

  private async persistPending(
    raw: { id: string; sourceSite: string; sourceSportSlug: string; internalSportSlug: string | null; rawLeagueSlug: string | null; rawHomeName: string | null; rawAwayName: string | null; rawKickoffUtc: Date | null },
    reasonCode: string,
    detail: { reason: string; candidates?: CatalogEvent[] },
  ): Promise<{ kind: 'pending'; reason: string }> {
    const candidatesJsonCreate: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      detail.candidates && detail.candidates.length > 0
        ? (detail.candidates.slice(0, 20) as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    await this.prisma.crawlerMatchMapping.upsert({
      where: { rawMatchId: raw.id },
      create: {
        rawMatchId: raw.id,
        sourceSite: raw.sourceSite,
        sourceSportSlug: raw.sourceSportSlug,
        internalSportSlug: raw.internalSportSlug,
        rawLeagueSlug: raw.rawLeagueSlug,
        rawHomeName: raw.rawHomeName,
        rawAwayName: raw.rawAwayName,
        rawKickoffUtc: raw.rawKickoffUtc,
        status: 'pending',
        matchedVia: null,
        reason: `${reasonCode}: ${detail.reason}`,
        candidatesJson: candidatesJsonCreate,
      },
      update: {
        status: 'pending',
        matchedVia: null,
        reason: `${reasonCode}: ${detail.reason}`,
        candidatesJson: candidatesJsonCreate,
        // provider 결과는 비움 (이전 auto 가 다시 실패한 경우를 대비)
        providerExternalEventId: null,
        providerHomeExternalId: null,
        providerAwayExternalId: null,
        providerHomeName: null,
        providerAwayName: null,
        providerKickoffUtc: null,
        kickoffDeltaSeconds: null,
      },
    });
    return { kind: 'pending', reason: reasonCode };
  }

  private async persistAuto(
    raw: { id: string; sourceSite: string; sourceSportSlug: string; internalSportSlug: string | null; rawLeagueSlug: string | null; rawHomeName: string | null; rawAwayName: string | null; rawKickoffUtc: Date | null },
    args: {
      league: ConfirmedLeague;
      homeTeam: ConfirmedTeam | null;
      awayTeam: ConfirmedTeam | null;
      providerSportSlug: string;
      providerLeagueSlug: string;
      event: CatalogEvent;
      kickoffDeltaSec: number | null;
      /** 기본 1.0 — strict-single-team 은 상대 팀명 유사도 기반 */
      matchScore?: number;
      matchedVia?: string;
    },
  ) {
    const ev = args.event;
    const matchedVia = args.matchedVia ?? 'strict';
    const matchScore = args.matchScore ?? 1.0;
    await this.prisma.crawlerMatchMapping.upsert({
      where: { rawMatchId: raw.id },
      create: {
        rawMatchId: raw.id,
        sourceSite: raw.sourceSite,
        sourceSportSlug: raw.sourceSportSlug,
        internalSportSlug: raw.internalSportSlug,
        rawLeagueSlug: raw.rawLeagueSlug,
        rawHomeName: raw.rawHomeName,
        rawAwayName: raw.rawAwayName,
        rawKickoffUtc: raw.rawKickoffUtc,
        leagueMappingId: args.league.id,
        homeTeamMappingId: args.homeTeam?.id ?? null,
        awayTeamMappingId: args.awayTeam?.id ?? null,
        providerName: args.league.providerName ?? 'odds-api.io',
        providerSportSlug: args.providerSportSlug,
        providerLeagueSlug: args.providerLeagueSlug,
        providerExternalEventId: ev.id,
        providerHomeExternalId:
          ev.homeId != null ? String(ev.homeId) : null,
        providerAwayExternalId:
          ev.awayId != null ? String(ev.awayId) : null,
        providerHomeName:
          ev.home ?? args.homeTeam?.providerTeamName ?? null,
        providerAwayName:
          ev.away ?? args.awayTeam?.providerTeamName ?? null,
        providerKickoffUtc: ev.date ? new Date(ev.date) : null,
        kickoffDeltaSeconds: args.kickoffDeltaSec,
        status: 'auto',
        matchedVia,
        matchScore,
        reason: null,
        candidatesJson: Prisma.JsonNull,
        matchedAt: new Date(),
      },
      update: {
        leagueMappingId: args.league.id,
        homeTeamMappingId: args.homeTeam?.id ?? null,
        awayTeamMappingId: args.awayTeam?.id ?? null,
        providerName: args.league.providerName ?? 'odds-api.io',
        providerSportSlug: args.providerSportSlug,
        providerLeagueSlug: args.providerLeagueSlug,
        providerExternalEventId: ev.id,
        providerHomeExternalId:
          ev.homeId != null ? String(ev.homeId) : null,
        providerAwayExternalId:
          ev.awayId != null ? String(ev.awayId) : null,
        providerHomeName:
          ev.home ?? args.homeTeam?.providerTeamName ?? null,
        providerAwayName:
          ev.away ?? args.awayTeam?.providerTeamName ?? null,
        providerKickoffUtc: ev.date ? new Date(ev.date) : null,
        kickoffDeltaSeconds: args.kickoffDeltaSec,
        status: 'auto',
        matchedVia,
        matchScore,
        reason: null,
        candidatesJson: Prisma.JsonNull,
        matchedAt: new Date(),
      },
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // [NEW] team-name-pair 매칭 경로: HQ 확정이 없어도 팀 페어 이름이 catalog 와
  // normalize 일치하면 league/team 매핑을 즉시 auto-confirmed 로 upsert 하고
  // CrawlerMatchMapping 을 strict-team-name 으로 auto 로 확정한다.

  /** 현재 raw + pairedRawMatch 의 (home, away) 이름 후보 쌍을 모은다. */
  private collectTeamNameCandidates(
    raw: RawMatchWithMapping,
  ): Array<{ home: string; away: string }> {
    const out: Array<{ home: string; away: string }> = [];
    const h = (raw.rawHomeName ?? '').trim();
    const a = (raw.rawAwayName ?? '').trim();
    if (h && a) out.push({ home: h, away: a });
    const pr = raw.pairedRawMatch;
    if (pr) {
      const ph = (pr.rawHomeName ?? '').trim();
      const pa = (pr.rawAwayName ?? '').trim();
      if (ph && pa && (ph !== h || pa !== a)) {
        out.push({ home: ph, away: pa });
      }
    }
    return out;
  }

  private async tryMatchByTeamPair(
    raw: RawMatchWithMapping,
    eventsBySport: Map<string, CatalogEvent[]>,
    leagueIdx: Map<string, ConfirmedLeague>,
    teamIdx: Map<string, ConfirmedTeam>,
  ): Promise<
    | { kind: 'auto' }
    | { kind: 'pending'; reason: string; note?: string }
    | { kind: 'noop' }
  > {
    const pairs = this.collectTeamNameCandidates(raw);
    if (pairs.length === 0) return { kind: 'noop' };

    const sportSlug = this.resolveSportSlugForCatalog(raw, eventsBySport);
    if (!sportSlug) return { kind: 'noop' };
    const events = eventsBySport.get(sportSlug) ?? [];
    if (events.length === 0) return { kind: 'noop' };

    /**
     * 후보 페어: normalized 표현. exact 일치 우선 + 양쪽 모두 fuzzy ratio ≥ FUZZ_MIN 인 경우도 허용.
     * "Darwin Hearts" ↔ "Darwin Hearts FC" 같은 suffix/오기 차이가 normalize 후에도 남을 때를 잡는다.
     */
    const FUZZ_MIN = 90;
    const normalizedPairs: Array<{ home: string; away: string }> = [];
    const keys = new Set<string>();
    for (const p of pairs) {
      const h = normalizeTeamName(p.home);
      const a = normalizeTeamName(p.away);
      if (!h || !a) continue;
      keys.add(`${h}||${a}`);
      normalizedPairs.push({ home: h, away: a });
    }
    if (normalizedPairs.length === 0) return { kind: 'noop' };

    const rawKickoff = raw.rawKickoffUtc;
    const matched: Array<{
      ev: CatalogEvent;
      deltaSec: number | null;
      /** 이름 유사도 합산(홈+원정). exact 는 200, fuzzy 는 두 ratio 합. */
      nameScore: number;
      /** 'exact' | 'fuzzy' */
      howMatched: 'exact' | 'fuzzy';
    }> = [];
    for (const ev of events) {
      const eh = normalizeTeamName(ev.home ?? '');
      const ea = normalizeTeamName(ev.away ?? '');
      if (!eh || !ea) continue;

      let howMatched: 'exact' | 'fuzzy' | null = null;
      let nameScore = 0;
      if (keys.has(`${eh}||${ea}`)) {
        howMatched = 'exact';
        nameScore = 200;
      } else {
        let best = 0;
        for (const p of normalizedPairs) {
          const rh = ratio(p.home, eh);
          const ra = ratio(p.away, ea);
          if (rh >= FUZZ_MIN && ra >= FUZZ_MIN && rh + ra > best) {
            best = rh + ra;
          }
        }
        if (best > 0) {
          howMatched = 'fuzzy';
          nameScore = best;
        }
      }
      if (!howMatched) continue;

      let deltaSec: number | null = null;
      const evKick = ev.date ? new Date(ev.date) : null;
      if (rawKickoff && evKick && !Number.isNaN(evKick.getTime())) {
        deltaSec = Math.round(
          Math.abs(rawKickoff.getTime() - evKick.getTime()) / 1000,
        );
        if (deltaSec > this.KICKOFF_TOLERANCE_SEC) continue;
      }
      matched.push({ ev, deltaSec, nameScore, howMatched });
    }

    if (matched.length === 0) return { kind: 'noop' };

    /**
     * 우선순위: (1) exact 우선, (2) 이름 유사도 점수 desc, (3) kickoff delta asc.
     * 동률이면 ambiguous 처리해서 오확정 막는다.
     */
    matched.sort((a, b) => {
      const ae = a.howMatched === 'exact' ? 1 : 0;
      const be = b.howMatched === 'exact' ? 1 : 0;
      if (ae !== be) return be - ae;
      if (b.nameScore !== a.nameScore) return b.nameScore - a.nameScore;
      const ad = a.deltaSec ?? Number.MAX_SAFE_INTEGER;
      const bd = b.deltaSec ?? Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

    if (matched.length > 1) {
      const top = matched[0];
      const nxt = matched[1];
      const sameBucket =
        top.howMatched === nxt.howMatched &&
        top.nameScore === nxt.nameScore &&
        (top.deltaSec ?? Number.MAX_SAFE_INTEGER) ===
          (nxt.deltaSec ?? Number.MAX_SAFE_INTEGER);
      if (sameBucket) {
        return this.persistPending(raw, 'team-name-ambiguous', {
          reason: `팀 페어 이름이 같고 점수/delta 동률 ${matched.length}건`,
          candidates: matched.slice(0, 12).map((m) => m.ev),
        });
      }
    }

    const best = matched[0];
    const ev = best.ev;
    const providerLeagueSlug = (ev.leagueSlug ?? '').trim();
    if (!providerLeagueSlug) return { kind: 'noop' };

    /** 1) league mapping upsert (없으면 confirmed 로 신규, 있으면 provider slug 만 보강) */
    const leagueRow = await this.upsertAutoLeagueMapping(
      raw,
      ev,
      sportSlug,
      providerLeagueSlug,
    );
    leagueIdx.set(
      `${leagueRow.sourceSite}::${leagueRow.sourceLeagueSlug}`,
      leagueRow,
    );

    /** 2) team mapping upsert (양쪽) */
    const homeExt = ev.homeId != null ? String(ev.homeId) : null;
    const awayExt = ev.awayId != null ? String(ev.awayId) : null;
    const homeTeam = await this.upsertAutoTeamMapping(
      raw,
      ev,
      sportSlug,
      'home',
      homeExt,
    );
    const awayTeam = await this.upsertAutoTeamMapping(
      raw,
      ev,
      sportSlug,
      'away',
      awayExt,
    );
    if (homeTeam) {
      teamIdx.set(
        `${homeTeam.sourceSite}::${homeTeam.sourceSportSlug}::${homeTeam.sourceTeamName}`,
        homeTeam,
      );
    }
    if (awayTeam) {
      teamIdx.set(
        `${awayTeam.sourceSite}::${awayTeam.sourceSportSlug}::${awayTeam.sourceTeamName}`,
        awayTeam,
      );
    }

    /** 3) 현재 raw auto 저장 */
    await this.persistAuto(raw, {
      league: leagueRow,
      homeTeam,
      awayTeam,
      providerSportSlug: sportSlug,
      providerLeagueSlug,
      event: ev,
      kickoffDeltaSec: best.deltaSec,
      matchedVia: 'strict-team-name',
      matchScore:
        best.howMatched === 'exact' ? 0.98 : Math.min(0.97, best.nameScore / 200),
    });

    /** 4) 짝 로케일 raw 에도 동일 eventId 전파 (aiscore ko↔en) */
    await this.propagateAutoToPair({
      raw,
      league: leagueRow,
      event: ev,
      providerSportSlug: sportSlug,
      providerLeagueSlug,
      kickoffDeltaSec: best.deltaSec,
    });

    return { kind: 'auto' };
  }

  /** raw.rawLeagueSlug 로 확정된 league mapping 을 만들거나(없을 때) provider slug 를 보강한다. */
  private async upsertAutoLeagueMapping(
    raw: RawMatchWithMapping,
    ev: CatalogEvent,
    providerSportSlug: string,
    providerLeagueSlug: string,
  ): Promise<ConfirmedLeague> {
    const sourceLeagueSlug =
      (raw.rawLeagueSlug ?? '').trim() || `inferred:${providerLeagueSlug}`;
    const existing = await this.prisma.crawlerLeagueMapping.findUnique({
      where: {
        sourceSite_sourceLeagueSlug: {
          sourceSite: raw.sourceSite,
          sourceLeagueSlug,
        },
      },
    });
    const baseData = {
      sourceSite: raw.sourceSite,
      sourceSportSlug: raw.sourceSportSlug,
      sourceLeagueSlug,
      sourceLeagueLabel: raw.rawLeagueLabel ?? null,
      internalSportSlug: raw.internalSportSlug ?? null,
      providerName: 'odds-api.io' as const,
      providerSportSlug,
      providerLeagueSlug,
    };
    let row;
    if (!existing) {
      row = await this.prisma.crawlerLeagueMapping.create({
        data: {
          ...baseData,
          status: 'confirmed',
          note: 'auto-confirmed by team-name match',
          confirmedAt: new Date(),
          confirmedBy: 'matcher:team-name',
        },
      });
    } else if (existing.status === 'ignored') {
      // ignored 는 건드리지 않고, 그대로 ConfirmedLeague 형태로 반환 (persistAuto 는 id 만 사용).
      row = existing;
    } else {
      row = await this.prisma.crawlerLeagueMapping.update({
        where: { id: existing.id },
        data: {
          sourceSportSlug: raw.sourceSportSlug,
          sourceLeagueLabel:
            raw.rawLeagueLabel ?? existing.sourceLeagueLabel,
          internalSportSlug:
            raw.internalSportSlug ?? existing.internalSportSlug,
          providerName: 'odds-api.io',
          providerSportSlug,
          providerLeagueSlug,
          status: existing.status === 'confirmed' ? 'confirmed' : 'confirmed',
          confirmedAt: existing.confirmedAt ?? new Date(),
          confirmedBy: existing.confirmedBy ?? 'matcher:team-name',
          lastSeenAt: new Date(),
        },
      });
    }
    return {
      id: row.id,
      sourceSite: row.sourceSite,
      sourceSportSlug: row.sourceSportSlug,
      sourceLeagueSlug: row.sourceLeagueSlug,
      internalSportSlug: row.internalSportSlug ?? null,
      providerName: row.providerName ?? 'odds-api.io',
      providerSportSlug: row.providerSportSlug ?? providerSportSlug,
      providerLeagueSlug: row.providerLeagueSlug ?? providerLeagueSlug,
    };
  }

  private async upsertAutoTeamMapping(
    raw: RawMatchWithMapping,
    ev: CatalogEvent,
    providerSportSlug: string,
    side: 'home' | 'away',
    providerTeamExternalId: string | null,
  ): Promise<ConfirmedTeam | null> {
    if (!providerTeamExternalId) return null;
    const sourceTeamName = (
      side === 'home' ? raw.rawHomeName : raw.rawAwayName
    )?.trim();
    if (!sourceTeamName) return null;
    const providerTeamName = (side === 'home' ? ev.home : ev.away) ?? null;
    const existing = await this.prisma.crawlerTeamMapping.findUnique({
      where: {
        sourceSite_sourceSportSlug_sourceTeamName: {
          sourceSite: raw.sourceSite,
          sourceSportSlug: raw.sourceSportSlug,
          sourceTeamName,
        },
      },
    });
    const baseData = {
      sourceSite: raw.sourceSite,
      sourceSportSlug: raw.sourceSportSlug,
      sourceTeamName,
      sourceLeagueSlug: raw.rawLeagueSlug ?? null,
      sourceLeagueLabel: raw.rawLeagueLabel ?? null,
      internalSportSlug: raw.internalSportSlug ?? null,
      providerName: 'odds-api.io' as const,
      providerSportSlug,
      providerTeamExternalId,
      providerTeamName,
    };
    let row;
    if (!existing) {
      row = await this.prisma.crawlerTeamMapping.create({
        data: {
          ...baseData,
          status: 'confirmed',
          note: 'auto-confirmed by team-name match',
          confirmedAt: new Date(),
          confirmedBy: 'matcher:team-name',
        },
      });
    } else if (existing.status === 'ignored') {
      return null;
    } else {
      row = await this.prisma.crawlerTeamMapping.update({
        where: { id: existing.id },
        data: {
          providerName: 'odds-api.io',
          providerSportSlug,
          providerTeamExternalId:
            existing.providerTeamExternalId ?? providerTeamExternalId,
          providerTeamName: existing.providerTeamName ?? providerTeamName,
          status: existing.status === 'confirmed' ? 'confirmed' : 'confirmed',
          confirmedAt: existing.confirmedAt ?? new Date(),
          confirmedBy: existing.confirmedBy ?? 'matcher:team-name',
          lastSeenAt: new Date(),
        },
      });
    }
    return {
      id: row.id,
      sourceSite: row.sourceSite,
      sourceSportSlug: row.sourceSportSlug,
      sourceTeamName: row.sourceTeamName,
      internalSportSlug: row.internalSportSlug ?? null,
      providerName: row.providerName ?? 'odds-api.io',
      providerSportSlug: row.providerSportSlug ?? providerSportSlug,
      providerTeamExternalId:
        row.providerTeamExternalId ?? providerTeamExternalId,
      providerTeamName: row.providerTeamName ?? providerTeamName,
    };
  }

  /** 짝 로케일 raw(ko↔en) 도 같은 providerExternalEventId 로 auto 확정한다. */
  private async propagateAutoToPair(args: {
    raw: RawMatchWithMapping;
    league: ConfirmedLeague;
    event: CatalogEvent;
    providerSportSlug: string;
    providerLeagueSlug: string;
    kickoffDeltaSec: number | null;
  }): Promise<void> {
    const pairedId = args.raw.pairedRawMatchId;
    if (!pairedId) return;
    const paired = await this.prisma.crawlerRawMatch.findUnique({
      where: { id: pairedId },
      include: { mapping: true },
    });
    if (!paired) return;
    if (
      paired.mapping &&
      (paired.mapping.status === 'auto' ||
        paired.mapping.status === 'confirmed')
    ) {
      return;
    }
    await this.persistAuto(
      {
        id: paired.id,
        sourceSite: paired.sourceSite,
        sourceSportSlug: paired.sourceSportSlug,
        internalSportSlug: paired.internalSportSlug,
        rawLeagueSlug: paired.rawLeagueSlug,
        rawHomeName: paired.rawHomeName,
        rawAwayName: paired.rawAwayName,
        rawKickoffUtc: paired.rawKickoffUtc,
      },
      {
        league: args.league,
        homeTeam: null,
        awayTeam: null,
        providerSportSlug: args.providerSportSlug,
        providerLeagueSlug: args.providerLeagueSlug,
        event: args.event,
        kickoffDeltaSec: args.kickoffDeltaSec,
        matchedVia: 'strict-team-name-paired',
        matchScore: 0.98,
      },
    );
  }

  private async loadConfirmedLeagues(
    sourceSite?: string,
  ): Promise<ConfirmedLeague[]> {
    const rows = await this.prisma.crawlerLeagueMapping.findMany({
      where: {
        status: 'confirmed',
        providerLeagueSlug: { not: null },
        ...(sourceSite ? { sourceSite } : {}),
      },
      select: {
        id: true,
        sourceSite: true,
        sourceSportSlug: true,
        sourceLeagueSlug: true,
        internalSportSlug: true,
        providerName: true,
        providerSportSlug: true,
        providerLeagueSlug: true,
      },
    });
    return rows;
  }

  private async loadConfirmedTeams(
    sourceSite?: string,
  ): Promise<ConfirmedTeam[]> {
    const rows = await this.prisma.crawlerTeamMapping.findMany({
      where: {
        status: 'confirmed',
        providerTeamExternalId: { not: null },
        ...(sourceSite ? { sourceSite } : {}),
      },
      select: {
        id: true,
        sourceSite: true,
        sourceSportSlug: true,
        sourceTeamName: true,
        internalSportSlug: true,
        providerName: true,
        providerSportSlug: true,
        providerTeamExternalId: true,
        providerTeamName: true,
      },
    });
    return rows;
  }

  /**
   * 최신 OddsApiCatalogSnapshot 들에서 live event 를 꺼내 sport 별로 인덱스.
   *
   * Phase1 에서는 각 platform 별로 가장 최근 스냅샷 1개만 봄 (최근 N 시간 이내).
   * 여러 platform 이 동일 event 를 담을 수 있으므로 event.id 로 dedupe.
   */
  private async loadLiveEvents(): Promise<{
    eventsBySport: Map<string, CatalogEvent[]>;
    totalEvents: number;
  }> {
    const since = new Date(
      Date.now() - this.CATALOG_FRESHNESS_HOURS * 3600 * 1000,
    );
    const snapshots = await this.prisma.oddsApiCatalogSnapshot.findMany({
      where: { fetchedAt: { gte: since } },
      orderBy: [{ fetchedAt: 'desc' }],
      distinct: ['platformId'],
      select: { payloadJson: true, fetchedAt: true, platformId: true },
      take: 50,
    });
    const dedupe = new Map<string, CatalogEvent>();
    for (const snap of snapshots) {
      const events = extractCatalogEvents(snap.payloadJson);
      for (const ev of events) {
        if (!ev.id) continue;
        if (!dedupe.has(ev.id)) dedupe.set(ev.id, ev);
      }
    }
    const eventsBySport = new Map<string, CatalogEvent[]>();
    for (const ev of dedupe.values()) {
      const arr = eventsBySport.get(ev.sport) ?? [];
      arr.push(ev);
      eventsBySport.set(ev.sport, arr);
    }
    return { eventsBySport, totalEvents: dedupe.size };
  }

  // ─── Admin helpers ────────────────────────────────────────────────

  async listMappings(params: {
    status?:
      | 'pending'
      | 'auto'
      | 'confirmed'
      | 'rejected'
      | 'ignored'
      | 'all'
      /** HQ UI: 자동+수동확정 한 화면에서 보기 */
      | 'matched'
      /** HQ UI: 거부+무시 등 정리함 */
      | 'misc';
    sportSlug?: string;
    leagueSlug?: string;
    sourceSite?: string;
    q?: string;
    take?: number;
    skip?: number;
    /**
     * upcoming: kickoff 가 없거나 지금 이후(실시간 매칭 작업용)
     * past: kickoff 가 과거 — 백로그·미처리 구역
     * all: 필터 없음
     */
    kickoffScope?: 'upcoming' | 'past' | 'all';
  }) {
    // AND 합성: sportSlug 와 q 가 동시에 들어와도 서로 OR 가 덮어쓰지 않도록 AND 배열에 push.
    const where: Record<string, unknown> = {};
    const andClauses: Record<string, unknown>[] = [];
    if (params.sourceSite) where.sourceSite = params.sourceSite;
    if (params.status && params.status !== 'all') {
      if (params.status === 'matched') {
        where.status = { in: ['auto', 'confirmed'] };
      } else if (params.status === 'misc') {
        where.status = { in: ['rejected', 'ignored'] };
      } else {
        where.status = params.status;
      }
    }
    if (params.sportSlug) {
      andClauses.push({
        OR: [
          { sourceSportSlug: params.sportSlug },
          { providerSportSlug: params.sportSlug },
          { internalSportSlug: params.sportSlug },
        ],
      });
    }
    if (params.leagueSlug) {
      andClauses.push({
        OR: [
          { rawLeagueSlug: params.leagueSlug },
          { providerLeagueSlug: params.leagueSlug },
        ],
      });
    }
    const q = (params.q || '').trim();
    if (q) {
      andClauses.push({
        OR: [
          { rawHomeName: { contains: q, mode: 'insensitive' } },
          { rawAwayName: { contains: q, mode: 'insensitive' } },
          { providerHomeName: { contains: q, mode: 'insensitive' } },
          { providerAwayName: { contains: q, mode: 'insensitive' } },
          { providerExternalEventId: { contains: q, mode: 'insensitive' } },
          { rawLeagueSlug: { contains: q, mode: 'insensitive' } },
          { rawLeagueLabel: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    const kickoffScope = params.kickoffScope ?? 'all';
    const now = new Date();
    if (kickoffScope === 'upcoming') {
      andClauses.push({
        OR: [{ rawKickoffUtc: null }, { rawKickoffUtc: { gte: now } }],
      });
    } else if (kickoffScope === 'past') {
      andClauses.push({
        AND: [{ rawKickoffUtc: { not: null } }, { rawKickoffUtc: { lt: now } }],
      });
    }
    if (andClauses.length > 0) where.AND = andClauses;
    const take = Math.max(1, Math.min(500, params.take ?? 100));
    const skip = Math.max(0, params.skip ?? 0);
    const [items, total] = await Promise.all([
      this.prisma.crawlerMatchMapping.findMany({
        where,
        /** HQ: 크롤/픽스처 목록과 맞추기 — kickoff → 리그 → 소스 경기 id (updatedAt 금지: 매처가 순서를 뒤섞음) */
        orderBy: [
          { rawKickoffUtc: { sort: 'asc', nulls: 'last' } },
          { rawLeagueSlug: { sort: 'asc', nulls: 'last' } },
          { rawMatch: { sourceMatchId: 'asc' } },
        ],
        take,
        skip,
        include: {
          rawMatch: {
            include: {
              pairedRawMatch: {
                select: {
                  sourceLocale: true,
                  rawHomeName: true,
                  rawAwayName: true,
                  rawLeagueLabel: true,
                  rawCountryLabel: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.crawlerMatchMapping.count({ where }),
    ]);

    const enriched = await this.enrichMappingsWithLogos(items);
    return { items: enriched, total, take, skip };
  }

  /**
   * `listMappings` + (선택) 플랫폼 odds 스냅샷 병합.
   * `oddsPayload=preview` 이면 `providerOddsPreview` 만(경량), `full` 이면 `providerOdds` 전체.
   * `omitRawMatch` 이면 응답에서 `rawMatch` 제거(공개 목록).
   */
  async listMappingOverlays(args: {
    listParams: Parameters<CrawlerMatcherService['listMappings']>[0];
    platformId: string | null;
    includeOdds: boolean;
    oddsPayload?: 'full' | 'preview';
    omitRawMatch?: boolean;
  }): Promise<
    Awaited<ReturnType<CrawlerMatcherService['listMappings']>> & {
      platformId?: string;
    }
  > {
    const list = await this.listMappings(args.listParams);
    const pid = (args.platformId || '').trim();
    const want = Boolean(pid) && args.includeOdds;
    const payload = args.oddsPayload ?? 'full';
    const strip = Boolean(args.omitRawMatch);

    type Row = (typeof list.items)[number];
    const baseItems: Row[] = strip
      ? list.items.map((row) =>
          omitRawMatchFromOverlayRow(
            row as Row & Record<string, unknown>,
          ) as unknown as Row,
        )
      : list.items;

    if (!want) {
      return { ...list, items: baseItems };
    }

    const platformOk = await this.prisma.platform.findUnique({
      where: { id: pid },
      select: { id: true },
    });
    if (!platformOk) {
      throw new BadRequestException('platformId not found');
    }
    const eventIds = new Set<string>();
    for (const row of baseItems) {
      const eid = normalizeOddsEventId(row.providerExternalEventId);
      if (eid) eventIds.add(eid);
    }
    const oddsById = await this.oddsSnapshots.lookupAggregatedMatchesByEventIds(
      pid,
      eventIds,
    );
    const merged = baseItems.map((row) => {
      const eid = normalizeOddsEventId(row.providerExternalEventId);
      const full = eid ? oddsById.get(eid) ?? null : null;
      if (payload === 'preview') {
        return {
          ...(row as Record<string, unknown>),
          providerOddsPreview: buildProviderOddsPreview(full),
        } as unknown as Row;
      }
      return {
        ...(row as Record<string, unknown>),
        providerOdds: full,
      } as unknown as Row;
    });
    return {
      ...list,
      platformId: pid,
      items: merged,
    };
  }

  /** 단일 매핑 + 전체 배당(상세 화면용) */
  async getMappingOverlayDetail(
    platformId: string,
    mappingId: string,
  ): Promise<Record<string, unknown>> {
    const id = mappingId.trim();
    if (!id) throw new BadRequestException('mappingId is required');
    const row = await this.prisma.crawlerMatchMapping.findUnique({
      where: { id },
      include: {
        rawMatch: {
          include: {
            pairedRawMatch: {
              select: {
                sourceLocale: true,
                rawHomeName: true,
                rawAwayName: true,
                rawLeagueLabel: true,
                rawCountryLabel: true,
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('매핑을 찾을 수 없습니다');
    const enriched = await this.enrichMappingsWithLogos([row]);
    const one = enriched[0] as Record<string, unknown> & {
      providerExternalEventId?: string | null;
    };
    const eid = normalizeOddsEventId(one.providerExternalEventId);
    const oddsById = await this.oddsSnapshots.lookupAggregatedMatchesByEventIds(
      platformId,
      eid ? new Set([eid]) : new Set(),
    );
    const providerOdds = eid ? oddsById.get(eid) ?? null : null;
    return {
      ...omitRawMatchFromOverlayRow(
        one as Record<string, unknown> & { rawMatch?: unknown },
      ),
      providerOdds,
    };
  }

  /**
   * 매핑 row 에 홈/원정 팀 로고, 리그 로고/국기를 붙인다.
   * 키:
   *   - source 팀 로고 : CrawlerTeamMapping.sourceTeamLogo  by (site, sport, teamName)
   *   - source 리그 로고/국기: CrawlerLeagueMapping.{sourceLeagueLogo,sourceCountryFlag} by (site, leagueSlug)
   *   - provider 팀 로고: OddsApiTeamAlias.logoUrl  by (sport, externalId)
   *
   * 목록이 크지 않아서(<=500) 집합 조회 한 번으로 처리.
   */
  private async enrichMappingsWithLogos<
    T extends {
      id: string;
      sourceSite: string;
      sourceSportSlug: string;
      rawLeagueSlug: string | null;
      rawHomeName: string | null;
      rawAwayName: string | null;
      providerSportSlug: string | null;
      internalSportSlug: string | null;
      providerLeagueSlug: string | null;
      providerHomeExternalId: string | null;
      providerAwayExternalId: string | null;
    },
  >(items: T[]) {
    if (items.length === 0) return items as Array<T & MatchLogoPatch>;

    const teamKeys = new Set<string>();
    const leagueKeys = new Set<string>();
    const providerSportByTeamKey = new Map<string, string>();
    const providerTeamKeys = new Set<string>();
    for (const m of items) {
      if (m.rawHomeName) {
        teamKeys.add(`${m.sourceSite}|${m.sourceSportSlug}|${m.rawHomeName}`);
      }
      if (m.rawAwayName) {
        teamKeys.add(`${m.sourceSite}|${m.sourceSportSlug}|${m.rawAwayName}`);
      }
      if (m.rawLeagueSlug) {
        leagueKeys.add(`${m.sourceSite}|${m.rawLeagueSlug}`);
      }
      const pSport =
        m.providerSportSlug || m.internalSportSlug || null;
      if (pSport && m.providerHomeExternalId) {
        const k = `${pSport}|${m.providerHomeExternalId}`;
        providerTeamKeys.add(k);
        providerSportByTeamKey.set(k, pSport);
      }
      if (pSport && m.providerAwayExternalId) {
        const k = `${pSport}|${m.providerAwayExternalId}`;
        providerTeamKeys.add(k);
        providerSportByTeamKey.set(k, pSport);
      }
    }

    const [teamRows, leagueRows, providerTeamRows] = await Promise.all([
      teamKeys.size > 0
        ? this.prisma.crawlerTeamMapping.findMany({
            where: {
              OR: Array.from(teamKeys).map((k) => {
                const [site, sport, name] = splitKeyThree(k);
                return {
                  sourceSite: site,
                  sourceSportSlug: sport,
                  sourceTeamName: name,
                };
              }),
            },
            select: {
              sourceSite: true,
              sourceSportSlug: true,
              sourceTeamName: true,
              sourceTeamLogo: true,
              providerTeamExternalId: true,
              providerTeamName: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      leagueKeys.size > 0
        ? this.prisma.crawlerLeagueMapping.findMany({
            where: {
              OR: Array.from(leagueKeys).map((k) => {
                const [site, leagueSlug] = splitKeyLast(k);
                return { sourceSite: site, sourceLeagueSlug: leagueSlug };
              }),
            },
            select: {
              sourceSite: true,
              sourceLeagueSlug: true,
              sourceLeagueLabel: true,
              sourceLeagueLogo: true,
              sourceCountryFlag: true,
              providerLeagueSlug: true,
              providerLeagueLabel: true,
              internalSportSlug: true,
            },
          })
        : Promise.resolve([]),
      providerTeamKeys.size > 0
        ? this.prisma.oddsApiTeamAlias.findMany({
            where: {
              OR: Array.from(providerTeamKeys).map((k) => {
                const [sport, externalId] = splitKeyLast(k);
                return { sport, externalId };
              }),
            },
            select: {
              sport: true,
              externalId: true,
              logoUrl: true,
              koreanName: true,
              originalName: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const teamMap = new Map<string, (typeof teamRows)[number]>();
    for (const t of teamRows) {
      teamMap.set(
        `${t.sourceSite}|${t.sourceSportSlug}|${t.sourceTeamName}`,
        t,
      );
    }
    const leagueMap = new Map<string, (typeof leagueRows)[number]>();
    for (const l of leagueRows) {
      leagueMap.set(`${l.sourceSite}|${l.sourceLeagueSlug}`, l);
    }

    const oddsLeagueKeys = new Set<string>();
    for (const m of items) {
      const lg = m.rawLeagueSlug
        ? leagueMap.get(`${m.sourceSite}|${m.rawLeagueSlug}`)
        : undefined;
      const sportForOdds = (
        m.internalSportSlug ||
        lg?.internalSportSlug ||
        m.providerSportSlug ||
        m.sourceSportSlug ||
        ''
      ).trim();
      const slugForOdds =
        (m.providerLeagueSlug && m.providerLeagueSlug.trim()) ||
        (lg?.providerLeagueSlug && lg.providerLeagueSlug.trim()) ||
        (m.rawLeagueSlug && m.rawLeagueSlug.trim()) ||
        '';
      if (sportForOdds && slugForOdds) {
        oddsLeagueKeys.add(`${sportForOdds}\t${slugForOdds}`);
      }
    }
    const oddsLeagueOr =
      oddsLeagueKeys.size > 0
        ? Array.from(oddsLeagueKeys).map((k) => {
            const tab = k.indexOf('\t');
            const sport = tab >= 0 ? k.slice(0, tab) : '';
            const slug = tab >= 0 ? k.slice(tab + 1) : '';
            return { sport, slug };
          })
        : [];
    const oddsLeagueRows =
      oddsLeagueOr.length > 0
        ? await this.prisma.oddsApiLeagueAlias.findMany({
            where: { OR: oddsLeagueOr },
            select: { sport: true, slug: true, country: true, koreanName: true },
          })
        : [];

    const providerTeamMap = new Map<string, (typeof providerTeamRows)[number]>();
    for (const a of providerTeamRows) {
      providerTeamMap.set(`${a.sport}|${a.externalId}`, a);
    }
    const oddsLeagueMap = new Map<string, (typeof oddsLeagueRows)[number]>();
    for (const a of oddsLeagueRows) {
      oddsLeagueMap.set(`${a.sport}\t${a.slug}`, a);
    }

    return items.map<T & MatchLogoPatch>((m) => {
      const rawWrap = m as T & {
        rawMatch?: {
          pairedRawMatch?: {
            sourceLocale: string;
            rawHomeName: string | null;
            rawAwayName: string | null;
            rawLeagueLabel: string | null;
            rawCountryLabel: string | null;
          } | null;
        } | null;
      };
      const pr = rawWrap.rawMatch?.pairedRawMatch ?? null;
      const pairedLocaleRaw = pr
        ? {
            sourceLocale: pr.sourceLocale,
            rawHomeName: pr.rawHomeName ?? null,
            rawAwayName: pr.rawAwayName ?? null,
            rawLeagueLabel: pr.rawLeagueLabel ?? null,
            rawCountryLabel: pr.rawCountryLabel ?? null,
          }
        : null;

      const homeT = m.rawHomeName
        ? teamMap.get(`${m.sourceSite}|${m.sourceSportSlug}|${m.rawHomeName}`)
        : undefined;
      const awayT = m.rawAwayName
        ? teamMap.get(`${m.sourceSite}|${m.sourceSportSlug}|${m.rawAwayName}`)
        : undefined;
      const lg = m.rawLeagueSlug
        ? leagueMap.get(`${m.sourceSite}|${m.rawLeagueSlug}`)
        : undefined;
      const pSport = m.providerSportSlug || m.internalSportSlug || null;
      const pHome =
        pSport && m.providerHomeExternalId
          ? providerTeamMap.get(`${pSport}|${m.providerHomeExternalId}`)
          : undefined;
      const pAway =
        pSport && m.providerAwayExternalId
          ? providerTeamMap.get(`${pSport}|${m.providerAwayExternalId}`)
          : undefined;
      const sportForOdds = (
        m.internalSportSlug ||
        lg?.internalSportSlug ||
        m.providerSportSlug ||
        m.sourceSportSlug ||
        ''
      ).trim();
      const slugForOdds =
        (m.providerLeagueSlug && m.providerLeagueSlug.trim()) ||
        (lg?.providerLeagueSlug && lg.providerLeagueSlug.trim()) ||
        (m.rawLeagueSlug && m.rawLeagueSlug.trim()) ||
        '';
      const oddsAlias =
        sportForOdds && slugForOdds
          ? oddsLeagueMap.get(`${sportForOdds}\t${slugForOdds}`)
          : undefined;
      const oddsCountryRaw = oddsAlias?.country ?? null;
      const providerCountryKo = resolveCountryKoFromOddsLeague(
        slugForOdds || null,
        oddsCountryRaw,
      );
      const primaryRaw = rawWrap.rawMatch as
        | {
            rawLeagueLabel?: string | null;
            pairedRawMatch?: {
              sourceLocale?: string | null;
              rawLeagueLabel?: string | null;
            } | null;
          }
        | null
        | undefined;
      const pairedLeagueLbl =
        primaryRaw?.pairedRawMatch?.rawLeagueLabel?.trim() || null;
      const primaryLeagueLbl = primaryRaw?.rawLeagueLabel?.trim() || null;
      const aliasKr = oddsAlias?.koreanName?.trim() || null;
      const lgSourceLbl = lg?.sourceLeagueLabel?.trim() || null;
      const lgProvLbl = lg?.providerLeagueLabel?.trim() || null;
      const displayLeagueName =
        aliasKr ||
        pairedLeagueLbl ||
        primaryLeagueLbl ||
        lgSourceLbl ||
        lgProvLbl ||
        null;
      return {
        ...m,
        sourceHomeLogo: toPublicMediaUrl(homeT?.sourceTeamLogo ?? null),
        sourceAwayLogo: toPublicMediaUrl(awayT?.sourceTeamLogo ?? null),
        sourceHomeConfirmed: homeT?.status === 'confirmed',
        sourceAwayConfirmed: awayT?.status === 'confirmed',
        sourceLeagueLogo: toPublicMediaUrl(lg?.sourceLeagueLogo ?? null),
        sourceCountryFlag: toPublicMediaUrl(lg?.sourceCountryFlag ?? null),
        providerHomeLogo: toPublicMediaUrl(pHome?.logoUrl ?? null),
        providerAwayLogo: toPublicMediaUrl(pAway?.logoUrl ?? null),
        providerHomeKoreanName: pHome?.koreanName ?? null,
        providerAwayKoreanName: pAway?.koreanName ?? null,
        oddsLeagueAliasCountry: oddsCountryRaw,
        providerCountryKo,
        pairedLocaleRaw,
        displayLeagueName,
      };
    });
  }

  /**
   * OddsApiTeamAlias upsert (한글명/로고/국가 수정).
   * alias 가 없으면 originalName(또는 hint) 을 기반으로 새로 생성.
   */
  async upsertProviderTeamAlias(body: {
    sport: string;
    externalId: string;
    originalName?: string | null;
    koreanName?: string | null;
    logoUrl?: string | null;
    country?: string | null;
  }) {
    const sport = (body.sport || '').trim();
    const externalId = (body.externalId || '').trim();
    if (!sport || !externalId) {
      throw new Error('sport, externalId are required');
    }
    const toNullable = (v: string | null | undefined) =>
      v === undefined ? undefined : v === '' ? null : v;
    const data: {
      koreanName?: string | null;
      logoUrl?: string | null;
      country?: string | null;
    } = {
      koreanName: toNullable(body.koreanName),
      logoUrl: toNullable(body.logoUrl),
      country: toNullable(body.country),
    };
    return this.prisma.oddsApiTeamAlias.upsert({
      where: { sport_externalId: { sport, externalId } },
      update: data,
      create: {
        sport,
        externalId,
        originalName: (body.originalName || '').trim() || externalId,
        ...data,
      },
    });
  }

  /** OddsApiLeagueAlias upsert. */
  async upsertProviderLeagueAlias(body: {
    sport: string;
    slug: string;
    originalName?: string | null;
    koreanName?: string | null;
    logoUrl?: string | null;
    country?: string | null;
    displayPriority?: number;
    isHidden?: boolean;
  }) {
    const sport = (body.sport || '').trim();
    const slug = (body.slug || '').trim();
    if (!sport || !slug) throw new Error('sport, slug are required');
    const toNullable = (v: string | null | undefined) =>
      v === undefined ? undefined : v === '' ? null : v;
    const data: {
      koreanName?: string | null;
      logoUrl?: string | null;
      country?: string | null;
      displayPriority?: number;
      isHidden?: boolean;
    } = {
      koreanName: toNullable(body.koreanName),
      logoUrl: toNullable(body.logoUrl),
      country: toNullable(body.country),
      displayPriority: body.displayPriority,
      isHidden: body.isHidden,
    };
    return this.prisma.oddsApiLeagueAlias.upsert({
      where: { sport_slug: { sport, slug } },
      update: data,
      create: {
        sport,
        slug,
        originalName: (body.originalName || '').trim() || slug,
        ...data,
      },
    });
  }

  /**
   * 크롤러 원본(raw) 의 홈/원정/리그 한글 라벨을 수정한다.
   *
   *  - `field=home`  : `CrawlerRawMatch.rawHomeName` + `CrawlerMatchMapping.rawHomeName` 덮어쓰기
   *  - `field=away`  : `CrawlerRawMatch.rawAwayName` + `CrawlerMatchMapping.rawAwayName` 덮어쓰기
   *  - `field=league`: `CrawlerRawMatch.rawLeagueLabel` 덮어쓰기
   *
   * 매핑이 존재하고 provider 쪽 식별자가 채워져 있다면, 편집한 한글명을 그대로
   * `OddsApiTeamAlias.koreanName` / `OddsApiLeagueAlias.koreanName` 에 propagate 해서
   * 앞으로 같은 provider 팀/리그가 올 때 자동으로 한글이 붙도록 한다.
   */
  async updateRawLabel(body: {
    rawMatchId: string;
    field: 'home' | 'away' | 'league';
    value: string;
  }) {
    const rawMatchId = (body?.rawMatchId || '').trim();
    const field = body?.field;
    if (!rawMatchId || !field) {
      throw new Error('rawMatchId, field are required');
    }
    const valueRaw = (body?.value ?? '').trim();
    // 빈 문자열은 null 로 저장 (= 크롤러 값으로 되돌리기)
    const value: string | null = valueRaw.length > 0 ? valueRaw : null;

    const raw = await this.prisma.crawlerRawMatch.findUnique({
      where: { id: rawMatchId },
      include: { mapping: true },
    });
    if (!raw) throw new Error('raw match not found');

    const rawUpdate: Record<string, string | null> = {};
    const mappingUpdate: Record<string, string | null> = {};
    if (field === 'home') {
      rawUpdate.rawHomeName = value;
      mappingUpdate.rawHomeName = value;
    } else if (field === 'away') {
      rawUpdate.rawAwayName = value;
      mappingUpdate.rawAwayName = value;
    } else if (field === 'league') {
      rawUpdate.rawLeagueLabel = value;
    }

    await this.prisma.crawlerRawMatch.update({
      where: { id: rawMatchId },
      data: rawUpdate,
    });
    if (raw.mapping && Object.keys(mappingUpdate).length > 0) {
      await this.prisma.crawlerMatchMapping.update({
        where: { id: raw.mapping.id },
        data: mappingUpdate,
      });
    }

    // 매핑이 이미 provider 쪽과 붙어 있다면 → alias 도 같이 upsert (한글 번역 소스로 사용).
    const mapping = raw.mapping;
    const sport =
      mapping?.providerSportSlug ||
      mapping?.internalSportSlug ||
      raw.internalSportSlug ||
      raw.sourceSportSlug ||
      '';

    if (mapping && value && sport) {
      if (field === 'home' && mapping.providerHomeExternalId) {
        await this.prisma.oddsApiTeamAlias.upsert({
          where: {
            sport_externalId: {
              sport,
              externalId: mapping.providerHomeExternalId,
            },
          },
          update: { koreanName: value },
          create: {
            sport,
            externalId: mapping.providerHomeExternalId,
            originalName:
              mapping.providerHomeName ||
              raw.rawHomeName ||
              mapping.providerHomeExternalId,
            koreanName: value,
          },
        });
      } else if (field === 'away' && mapping.providerAwayExternalId) {
        await this.prisma.oddsApiTeamAlias.upsert({
          where: {
            sport_externalId: {
              sport,
              externalId: mapping.providerAwayExternalId,
            },
          },
          update: { koreanName: value },
          create: {
            sport,
            externalId: mapping.providerAwayExternalId,
            originalName:
              mapping.providerAwayName ||
              raw.rawAwayName ||
              mapping.providerAwayExternalId,
            koreanName: value,
          },
        });
      } else if (field === 'league' && mapping.providerLeagueSlug) {
        await this.prisma.oddsApiLeagueAlias.upsert({
          where: {
            sport_slug: { sport, slug: mapping.providerLeagueSlug },
          },
          update: { koreanName: value },
          create: {
            sport,
            slug: mapping.providerLeagueSlug,
            originalName: mapping.providerLeagueSlug,
            koreanName: value,
          },
        });
      }
    }

    return {
      ok: true,
      rawMatchId,
      field,
      value,
      propagated: Boolean(
        mapping &&
          value &&
          sport &&
          ((field === 'home' && mapping.providerHomeExternalId) ||
            (field === 'away' && mapping.providerAwayExternalId) ||
            (field === 'league' && mapping.providerLeagueSlug)),
      ),
    };
  }

  /**
   * sport / 리그 필터 칩용.
   * CrawlerRawMatch 기준(크롤 원본이 진짜 소스) — 매핑 행이 아직 없어도 종목이 보인다.
   */
  async listFacets() {
    const [sports, leagues] = await Promise.all([
      this.prisma.crawlerRawMatch.groupBy({
        by: ['sourceSportSlug', 'internalSportSlug'],
        _count: { _all: true },
      }),
      this.prisma.crawlerRawMatch.groupBy({
        by: ['sourceSportSlug', 'rawLeagueSlug'],
        where: { rawLeagueSlug: { not: null } },
        _count: { _all: true },
      }),
    ]);
    return {
      sports: sports
        .filter((s) => !!s.sourceSportSlug)
        .map((s) => ({
          sourceSport: s.sourceSportSlug,
          internalSport: s.internalSportSlug,
          count: s._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      leagues: leagues
        .filter((l) => !!l.rawLeagueSlug)
        .map((l) => ({
          sourceSport: l.sourceSportSlug,
          leagueSlug: l.rawLeagueSlug as string,
          count: l._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * 드래그-드롭 UI 용 provider catalog event 풀.
   *
   * @param sport      필터 할 internal sport slug (없으면 전체)
   * @param q          팀/리그 검색어
   * @param leagueSlug 리그 slug 필터
   * @param limit      한 번에 반환할 최대 개수 (기본 80, 최대 400)
   * @param skip       풀 정렬(kickoff 오름차순) 기준 앞에서 건너뛸 개수 (페이지네이션)
   * @param onlyUnused true 이면 이미 CrawlerMatchMapping.providerExternalEventId 로 붙은 이벤트는 제외.
   */
  async listProviderPool(opts: {
    sport?: string;
    q?: string;
    leagueSlug?: string;
    limit?: number;
    skip?: number;
    onlyUnused?: boolean;
    kickoffScope?: 'upcoming' | 'past' | 'all';
  }): Promise<{
    events: (CatalogEvent & {
      homeLogo: string | null;
      awayLogo: string | null;
      homeKoreanName: string | null;
      awayKoreanName: string | null;
      homeAliasId: string | null;
      awayAliasId: string | null;
      country: string | null;
      leagueKoreanName: string | null;
      leagueLogo: string | null;
      leagueAliasId: string | null;
      used: boolean;
    })[];
    total: number;
    totalBeforeFilter: number;
    hasMore: boolean;
    skip: number;
    catalogTotalEvents: number;
    catalogSportSlugs: string[];
  }> {
    const limit = Math.max(1, Math.min(400, opts.limit ?? 80));
    const skip = Math.max(0, Math.min(500_000, opts.skip ?? 0));
    const { eventsBySport, totalEvents } = await this.loadLiveEvents();

    let pool: CatalogEvent[] = [];
    if (opts.sport) {
      pool = eventsBySport.get(opts.sport) ?? [];
    } else {
      pool = Array.from(eventsBySport.values()).flat();
    }

    if (opts.leagueSlug) {
      pool = pool.filter((ev) => (ev.leagueSlug ?? '') === opts.leagueSlug);
    }
    if (opts.q) {
      const needle = opts.q.toLowerCase();
      pool = pool.filter((ev) =>
        `${ev.home ?? ''} ${ev.away ?? ''} ${ev.leagueSlug ?? ''} ${ev.id}`
          .toLowerCase()
          .includes(needle),
      );
    }

    const scope = opts.kickoffScope ?? 'all';
    const nowMs = Date.now();
    if (scope === 'upcoming') {
      pool = pool.filter((ev) => {
        if (!ev.date) return true;
        const t = new Date(ev.date).getTime();
        if (Number.isNaN(t)) return true;
        return t >= nowMs;
      });
    } else if (scope === 'past') {
      pool = pool.filter((ev) => {
        if (!ev.date) return false;
        const t = new Date(ev.date).getTime();
        if (Number.isNaN(t)) return false;
        return t < nowMs;
      });
    }

    // 사용 중 = auto/confirmed 로 잡힌 provider event id 집합.
    // 과거: pool 전체 id 를 IN (...) 에 넣어 수만 건이면 쿼리·메모리 폭주로 API 가 죽을 수 있음(크롤러 매칭 탭).
    const usedSet = new Set<string>();
    if (pool.length > 0) {
      const usedRows = await this.prisma.crawlerMatchMapping.findMany({
        where: {
          status: { in: ['auto', 'confirmed'] },
          providerExternalEventId: { not: null },
        },
        distinct: ['providerExternalEventId'],
        select: { providerExternalEventId: true },
      });
      for (const r of usedRows) {
        if (r.providerExternalEventId) usedSet.add(r.providerExternalEventId);
      }
    }

    const beforeUsed = pool.length;
    if (opts.onlyUnused) {
      pool = pool.filter((ev) => !usedSet.has(ev.id));
    }

    // kickoff 오름차순 정렬 (가까운 것 먼저)
    pool.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
      const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });

    const sliced = pool.slice(skip, skip + limit);
    const hasMore = skip + sliced.length < pool.length;

    // 로고/한글명 + 리그 country 패치
    const teamKeys = new Set<string>();
    const leagueKeys = new Set<string>();
    for (const ev of sliced) {
      if (ev.homeId != null) teamKeys.add(`${ev.sport}|${ev.homeId}`);
      if (ev.awayId != null) teamKeys.add(`${ev.sport}|${ev.awayId}`);
      if (ev.leagueSlug) leagueKeys.add(`${ev.sport}|${ev.leagueSlug}`);
    }
    const [aliases, leagueAliases] = await Promise.all([
      teamKeys.size > 0
        ? this.prisma.oddsApiTeamAlias.findMany({
            where: {
              OR: Array.from(teamKeys).map((k) => {
                const [sport, externalId] = splitKeyLast(k);
                return { sport, externalId };
              }),
            },
            select: {
              id: true,
              sport: true,
              externalId: true,
              originalName: true,
              logoUrl: true,
              koreanName: true,
              country: true,
            },
          })
        : Promise.resolve([]),
      leagueKeys.size > 0
        ? this.prisma.oddsApiLeagueAlias.findMany({
            where: {
              OR: Array.from(leagueKeys).map((k) => {
                const [sport, slug] = splitKeyLast(k);
                return { sport, slug };
              }),
            },
            select: {
              id: true,
              sport: true,
              slug: true,
              country: true,
              originalName: true,
              koreanName: true,
              logoUrl: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const aliasMap = new Map<string, (typeof aliases)[number]>();
    for (const a of aliases) aliasMap.set(`${a.sport}|${a.externalId}`, a);
    const leagueAliasMap = new Map<string, (typeof leagueAliases)[number]>();
    for (const l of leagueAliases) leagueAliasMap.set(`${l.sport}|${l.slug}`, l);

    const events = sliced.map((ev) => {
      const homeA = ev.homeId != null ? aliasMap.get(`${ev.sport}|${ev.homeId}`) : undefined;
      const awayA = ev.awayId != null ? aliasMap.get(`${ev.sport}|${ev.awayId}`) : undefined;
      const leagueA = ev.leagueSlug
        ? leagueAliasMap.get(`${ev.sport}|${ev.leagueSlug}`)
        : undefined;
      return {
        ...ev,
        homeLogo: toPublicMediaUrl(homeA?.logoUrl ?? null),
        awayLogo: toPublicMediaUrl(awayA?.logoUrl ?? null),
        homeKoreanName: homeA?.koreanName ?? null,
        awayKoreanName: awayA?.koreanName ?? null,
        homeAliasId: homeA?.id ?? null,
        awayAliasId: awayA?.id ?? null,
        // country 우선순위: 리그 country > 홈팀 country > 원정팀 country
        country:
          leagueA?.country ?? homeA?.country ?? awayA?.country ?? null,
        leagueKoreanName: leagueA?.koreanName ?? null,
        leagueLogo: toPublicMediaUrl(leagueA?.logoUrl ?? null),
        leagueAliasId: leagueA?.id ?? null,
        used: usedSet.has(ev.id),
      };
    });

    return {
      events,
      total: pool.length,
      totalBeforeFilter: beforeUsed,
      hasMore,
      skip,
      /** UI 안내: 카탈로그 스냅샷 전체(필터 전) */
      catalogTotalEvents: totalEvents,
      catalogSportSlugs: [...eventsBySport.keys()].sort(),
    };
  }

  async stats(sourceSite?: string) {
    const base = sourceSite ? { sourceSite } : {};
    const [auto, pending, confirmed, rejected, ignored, total, rawTotal] =
      await Promise.all([
        this.prisma.crawlerMatchMapping.count({ where: { ...base, status: 'auto' } }),
        this.prisma.crawlerMatchMapping.count({ where: { ...base, status: 'pending' } }),
        this.prisma.crawlerMatchMapping.count({ where: { ...base, status: 'confirmed' } }),
        this.prisma.crawlerMatchMapping.count({ where: { ...base, status: 'rejected' } }),
        this.prisma.crawlerMatchMapping.count({ where: { ...base, status: 'ignored' } }),
        this.prisma.crawlerMatchMapping.count({ where: base }),
        this.prisma.crawlerRawMatch.count({ where: base }),
      ]);
    return {
      total,
      auto,
      pending,
      confirmed,
      rejected,
      ignored,
      rawTotal,
      unmatched: Math.max(0, rawTotal - total),
    };
  }

  /**
   * 수동 확정용 후보 이벤트 제안.
   *
   * 반환:
   *   - stored: pending 으로 넘어갈 때 매처가 미리 저장해둔 후보(candidatesJson).
   *   - live:   최신 catalog 에서 느슨한 조건으로 검색한 후보.
   *   - hints:  제안 생성에 사용된 힌트 (sport/leagueSlug/팀 externalId).
   */
  async suggestMatchCandidates(
    id: string,
    opts?: {
      q?: string;
      leagueSlug?: string;
      limit?: number;
    },
  ): Promise<{
    mapping: unknown;
    stored: CatalogEvent[];
    live: CatalogEvent[];
    hints: {
      sport: string | null;
      providerLeagueSlug: string | null;
      homeExternalId: string | null;
      awayExternalId: string | null;
      kickoffUtc: string | null;
      /** 크롤 국가·리그 slug 기반 catalog leagueSlug 필터 */
      countrySlugHints: string[];
    };
  }> {
    const row = await this.prisma.crawlerMatchMapping.findUnique({
      where: { id },
      include: {
        rawMatch: { select: { rawCountryLabel: true } },
      },
    });
    if (!row) throw new NotFoundException('mapping not found');
    const limit = Math.max(1, Math.min(100, opts?.limit ?? 40));
    const keyword = (opts?.q || '').trim();
    const countrySlugHints = collectCountrySlugHints(
      row.rawMatch?.rawCountryLabel ?? null,
      row.rawLeagueSlug,
    );

    // 1) 저장된 후보
    const stored: CatalogEvent[] = Array.isArray(row.candidatesJson)
      ? (row.candidatesJson as unknown as CatalogEvent[])
      : [];

    // 2) 힌트: 확정된 리그/팀 매핑이 있는지 확인
    const [leagueMap, homeTeamMap, awayTeamMap] = await Promise.all([
      row.rawLeagueSlug
        ? this.prisma.crawlerLeagueMapping.findUnique({
            where: {
              sourceSite_sourceLeagueSlug: {
                sourceSite: row.sourceSite,
                sourceLeagueSlug: row.rawLeagueSlug,
              },
            },
          })
        : Promise.resolve(null),
      row.rawHomeName
        ? this.prisma.crawlerTeamMapping.findUnique({
            where: {
              sourceSite_sourceSportSlug_sourceTeamName: {
                sourceSite: row.sourceSite,
                sourceSportSlug: row.sourceSportSlug,
                sourceTeamName: row.rawHomeName,
              },
            },
          })
        : Promise.resolve(null),
      row.rawAwayName
        ? this.prisma.crawlerTeamMapping.findUnique({
            where: {
              sourceSite_sourceSportSlug_sourceTeamName: {
                sourceSite: row.sourceSite,
                sourceSportSlug: row.sourceSportSlug,
                sourceTeamName: row.rawAwayName,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const hintSport =
      row.providerSportSlug ||
      leagueMap?.providerSportSlug ||
      leagueMap?.internalSportSlug ||
      row.internalSportSlug ||
      null;
    const hintLeagueSlug =
      (opts?.leagueSlug?.trim() || '') ||
      row.providerLeagueSlug ||
      leagueMap?.providerLeagueSlug ||
      null;
    const hintHomeId =
      homeTeamMap?.status === 'confirmed'
        ? homeTeamMap.providerTeamExternalId
        : null;
    const hintAwayId =
      awayTeamMap?.status === 'confirmed'
        ? awayTeamMap.providerTeamExternalId
        : null;

    // 3) live 후보: 최신 catalog 이벤트 풀에서 느슨한 필터
    const { eventsBySport } = await this.loadLiveEvents();
    let pool: CatalogEvent[] = [];
    if (hintSport) {
      pool = eventsBySport.get(hintSport) ?? [];
    }
    if (pool.length === 0 && !hintSport) {
      // sport 가 하나도 안 잡히면 전 종목에서 검색 (검색어 필수)
      if (!keyword && !hintLeagueSlug) {
        return {
          mapping: row,
          stored,
          live: [],
          hints: {
            sport: hintSport,
            providerLeagueSlug: hintLeagueSlug,
            homeExternalId: hintHomeId,
            awayExternalId: hintAwayId,
            kickoffUtc: row.rawKickoffUtc?.toISOString() ?? null,
            countrySlugHints,
          },
        };
      }
      pool = Array.from(eventsBySport.values()).flat();
    }

    let filtered = pool;
    if (hintLeagueSlug) {
      filtered = filtered.filter(
        (ev) => (ev.leagueSlug ?? '') === hintLeagueSlug,
      );
    }
    // 팀 externalId 힌트가 둘 다 있으면 양쪽 호환 매칭 우선
    if (hintHomeId && hintAwayId) {
      const bothMatch = filtered.filter(
        (ev) =>
          (String(ev.homeId ?? '') === hintHomeId &&
            String(ev.awayId ?? '') === hintAwayId) ||
          (String(ev.homeId ?? '') === hintAwayId &&
            String(ev.awayId ?? '') === hintHomeId),
      );
      if (bothMatch.length > 0) filtered = bothMatch;
    }

    /** 크롤 국가(한글·slug) + 리그 slug → catalog leagueSlug 가 같은 국가 접두인 것만 (없으면 스킵) */
    if (countrySlugHints.length > 0) {
      const gated = filtered.filter((ev) =>
        catalogLeagueSlugMatchesCountryHints(ev.leagueSlug, countrySlugHints),
      );
      if (gated.length > 0) filtered = gated;
    }

    // 키워드: 이름/leagueSlug/event id 에 포함 (양쪽 중 아무 곳)
    if (keyword) {
      const needle = keyword.toLowerCase();
      filtered = filtered.filter((ev) => {
        const hay =
          `${ev.home ?? ''} ${ev.away ?? ''} ${ev.leagueSlug ?? ''} ${ev.id}`.toLowerCase();
        return hay.includes(needle);
      });
    } else if (!hintLeagueSlug && !hintHomeId && !hintAwayId) {
      // 힌트도 없고 키워드도 없으면 raw 팀명 토큰으로라도 1차 축소
      // 라틴 2~3글자(HB 등)만으로는 오탐이 많아 4자 이상만 허용 + 한글 2자 이상
      const tokens = ([row.rawHomeName, row.rawAwayName].filter(Boolean) as string[])
        .flatMap((s) => s.split(/\s+/))
        .map((s) => s.trim())
        .filter(
          (s) =>
            s.length >= 4 ||
            (/[\uAC00-\uD7AF]/.test(s) && s.length >= 2),
        );
      if (tokens.length > 0) {
        filtered = filtered.filter((ev) =>
          tokens.some((t) =>
            `${ev.home ?? ''} ${ev.away ?? ''}`
              .toLowerCase()
              .includes(t.toLowerCase()),
          ),
        );
      }
    }

    // kickoff 근접도로 정렬 (raw.rawKickoffUtc 기준, 없으면 id 순서)
    const rawKickoffMs = row.rawKickoffUtc?.getTime() ?? null;
    filtered.sort((a, b) => {
      if (rawKickoffMs !== null) {
        const da = a.date ? Math.abs(new Date(a.date).getTime() - rawKickoffMs) : Number.POSITIVE_INFINITY;
        const db = b.date ? Math.abs(new Date(b.date).getTime() - rawKickoffMs) : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      return (a.id > b.id ? 1 : -1);
    });

    const live = filtered.slice(0, limit);

    return {
      mapping: row,
      stored,
      live,
      hints: {
        sport: hintSport,
        providerLeagueSlug: hintLeagueSlug,
        homeExternalId: hintHomeId,
        awayExternalId: hintAwayId,
        kickoffUtc: row.rawKickoffUtc?.toISOString() ?? null,
        countrySlugHints,
      },
    };
  }

  /**
   * provider(API) 경기 1건 기준으로 크롤 raw 경기 후보를 점수화해 추천 (자동 확정 아님).
   */
  async suggestCrawlCandidatesForApiMatch(opts: {
    apiMatch: ApiMatchInput;
    sourceSite?: string;
    limit?: number;
    /** raw 스캔 상한 (기본 4000) */
    maxScan?: number;
  }): Promise<{
    candidates: MatchCandidateResult[];
    confirmedMappingsUsed: number;
    scanned: number;
    thresholds: { strong: number; review: number; lowBelow: number };
  }> {
    const api = opts.apiMatch;
    if (!api || typeof api !== 'object') {
      throw new BadRequestException('apiMatch is required');
    }
    const sportSlug = String(api.sport?.slug ?? '').trim();
    const leagueSlug = String(api.league?.slug ?? '').trim();
    const home = String(api.home ?? '').trim();
    const away = String(api.away ?? '').trim();
    if (!sportSlug || !leagueSlug || !home || !away) {
      throw new BadRequestException(
        'apiMatch.sport.slug, league.slug, home, away are required',
      );
    }

    const limit = Math.max(1, Math.min(50, opts.limit ?? 5));
    const maxScan = Math.max(50, Math.min(20_000, opts.maxScan ?? 4000));
    const sourceSite = opts.sourceSite?.trim() || undefined;

    const whereSport: Prisma.CrawlerRawMatchWhereInput = {
      OR: [
        { internalSportSlug: sportSlug },
        {
          AND: [
            { internalSportSlug: null },
            { providerSportSlug: sportSlug },
          ],
        },
      ],
    };

    const raws = await this.prisma.crawlerRawMatch.findMany({
      where: {
        rawLeagueSlug: leagueSlug,
        ...(sourceSite ? { sourceSite } : {}),
        AND: [
          whereSport,
          { rawHomeName: { not: null } },
          { rawAwayName: { not: null } },
        ],
      },
      orderBy: { id: 'asc' },
      take: maxScan,
      select: {
        id: true,
        rawHomeName: true,
        rawAwayName: true,
        rawLeagueSlug: true,
        internalSportSlug: true,
        providerSportSlug: true,
      },
    });

    const pairs = await this.loadConfirmedTeamNamePairs(sourceSite);
    const crawlInputs = raws.map((r) => ({
      id: r.id,
      home: (r.rawHomeName ?? '').trim(),
      away: (r.rawAwayName ?? '').trim(),
      leagueSlug: (r.rawLeagueSlug ?? '').trim(),
      sportSlug: (r.internalSportSlug ?? r.providerSportSlug ?? '').trim(),
    }));

    const candidates = findTopCandidates(
      {
        id: api.id,
        home,
        away,
        sport: { slug: sportSlug, name: api.sport?.name },
        league: { slug: leagueSlug, name: api.league?.name },
      },
      crawlInputs,
      pairs,
      { limit },
    );

    return {
      candidates,
      confirmedMappingsUsed: pairs.length,
      scanned: raws.length,
      thresholds: { strong: 90, review: 75, lowBelow: 75 },
    };
  }

  private async loadConfirmedTeamNamePairs(
    sourceSite?: string,
  ): Promise<ConfirmedTeamNamePair[]> {
    const rows = await this.prisma.crawlerTeamMapping.findMany({
      where: {
        status: 'confirmed',
        ...(sourceSite ? { sourceSite } : {}),
        providerTeamName: { not: null },
      },
      select: { sourceTeamName: true, providerTeamName: true },
    });
    const out: ConfirmedTeamNamePair[] = [];
    for (const r of rows) {
      const a = (r.providerTeamName ?? '').trim();
      const c = (r.sourceTeamName ?? '').trim();
      if (a && c) out.push({ apiName: a, crawlName: c });
    }
    return out;
  }

  async confirmMapping(
    id: string,
    payload: {
      providerExternalEventId?: string | null;
      providerSportSlug?: string | null;
      providerLeagueSlug?: string | null;
      note?: string | null;
      confirmedBy?: string | null;
    },
  ) {
    const row = await this.prisma.crawlerMatchMapping.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('mapping not found');
    return this.prisma.crawlerMatchMapping.update({
      where: { id },
      data: {
        status: 'confirmed',
        matchedVia: 'manual',
        providerExternalEventId:
          payload.providerExternalEventId ?? row.providerExternalEventId,
        providerSportSlug:
          payload.providerSportSlug ?? row.providerSportSlug,
        providerLeagueSlug:
          payload.providerLeagueSlug ?? row.providerLeagueSlug,
        note: payload.note ?? row.note,
        confirmedAt: new Date(),
        confirmedBy: payload.confirmedBy ?? null,
        reason: null,
      },
    });
  }

  async rejectMapping(id: string, note?: string | null) {
    const row = await this.prisma.crawlerMatchMapping.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('mapping not found');
    return this.prisma.crawlerMatchMapping.update({
      where: { id },
      data: { status: 'rejected', note: note ?? row.note },
    });
  }

  async reopenMapping(id: string) {
    const row = await this.prisma.crawlerMatchMapping.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('mapping not found');
    return this.prisma.crawlerMatchMapping.update({
      where: { id },
      data: {
        status: 'pending',
        matchedVia: null,
        confirmedAt: null,
        confirmedBy: null,
        reason: null,
        candidatesJson: Prisma.JsonNull,
      },
    });
  }
}

/* ───────────────────── helpers ───────────────────── */

/** `reasonCode: 상세` 형태의 앞 토큰 */
function parseMatcherReasonCode(reason: string | null | undefined): string {
  const s = String(reason ?? '').trim();
  if (!s) return '';
  const i = s.indexOf(':');
  return (i === -1 ? s : s.slice(0, i)).trim();
}

/** persistPending 의 no-events-for-sport 메시지에서 sport 슬러그 추출 */
function parseSportSlugFromNoEventsReason(reason: string | null | undefined): string {
  const m = String(reason ?? '').match(/sport=([^\s]+)/);
  return m?.[1]?.trim() ?? '';
}

function extractCatalogEvents(payloadJson: unknown): CatalogEvent[] {
  if (!payloadJson || typeof payloadJson !== 'object') return [];
  const p = payloadJson as Record<string, unknown>;
  const items = Array.isArray(p.items)
    ? (p.items as Array<Record<string, unknown>>)
    : [];
  const out: CatalogEvent[] = [];
  for (const x of items) {
    if (!x || typeof x !== 'object') continue;
    const id = typeof x.id === 'string' ? x.id : String(x.id ?? '');
    if (!id) continue;
    const sport = typeof x.sport === 'string' ? x.sport : '';
    if (!sport) continue;
    const homeId = numOrNull(x.homeId);
    const awayId = numOrNull(x.awayId);
    const leagueSlug =
      typeof x.leagueSlug === 'string' && x.leagueSlug.length > 0
        ? x.leagueSlug
        : null;
    const home = typeof x.home === 'string' ? x.home : null;
    const away = typeof x.away === 'string' ? x.away : null;
    const date = typeof x.date === 'string' ? x.date : null;
    const status = typeof x.status === 'string' ? x.status : null;
    out.push({ id, sport, leagueSlug, homeId, awayId, home, away, date, status });
  }
  return out;
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** `sport|rest` — sport 슬러그에 하이픈만 있어도 | 가 여러 개일 수 있어 마지막 구간만 id 로 본다. */
function splitKeyLast(key: string, sep = '|'): [string, string] {
  const i = key.lastIndexOf(sep);
  if (i === -1) return [key, ''];
  return [key.slice(0, i), key.slice(i + 1)];
}

/** `sourceSite|sourceSportSlug|teamName` — 가운데 sport 는 ice-hockey 처럼 하이핀을 포함할 수 있음. */
function splitKeyThree(key: string): [string, string, string] {
  const i1 = key.indexOf('|');
  if (i1 === -1) return [key, '', ''];
  const i2 = key.indexOf('|', i1 + 1);
  if (i2 === -1) return [key.slice(0, i1), key.slice(i1 + 1), ''];
  return [key.slice(0, i1), key.slice(i1 + 1, i2), key.slice(i2 + 1)];
}
