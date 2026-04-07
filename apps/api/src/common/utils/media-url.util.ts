function publicOrigin(): string {
  return (process.env.PUBLIC_API_URL || 'http://localhost:4001').replace(
    /\/$/,
    '',
  );
}

/** DB에 저장된 이미지 주소를 브라우저용 절대 URL로 */
export function resolvePublicMediaUrl(stored: string): string {
  const s = stored.trim();
  if (!s) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = publicOrigin();
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}

/**
 * 테마·공지 등에 저장된 URL 정리: 상대 경로는 PUBLIC_API_URL 기준,
 * 예전에 localhost:4001 등으로 박힌 절대 경로는 공개 API 호스트로 치환.
 */
export function normalizePublicAssetUrl(
  stored: string | null | undefined,
): string | null {
  if (stored == null) return null;
  const s = String(stored).trim();
  if (!s) return null;
  const base = publicOrigin();
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(s);
      const isUploads = u.pathname.startsWith('/uploads/');
      const isLocal =
        u.hostname === 'localhost' ||
        u.hostname === '127.0.0.1' ||
        /^127\.\d+\.\d+\.\d+$/.test(u.hostname);
      if (isUploads && isLocal) {
        return `${base}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      /* ignore */
    }
    return s;
  }
  return resolvePublicMediaUrl(s);
}
