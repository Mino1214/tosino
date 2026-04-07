const BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001")
    : "";

export function getApiBase(): string {
  return BASE;
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
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch (e) {
    const isLocal =
      !BASE || /localhost|127\.0\.0\.1/i.test(BASE);
    const hint = isLocal
      ? " Nest API(기본 :4001)가 실행 중인지 확인하세요. 휴대폰/other PC에서 접속 중이면 localhost가 아니라 그 컴퓨터의 LAN IP로 NEXT_PUBLIC_API_URL을 설정해야 합니다."
      : " 네트워크·방화벽·HTTPS 혼합 콘텐츠를 확인하세요.";
    const msg = e instanceof Error ? e.message : "연결 실패";
    throw new Error(`${msg}.${hint}`);
  }
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
    `${BASE}/platforms/${platformId}/announcements/assets`,
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
