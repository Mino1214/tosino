/**
 * GET /v3/events?sport= 는 GET /v3/sports 의 정식 `slug` 만 허용.
 * UI·콘솔에서 흔한 별칭(예: mma)을 넣으면 HTTP 400.
 * @see apps/score-crawler/mappings.py ODDS_API_SPORTS
 */
const ALIASES: Record<string, string> = {
  mma: 'mixed-martial-arts',
};

/**
 * @returns odds-api /events(및 동일 slug 규칙 API)에 넣을 sport 파라미터
 */
export function normalizeOddsApiEventsSport(sport: string): string {
  const t = sport.trim();
  if (!t) return t;
  return ALIASES[t.toLowerCase()] ?? t;
}
