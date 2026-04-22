import type { AggregatedMatch, CrawlerMatchOverlayItem } from "./api";

type TeamRef = { nameKr?: string | null; name?: string | null } | undefined;

function hasHangul(s: string): boolean {
  return /[\uAC00-\uD7A3]/.test(s);
}

type RowWithAlias = CrawlerMatchOverlayItem & {
  providerHomeKoreanName?: string | null;
  providerAwayKoreanName?: string | null;
};

/**
 * 솔루션 스포츠탭(한글) — 팀 표기 우선순위:
 *  1) OddsApiTeamAlias 한글명
 *  2) 스냅샷 nameKr (preview 또는 full 매치)
 *  3) 짝 로케일이 ko 인 경우 그쪽 raw 이름
 *  4) 현재 raw 에 한글 포함 시
 *  5) raw · provider 폴백
 */
export function overlayDisplayTeamName(
  row: CrawlerMatchOverlayItem,
  side: "home" | "away",
  fullMatch?: AggregatedMatch | null,
): string {
  const r = row as RowWithAlias;
  const krAlias =
    side === "home"
      ? r.providerHomeKoreanName?.trim()
      : r.providerAwayKoreanName?.trim();
  if (krAlias) return krAlias;

  const pv = row.providerOddsPreview;
  const pvSide: TeamRef =
    side === "home"
      ? pv?.home ?? fullMatch?.home
      : pv?.away ?? fullMatch?.away;
  const pvKr = pvSide?.nameKr?.trim();
  if (pvKr) return pvKr;

  const paired = row.pairedLocaleRaw;
  if (paired?.sourceLocale === "ko") {
    const pn =
      side === "home"
        ? paired.rawHomeName?.trim()
        : paired.rawAwayName?.trim();
    if (pn) return pn;
  }

  const raw =
    side === "home"
      ? row.rawHomeName?.trim()
      : row.rawAwayName?.trim();
  if (raw && hasHangul(raw)) return raw;

  const fallback =
    side === "home"
      ? row.rawHomeName ?? row.providerHomeName ?? pvSide?.name
      : row.rawAwayName ?? row.providerAwayName ?? pvSide?.name;
  const t = fallback?.trim();
  return t || "?";
}
