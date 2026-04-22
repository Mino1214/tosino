import type { CasinoLobbyCatalog } from "@tosino/shared";

const ENV_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api"
).replace(/\/$/, "");
const AUTH_CHANGED_EVENT = "tosino:auth-changed";

function trimApiBase(s: string | undefined): string {
  return (s || "").replace(/\/$/, "").trim();
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function envLooksLikeLocalNestApi(base: string): boolean {
  try {
    const u = new URL(base);
    return (
      u.protocol === "http:" &&
      /^(127\.0\.0\.1|localhost)$/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * API 베이스 URL.
 * - `NEXT_PUBLIC_DIRECT_API_URL` 이 있으면(빌드에 박힘) 클라이언트에서 최우선 — LAN·정적 serve 등 직통 Nest URL.
 * - `NEXT_PUBLIC_USE_SAME_ORIGIN_API=true` 이면 보통 `현재 호스트 + /api` (nginx 가 /api 프록시).
 * - 다만 localhost/127 로 `serve out` 만 켠 경우 `/api` 는 404 이므로 Nest(:4001) 로 직통.
 * - 운영 도메인(demo1 등)은 그대로 `origin + /api`.
 */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const direct = trimApiBase(process.env.NEXT_PUBLIC_DIRECT_API_URL);
    if (direct) return direct;
  }

  const same =
    process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API === "1" ||
    process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API === "true";

  if (same && typeof window !== "undefined") {
    if (isLoopbackHostname(window.location.hostname)) {
      if (envLooksLikeLocalNestApi(ENV_API_BASE)) {
        return ENV_API_BASE;
      }
      const p = process.env.NEXT_PUBLIC_API_LOOPBACK_PORT || "4001";
      return `http://127.0.0.1:${p}/api`;
    }
    return `${window.location.origin}/api`;
  }
  return ENV_API_BASE;
}

/** 호스트 기반 또는 NEXT_PUBLIC_PREVIEW_PORT 기반 공개 API 쿼리 */
export function buildPublicApiQuery(host: string): URLSearchParams {
  const port = process.env.NEXT_PUBLIC_PREVIEW_PORT;
  if (port) {
    const q = new URLSearchParams({ port });
    const secret = process.env.NEXT_PUBLIC_PREVIEW_BOOTSTRAP_SECRET;
    if (secret) q.set("previewSecret", secret);
    return q;
  }
  return new URLSearchParams({ host });
}

/** 로그인·공개 가입 시 API가 플랫폼을 식별하도록 동일 규칙을 body에 넣습니다 */
export function buildLoginPlatformBody(host: string): Record<string, unknown> {
  const port = process.env.NEXT_PUBLIC_PREVIEW_PORT;
  if (port) {
    const body: Record<string, unknown> = { port: Number(port) };
    const secret = process.env.NEXT_PUBLIC_PREVIEW_BOOTSTRAP_SECRET;
    if (secret) body.previewSecret = secret;
    return body;
  }
  return { host };
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setSession(data: {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));
  emitAuthChanged();
}

export function subscribeAuthChange(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = () => listener();
  window.addEventListener(AUTH_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  emitAuthChanged();
}

let refreshInFlight: Promise<boolean> | null = null;

function skipRefreshOn401(path: string): boolean {
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/bootstrap")
  );
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const rt = localStorage.getItem("refreshToken");
  if (!rt) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      emitAuthChanged();
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const run = async (isRetry: boolean): Promise<T> => {
    const token = getAccessToken();
    const headers = new Headers(opts.headers);
    if (!headers.has("Content-Type") && opts.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${getApiBase()}${path}`, { ...opts, headers });
    if (res.status === 401) {
      if (!skipRefreshOn401(path) && !isRetry) {
        const refreshed = await tryRefreshAccessToken();
        if (refreshed) return run(true);
      }
      clearSession();
    }
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = (await res.json()) as { message?: string | string[] };
        if (typeof j.message === "string") msg = j.message;
        else if (Array.isArray(j.message)) msg = j.message.join(", ");
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  };
  return run(false);
}

export async function fetchCasinoLobbyCatalog() {
  return apiFetch<CasinoLobbyCatalog>("/public/casino/catalog", {
    cache: "no-store",
  });
}

export async function fetchReferral(code: string, host: string) {
  const q = buildPublicApiQuery(host);
  q.set("code", code.trim());
  const res = await fetch(`${getApiBase()}/public/referral?${q}`, { cache: "no-store" });
  if (!res.ok) {
    let msg = "가입코드 또는 추천인 아이디를 확인할 수 없습니다";
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (typeof j.message === "string") msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<{
    valid: boolean;
    platformName: string;
    resolvedBy?: "signup_code" | "login_id";
    referrerLoginId?: string | null;
  }>;
}

export type PublicRegisterBody = {
  loginId: string;
  password: string;
  signupKey: string;
  displayName?: string;
  contactEmail?: string;
  signupMode?: "full" | "anonymous";
  telegramUsername?: string;
  phone?: string;
  telecomCompany?: string;
  birthDate?: string;
  gender?: string;
  bankCode?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  exchangePin?: string;
  usdtWalletAddress?: string;
};

export async function publicRegister(body: PublicRegisterBody, host: string) {
  const res = await fetch(`${getApiBase()}/public/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginId: body.loginId.trim().toLowerCase(),
      password: body.password,
      signupKey: body.signupKey.trim(),
      displayName: body.displayName,
      signupMode: body.signupMode,
      telegramUsername: body.telegramUsername?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      telecomCompany: body.telecomCompany || undefined,
      birthDate: body.birthDate?.trim() || undefined,
      gender: body.gender || undefined,
      bankCode: body.bankCode || undefined,
      bankAccountNumber: body.bankAccountNumber?.trim() || undefined,
      bankAccountHolder: body.bankAccountHolder?.trim() || undefined,
      exchangePin: body.exchangePin || undefined,
      usdtWalletAddress: body.usdtWalletAddress?.trim() || undefined,
      ...(body.contactEmail?.trim()
        ? { contactEmail: body.contactEmail.trim().toLowerCase() }
        : {}),
      ...buildLoginPlatformBody(host),
    }),
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (typeof j.message === "string") msg = j.message;
      else if (Array.isArray(j.message)) msg = j.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<{ ok: boolean; message: string }>;
}

export type BootstrapThemeUi = {
  headerStyle: string;
  homeLayout: string;
  cardRadius: string;
  density: string;
  background: string;
};

export async function fetchBootstrap(host: string) {
  const q = buildPublicApiQuery(host);
  const res = await fetch(`${getApiBase()}/public/bootstrap?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (typeof j.message === "string") detail = j.message;
      else if (Array.isArray(j.message)) detail = j.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(`Bootstrap failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<{
    platformId: string;
    slug: string;
    name: string;
    previewPort: number | null;
    theme: {
      primaryColor: string;
      logoUrl: string | null;
      siteName: string;
      bannerUrls: string[];
      ui: BootstrapThemeUi;
    };
    flags: Record<string, unknown>;
    sportsSections: {
      domestic: { id: string; sportLabel: string }[];
      european: { id: string; sportLabel: string }[];
      unset: { id: string; sportLabel: string }[];
    };
    oddsApi?: {
      enabled: boolean;
      sports: string[];
      bookmakers: string[];
      status: "all" | "live" | "prematch";
      cacheTtlSeconds: number;
      matchLimit: number;
      betSlipTemplate: {
        title: string;
        subtitle: string;
        quickAmounts: number[];
        marketPriority: Array<"moneyline" | "handicap" | "totals">;
        showBookmakerCount: boolean;
        showSourceBookmaker: boolean;
      };
    } | null;
    walletRules: {
      minDepositKrw: string | null;
      minDepositUsdt: string | null;
      minWithdrawKrw: string | null;
      minWithdrawUsdt: string | null;
      minPointRedeemPoints: number | null;
      minPointRedeemKrw: string | null;
      minPointRedeemUsdt: string | null;
      rollingLockWithdrawals: boolean;
      rollingTurnoverMultiplier: string | null;
      agentCanEditMemberRolling: boolean;
    };
    announcements: {
      modalEnabled: boolean;
      items: {
        id: string;
        imageUrl: string;
        width: number | null;
        height: number | null;
        mandatoryRead?: boolean;
      }[];
    };
    oddshostProxySecret: string | null;
    /** 구 API에는 없을 수 있음 */
    oddshost?: {
      keyConfigured: boolean;
      prematchConfigured: boolean;
      marketsConfigured: boolean;
    };
  }>;
}

export type PublicSportsOddsFeed = {
  sourceFeedId: string;
  sportLabel: string;
  market: string | null;
  fetchedAt: string;
  payload: unknown;
};

export async function fetchSportsOdds(host: string) {
  const q = buildPublicApiQuery(host);
  const res = await fetch(`${getApiBase()}/public/sports-odds?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (typeof j.message === "string") detail = j.message;
      else if (Array.isArray(j.message)) detail = j.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(`sports-odds failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<{
    platformSlug: string;
    feeds: PublicSportsOddsFeed[];
  }>;
}

export type SportsLiveGameDto = {
  game_id: string;
  status: string;
  start_ts: string;
  competition_id: string;
  competition_name: string;
  competition_name_kor: string;
  competition_cc_name: string;
  competition_cc_name_kor: string;
  team: [
    {
      team1_id: string;
      team1_name: string;
      team1_name_kor: string;
      team1_img?: string;
    },
    {
      team2_id: string;
      team2_name: string;
      team2_name_kor: string;
      team2_img?: string;
    },
  ];
  location: string;
  round: string;
  series: string;
  timer?: { time_mark: string; time_mark_kor: string };
  score: string;
  update_time: string;
  /** 북메이커·OddsHost 라이브/상세 페이지 (있으면 카드에 외부 링크) */
  live_ui_url?: string;
  /** 스냅샷에 실린 승무패 배당 (없으면 UI에서 안내용 플레이스홀더) */
  odds_1x2?: { home: string; draw?: string; away: string };
};

export async function fetchSportsLive(host: string) {
  const q = buildPublicApiQuery(host);
  const res = await fetch(`${getApiBase()}/public/sports-live?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (typeof j.message === "string") detail = j.message;
      else if (Array.isArray(j.message)) detail = j.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(`sports-live failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<{
    success: number;
    total: number;
    fetchedAt: string | null;
    game: SportsLiveGameDto[];
  }>;
}

/* ─── odds-api.io WebSocket (live odds feed) — public read endpoints ─── */

export type OddsApiWsStatus = {
  configured: boolean;
  connectionState: "idle" | "connecting" | "open" | "closed" | "error";
  connectedAt: string | null;
  lastMessageAt: string | null;
  lastSeq: number;
  stateCount: number;
  filters: {
    sports: string[];
    markets: string[];
    status: "live" | "prematch" | null;
  };
  snapshot?: {
    liveFetchedAt: string | null;
    prematchFetchedAt: string | null;
    bookmakers: string[];
    matchLimit: number | null;
    cacheTtlSeconds: number | null;
  };
};

export type OddsApiWsEvent = {
  sport: string;
  eventId: string;
  bookie: string;
  url?: string;
  markets: unknown;
  timestamp: number;
  seq: number;
  updatedAt: string;
  /** REST `/v3/odds` 보강. 들어올 때까지 잠시 null 일 수 있음. */
  home?: string | null;
  away?: string | null;
  league?: string | null;
  date?: string | null;
  eventStatus?: string | null;
  /** 라이브 스코어 (REST 보강에 들어 있을 때) */
  scores?: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
};

export async function fetchOddsApiWsStatus(
  host?: string,
): Promise<OddsApiWsStatus> {
  const q = host ? buildPublicApiQuery(host) : new URLSearchParams();
  const res = await fetch(`${getApiBase()}/public/odds-api-ws/status?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`odds-api-ws status (${res.status})`);
  return res.json() as Promise<OddsApiWsStatus>;
}

export async function fetchOddsApiWsEvents(opts: {
  sport?: string;
  bookie?: string;
  limit?: number;
} = {}): Promise<{
  sport: string | null;
  bookie: string | null;
  total: number;
  events: OddsApiWsEvent[];
}> {
  const q = new URLSearchParams();
  if (opts.sport) q.set("sport", opts.sport);
  if (opts.bookie) q.set("bookie", opts.bookie);
  if (opts.limit) q.set("limit", String(opts.limit));
  const res = await fetch(
    `${getApiBase()}/public/odds-api-ws/events?${q}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`odds-api-ws events (${res.status})`);
  return res.json();
}

/* ─── 집계 응답 (Phase 1+2 — 매치 단위, 한글 보강, 마진 9.95~10.1% 재조정) ─── */

export type AggregatedMatchStatus = "live" | "prematch" | "finished" | "unknown";

export type AggregatedMoneyline = {
  home: number;
  draw?: number;
  away: number;
  margin: number;
};
export type AggregatedHandicap = {
  line: number;
  home: number;
  away: number;
  margin: number;
};
export type AggregatedTotals = {
  line: number;
  over: number;
  under: number;
  margin: number;
};

export type AggregatedHandicapLine = AggregatedHandicap & { primary: boolean };
export type AggregatedTotalsLine = AggregatedTotals & { primary: boolean };

/** 스페셜 마켓 (Draw No Bet / BTTS / European Handicap / HTFT 등) — 원본 pass-through */
export type AggregatedExtraOutcome = {
  key: string;
  label?: string | null;
  price: number;
};
export type AggregatedExtraLine = {
  hdp?: number | null;
  label?: string | null;
  outcomes: AggregatedExtraOutcome[];
};
export type AggregatedExtraMarket = {
  name: string;
  lines: AggregatedExtraLine[];
};

export type AggregatedMatch = {
  matchId: string;
  sport: string;
  status: AggregatedMatchStatus;
  startTime: string | null;
  kickoffUtc?: string | null;
  kickoffKst?: string | null;
  league: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    slug?: string | null;
  };
  home: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    externalId?: number | null;
  };
  away: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    externalId?: number | null;
  };
  scores: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
  markets: {
    moneyline?: AggregatedMoneyline;
    handicap?: AggregatedHandicap;
    totals?: AggregatedTotals;
    handicapLines?: AggregatedHandicapLine[];
    totalsLines?: AggregatedTotalsLine[];
    extras?: Record<string, AggregatedExtraMarket>;
  };
  bookies: string[];
  bookieCount: number;
  url?: string;
  lastUpdatedMs: number;
};

export type AggregatedMatchesResponse = {
  status: AggregatedMatchStatus | "all";
  sport: string | null;
  total: number;
  matches: AggregatedMatch[];
  fetchedAt?: string;
  filters?: {
    sports: string[];
    bookmakers: string[];
    matchLimit: number;
    cacheTtlSeconds: number;
  };
};

export async function fetchOddsApiMatches(opts: {
  host?: string;
  status?: AggregatedMatchStatus | "all";
  sport?: string;
  limit?: number;
} = {}): Promise<AggregatedMatchesResponse> {
  const q = opts.host ? buildPublicApiQuery(opts.host) : new URLSearchParams();
  if (opts.status) q.set("status", opts.status);
  if (opts.sport) q.set("sport", opts.sport);
  if (opts.limit) q.set("limit", String(opts.limit));
  const res = await fetch(
    `${getApiBase()}/public/odds-api-ws/matches?${q}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`odds-api-ws matches (${res.status})`);
  return res.json();
}

function appendOddsHostSecret(
  q: URLSearchParams,
  oddshostSecret?: string,
): URLSearchParams {
  const next = new URLSearchParams(q.toString());
  if (oddshostSecret) next.set("oddshostSecret", oddshostSecret);
  return next;
}

/**
 * (선택) 빌드에만 박는 폴백. 우선순위는 `GET /public/bootstrap` 의 `oddshostProxySecret` 입니다.
 */
export function defaultOddshostProxySecretFromEnv(): string {
  return (process.env.NEXT_PUBLIC_ODDSHOST_PROXY_SECRET || "").trim();
}

/** Nest OddsHost 프록시 (허용 IP·환경변수 설정 시). oddshostSecret 은 ODDSHOST_PROXY_SECRET 과 일치해야 함. */
export async function fetchOddsHostInplayList(
  host: string,
  sport: string,
  oddshostSecret?: string,
) {
  const q = appendOddsHostSecret(buildPublicApiQuery(host), oddshostSecret);
  q.set("sport", sport);
  const res = await fetch(
    `${getApiBase()}/public/oddshost/inplay-list?${q}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oddshost inplay-list (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

export async function fetchOddsHostInplayGame(
  host: string,
  sport: string,
  gameId: string,
  oddshostSecret?: string,
) {
  const q = appendOddsHostSecret(buildPublicApiQuery(host), oddshostSecret);
  q.set("sport", sport);
  q.set("game_id", gameId);
  const res = await fetch(
    `${getApiBase()}/public/oddshost/inplay-game?${q}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oddshost inplay-game (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

/** GET /public/oddshost/diagnostic — API 서버에서 URL 조합·(선택) 업스트림 GET 결과 */
export async function fetchOddsHostDiagnostic(
  host: string,
  sport: string,
  oddshostSecret?: string,
  probe = false,
) {
  const q = appendOddsHostSecret(buildPublicApiQuery(host), oddshostSecret);
  q.set("sport", sport);
  if (probe) q.set("probe", "1");
  const res = await fetch(
    `${getApiBase()}/public/oddshost/diagnostic?${q}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oddshost diagnostic (${res.status}): ${t.slice(0, 400)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function fetchOddsHostPrematch(
  host: string,
  sport: string,
  oddshostSecret?: string,
  extraQuery?: Record<string, string>,
) {
  const q = appendOddsHostSecret(buildPublicApiQuery(host), oddshostSecret);
  q.set("sport", sport);
  if (extraQuery) {
    for (const [k, v] of Object.entries(extraQuery)) {
      if (v !== undefined && v !== "") q.set(k, v);
    }
  }
  const res = await fetch(
    `${getApiBase()}/public/oddshost/prematch?${q}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oddshost prematch (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

/** OddsHost 마켓 피드(오즈마켓). API에 ODDSHOST_TEMPLATE_MARKETS 또는 PATH 필요 */
export async function fetchOddsHostMarkets(
  host: string,
  sport: string,
  oddshostSecret?: string,
  extraQuery?: Record<string, string>,
) {
  const q = appendOddsHostSecret(buildPublicApiQuery(host), oddshostSecret);
  q.set("sport", sport);
  if (extraQuery) {
    for (const [k, v] of Object.entries(extraQuery)) {
      if (v !== undefined && v !== "") q.set(k, v);
    }
  }
  const res = await fetch(
    `${getApiBase()}/public/oddshost/markets?${q}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oddshost markets (${res.status}): ${t.slice(0, 400)}`);
  }
  return res.json() as Promise<unknown>;
}

export async function fetchSportsPrematchSnapshot(host: string) {
  const q = buildPublicApiQuery(host);
  const res = await fetch(`${getApiBase()}/public/sports-prematch?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (typeof j.message === "string") detail = j.message;
      else if (Array.isArray(j.message)) detail = j.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(`sports-prematch failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<{
    fetchedAt: string | null;
    payload: unknown;
  }>;
}
