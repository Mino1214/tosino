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

/**
 * - 운영(nginx): 보통 `현재 호스트 + /api`.
 * - 로컬에서 `serve out` 만 쓰면 `/api` 가 없으므로 loopback 일 때 Nest(:4001) 직통 (solution-user 와 동일 규칙).
 */
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
  sessionStorage.removeItem("adminSelectedPlatformId");
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
  const base = getApiBase();
  const url = `${base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch (e) {
    const isLocal =
      !base || /localhost|127\.0\.0\.1/i.test(base);
    const hint = isLocal
      ? " Nest API(기본 :4001)가 실행 중인지 확인하세요. 휴대폰/other PC에서 접속 중이면 localhost가 아니라 그 컴퓨터의 LAN IP로 NEXT_PUBLIC_API_URL을 설정하거나 운영에선 NEXT_PUBLIC_USE_SAME_ORIGIN_API=true 를 쓰세요."
      : " 네트워크·방화벽·HTTPS 혼합 콘텐츠를 확인하세요.";
    const msg = e instanceof Error ? e.message : "연결 실패";
    throw new Error(`${msg}.${hint}`);
  }
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("tosino:session-expired"));
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

export type UploadedAnnouncementAsset = {
  id: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: string;
  publicPath: string;
  url: string;
};

export async function apiUploadAnnouncementAsset(
  platformId: string,
  file: File,
): Promise<UploadedAnnouncementAsset> {
  const token = getAccessToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${getApiBase()}/platforms/${platformId}/announcements/assets`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    },
  );
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
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
  return res.json() as Promise<UploadedAnnouncementAsset>;
}
