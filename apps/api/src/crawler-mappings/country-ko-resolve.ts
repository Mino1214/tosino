import slugToKo from './data/country-slugs-ko.json';

function loadSlugToKo(): Record<string, string> {
  const m = slugToKo as unknown;
  if (m != null && typeof m === 'object' && !Array.isArray(m)) {
    return m as Record<string, string>;
  }
  return {};
}

const SLUG_TO_KO: Record<string, string> = loadSlugToKo();

/** odds-api 리그 slug(하이픈 토큰) 앞쪽이 국가 slug 인 경우 → 한글 국가명 */
export function inferCountryKoFromLeagueSlug(
  leagueSlug: string | null | undefined,
): string | null {
  if (leagueSlug == null) return null;
  const s = typeof leagueSlug === 'string' ? leagueSlug : String(leagueSlug);
  const parts = s
    .trim()
    .toLowerCase()
    .split('-')
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  for (let len = parts.length; len >= 1; len--) {
    const cand = parts.slice(0, len).join('-');
    const label = SLUG_TO_KO[cand];
    if (label) return label;
  }
  return null;
}

/**
 * OddsApiLeagueAlias.country 값(슬러그·영문·한글 등)을 UI용 한글 국가 힌트로 정리.
 * - DB 값이 이미 한글이면 그대로
 * - slug 키와 일치하면 JSON 한글
 * - 그 외에는 리그 slug 에서 국가 토큰 추론
 */
export function resolveCountryKoFromOddsLeague(
  leagueSlug: string | null | undefined,
  oddsAliasCountry: string | null | undefined,
): string | null {
  const raw = (oddsAliasCountry ?? '').trim();
  if (raw) {
    if (SLUG_TO_KO[raw]) return SLUG_TO_KO[raw];
    const low = raw.toLowerCase();
    if (SLUG_TO_KO[low]) return SLUG_TO_KO[low];
    if (/[\uAC00-\uD7AF]/.test(raw)) return raw;
    const slugGuess = low.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (slugGuess && SLUG_TO_KO[slugGuess]) return SLUG_TO_KO[slugGuess];
    const fromField = inferCountryKoFromLeagueSlug(raw);
    if (fromField) return fromField;
  }
  const ls = (leagueSlug ?? '').trim();
  if (!ls) return null;
  return inferCountryKoFromLeagueSlug(ls);
}

/**
 * 크롤 raw 국가 라벨 + 리그 slug 에서 odds catalog leagueSlug 접두어로 쓸 국가 slug 후보.
 * (예: raw "알제리" → algeria, 리그 slug `algeria-ligue-2` → algeria)
 */
export function collectCountrySlugHints(
  rawCountryLabel: string | null | undefined,
  rawLeagueSlug: string | null | undefined,
): string[] {
  const out = new Set<string>();
  const label = (rawCountryLabel ?? '').trim().replace(/:\s*$/u, '');
  if (label) {
    if (SLUG_TO_KO[label]) out.add(label);
    const low = label.toLowerCase();
    if (SLUG_TO_KO[low]) out.add(low);
    for (const [slug, ko] of Object.entries(SLUG_TO_KO)) {
      if (ko === label || ko.toLowerCase() === low) out.add(slug);
    }
    const slugGuess = low.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (slugGuess && SLUG_TO_KO[slugGuess]) out.add(slugGuess);
  }
  const slug = (rawLeagueSlug ?? '').trim().toLowerCase();
  if (slug) {
    const parts = slug.split('-').filter((p) => p.length > 0);
    for (let len = parts.length; len >= 1; len--) {
      const cand = parts.slice(0, len).join('-');
      if (SLUG_TO_KO[cand]) out.add(cand);
    }
  }
  return [...out];
}

/** catalog 이벤트 leagueSlug 가 국가 slug 힌트와 맞는지 (접두·포함) */
export function catalogLeagueSlugMatchesCountryHints(
  leagueSlug: string | null | undefined,
  hints: string[],
): boolean {
  if (hints.length === 0) return true;
  const ls = (leagueSlug ?? '').trim().toLowerCase();
  if (!ls) return false;
  return hints.some(
    (h) =>
      ls === h ||
      ls.startsWith(`${h}-`) ||
      ls.includes(`-${h}-`) ||
      ls.endsWith(`-${h}`),
  );
}
