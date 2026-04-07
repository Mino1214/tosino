const ENV_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api"
).replace(/\/$/, "");

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

/** 총판 로그인 시 플랫폼 식별(도메인 또는 미리보기 포트) */
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
  if (typeof window !== "undefined") {
    return ENV_API_BASE;
  }
  return ENV_API_BASE;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getStoredUser(): {
  id: string;
  loginId?: string;
  email?: string | null;
  role: string;
  platformId: string | null;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      id: string;
      loginId?: string;
      email?: string | null;
      role: string;
      platformId: string | null;
    };
  } catch {
    return null;
  }
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
  const url = `${getApiBase()}${path}`;
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !path.startsWith("/auth/")) {
      window.location.href = "/login";
    }
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
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}
