import { Injectable, Logger } from '@nestjs/common';
import { OddsApiWsService } from './odds-api-ws.service';
import { koreanLeague } from './i18n/league-names-ko';
import { koreanTeamName } from './i18n/team-names-ko';

/**
 * 솔루션 페이지에 그대로 내려주기 위한 집계 레이어.
 *
 * 책임:
 *  1) WS raw event(=북메이커 행 단위) 를 eventId 기준으로 한 매치로 묶는다.
 *  2) 인게임(라이브) / 프리매치 / 종료 / unknown 으로 분류한다.
 *  3) 시장(머니라인 / 핸디캡 / 오버언더) 별로 "북메이커 중 가장 좋은(=높은) 배당" 을 뽑은 뒤,
 *     실제 스포츠북에서 통상 사용하는 마진(9.95~10.1%) 으로 재조정한다.
 *  4) Phase 2 에서 enrichment(한글 리그/팀명, 로고) 를 끼워 넣을 수 있도록 hook 을 비워둔다.
 *
 * 본 서비스는 in-memory aggregation 만 수행하며 DB 와 무관.
 */
@Injectable()
export class OddsApiAggregatorService {
  private readonly log = new Logger(OddsApiAggregatorService.name);

  /**
   * 마진 재조정 목표 밴드.
   * 사용자가 명시: "9.95% ~ 10.1%"  →  overround 기준 1.0995 ~ 1.101
   * 매치+시장 단위로 살짝씩 흔들어 자연스럽게 보이게 한다.
   */
  private readonly MARGIN_MIN = 0.0995;
  private readonly MARGIN_MAX = 0.101;

  constructor(private readonly ws: OddsApiWsService) {}

  /**
   * 가공된 매치 목록 반환.
   * @param status 'live' | 'prematch' | 'all' (기본 'all')
   * @param sport  종목 슬러그 (없으면 전부)
   * @param limit  매치 수 상한 (1~500, 기본 200)
   */
  listMatches(
    opts: {
      status?: MatchStatus | 'all';
      sport?: string;
      sports?: string[];
      bookmakers?: string[];
      limit?: number;
    } = {},
  ): MatchesResponse {
    const normalized = normalizeListOptions(opts);

    // 종목 필터는 raw 단계에서 거름. limit 은 절대 raw 에 그대로 주면 안 됨
    // (raw 는 북메이커 행 단위라 매치 1개당 N개 항목이 들어옴 → 매치 단위 limit 과 다름).
    const raw = this.ws.listEvents({ limit: 500 });

    const map = new Map<string, MatchAccumulator>();
    for (const ev of raw.events) {
      if (
        normalized.wantSports.length > 0 &&
        !normalized.wantSports.includes(ev.sport)
      )
        continue;
      if (
        normalized.bookmakerSet &&
        !normalized.bookmakerSet.has(ev.bookie)
      )
        continue;
      const id = ev.eventId;
      let m = map.get(id);
      if (!m) {
        m = this.createAccumulator({
          eventId: id,
          sport: ev.sport,
          home: ev.home,
          away: ev.away,
          league: ev.league,
          startTime: ev.date,
          eventStatus: ev.eventStatus,
          scores: ev.scores,
          url: ev.url,
        });
        map.set(id, m);
      } else {
        this.mergeAccumulatorMeta(m, {
          sport: ev.sport,
          home: ev.home,
          away: ev.away,
          league: ev.league,
          startTime: ev.date,
          eventStatus: ev.eventStatus,
          scores: ev.scores,
          url: ev.url,
        });
      }
      m.bookies.add(ev.bookie);
      const t = Date.parse(ev.updatedAt);
      if (Number.isFinite(t) && t > m.lastUpdatedMs) m.lastUpdatedMs = t;
      this.absorbMarkets(m, ev.markets);
    }

    return this.finalizeMatches(map, normalized);
  }

  /**
   * REST `events + odds/multi` 결과처럼 "이벤트 1행 + bookmakers 묶음" 형태의 카탈로그를
   * 기존 매치 응답 포맷으로 변환한다.
   */
  listMatchesFromCatalog(
    catalog: OddsApiCatalogItem[],
    opts: {
      status?: MatchStatus | 'all';
      sport?: string;
      sports?: string[];
      bookmakers?: string[];
      limit?: number;
    } = {},
  ): MatchesResponse {
    const normalized = normalizeListOptions(opts);
    const map = new Map<string, MatchAccumulator>();

    for (const item of catalog) {
      if (!item?.id) continue;
      if (
        normalized.wantSports.length > 0 &&
        !normalized.wantSports.includes(item.sport)
      )
        continue;

      let acc = map.get(item.id);
      if (!acc) {
        acc = this.createAccumulator({
          eventId: item.id,
          sport: item.sport,
          home: item.home,
          away: item.away,
          league: item.league,
          startTime: item.date,
          eventStatus: item.status,
          scores: item.scores,
          url: item.url ?? undefined,
        });
        map.set(item.id, acc);
      } else {
        this.mergeAccumulatorMeta(acc, {
          sport: item.sport,
          home: item.home,
          away: item.away,
          league: item.league,
          startTime: item.date,
          eventStatus: item.status,
          scores: item.scores,
          url: item.url ?? undefined,
        });
      }

      const fetchedAtMs = item.fetchedAt ? Date.parse(item.fetchedAt) : NaN;
      if (Number.isFinite(fetchedAtMs) && fetchedAtMs > acc.lastUpdatedMs) {
        acc.lastUpdatedMs = fetchedAtMs;
      }

      for (const [bookie, raw] of Object.entries(item.bookmakers ?? {})) {
        if (
          normalized.bookmakerSet &&
          !normalized.bookmakerSet.has(bookie)
        ) {
          continue;
        }
        acc.bookies.add(bookie);
        const markets =
          raw && typeof raw === 'object'
            ? (raw as { markets?: unknown }).markets
            : undefined;
        this.absorbMarkets(acc, markets);
      }
    }

    return this.finalizeMatches(map, normalized);
  }

  /* ─────────────────────────── 내부 ─────────────────────────── */

  private createAccumulator(input: {
    eventId: string;
    sport: string;
    home: string | null;
    away: string | null;
    league: string | null;
    startTime: string | null;
    eventStatus: string | null;
    scores: AggregatedMatch['scores'];
    url?: string;
  }): MatchAccumulator {
    return {
      eventId: input.eventId,
      sport: input.sport,
      home: input.home,
      away: input.away,
      league: input.league,
      startTime: input.startTime,
      eventStatus: input.eventStatus,
      scores: input.scores,
      url: input.url,
      bookies: new Set<string>(),
      lastUpdatedMs: 0,
      mlPrices: { home: [], draw: [], away: [] },
      handicapByLine: new Map<number, { home: number[]; away: number[] }>(),
      totalsByLine: new Map<number, { over: number[]; under: number[] }>(),
    };
  }

  private mergeAccumulatorMeta(
    acc: MatchAccumulator,
    input: {
      sport: string;
      home: string | null;
      away: string | null;
      league: string | null;
      startTime: string | null;
      eventStatus: string | null;
      scores: AggregatedMatch['scores'];
      url?: string;
    },
  ): void {
    acc.home ??= input.home;
    acc.away ??= input.away;
    acc.league ??= input.league;
    acc.startTime ??= input.startTime;
    acc.eventStatus ??= input.eventStatus;
    acc.scores ??= input.scores;
    if (!acc.url && input.url) acc.url = input.url;
    if (acc.sport === 'unknown' && input.sport !== 'unknown') {
      acc.sport = input.sport;
    }
    if (!acc.scores && input.scores) acc.scores = input.scores;
  }

  private finalizeMatches(
    map: Map<string, MatchAccumulator>,
    normalized: NormalizedListOptions,
  ): MatchesResponse {
    const all: AggregatedMatch[] = [];
    for (const acc of map.values()) {
      if (acc.bookies.size === 0) continue;
      const status = classifyStatus(acc);
      if (normalized.wantStatus !== 'all' && status !== normalized.wantStatus) {
        continue;
      }
      all.push(this.finalize(acc, status));
    }

    // 정렬: 라이브가 먼저, 그 다음 시작시간 가까운 순, 그 다음 update 최근 순
    all.sort((a, b) => {
      const aw = a.status === 'live' ? 0 : 1;
      const bw = b.status === 'live' ? 0 : 1;
      if (aw !== bw) return aw - bw;
      const at = a.startTime ? Date.parse(a.startTime) : Number.MAX_SAFE_INTEGER;
      const bt = b.startTime ? Date.parse(b.startTime) : Number.MAX_SAFE_INTEGER;
      if (at !== bt) return at - bt;
      return b.lastUpdatedMs - a.lastUpdatedMs;
    });

    return {
      status: normalized.wantStatus,
      sport: normalized.wantSport ?? null,
      total: all.length,
      matches: all.slice(0, normalized.limit),
    };
  }

  /**
   * 한 북메이커가 보낸 markets 배열을 누적기에 흡수.
   * markets shape (odds-api.io):
   *   [{ name: 'ML' | 'Spread' | 'Totals', odds: [{home, draw, away, hdp, over, under, ...}, ...] }, ...]
   * 가격은 문자열일 수 있어 parseFloat 로 안전 변환.
   */
  private absorbMarkets(acc: MatchAccumulator, markets: unknown): void {
    if (!Array.isArray(markets)) return;
    for (const market of markets) {
      if (!market || typeof market !== 'object') continue;
      const name = String((market as { name?: unknown }).name ?? '')
        .trim()
        .toLowerCase();
      const odds = (market as { odds?: unknown }).odds;
      if (!Array.isArray(odds) || odds.length === 0) continue;

      if (name === 'ml' || name === 'h2h' || name === '1x2') {
        for (const row of odds) {
          if (!row || typeof row !== 'object') continue;
          const r = row as Record<string, unknown>;
          pushNum(acc.mlPrices.home, r.home);
          pushNum(acc.mlPrices.draw, r.draw);
          pushNum(acc.mlPrices.away, r.away);
        }
      } else if (name === 'spread' || name.includes('handicap')) {
        for (const row of odds) {
          if (!row || typeof row !== 'object') continue;
          const r = row as Record<string, unknown>;
          const line = numFrom(r.hdp);
          if (line === null) continue;
          let bag = acc.handicapByLine.get(line);
          if (!bag) {
            bag = { home: [], away: [] };
            acc.handicapByLine.set(line, bag);
          }
          pushNum(bag.home, r.home);
          pushNum(bag.away, r.away);
        }
      } else if (name === 'totals' || name.includes('total')) {
        for (const row of odds) {
          if (!row || typeof row !== 'object') continue;
          const r = row as Record<string, unknown>;
          const line = numFrom(r.hdp ?? r.line ?? r.points);
          if (line === null) continue;
          let bag = acc.totalsByLine.get(line);
          if (!bag) {
            bag = { over: [], under: [] };
            acc.totalsByLine.set(line, bag);
          }
          pushNum(bag.over, r.over);
          pushNum(bag.under, r.under);
        }
      }
    }
  }

  /**
   * 누적기를 최종 매치 객체로 변환.
   * - 머니라인: 3-way(축구류) 면 home/draw/away 모두, 2-way 면 draw 생략.
   * - 핸디캡/오버언더: 가장 많이 collect 된 라인 (modal line) 1개만 채택 (스포츠북 표준 표기).
   * - 모든 시장: 각 outcome 의 best price (= 가장 높은 배당) 를 뽑은 뒤 마진 9.95~10.1% 로 재조정.
   */
  private finalize(acc: MatchAccumulator, status: MatchStatus): AggregatedMatch {
    const ml = this.buildMoneyline(acc);
    const handicap = this.buildHandicap(acc);
    const totals = this.buildTotals(acc);

    const leagueI18n = koreanLeague(acc.league);
    return {
      matchId: acc.eventId,
      sport: acc.sport,
      status,
      startTime: acc.startTime,
      league: {
        name: acc.league,
        nameKr: leagueI18n.nameKr,
        logoUrl: leagueI18n.logoUrl,
      },
      home: {
        name: acc.home,
        nameKr: koreanTeamName(acc.home),
        logoUrl: null, // 팀 로고는 별도 자산 정책 필요 — 1차에서는 미제공
      },
      away: {
        name: acc.away,
        nameKr: koreanTeamName(acc.away),
        logoUrl: null,
      },
      scores: acc.scores ?? null,
      markets: {
        ...(ml ? { moneyline: ml } : {}),
        ...(handicap ? { handicap } : {}),
        ...(totals ? { totals } : {}),
      },
      bookies: [...acc.bookies],
      bookieCount: acc.bookies.size,
      url: acc.url,
      lastUpdatedMs: acc.lastUpdatedMs,
    };
  }

  private buildMoneyline(acc: MatchAccumulator): MoneylineMarket | null {
    const home = bestOf(acc.mlPrices.home);
    const draw = bestOf(acc.mlPrices.draw);
    const away = bestOf(acc.mlPrices.away);
    if (home === null && away === null) return null;
    // 2-way (테니스/야구/농구 등) 인지 3-way (축구) 인지: draw 가 한 번이라도 들어왔으면 3-way 로 본다
    const is3way = draw !== null;

    const targetMargin = pickMargin(this.MARGIN_MIN, this.MARGIN_MAX, acc.eventId, 'ml');
    if (is3way) {
      const adjusted = renormalizeOverround(
        [home ?? 0, draw ?? 0, away ?? 0].filter((x) => x > 0),
        targetMargin,
      );
      // 위치 보존하며 다시 분배
      const [aH, aD, aA] = redistribute(
        [home, draw, away],
        adjusted,
      );
      if (aH === null || aA === null) return null;
      return {
        home: aH,
        draw: aD ?? undefined,
        away: aA,
        margin: round4(targetMargin),
      };
    }
    if (home === null || away === null) return null;
    const adjusted = renormalizeOverround([home, away], targetMargin);
    return {
      home: round3(adjusted[0]),
      away: round3(adjusted[1]),
      margin: round4(targetMargin),
    };
  }

  private buildHandicap(acc: MatchAccumulator): HandicapMarket | null {
    const line = pickModalLine(acc.handicapByLine);
    if (line === null) return null;
    const bag = acc.handicapByLine.get(line)!;
    const home = bestOf(bag.home);
    const away = bestOf(bag.away);
    if (home === null || away === null) return null;
    const targetMargin = pickMargin(
      this.MARGIN_MIN,
      this.MARGIN_MAX,
      acc.eventId,
      `hdp:${line}`,
    );
    const adjusted = renormalizeOverround([home, away], targetMargin);
    return {
      line,
      home: round3(adjusted[0]),
      away: round3(adjusted[1]),
      margin: round4(targetMargin),
    };
  }

  private buildTotals(acc: MatchAccumulator): TotalsMarket | null {
    const line = pickModalLine(acc.totalsByLine);
    if (line === null) return null;
    const bag = acc.totalsByLine.get(line)!;
    const over = bestOf(bag.over);
    const under = bestOf(bag.under);
    if (over === null || under === null) return null;
    const targetMargin = pickMargin(
      this.MARGIN_MIN,
      this.MARGIN_MAX,
      acc.eventId,
      `tot:${line}`,
    );
    const adjusted = renormalizeOverround([over, under], targetMargin);
    return {
      line,
      over: round3(adjusted[0]),
      under: round3(adjusted[1]),
      margin: round4(targetMargin),
    };
  }
}

/* ─────────────────────────── 타입 ─────────────────────────── */

export type MatchStatus = 'live' | 'prematch' | 'finished' | 'unknown';

export type MoneylineMarket = {
  home: number;
  draw?: number;
  away: number;
  margin: number;
};

export type HandicapMarket = {
  line: number;
  home: number;
  away: number;
  margin: number;
};

export type TotalsMarket = {
  line: number;
  over: number;
  under: number;
  margin: number;
};

export type AggregatedMatch = {
  matchId: string;
  sport: string;
  status: MatchStatus;
  startTime: string | null;
  league: { name: string | null; nameKr: string | null; logoUrl: string | null };
  home: { name: string | null; nameKr: string | null; logoUrl: string | null };
  away: { name: string | null; nameKr: string | null; logoUrl: string | null };
  scores: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
  markets: {
    moneyline?: MoneylineMarket;
    handicap?: HandicapMarket;
    totals?: TotalsMarket;
  };
  bookies: string[];
  bookieCount: number;
  url?: string;
  lastUpdatedMs: number;
};

export type MatchesResponse = {
  status: MatchStatus | 'all';
  sport: string | null;
  total: number;
  matches: AggregatedMatch[];
};

export type OddsApiCatalogItem = {
  id: string;
  sport: string;
  home: string | null;
  away: string | null;
  league: string | null;
  date: string | null;
  status: string | null;
  scores: AggregatedMatch['scores'];
  bookmakers: Record<string, unknown>;
  fetchedAt?: string | null;
  url?: string | null;
};

type MatchAccumulator = {
  eventId: string;
  sport: string;
  home: string | null;
  away: string | null;
  league: string | null;
  startTime: string | null;
  eventStatus: string | null;
  scores: AggregatedMatch['scores'];
  url?: string;
  bookies: Set<string>;
  lastUpdatedMs: number;
  mlPrices: { home: number[]; draw: number[]; away: number[] };
  handicapByLine: Map<number, { home: number[]; away: number[] }>;
  totalsByLine: Map<number, { over: number[]; under: number[] }>;
};

type NormalizedListOptions = {
  wantStatus: MatchStatus | 'all';
  wantSport?: string;
  wantSports: string[];
  bookmakerSet: Set<string> | null;
  limit: number;
};

/* ─────────────────────────── helpers ─────────────────────────── */

function pushNum(arr: number[], v: unknown): void {
  const n = numFrom(v);
  if (n !== null && n > 1.0) arr.push(n);
}

function numFrom(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const f = parseFloat(v);
    return Number.isFinite(f) ? f : null;
  }
  return null;
}

function bestOf(arr: number[]): number | null {
  if (arr.length === 0) return null;
  let max = -Infinity;
  for (const v of arr) if (v > max) max = v;
  return max === -Infinity ? null : max;
}

/**
 * 가격 배열을 받아 마진(target overround = 1+target) 으로 재조정.
 * implied prob 의 비율은 보존, 합만 (1+target) 이 되도록 스케일 → 각 가격은 다시 1/p_new.
 */
function renormalizeOverround(
  prices: number[],
  targetMargin: number,
): number[] {
  if (prices.length === 0) return [];
  const probs = prices.map((p) => 1 / p);
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum <= 0) return prices.slice();
  const target = 1 + targetMargin;
  const scale = target / sum;
  return probs.map((p) => 1 / (p * scale));
}

/**
 * 입력 위치 [home, draw?, away] → renormalizeOverround 결과를 위치 보존하며 다시 매핑.
 * draw 가 null 이면 그 자리만 건너뛴다.
 */
function redistribute(
  raw: Array<number | null>,
  adjusted: number[],
): Array<number | null> {
  const out: Array<number | null> = [];
  let j = 0;
  for (const r of raw) {
    if (r === null || r <= 0) {
      out.push(null);
      continue;
    }
    const v = adjusted[j++];
    out.push(typeof v === 'number' ? round3(v) : null);
  }
  return out;
}

/**
 * 매치+시장 단위로 결정적인 마진을 [min, max] 사이에서 뽑는다 (해시 기반).
 * 같은 매치의 같은 시장은 항상 같은 값 → UI 가 뽀글뽀글 변하지 않음.
 */
function pickMargin(
  min: number,
  max: number,
  matchId: string,
  marketKey: string,
): number {
  const seed = hashStr(`${matchId}|${marketKey}`);
  const rand = (seed % 10_000) / 10_000;
  return min + (max - min) * rand;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * 라인별 누적기 중 "가장 많이 collect 된" 라인 1개를 뽑는다 (modal).
 * 동률이면 0 에 가까운 라인 우선 → 표준 라인이 화면에 뜨도록.
 */
function pickModalLine<T extends { home?: number[]; over?: number[] }>(
  byLine: Map<number, T>,
): number | null {
  if (byLine.size === 0) return null;
  let bestLine: number | null = null;
  let bestCount = -1;
  for (const [line, bag] of byLine) {
    const a = (bag as { home?: number[] }).home ?? (bag as { over?: number[] }).over ?? [];
    const cnt = a.length;
    if (cnt > bestCount || (cnt === bestCount && bestLine !== null && Math.abs(line) < Math.abs(bestLine))) {
      bestLine = line;
      bestCount = cnt;
    }
  }
  return bestLine;
}

export function classifyOddsApiMatchStatus(input: {
  eventStatus?: string | null;
  startTime?: string | null;
  scores?: AggregatedMatch['scores'];
}): MatchStatus {
  const s = (input.eventStatus ?? '').toLowerCase().trim();
  if (s === 'live' || s === 'in_play' || s === 'inplay' || s === 'started') return 'live';
  if (
    s === 'finished' ||
    s === 'ended' ||
    s === 'cancelled' ||
    s === 'canceled' ||
    s === 'postponed' ||
    s === 'abandoned'
  )
    return 'finished';
  if (
    s === 'prematch' ||
    s === 'pre_match' ||
    s === 'scheduled' ||
    s === 'not_started' ||
    s === 'pending'
  )
    return 'prematch';
  // 보강 status 가 없을 때: scores 가 의미있게 들어와 있으면 라이브로 간주
  if (input.scores && (input.scores.home !== null || input.scores.away !== null)) {
    return 'live';
  }
  // startTime 이 미래면 prematch, 과거면 unknown(=경기 종료 가능성, 다만 보강 전이라 확신 X)
  if (input.startTime) {
    const t = Date.parse(input.startTime);
    if (Number.isFinite(t)) {
      return t > Date.now() ? 'prematch' : 'unknown';
    }
  }
  return 'unknown';
}

function classifyStatus(acc: MatchAccumulator): MatchStatus {
  return classifyOddsApiMatchStatus({
    eventStatus: acc.eventStatus,
    startTime: acc.startTime,
    scores: acc.scores,
  });
}

function normalizeListOptions(opts: {
  status?: MatchStatus | 'all';
  sport?: string;
  sports?: string[];
  bookmakers?: string[];
  limit?: number;
}): NormalizedListOptions {
  const wantStatus = opts.status ?? 'all';
  const sportsFromList = Array.isArray(opts.sports)
    ? opts.sports.map((s) => s.trim()).filter(Boolean)
    : [];
  const wantSports = [
    ...(opts.sport?.trim() ? [opts.sport.trim()] : []),
    ...sportsFromList,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  const wantBookmakers = Array.isArray(opts.bookmakers)
    ? opts.bookmakers.map((b) => b.trim()).filter(Boolean)
    : [];
  return {
    wantStatus,
    wantSport:
      wantSports.length === 1 ? wantSports[0] : opts.sport?.trim() || undefined,
    wantSports,
    bookmakerSet:
      wantBookmakers.length > 0 ? new Set(wantBookmakers) : null,
    limit:
      typeof opts.limit === 'number' && opts.limit > 0
        ? Math.min(opts.limit, 500)
        : 200,
  };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
