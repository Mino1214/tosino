const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

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

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
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
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
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
  const res = await fetch(`${BASE}/public/referral?${q}`, { cache: "no-store" });
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

export async function publicRegister(
  body: {
    loginId: string;
    password: string;
    referralCode: string;
    displayName?: string;
    contactEmail?: string;
  },
  host: string,
) {
  const res = await fetch(`${BASE}/public/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginId: body.loginId.trim().toLowerCase(),
      password: body.password,
      referralCode: body.referralCode.trim().toUpperCase(),
      displayName: body.displayName,
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
  const res = await fetch(`${BASE}/public/bootstrap?${q}`, {
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
  const res = await fetch(`${BASE}/public/sports-odds?${q}`, {
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
