/** DB에 저장된 이미지 주소를 브라우저용 절대 URL로 */
export function resolvePublicMediaUrl(stored: string): string {
  const s = stored.trim();
  if (!s) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = (process.env.PUBLIC_API_URL || 'http://localhost:4001').replace(
    /\/$/,
    '',
  );
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}
