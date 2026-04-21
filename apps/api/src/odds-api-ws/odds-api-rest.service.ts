import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * odds-api.io REST 클라이언트.
 *
 * 가이드: docs.odds-api.io  (https://api.odds-api.io/v3)
 *
 * 본 서비스 책임:
 *  1) `/v3/odds?eventId=...` — 단일 이벤트의 home/away/league/date/status 와 multi-bookmaker odds 를
 *     "스냅샷" 으로 가져와서 WS 가 아직 못 보낸 시장까지 채울 수 있게 함 (이벤트 카드 enrichment).
 *  2) `/v3/events?sport=football&bookmaker=Bet365` — 종목별 활성 eventId 셋을 받아와서, WS 메시지의
 *     sport 가 unknown 일 때 정답으로 매핑.
 *
 * 가이드 권장 캐시 TTL:
 *  - sports list: 1h+
 *  - events list: 5–10min
 *  - live odds  : 5–10s
 *  - prematch   : 30–60s
 *
 * 단순 인-메모리 캐시 + single-flight 디듀프 + (보수적) 30 req/min 레이트리밋. 키 노출 방지를 위해
 * 공개 컨트롤러에는 직접 호출 노출하지 않고, WS 서비스 내부에서만 사용한다.
 */
@Injectable()
export class OddsApiRestService {
  private readonly log = new Logger(OddsApiRestService.name);
  private readonly base = 'https://api.odds-api.io/v3';

  private apiKey = '';

  /** /v3/odds?eventId 캐시 */
  private oddsCache = new Map<
    string,
    { data: OddsByEvent | null; fetchedAt: number; until: number }
  >();
  /** /v3/odds 진행중 promise (single-flight) */
  private oddsInflight = new Map<string, Promise<OddsByEvent | null>>();

  /** sport → Set<eventId> 캐시 */
  private eventsBySport = new Map<
    string,
    { ids: Set<string>; fetchedAt: number; until: number }
  >();
  /** /v3/events sport refresh single-flight */
  private eventsInflight = new Map<string, Promise<Set<string>>>();

  /** 슬라이딩 윈도우 레이트리밋 (보수적: 분당 30회) */
  private callTimes: number[] = [];
  private readonly MAX_PER_MIN = 30;

  /** 가벼운 차단 — 429 가 와도 잠시 쉼 */
  private cooldownUntil = 0;

  constructor(private readonly config: ConfigService) {}

  setApiKey(key: string) {
    this.apiKey = (key || '').trim();
  }

  hasKey(): boolean {
    return !!this.apiKey;
  }

  onModuleInit() {
    this.apiKey = (this.config.get<string>('ODDS_API_KEY') || '').trim();
  }

  /**
   * 단일 이벤트 enrich. 캐시 hit 또는 inflight 면 그대로 반환.
   * @param eventId odds-api eventId
   * @param bookies 비우면 odds-api 기본값. 보통 우리는 Bet365,Sbobet 등 구독 북메이커 그대로 전달
   * @param ttlMs 기본 30s (라이브 가정). prematch 면 60s 권장
   */
  async getOdds(
    eventId: string,
    opts: { bookies?: string[]; ttlMs?: number } = {},
  ): Promise<OddsByEvent | null> {
    if (!this.apiKey || !eventId) return null;
    const ttl = opts.ttlMs ?? 30_000;
    const bookieKey = (opts.bookies ?? []).slice().sort().join(',');
    const cacheKey = `${eventId}|${bookieKey}`;

    const cached = this.oddsCache.get(cacheKey);
    const now = Date.now();
    if (cached && now < cached.until) return cached.data;

    const inflight = this.oddsInflight.get(cacheKey);
    if (inflight) return inflight;

    const p = (async () => {
      try {
        const params = new URLSearchParams({
          apiKey: this.apiKey,
          eventId,
        });
        if (opts.bookies && opts.bookies.length > 0) {
          params.set('bookmakers', opts.bookies.join(','));
        }
        const data = await this.fetchJson(`/odds?${params.toString()}`);
        const parsed = parseOddsResponse(data);
        this.oddsCache.set(cacheKey, {
          data: parsed,
          fetchedAt: now,
          until: now + ttl,
        });
        return parsed;
      } catch (e) {
        this.log.warn(
          `getOdds(${eventId}) 실패: ${e instanceof Error ? e.message : String(e)}`,
        );
        // negative-cache (실패도 짧게 캐시해서 다른 북메이커 들어올 때마다 폭주 방지)
        this.oddsCache.set(cacheKey, {
          data: null,
          fetchedAt: now,
          until: now + Math.min(ttl, 15_000),
        });
        return null;
      } finally {
        this.oddsInflight.delete(cacheKey);
      }
    })();
    this.oddsInflight.set(cacheKey, p);
    return p;
  }

  /**
   * 종목별 활성 이벤트 ID Set. 캐시 hit 면 그대로 반환.
   * @param sport odds-api sport slug (e.g. football)
   * @param ttlMs 기본 5분
   */
  async getEventIdsBySport(
    sport: string,
    opts: { bookmaker?: string; ttlMs?: number } = {},
  ): Promise<Set<string>> {
    if (!this.apiKey || !sport) return new Set();
    const ttl = opts.ttlMs ?? 5 * 60_000;
    const cacheKey = `${sport}|${opts.bookmaker ?? ''}`;

    const cached = this.eventsBySport.get(cacheKey);
    const now = Date.now();
    if (cached && now < cached.until) return cached.ids;

    const inflight = this.eventsInflight.get(cacheKey);
    if (inflight) return inflight;

    const p = (async () => {
      try {
        const params = new URLSearchParams({
          apiKey: this.apiKey,
          sport,
        });
        if (opts.bookmaker) params.set('bookmaker', opts.bookmaker);
        const data = await this.fetchJson(`/events?${params.toString()}`);
        const ids = parseEventsList(data);
        const set = new Set(ids);
        this.eventsBySport.set(cacheKey, {
          ids: set,
          fetchedAt: now,
          until: now + ttl,
        });
        return set;
      } catch (e) {
        this.log.warn(
          `getEventIdsBySport(${sport}) 실패: ${e instanceof Error ? e.message : String(e)}`,
        );
        // 실패도 60s 쿨다운으로 캐시 — 폭주 방지
        const fallback = cached?.ids ?? new Set<string>();
        this.eventsBySport.set(cacheKey, {
          ids: fallback,
          fetchedAt: now,
          until: now + 60_000,
        });
        return fallback;
      } finally {
        this.eventsInflight.delete(cacheKey);
      }
    })();
    this.eventsInflight.set(cacheKey, p);
    return p;
  }

  /** 캐시 전체 클리어 (재구독 직후 등) */
  clearCaches() {
    this.oddsCache.clear();
    this.oddsInflight.clear();
    this.eventsBySport.clear();
    this.eventsInflight.clear();
  }

  /** 진단용 */
  getCacheStats() {
    return {
      odds: this.oddsCache.size,
      eventsBySport: this.eventsBySport.size,
      callsLastMinute: this.recentCallCount(),
      cooldownMs: Math.max(0, this.cooldownUntil - Date.now()),
    };
  }

  async listSports(): Promise<OddsApiSportItem[]> {
    const data = await this.fetchJson('/sports');
    return parseArrayItems(data).map((x) => ({
      id: String(x.id ?? ''),
      name: typeof x.name === 'string' ? x.name : null,
      slug: typeof x.slug === 'string' ? x.slug : null,
    }));
  }

  async listBookmakers(): Promise<OddsApiBookmakerItem[]> {
    const data = await this.fetchJson('/bookmakers');
    return parseArrayItems(data).map((x) => ({
      id: String(x.id ?? ''),
      name: typeof x.name === 'string' ? x.name : null,
      slug: typeof x.slug === 'string' ? x.slug : null,
    }));
  }

  async listSelectedBookmakers(): Promise<OddsApiBookmakerItem[]> {
    if (!this.apiKey) return [];
    const q = new URLSearchParams({ apiKey: this.apiKey });
    const data = await this.fetchJson(`/bookmakers/selected?${q.toString()}`);
    return parseArrayItems(data).map((x) => ({
      id: String(x.id ?? ''),
      name: typeof x.name === 'string' ? x.name : null,
      slug: typeof x.slug === 'string' ? x.slug : null,
    }));
  }

  async listEventsBySport(
    sport: string,
    opts: { limit?: number } = {},
  ): Promise<OddsApiEventItem[]> {
    if (!this.apiKey) return [];
    const q = new URLSearchParams({
      apiKey: this.apiKey,
      sport,
      limit: String(Math.min(Math.max(opts.limit ?? 200, 1), 1000)),
    });
    const data = await this.fetchJson(`/events?${q.toString()}`);
    return parseArrayItems(data).map((x) => ({
      id: String(x.id ?? ''),
      home: readNamedText(x.home),
      away: readNamedText(x.away),
      league: readNamedText(x.league) ?? readNamedText(x.tournament),
      date: typeof x.date === 'string' ? x.date : null,
      status: typeof x.status === 'string' ? x.status : null,
      sport,
    }));
  }

  async getMultiOdds(
    eventIds: string[],
    bookmakers: string[],
  ): Promise<OddsByEvent[]> {
    if (!this.apiKey || eventIds.length === 0) return [];
    const ids = eventIds.slice(0, 10).join(',');
    const q = new URLSearchParams({
      apiKey: this.apiKey,
      eventIds: ids,
    });
    if (bookmakers.length > 0) {
      q.set('bookmakers', bookmakers.join(','));
    }
    const data = await this.fetchJson(`/odds/multi?${q.toString()}`);
    return parseArrayItems(data)
      .map((x) => parseOddsResponse(x))
      .filter((x): x is OddsByEvent => x !== null);
  }

  /* ─────────────────────────── internal ─────────────────────────── */

  private recentCallCount(): number {
    const cutoff = Date.now() - 60_000;
    this.callTimes = this.callTimes.filter((t) => t >= cutoff);
    return this.callTimes.length;
  }

  private async takeSlot(): Promise<void> {
    const now = Date.now();
    if (now < this.cooldownUntil) {
      const wait = this.cooldownUntil - now;
      await sleep(wait);
    }
    while (this.recentCallCount() >= this.MAX_PER_MIN) {
      const oldest = this.callTimes[0] ?? Date.now();
      const wait = Math.max(50, oldest + 60_000 - Date.now());
      await sleep(wait);
    }
    this.callTimes.push(Date.now());
  }

  private async fetchJson(
    pathAndQuery: string,
  ): Promise<Record<string, unknown>> {
    await this.takeSlot();
    const url = `${this.base}${pathAndQuery}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: ac.signal,
        headers: { Accept: 'application/json' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 429) {
      // Retry-After 또는 5s 쿨다운
      const ra = Number(res.headers.get('retry-after') ?? '0');
      const cd = (Number.isFinite(ra) && ra > 0 ? ra : 5) * 1000;
      this.cooldownUntil = Date.now() + cd;
      throw new Error(`HTTP 429 rate-limited (cooldown ${cd}ms)`);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as Record<string, unknown>;
  }
}

/* ─────────────────────────── shapes ─────────────────────────── */

export type OddsByEvent = {
  id: string;
  home: string | null;
  away: string | null;
  league: string | null;
  date: string | null;
  status: string | null;
  /** 라이브 스코어 (해당 응답에 들어 있을 때) — periods 키는 종목마다 다름 (p1/p2/p3/p4/fulltime/overtime …) */
  scores: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
  /** 이번 enrichment 호출 시점에 odds-api 가 알려준 풀 마켓 (북메이커별) */
  bookmakers: Record<string, unknown>;
};

export type OddsApiSportItem = {
  id: string;
  name: string | null;
  slug: string | null;
};

export type OddsApiBookmakerItem = {
  id: string;
  name: string | null;
  slug: string | null;
};

export type OddsApiEventItem = {
  id: string;
  sport: string;
  home: string | null;
  away: string | null;
  league: string | null;
  date: string | null;
  status: string | null;
};

function parseOddsResponse(d: unknown): OddsByEvent | null {
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  const id = o.id;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    home: readNamedText(o.home),
    away: readNamedText(o.away),
    league: readNamedText(o.league) ?? readNamedText(o.tournament),
    date: typeof o.date === 'string' ? o.date : null,
    status: typeof o.status === 'string' ? o.status : null,
    scores: parseScores(o.scores),
    bookmakers:
      o.bookmakers && typeof o.bookmakers === 'object'
        ? (o.bookmakers as Record<string, unknown>)
        : {},
  };
}

function parseScores(v: unknown): OddsByEvent['scores'] {
  if (!v || typeof v !== 'object') return null;
  const s = v as Record<string, unknown>;
  const home = typeof s.home === 'number' ? s.home : null;
  const away = typeof s.away === 'number' ? s.away : null;
  const periods: Record<string, { home: number; away: number }> = {};
  const rawPeriods = s.periods;
  if (rawPeriods && typeof rawPeriods === 'object') {
    for (const [k, p] of Object.entries(rawPeriods as Record<string, unknown>)) {
      if (!p || typeof p !== 'object') continue;
      const ph = (p as { home?: unknown }).home;
      const pa = (p as { away?: unknown }).away;
      if (typeof ph === 'number' && typeof pa === 'number') {
        periods[k] = { home: ph, away: pa };
      }
    }
  }
  if (home === null && away === null && Object.keys(periods).length === 0)
    return null;
  return { home, away, periods };
}

function parseEventsList(d: unknown): string[] {
  // 가이드 응답이 array 일 수도, { events: [...] } 일 수도 있어 양쪽 다 허용
  const arr = Array.isArray(d)
    ? d
    : Array.isArray((d as { events?: unknown }).events)
      ? ((d as { events: unknown[] }).events as unknown[])
      : [];
  const ids: string[] = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const id = (it as { id?: unknown }).id;
    if (id !== undefined && id !== null) ids.push(String(id));
  }
  return ids;
}

function parseArrayItems(d: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(d)) {
    return d.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  }
  if (d && typeof d === 'object') {
    const o = d as { data?: unknown; items?: unknown };
    if (Array.isArray(o.data)) {
      return o.data.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
    }
    if (Array.isArray(o.items)) {
      return o.items.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
    }
  }
  return [];
}

function readNamedText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  const name = (value as { name?: unknown }).name;
  return typeof name === 'string' ? name : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}
