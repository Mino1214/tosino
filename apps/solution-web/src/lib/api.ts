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

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type") && opts.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiBase()}${path}`, { ...opts, headers });
  if (res.status === 401) {
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
}

export async function fetchReferral(code: string, host: string) {
  const q = buildPublicApiQuery(host);
  q.set("code", code.trim());
  const res = await fetch(`${getApiBase()}/public/referral?${q}`, { cache: "no-store" });
  if (!res.ok) {
    let msg = "코드를 확인할 수 없습니다";
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
    agentDisplayName: string;
  }>;
}

export type PublicRegisterBody = {
  loginId: string;
  password: string;
  referralCode: string;
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
};

export async function publicRegister(body: PublicRegisterBody, host: string) {
  const res = await fetch(`${getApiBase()}/public/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginId: body.loginId.trim().toLowerCase(),
      password: body.password,
      referralCode: body.referralCode.trim().toUpperCase(),
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
    announcements: {
      modalEnabled: boolean;
      items: { imageUrl: string; width: number | null; height: number | null }[];
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
