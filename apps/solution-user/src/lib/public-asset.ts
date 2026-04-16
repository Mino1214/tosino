const ASSET_VERSION = process.env.NEXT_PUBLIC_ASSET_VERSION?.trim() || "";
const REMOTE_ASSET_RE = /^(?:https?:)?\/\//i;

/** `next.config` `basePath` 사용 시 public 정적 경로 앞에 붙이고, 배포 단위 캐시 버전을 붙임 */
export function publicAsset(path: string): string {
  if (!path || REMOTE_ASSET_RE.test(path) || path.startsWith("data:")) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withBase = base ? `${base}${normalized}` : normalized;
  if (!ASSET_VERSION) return withBase;

  const [pathWithoutHash, hash = ""] = withBase.split("#");
  const joiner = pathWithoutHash.includes("?") ? "&" : "?";
  return `${pathWithoutHash}${joiner}v=${encodeURIComponent(ASSET_VERSION)}${hash ? `#${hash}` : ""}`;
}
