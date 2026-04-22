import type { AggregatedMatch } from '../odds-api-ws/odds-api-aggregator.service';

/**
 * 목록 API 부담 완화용 — 전체 `AggregatedMatch` 대신 리그/팀 메타 + 주요 3마켓 + 펼침 가능 개수만 전달.
 */
export type ProviderOddsPreview = {
  matchId: string;
  sport: string;
  status: string;
  league: AggregatedMatch['league'];
  home: AggregatedMatch['home'];
  away: AggregatedMatch['away'];
  scores: AggregatedMatch['scores'];
  primaryMarkets: {
    moneyline?: AggregatedMatch['markets']['moneyline'];
    handicap?: AggregatedMatch['markets']['handicap'];
    totals?: AggregatedMatch['markets']['totals'];
  };
  /** 핸디/총점 추가 라인 + 스페셜 마켓 수 (펼침 탭 개수 가이드) */
  expandableMarketCount: number;
};

export function buildProviderOddsPreview(
  m: AggregatedMatch | null | undefined,
): ProviderOddsPreview | null {
  if (!m) return null;
  const mk = m.markets;
  let expandable = 0;
  const hLines = mk.handicapLines;
  if (hLines && hLines.length > 1) expandable += hLines.length - 1;
  const tLines = mk.totalsLines;
  if (tLines && tLines.length > 1) expandable += tLines.length - 1;
  if (mk.extras) expandable += Object.keys(mk.extras).length;

  const handicap =
    mk.handicap ??
    hLines?.find((x) => x.primary) ??
    hLines?.[0] ??
    undefined;
  const totals =
    mk.totals ??
    tLines?.find((x) => x.primary) ??
    tLines?.[0] ??
    undefined;

  return {
    matchId: m.matchId,
    sport: m.sport,
    status: m.status,
    league: m.league,
    home: m.home,
    away: m.away,
    scores: m.scores,
    primaryMarkets: {
      moneyline: mk.moneyline,
      handicap,
      totals,
    },
    expandableMarketCount: expandable,
  };
}

/** 응답 크기 축소 — `pairedLocaleRaw` 등은 이미 루트에 평탄화됨 */
export function omitRawMatchFromOverlayRow<
  T extends Record<string, unknown> & { rawMatch?: unknown },
>(row: T): Omit<T, 'rawMatch'> {
  const { rawMatch: _drop, ...rest } = row;
  return rest as Omit<T, 'rawMatch'>;
}
