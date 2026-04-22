import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolvePublicMediaUrl } from '../common/utils/media-url.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  type ApiMatchInput,
  type ConfirmedTeamNamePair,
  type MatchCandidateResult,
  findTopCandidates,
} from './match-candidate-scorer';

function toPublicMediaUrl(u: string | null | undefined): string | null {
  if (u == null) return null;
  const t = String(u).trim();
  if (!t) return null;
  return resolvePublicMediaUrl(t);
}

/** `findMany({ include: { mapping: true } })` 한 행 — `mapping` 필드 타입 포함 */
type RawMatchWithMapping = Prisma.CrawlerRawMatchGetPayload<{
  include: { mapping: true };
}>;

/**
 * livesport raw 경기 ↔ odds-api.io 이벤트를 엄격한 규칙으로 매칭한다.
 *
 * 엄격(strict) 규칙:
 *   1) raw.rawLeagueSlug 가 CrawlerLeagueMapping(status=confirmed) 로 providerLeagueSlug 로 해결되어야 한다.
 *   2) raw.rawHomeName, raw.rawAwayName 각각 CrawlerTeamMapping(status=confirmed) 로
 *      providerTeamExternalId 로 해결되어야 한다.
 *   3) 최신 OddsApiCatalogSnapshot 들에서 해당 sport 의 event 중
 *      sport/leagueSlug/homeId/awayId 가 완전히 일치하는 후보를 찾는다.
 *   4) 후보가 정확히 1개이고, kickoff(UTC) 차이가 ±90분 이내여야 한다.
 *
 * 위 조건 모두 만족 → status='auto', matchedVia='strict', matchScore=1.0.
 * 그 외 → status='pending' 에 reason 으로 어디서 막혔는지 남김.
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
  /** 최신 Catalog 를 읽어올 때 platform 당 소비할 최대 스냅샷 수 */
  private readonly CATALOG_FRESHNESS_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  async run(options?: {
    sourceSite?: string;
    limit?: number;
    onlyStatuses?: Array<'pending' | 'rejected' | 'auto' | 'confirmed' | 'ignored'>;
  }): Promise<RunMatcherResult> {
    const t0 = Date.now();
    const limit = Math.max(1, Math.min(5000, options?.limit ?? 2000));
    const sourceSite = options?.sourceSite?.trim() || undefined;
    const onlyStatuses = options?.onlyStatuses ?? ['pending'];

    // 1) 매처가 볼 raw 경기: 아직 mapping 이 없거나 현재 status 가 onlyStatuses 에 포함된 것
    const where: Record<string, unknown> = {};
    if (sourceSite) where.sourceSite = sourceSite;
    where.OR = [
      { mapping: null },
      { mapping: { is: { status: { in: onlyStatuses } } } },
    ];
    const rawMatches = await this.prisma.crawlerRawMatch.findMany({
      where,
      orderBy: [{ lastSeenAt: 'desc' }],
      take: limit,
      include: { mapping: true },
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
    this.logger.log(
      `[matcher] loaded ${totalEvents} live events across ${eventsBySport.size} sports, confirmed: leagues=${confirmedLeagues.length} teams=${confirmedTeams.length}`,
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
        const result = await this.matchOne(raw, leagueIdx, teamIdx, eventsBySport);
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
      const t = teamIdx.get(
        `${raw.sourceSite}::${raw.sourceSportSlug}::${rawHomeName}`,
      );
      return !t;
    }
    if (reasonCode === 'away-team-not-confirmed') {
      const t = teamIdx.get(
        `${raw.sourceSite}::${raw.sourceSportSlug}::${rawAwayName}`,
      );
      return !t;
    }
    if (reasonCode === 'team-missing-externalId') {
      const home = teamIdx.get(
        `${raw.sourceSite}::${raw.sourceSportSlug}::${rawHomeName}`,
      );
      const away = teamIdx.get(
        `${raw.sourceSite}::${raw.sourceSportSlug}::${rawAwayName}`,
      );
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

  private async matchOne(
    raw: RawMatchWithMapping,
    leagueIdx: Map<string, ConfirmedLeague>,
    teamIdx: Map<string, ConfirmedTeam>,
    eventsBySport: Map<string, CatalogEvent[]>,
  ): Promise<
    | { kind: 'auto' }
    | { kind: 'pending'; reason: string; note?: string }
    | { kind: 'unchanged' }
  > {
    if (this.shouldSkipPendingRematch(raw, leagueIdx, teamIdx, eventsBySport)) {
      return { kind: 'unchanged' };
    }

    const rawLeagueSlug = raw.rawLeagueSlug || '';
    const rawHomeName = (raw.rawHomeName || '').trim();
    const rawAwayName = (raw.rawAwayName || '').trim();

    if (!rawLeagueSlug || !rawHomeName || !rawAwayName) {
      return this.persistPending(raw, 'missing-raw-fields', {
        reason: '리그/팀 raw 값이 누락',
      });
    }

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

    const homeTeam = teamIdx.get(
      `${raw.sourceSite}::${raw.sourceSportSlug}::${rawHomeName}`,
    );
    const awayTeam = teamIdx.get(
      `${raw.sourceSite}::${raw.sourceSportSlug}::${rawAwayName}`,
    );
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
    const homeExternalId = homeTeam.providerTeamExternalId;
    const awayExternalId = awayTeam.providerTeamExternalId;
    if (!homeExternalId || !awayExternalId) {
      return this.persistPending(raw, 'team-missing-externalId', {
        reason: '팀 매핑에 providerTeamExternalId 누락',
      });
    }

    const sportEvents = eventsBySport.get(providerSportSlug) ?? [];
    if (sportEvents.length === 0) {
      return this.persistPending(raw, 'no-events-for-sport', {
        reason: `odds-api.io 이벤트 풀에 sport=${providerSportSlug} 없음`,
      });
    }

    // strict filter
    const candidates = sportEvents.filter(
      (ev) =>
        (ev.leagueSlug ?? '') === providerLeagueSlug &&
        ev.homeId !== null &&
        String(ev.homeId) === homeExternalId &&
        ev.awayId !== null &&
        String(ev.awayId) === awayExternalId,
    );

    if (candidates.length === 0) {
      // 팀ID 역매칭(홈-원정 반대) 도 한 번 시도
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

    // 정확히 1개
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

    // ✅ strict auto match
    await this.persistAuto(raw, {
      league,
      homeTeam,
      awayTeam,
      providerSportSlug,
      providerLeagueSlug,
      event: ev,
      kickoffDeltaSec: deltaSec,
    });
    return { kind: 'auto' };
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
      homeTeam: ConfirmedTeam;
      awayTeam: ConfirmedTeam;
      providerSportSlug: string;
      providerLeagueSlug: string;
      event: CatalogEvent;
      kickoffDeltaSec: number | null;
    },
  ) {
    const ev = args.event;
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
        homeTeamMappingId: args.homeTeam.id,
        awayTeamMappingId: args.awayTeam.id,
        providerName: args.league.providerName ?? 'odds-api.io',
        providerSportSlug: args.providerSportSlug,
        providerLeagueSlug: args.providerLeagueSlug,
        providerExternalEventId: ev.id,
        providerHomeExternalId: args.homeTeam.providerTeamExternalId,
        providerAwayExternalId: args.awayTeam.providerTeamExternalId,
        providerHomeName: ev.home ?? args.homeTeam.providerTeamName,
        providerAwayName: ev.away ?? args.awayTeam.providerTeamName,
        providerKickoffUtc: ev.date ? new Date(ev.date) : null,
        kickoffDeltaSeconds: args.kickoffDeltaSec,
        status: 'auto',
        matchedVia: 'strict',
        matchScore: 1.0,
        reason: null,
        candidatesJson: Prisma.JsonNull,
        matchedAt: new Date(),
      },
      update: {
        leagueMappingId: args.league.id,
        homeTeamMappingId: args.homeTeam.id,
        awayTeamMappingId: args.awayTeam.id,
        providerName: args.league.providerName ?? 'odds-api.io',
        providerSportSlug: args.providerSportSlug,
        providerLeagueSlug: args.providerLeagueSlug,
        providerExternalEventId: ev.id,
        providerHomeExternalId: args.homeTeam.providerTeamExternalId,
        providerAwayExternalId: args.awayTeam.providerTeamExternalId,
        providerHomeName: ev.home ?? args.homeTeam.providerTeamName,
        providerAwayName: ev.away ?? args.awayTeam.providerTeamName,
        providerKickoffUtc: ev.date ? new Date(ev.date) : null,
        kickoffDeltaSeconds: args.kickoffDeltaSec,
        status: 'auto',
        matchedVia: 'strict',
        matchScore: 1.0,
        reason: null,
        candidatesJson: Prisma.JsonNull,
        matchedAt: new Date(),
      },
    });
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
    status?: 'pending' | 'auto' | 'confirmed' | 'rejected' | 'ignored' | 'all';
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
    if (params.status && params.status !== 'all') where.status = params.status;
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
        orderBy: [{ updatedAt: 'desc' }],
        take,
        skip,
        include: { rawMatch: true },
      }),
      this.prisma.crawlerMatchMapping.count({ where }),
    ]);

    const enriched = await this.enrichMappingsWithLogos(items);
    return { items: enriched, total, take, skip };
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
              sourceLeagueLogo: true,
              sourceCountryFlag: true,
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
    const providerTeamMap = new Map<string, (typeof providerTeamRows)[number]>();
    for (const a of providerTeamRows) {
      providerTeamMap.set(`${a.sport}|${a.externalId}`, a);
    }

    return items.map<T & MatchLogoPatch>((m) => {
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

  /** sport 드롭다운 용 카탈로그. 현재 수집된 sourceSport/internalSport 목록 + 대략 건수. */
  async listFacets() {
    const [sports, leagues] = await Promise.all([
      this.prisma.crawlerMatchMapping.groupBy({
        by: ['sourceSportSlug', 'internalSportSlug'],
        _count: { _all: true },
      }),
      this.prisma.crawlerMatchMapping.groupBy({
        by: ['sourceSportSlug', 'rawLeagueSlug'],
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
          leagueSlug: l.rawLeagueSlug,
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

    void totalEvents;
    return {
      events,
      total: pool.length,
      totalBeforeFilter: beforeUsed,
      hasMore,
      skip,
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
    };
  }> {
    const row = await this.prisma.crawlerMatchMapping.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('mapping not found');
    const limit = Math.max(1, Math.min(100, opts?.limit ?? 40));
    const keyword = (opts?.q || '').trim();

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
      const tokens = ([row.rawHomeName, row.rawAwayName].filter(Boolean) as string[])
        .flatMap((s) => s.split(/\s+/))
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);
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
