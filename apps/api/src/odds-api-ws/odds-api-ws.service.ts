import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket } from 'ws';
import {
  type OddsByEvent,
  OddsApiRestService,
} from './odds-api-rest.service';

/**
 * odds-api.io WebSocket 클라이언트.
 *
 * 가이드: docs.odds-api.io  (wss://api.odds-api.io/v3/ws?apiKey=...)
 * - markets 필수 (예: ML,Spread,Totals)
 * - sport 1~10개, leagues 1~20개, eventIds 1~50개 (sport+leagues 동시 사용 가능, leagues+eventIds 는 배타)
 * - 메시지: welcome / created / updated / deleted / no_markets / resync_required
 * - 각 메시지에 seq(전역 순증) — 재접속 시 lastSeq 전달로 누락분 replay
 *
 * 본 구현은 “1~2개 종목”만 동시 구독해 보고 즉시 솔루션 페이지에 표시하기 위한 1차 버전:
 *   - 인-메모리 stateMap 에 (id, bookie) 키로 최신 마켓 보관
 *   - status / events 조회 API 만 제공, DB 기록 없음
 *   - SUPER_ADMIN 이 sports/markets/status 를 런타임에 갱신하면 재접속
 */
@Injectable()
export class OddsApiWsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(OddsApiWsService.name);

  private readonly endpoint = 'wss://api.odds-api.io/v3/ws';

  private apiKey = '';
  private sports: string[] = [];
  private markets: string[] = [];
  private statusFilter: 'live' | 'prematch' | null = null;
  private autoConnectEnabled = true;

  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private lastSeq = 0;

  private connectionState:
    | 'idle'
    | 'connecting'
    | 'open'
    | 'closed'
    | 'error' = 'idle';
  private connectedAt: Date | null = null;
  private disconnectedAt: Date | null = null;
  private lastMessageAt: Date | null = null;
  private lastError: string | null = null;
  private welcomeMessage: Record<string, unknown> | null = null;

  /** eventId → sport 캐시 (북메이커 다양성 보정용. URL 에서 한 번이라도 sport 가 추정되면 기억) */
  private eventSportCache = new Map<string, string>();

  /** REST `/v3/odds` enrichment (eventId 단위. WS 메시지에 없는 home/away/league/date/status/scores 보강) */
  private enrichMap = new Map<
    string,
    {
      home: string | null;
      away: string | null;
      league: string | null;
      date: string | null;
      status: string | null;
      scores: OddsByEvent['scores'];
      fetchedAt: number;
    }
  >();
  /** enrichment 진행중 eventId (중복 호출 방지) */
  private enrichInflight = new Set<string>();
  /** key: `${sport}:${eventId}:${bookie}` */
  private stateMap = new Map<
    string,
    {
      sport: string;
      eventId: string;
      bookie: string;
      url?: string;
      markets: unknown;
      timestamp: number;
      seq: number;
      updatedAt: Date;
    }
  >();

  private counters = {
    welcome: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    no_markets: 0,
    resync_required: 0,
    other: 0,
  };

  /** /v3/events?sport=... 주기 갱신 타이머 */
  private sportRefreshTimer: NodeJS.Timeout | null = null;
  /** 마지막 sport 새로고침 결과 요약 (콘솔 디버깅용) */
  private sportLookup: Record<
    string,
    { count: number; fetchedAt: string | null }
  > = {};

  constructor(
    private readonly config: ConfigService,
    private readonly rest: OddsApiRestService,
  ) {}

  onModuleInit() {
    this.apiKey = (this.config.get<string>('ODDS_API_KEY') || '').trim();
    this.sports = parseList(this.config.get<string>('ODDS_API_WS_SPORTS'));
    this.markets =
      parseList(this.config.get<string>('ODDS_API_WS_MARKETS')) || [];
    if (this.markets.length === 0) this.markets = ['ML', 'Spread', 'Totals'];
    const sf = (this.config.get<string>('ODDS_API_WS_STATUS') || '')
      .trim()
      .toLowerCase();
    this.statusFilter =
      sf === 'live' || sf === 'prematch' ? (sf as 'live' | 'prematch') : null;

    const autoRaw = (
      this.config.get<string>('ODDS_API_WS_AUTOCONNECT') ?? 'true'
    )
      .trim()
      .toLowerCase();
    this.autoConnectEnabled = !(
      autoRaw === '0' ||
      autoRaw === 'false' ||
      autoRaw === 'off' ||
      autoRaw === 'no'
    );

    // REST 서비스에 같은 키를 주입(REST.onModuleInit 도 .env 에서 읽지만 명시적으로 동기화)
    this.rest.setApiKey(this.apiKey);

    if (!this.apiKey) {
      this.log.warn(
        'ODDS_API_KEY 미설정 — odds-api.io WebSocket 비활성. .env 에 키를 넣고 슈퍼어드민 콘솔에서 종목을 선택하세요.',
      );
      return;
    }
    if (this.sports.length === 0) {
      this.log.log(
        'ODDS_API_WS_SPORTS 비어있음 — 슈퍼어드민에서 종목 선택 후 connect 하세요. 자동연결을 건너뜁니다.',
      );
      return;
    }
    if (this.autoConnectEnabled) {
      this.connect();
    }
    this.startSportRefresh();
  }

  onModuleDestroy() {
    this.disconnect();
    this.stopSportRefresh();
  }

  /* ─────────────────────────── public API ─────────────────────────── */

  getStatus() {
    const sportCounts: Record<string, number> = {};
    const bookieCounts: Record<string, number> = {};
    for (const ev of this.stateMap.values()) {
      sportCounts[ev.sport] = (sportCounts[ev.sport] ?? 0) + 1;
      bookieCounts[ev.bookie] = (bookieCounts[ev.bookie] ?? 0) + 1;
    }
    return {
      configured: !!this.apiKey,
      autoConnectEnabled: this.autoConnectEnabled,
      connectionState: this.connectionState,
      connectedAt: this.connectedAt?.toISOString() ?? null,
      disconnectedAt: this.disconnectedAt?.toISOString() ?? null,
      lastMessageAt: this.lastMessageAt?.toISOString() ?? null,
      reconnectAttempts: this.reconnectAttempts,
      lastSeq: this.lastSeq,
      lastError: this.lastError,
      welcome: this.welcomeMessage,
      filters: {
        sports: [...this.sports],
        markets: [...this.markets],
        status: this.statusFilter,
      },
      counters: { ...this.counters },
      stateCount: this.stateMap.size,
      sportCounts,
      bookieCounts,
      endpoint: this.endpoint,
      enrichmentCount: this.enrichMap.size,
      sportLookup: { ...this.sportLookup },
      restCache: this.rest.getCacheStats(),
    };
  }

  /**
   * 현재 in-memory 상태에서 sport 별로 이벤트 묶음을 반환.
   * sport 가 비어있으면 전부.
   */
  listEvents(opts: { sport?: string; bookie?: string; limit?: number } = {}) {
    const { sport, bookie } = opts;
    const limit =
      typeof opts.limit === 'number' && opts.limit > 0
        ? Math.min(opts.limit, 500)
        : 200;
    const filtered: Array<{
      sport: string;
      eventId: string;
      bookie: string;
      url?: string;
      markets: unknown;
      timestamp: number;
      seq: number;
      updatedAt: string;
      home: string | null;
      away: string | null;
      league: string | null;
      date: string | null;
      eventStatus: string | null;
      scores: OddsByEvent['scores'];
    }> = [];
    for (const ev of this.stateMap.values()) {
      if (sport && ev.sport !== sport) continue;
      if (bookie && ev.bookie !== bookie) continue;
      const e = this.enrichMap.get(ev.eventId);
      filtered.push({
        sport: ev.sport,
        eventId: ev.eventId,
        bookie: ev.bookie,
        url: ev.url,
        markets: ev.markets,
        timestamp: ev.timestamp,
        seq: ev.seq,
        updatedAt: ev.updatedAt.toISOString(),
        home: e?.home ?? null,
        away: e?.away ?? null,
        league: e?.league ?? null,
        date: e?.date ?? null,
        eventStatus: e?.status ?? null,
        scores: e?.scores ?? null,
      });
    }
    filtered.sort((a, b) => b.seq - a.seq);
    return {
      sport: sport ?? null,
      bookie: bookie ?? null,
      total: filtered.length,
      events: filtered.slice(0, limit),
    };
  }

  /** SUPER_ADMIN runtime config 갱신 → 재접속 */
  applyConfig(input: {
    apiKey?: string;
    sports?: string[];
    markets?: string[];
    status?: 'live' | 'prematch' | null;
    autoConnect?: boolean;
  }) {
    let changed = false;
    if (typeof input.apiKey === 'string') {
      const next = input.apiKey.trim();
      if (next !== this.apiKey) {
        this.apiKey = next;
        changed = true;
      }
    }
    if (Array.isArray(input.sports)) {
      const next = uniqClean(input.sports).slice(0, 10);
      if (next.join(',') !== this.sports.join(',')) {
        this.sports = next;
        changed = true;
      }
    }
    if (Array.isArray(input.markets)) {
      const next = uniqClean(input.markets).slice(0, 20);
      if (next.length === 0) {
        // markets is required by upstream
      } else if (next.join(',') !== this.markets.join(',')) {
        this.markets = next;
        changed = true;
      }
    }
    if (input.status === null || input.status === undefined) {
      // no-op (don't clobber unintentionally)
    } else if (input.status === 'live' || input.status === 'prematch') {
      if (this.statusFilter !== input.status) {
        this.statusFilter = input.status;
        changed = true;
      }
    }
    if (typeof input.autoConnect === 'boolean') {
      this.autoConnectEnabled = input.autoConnect;
      changed = true;
    }

    if (changed) {
      this.lastSeq = 0;
      this.stateMap.clear();
      this.eventSportCache.clear();
      this.enrichMap.clear();
      this.enrichInflight.clear();
      this.sportLookup = {};
      this.rest.setApiKey(this.apiKey);
      this.rest.clearCaches();
      this.disconnect();
      this.stopSportRefresh();
      if (
        this.autoConnectEnabled &&
        this.apiKey &&
        this.sports.length > 0 &&
        this.markets.length > 0
      ) {
        this.connect();
      }
      this.startSportRefresh();
    }
    return this.getStatus();
  }

  reconnectNow() {
    this.disconnect();
    if (
      this.apiKey &&
      this.sports.length > 0 &&
      this.markets.length > 0
    ) {
      this.connect();
    }
    this.startSportRefresh();
    return this.getStatus();
  }

  /* ─────────────────────────── internal ─────────────────────────── */

  private buildUrl(): string {
    const params = new URLSearchParams({ apiKey: this.apiKey });
    params.set('markets', this.markets.join(','));
    if (this.sports.length > 0) params.set('sport', this.sports.join(','));
    if (this.statusFilter) params.set('status', this.statusFilter);
    if (this.lastSeq > 0) params.set('lastSeq', String(this.lastSeq));
    return `${this.endpoint}?${params.toString()}`;
  }

  private connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (!this.apiKey) {
      this.lastError = 'API key not configured';
      return;
    }
    if (this.markets.length === 0) {
      this.lastError = 'markets required';
      return;
    }

    const url = this.buildUrl();
    this.connectionState = 'connecting';
    this.lastError = null;
    this.log.log(
      `connect → odds-api.io WS sports=[${this.sports.join(',')}] markets=[${this.markets.join(',')}] status=${this.statusFilter ?? '*'} lastSeq=${this.lastSeq}`,
    );

    let ws: WebSocket;
    try {
      ws = new WebSocket(url, {
        handshakeTimeout: 10_000,
      });
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      this.connectionState = 'error';
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.on('open', () => {
      this.connectionState = 'open';
      this.connectedAt = new Date();
      this.reconnectAttempts = 0;
      this.lastError = null;
      this.log.log('odds-api.io WS open');
    });

    ws.on('message', (raw) => {
      this.lastMessageAt = new Date();
      let msg: Record<string, unknown> | null = null;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        this.counters.other++;
        return;
      }
      this.handleMessage(msg);
    });

    ws.on('error', (err: Error) => {
      this.lastError = err.message;
      this.log.warn(`odds-api.io WS error: ${err.message}`);
      this.connectionState = 'error';
    });

    ws.on('close', (code, reason) => {
      this.connectionState = 'closed';
      this.disconnectedAt = new Date();
      const r = reason?.toString() ?? '';
      this.log.warn(`odds-api.io WS closed code=${code} reason=${r}`);
      this.ws = null;
      if (this.autoConnectEnabled && this.apiKey && this.sports.length > 0) {
        this.scheduleReconnect();
      }
    });
  }

  private handleMessage(msg: Record<string, unknown>) {
    const type = (msg.type as string | undefined) ?? '';
    const seq = typeof msg.seq === 'number' ? msg.seq : null;
    if (seq !== null && seq > this.lastSeq) this.lastSeq = seq;

    switch (type) {
      case 'welcome': {
        this.counters.welcome++;
        this.welcomeMessage = msg;
        return;
      }
      case 'resync_required': {
        this.counters.resync_required++;
        this.lastError = `resync_required: ${String(msg.reason ?? '')}`;
        // 1차 구현: 즉시 lastSeq=0 으로 리셋해서 새 세션 시작 (REST snapshot 이행은 추후)
        this.lastSeq = 0;
        this.stateMap.clear();
        this.eventSportCache.clear();
        this.disconnect();
        this.scheduleReconnect();
        return;
      }
      case 'created':
      case 'updated':
      case 'no_markets':
      case 'deleted':
        break;
      default:
        this.counters.other++;
        return;
    }

    const eventId = String(msg.id ?? '');
    const bookie = String(msg.bookie ?? '');
    if (!eventId || !bookie) {
      this.counters.other++;
      return;
    }
    const sport = this.guessSport(msg, eventId);
    const key = `${sport}:${eventId}:${bookie}`;

    if (type === 'deleted') {
      this.counters.deleted++;
      this.stateMap.delete(key);
      return;
    }
    if (type === 'no_markets') {
      this.counters.no_markets++;
      const existing = this.stateMap.get(key);
      this.stateMap.set(key, {
        sport,
        eventId,
        bookie,
        url: existing?.url ?? (msg.url as string | undefined),
        markets: [],
        timestamp:
          typeof msg.timestamp === 'number'
            ? msg.timestamp
            : existing?.timestamp ?? Date.now() / 1000,
        seq: seq ?? existing?.seq ?? 0,
        updatedAt: new Date(),
      });
      return;
    }

    if (type === 'created') this.counters.created++;
    else this.counters.updated++;

    const url = (msg.url as string | undefined) ?? undefined;
    const markets = (msg.markets as unknown) ?? [];
    const ts =
      typeof msg.timestamp === 'number' ? msg.timestamp : Date.now() / 1000;

    this.stateMap.set(key, {
      sport,
      eventId,
      bookie,
      url,
      markets,
      timestamp: ts,
      seq: seq ?? 0,
      updatedAt: new Date(),
    });

    // 새 eventId 면 REST 보강 비동기 트리거 (캐시/디듀프는 RestService 가 처리)
    if (!this.enrichMap.has(eventId)) {
      void this.enrichEvent(eventId);
    }

    // 가벼운 메모리 보호 — 1.5k 넘어가면 가장 오래된 200개 제거
    if (this.stateMap.size > 1500) {
      const sorted = [...this.stateMap.entries()].sort(
        (a, b) => a[1].seq - b[1].seq,
      );
      for (let i = 0; i < 200 && i < sorted.length; i++) {
        this.stateMap.delete(sorted[i][0]);
      }
    }
    // eventId→sport 캐시도 별도 한도 (북메이커가 끊겨도 다른 북메이커가 이어서 들어올 수 있어 따로 둠)
    if (this.eventSportCache.size > 5000) {
      const it = this.eventSportCache.keys();
      for (let i = 0; i < 1000; i++) {
        const next = it.next();
        if (next.done) break;
        this.eventSportCache.delete(next.value);
      }
    }
  }

  /**
   * odds-api.io 메시지에는 sport 필드가 없는 게 보통입니다.
   * 우선순위:
   *  1) explicit msg.sport (혹시 들어오면)
   *  2) eventId 캐시 (이전에 잡혔던 것)
   *  3) REST `/v3/events?sport=...` 에서 만든 sportLookup 셋 (정답)
   *  4) msg.url 의 path 세그먼트 매칭 (singbet 류)
   *  5) Bet365 hash-route B-code 매핑
   *  6) 단일 종목만 구독 중이면 그 종목
   *  7) unknown — 이후 enrichEvent() 가 결과 받아 eventSportCache 보정
   */
  private guessSport(msg: Record<string, unknown>, eventId: string): string {
    const explicit = msg.sport;
    if (typeof explicit === 'string' && explicit) {
      this.eventSportCache.set(eventId, explicit);
      return explicit;
    }

    const cached = this.eventSportCache.get(eventId);
    if (cached) return cached;

    // (3) REST 기반 sport lookup (이미 새로고침 된 sportSet 안에서 일치하면 그 종목으로)
    const fromRest = this.lookupSportFromRestSets(eventId);
    if (fromRest) {
      this.eventSportCache.set(eventId, fromRest);
      return fromRest;
    }

    const url = typeof msg.url === 'string' ? msg.url : '';
    if (url && this.sports.length > 0) {
      const fromUrl = matchSportInUrl(url, this.sports);
      if (fromUrl) {
        this.eventSportCache.set(eventId, fromUrl);
        return fromUrl;
      }
      const fromBet365 = matchSportInBet365Url(url, this.sports);
      if (fromBet365) {
        this.eventSportCache.set(eventId, fromBet365);
        return fromBet365;
      }
    }

    if (this.sports.length === 1) {
      this.eventSportCache.set(eventId, this.sports[0]);
      return this.sports[0];
    }
    return 'unknown';
  }

  /**
   * 마지막으로 새로고침된 sport→eventIds 셋 안에서 eventId 가 어느 종목에 속하는지 찾기.
   * REST 클라이언트의 캐시를 직접 들여다보지 않고, 우리도 매핑을 하나 들고 있는다 (sportLookup 메타에 count 만 노출).
   * 실제 셋은 RestService.eventsBySport 에 있으므로, 우리는 RestService.getEventIdsBySport 를 동기 cache hit 만으로 호출해서 확인한다.
   */
  private lookupSportFromRestSets(eventId: string): string | null {
    if (this.sports.length === 0) return null;
    // 동기 hit 만 사용 — fetch 트리거하지 않음. (refresh 는 startSportRefresh 가 따로 함)
    for (const sp of this.sports) {
      // RestService 캐시를 비동기 메서드로 노출했지만, 캐시 hit 시 즉시 resolve 됨.
      // 이 위치는 동기 처리가 필요해서, 우리가 별도로 들고 있는 sportEventSets 에 의존.
      const set = this.sportEventSets.get(sp);
      if (set && set.has(eventId)) return sp;
    }
    return null;
  }

  /** sport → Set<eventId> 동기 룩업용 미러 (REST 갱신 시 채워짐) */
  private sportEventSets = new Map<string, Set<string>>();

  /** REST `/v3/odds?eventId=...` 호출해서 enrichMap 채우기 + sport 도 보정 가능하면 보정 */
  private async enrichEvent(eventId: string): Promise<void> {
    if (!this.rest.hasKey()) return;
    if (this.enrichInflight.has(eventId)) return;
    this.enrichInflight.add(eventId);
    try {
      // welcome.bookmakers 가 있으면 같이 넘겨서 응답을 좁힘
      const bookies = extractWelcomeBookmakers(this.welcomeMessage);
      const data: OddsByEvent | null = await this.rest.getOdds(eventId, {
        bookies,
        ttlMs: 30_000,
      });
      if (!data) return;
      this.enrichMap.set(eventId, {
        home: data.home,
        away: data.away,
        league: data.league,
        date: data.date,
        status: data.status,
        scores: data.scores,
        fetchedAt: Date.now(),
      });
      // 가벼운 메모리 보호 — 2k 넘어가면 가장 오래된 300개 제거
      if (this.enrichMap.size > 2000) {
        const sorted = [...this.enrichMap.entries()].sort(
          (a, b) => a[1].fetchedAt - b[1].fetchedAt,
        );
        for (let i = 0; i < 300 && i < sorted.length; i++) {
          this.enrichMap.delete(sorted[i][0]);
        }
      }
    } catch (e) {
      this.log.debug?.(
        `enrichEvent(${eventId}) 실패: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.enrichInflight.delete(eventId);
    }
  }

  /**
   * 구독 중인 sport 들에 대해 `/v3/events?sport=X` 를 5분 주기로 새로고침.
   * - 결과 셋은 sportEventSets 에 저장 → guessSport 가 동기 룩업.
   * - sportLookup 메타(콘솔용)도 같이 갱신.
   * - 새로고침 후, 현재 unknown 으로 분류된 stateMap 항목들을 가능하면 재분류.
   */
  private startSportRefresh() {
    this.stopSportRefresh();
    if (!this.rest.hasKey() || this.sports.length === 0) return;
    void this.refreshSportSets();
    this.sportRefreshTimer = setInterval(
      () => void this.refreshSportSets(),
      5 * 60_000,
    );
  }

  private stopSportRefresh() {
    if (this.sportRefreshTimer) {
      clearInterval(this.sportRefreshTimer);
      this.sportRefreshTimer = null;
    }
  }

  private async refreshSportSets() {
    const bookies = extractWelcomeBookmakers(this.welcomeMessage);
    // 한 종목당 우리는 보통 1~2 북메이커 — 첫 북메이커 기준으로만 받아오면 충분히 정확
    const bookmaker = bookies[0];
    for (const sp of this.sports) {
      try {
        const set = await this.rest.getEventIdsBySport(sp, {
          bookmaker,
          ttlMs: 5 * 60_000,
        });
        this.sportEventSets.set(sp, set);
        this.sportLookup[sp] = {
          count: set.size,
          fetchedAt: new Date().toISOString(),
        };
      } catch (e) {
        this.log.warn(
          `refreshSportSets(${sp}) 실패: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    // unknown 으로 잡힌 기존 항목 재분류 (메모리 안에서만)
    let promoted = 0;
    for (const [key, ev] of this.stateMap.entries()) {
      if (ev.sport !== 'unknown') continue;
      const sp = this.lookupSportFromRestSets(ev.eventId);
      if (!sp) continue;
      this.eventSportCache.set(ev.eventId, sp);
      const newKey = `${sp}:${ev.eventId}:${ev.bookie}`;
      this.stateMap.delete(key);
      this.stateMap.set(newKey, { ...ev, sport: sp });
      promoted++;
    }
    if (promoted > 0) {
      this.log.log(`sport refresh: unknown → known 재분류 ${promoted} 건`);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (!this.autoConnectEnabled) return;
    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, Math.min(this.reconnectAttempts, 6)),
      30_000,
    );
    this.log.log(
      `reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        ws.removeAllListeners();
      } catch {
        /* ignore */
      }
      try {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {
        /* ignore */
      }
    }
    this.connectionState = 'closed';
  }
}

function parseList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return uniqClean(raw.split(','));
}

/**
 * URL 에서 구독 sport 슬러그가 path 세그먼트(또는 그 변형)로 등장하면 그 종목 반환.
 * - 대소문자 무시
 * - 'football' ↔ 'soccer' 양방향 alias
 * - 다중 단어 슬러그 (예: 'ice-hockey') 도 그대로 매칭, 'icehockey' / 'ice_hockey' 도 같이 매칭
 */
function matchSportInUrl(url: string, sports: string[]): string | null {
  let path = url.toLowerCase();
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    /* keep raw */
  }
  const segs = path.split(/[/?#&=]+/).filter(Boolean);
  const segSet = new Set(segs);

  for (const sport of sports) {
    const variants = sportSlugVariants(sport);
    for (const v of variants) {
      if (segSet.has(v)) return sport;
    }
  }
  return null;
}

/**
 * Bet365 URL: `https://bet365.com/#/AC/B{sportCode}/C{competition}/D{type}/E{eventId}/...`
 * pathname 에는 sport 가 없고 hash 에 들어 있어 별도 처리.
 *
 * Bet365 내부 sport 코드(B-code) → 우리가 쓰는 odds-api sport slug 매핑.
 * (가장 많이 마주치는 코드 위주. 누락된 종목은 추가만 해주면 됨.)
 */
const BET365_SPORT_CODE_MAP: Record<string, string> = {
  B1: 'football', // Soccer (odds-api 슬러그는 'football')
  B3: 'cricket',
  B4: 'horse-racing',
  B12: 'american-football',
  B13: 'tennis',
  B16: 'baseball',
  B17: 'ice-hockey',
  B18: 'basketball',
  B40: 'snooker',
  B66: 'boxing',
  B78: 'handball',
  B83: 'futsal',
  B91: 'volleyball',
  B92: 'table-tennis',
  B94: 'darts',
  B95: 'rugby-union',
  B107: 'aussie-rules',
  B109: 'cycling',
  B110: 'esports',
  B151: 'esports',
  B161: 'mma',
};

function matchSportInBet365Url(url: string, sports: string[]): string | null {
  const lower = url.toLowerCase();
  if (!lower.includes('bet365.')) return null;

  // pathname/hash 어느 쪽에 있어도 잡히게 통째로 정규식으로 B{숫자} 추출
  const m = url.match(/\/B(\d+)\b/);
  if (!m) return null;
  const code = `B${m[1]}`;
  const slug = BET365_SPORT_CODE_MAP[code];
  if (!slug) return null;

  const variants = sportSlugVariants(slug);
  for (const sub of sports) {
    const subVariants = sportSlugVariants(sub);
    for (const v of variants) {
      if (subVariants.includes(v)) return sub;
    }
  }
  return null;
}

function sportSlugVariants(slug: string): string[] {
  const s = slug.toLowerCase();
  const out = new Set<string>([s]);
  out.add(s.replace(/-/g, ''));
  out.add(s.replace(/-/g, '_'));
  if (s === 'football') out.add('soccer');
  if (s === 'soccer') out.add('football');
  if (s === 'ice-hockey') {
    out.add('hockey');
    out.add('icehockey');
  }
  if (s === 'esports') {
    out.add('e-sports');
  }
  if (s === 'mma') out.add('ufc');
  return [...out];
}

function extractWelcomeBookmakers(
  welcome: Record<string, unknown> | null,
): string[] {
  if (!welcome) return [];
  const v = (welcome as { bookmakers?: unknown }).bookmakers;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

function uniqClean(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const t = (v ?? '').toString().trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
