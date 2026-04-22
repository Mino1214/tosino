import slugToKo from "@/data/crawler-country-slugs-ko.json";

const SLUG_TO_KO: Record<string, string> = slugToKo as Record<string, string>;

/** slug 키를 공백 구분 영문 구문으로도 조회 (예: north macedonia → north-macedonia) */
const PHRASE_TO_SLUG = new Map<string, string>();
for (const slug of Object.keys(SLUG_TO_KO)) {
  const phrase = slug.replace(/-/g, " ").toLowerCase();
  if (!PHRASE_TO_SLUG.has(phrase)) PHRASE_TO_SLUG.set(phrase, slug);
}

/** 한글 표기 → slug (JSON 값이 유일하지 않을 수 있어 첫 매칭만 유지) */
const KO_TO_SLUG = new Map<string, string>();
for (const [slug, ko] of Object.entries(SLUG_TO_KO)) {
  const k = ko.trim();
  if (k && !KO_TO_SLUG.has(k)) KO_TO_SLUG.set(k, slug);
}

function norm(s: string): string {
  return s
    .trim()
    .replace(/:\s*$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * 크롤 raw 의 국가 힌트(rawCountryLabel, 리그 slug 앞부분)로 한글 국가명을 고릅니다.
 * - 크롤러(aiscore 등)는 `raw_country_label` + 국기 URL/파일을 sqlite/Postgres에 넣습니다.
 * - 리그 라벨만 "컵"처럼 짧을 때 이 값으로 맥락을 보강합니다.
 */
export function resolveCrawlerCountryKo(
  rawCountryLabel: string | null | undefined,
  rawLeagueSlug: string | null | undefined,
): string | null {
  const cleaned = norm(rawCountryLabel || "");
  if (cleaned) {
    if (SLUG_TO_KO[cleaned]) return SLUG_TO_KO[cleaned];
    const low = cleaned.toLowerCase();
    if (SLUG_TO_KO[low]) return SLUG_TO_KO[low];
    if (KO_TO_SLUG.has(cleaned)) return cleaned;
    const phrase = low.replace(/-/g, " ");
    const slugFromPhrase = PHRASE_TO_SLUG.get(phrase);
    if (slugFromPhrase && SLUG_TO_KO[slugFromPhrase]) return SLUG_TO_KO[slugFromPhrase];
    const slugGuess = low.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (slugGuess && SLUG_TO_KO[slugGuess]) return SLUG_TO_KO[slugGuess];
    return cleaned;
  }
  const slug = (rawLeagueSlug || "").trim().toLowerCase();
  if (!slug) return null;
  const head = slug.split(/[-_/]/u)[0] ?? "";
  if (head.length >= 2 && SLUG_TO_KO[head]) return SLUG_TO_KO[head];
  return null;
}

/**
 * @param oddsCountryKo odds-api 리그 alias + slug 기반(서버 enrich) — 있으면 최우선
 */
export function crawlerLeagueContextTitle(
  oddsCountryKo: string | null | undefined,
  rawCountryLabel: string | null | undefined,
  rawLeagueSlug: string | null | undefined,
  rawLeagueLabel: string | null | undefined,
): string {
  const country =
    (oddsCountryKo && oddsCountryKo.trim()) ||
    resolveCrawlerCountryKo(rawCountryLabel, rawLeagueSlug);
  const league = (rawLeagueLabel || rawLeagueSlug || "").trim() || "-";
  if (!country) return league;
  if (country === league) return league;
  return `${country} · ${league}`;
}
