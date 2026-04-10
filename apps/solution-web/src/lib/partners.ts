import fs from "node:fs";
import path from "node:path";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

/**
 * `public/partner`에 실제로 있는 이미지 파일만 `/partner/파일명` URL로 반환 (빌드/SSR 시점).
 */
export function getPartnerLogoPaths(): string[] {
  const dir = path.join(process.cwd(), "public", "partner");
  if (!fs.existsSync(dir)) return [];
  const names = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && IMAGE_EXT.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "en"));
  return names.map((name) => `/partner/${encodeURIComponent(name)}`);
}
