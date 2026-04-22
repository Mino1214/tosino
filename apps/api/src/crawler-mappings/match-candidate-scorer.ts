/**
 * API 경기 1건 ↔ 크롤링 raw 경기 후보 점수화 (자동 확정 아님, 추천 전용).
 */
import { ratio, token_sort_ratio } from 'fuzzball';

export type MatchSideType = 'mapping' | 'exact' | 'normalized' | 'fuzzy';

export type ApiMatchInput = {
  id: string | number;
  home: string;
  away: string;
  sport: { slug: string; name?: string };
  league: { slug: string; name?: string };
};

export type CrawlMatchInput = {
  /** DB id (cuid 등) */
  id: string;
  home: string;
  away: string;
  leagueSlug: string;
  /** internal 또는 provider sport slug */
  sportSlug: string;
};

/** 확정 팀 매핑: 크롤러 표기 ↔ API(provider) 표기 */
export type ConfirmedTeamNamePair = {
  crawlName: string;
  apiName: string;
};

export type SideScoreDetail = {
  apiName: string;
  crawlName: string;
  score: number;
  matchType: MatchSideType;
};

export type MatchCandidateResult = {
  apiMatchId: string | number;
  crawlMatchId: string;
  score: number;
  rawScore: number;
  leagueMatched: boolean;
  leagueScore: number;
  home: SideScoreDetail;
  away: SideScoreDetail;
  bonus: number;
  reason: string[];
  /** 90+ strong, 75–89 review, <75 low */
  tier: 'strong' | 'review' | 'low';
  /** UI에서 접기용 (기본 75 미만) */
  suggestedFold: boolean;
};

const LEAGUE_SCORE = 50;
const SIDE_MAX = 25;
const SCORE_CAP = 100;

const TOKEN_STOP = new Set([
  'fc',
  'cf',
  'sc',
  'afc',
  'club',
  'the',
  'ac',
  'sv',
  'bk',
]);

/** 표시·비교용: 구두점/공백 정리 + 토큰 정규화 */
export function normalizeTeamName(name: string): string {
  let s = String(name ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[.\-,']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';

  const expandToken = (t: string): string => {
    if (t === 'utd') return 'united';
    if (t === 'dep') return 'deportivo';
    if (t === 'ath') return 'athletic';
    return t;
  };

  const tokens = s
    .split(' ')
    .map((t) => expandToken(t))
    .filter((t) => t.length > 0 && !TOKEN_STOP.has(t));

  return tokens.join(' ');
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** exact 비교용 원문 정리 (공백·케이스) */
function basicTrim(s: string): string {
  return stripDiacritics(String(s ?? '').normalize('NFKC'))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const r1 = ratio(a, b);
  const r2 = token_sort_ratio(a, b);
  // 명세: max 또는 평균 허용 — 평균이 부분 일치(예: 같은 접두) 과대평가를 줄임
  return Math.round((r1 + r2) / 2);
}

/** 퍼지는 exact/normalized 보다 낮게 상한(22) — 부분 문자열 일치 과대평가 완화 */
function mapFuzzyToScore(f: number): number {
  if (f < 52) return 0;
  const scaled = Math.round(((f - 52) / 48) * 22);
  return Math.min(22, scaled);
}

function confirmedPairMatches(
  apiName: string,
  crawlName: string,
  pairs: ConfirmedTeamNamePair[],
): boolean {
  const apiB = basicTrim(apiName);
  const crawlB = basicTrim(crawlName);
  const apiN = normalizeTeamName(apiName);
  const crawlN = normalizeTeamName(crawlName);
  for (const p of pairs) {
    const pApiB = basicTrim(p.apiName);
    const pCrawlB = basicTrim(p.crawlName);
    if (pApiB && pCrawlB && apiB === pApiB && crawlB === pCrawlB) return true;
    const pApiN = normalizeTeamName(p.apiName);
    const pCrawlN = normalizeTeamName(p.crawlName);
    if (pApiN && pCrawlN && apiN === pApiN && crawlN === pCrawlN) return true;
  }
  return false;
}

export type NameSimilarityOptions = {
  confirmedPairs?: ConfirmedTeamNamePair[];
};

/**
 * 한쪽 팀명 유사도 (0~SIDE_MAX), 우선순위: 확정 매핑 → exact → normalized → fuzzy
 */
export function calculateNameSimilarity(
  apiName: string,
  crawlName: string,
  opts?: NameSimilarityOptions,
): SideScoreDetail {
  const pairs = opts?.confirmedPairs ?? [];
  const a = String(apiName ?? '').trim();
  const c = String(crawlName ?? '').trim();

  if (confirmedPairMatches(a, c, pairs)) {
    return {
      apiName: a,
      crawlName: c,
      score: SIDE_MAX,
      matchType: 'mapping',
    };
  }

  if (a === c) {
    return { apiName: a, crawlName: c, score: SIDE_MAX, matchType: 'exact' };
  }

  if (basicTrim(a) === basicTrim(c)) {
    return {
      apiName: a,
      crawlName: c,
      score: SIDE_MAX,
      matchType: 'exact',
    };
  }

  const na = normalizeTeamName(a);
  const nc = normalizeTeamName(c);
  if (na && nc && na === nc) {
    return {
      apiName: a,
      crawlName: c,
      score: 24,
      matchType: 'normalized',
    };
  }

  const f = fuzzyRatio(na || basicTrim(a), nc || basicTrim(c));
  const sc = mapFuzzyToScore(f);
  return {
    apiName: a,
    crawlName: c,
    score: sc,
    matchType: 'fuzzy',
  };
}

export type ScoreMatchOptions = {
  confirmedPairs?: ConfirmedTeamNamePair[];
  /** 추후 홈/원정 반전 비교용 훅 — 현재 미사용 */
  reverseOrientation?: boolean;
};

function computeBonus(home: SideScoreDetail, away: SideScoreDetail): number {
  if (home.matchType === 'mapping' && away.matchType === 'mapping') return 15;
  if (home.matchType === 'exact' && away.matchType === 'exact') return 10;
  if (home.matchType === 'normalized' && away.matchType === 'normalized')
    return 5;
  return 0;
}

function buildReasons(
  home: SideScoreDetail,
  away: SideScoreDetail,
  bonus: number,
): string[] {
  const reasons: string[] = ['league.slug exact match'];
  reasons.push(`home ${home.matchType} match`);
  reasons.push(`away ${away.matchType} match`);
  if (bonus === 15) reasons.push('bonus: confirmed team mapping on both sides (+15)');
  else if (bonus === 10) reasons.push('bonus: both exact (+10)');
  else if (bonus === 5) reasons.push('bonus: both normalized (+5)');
  return reasons;
}

export function scoreMatch(
  apiMatch: ApiMatchInput,
  crawlMatch: CrawlMatchInput,
  opts?: ScoreMatchOptions,
): MatchCandidateResult | null {
  void opts?.reverseOrientation;

  const apiSport = String(apiMatch.sport?.slug ?? '').trim();
  const apiLeague = String(apiMatch.league?.slug ?? '').trim();
  if (!apiSport || !apiLeague) return null;

  if (String(crawlMatch.leagueSlug ?? '').trim() !== apiLeague) return null;

  const cSport = String(crawlMatch.sportSlug ?? '').trim();
  if (!cSport || cSport !== apiSport) return null;

  const pairs = opts?.confirmedPairs ?? [];
  const home = calculateNameSimilarity(apiMatch.home, crawlMatch.home, {
    confirmedPairs: pairs,
  });
  const away = calculateNameSimilarity(apiMatch.away, crawlMatch.away, {
    confirmedPairs: pairs,
  });

  const bonus = computeBonus(home, away);
  const rawScore = LEAGUE_SCORE + home.score + away.score + bonus;
  const score = Math.min(SCORE_CAP, rawScore);

  const tier: MatchCandidateResult['tier'] =
    score >= 90 ? 'strong' : score >= 75 ? 'review' : 'low';

  return {
    apiMatchId: apiMatch.id,
    crawlMatchId: crawlMatch.id,
    score,
    rawScore,
    leagueMatched: true,
    leagueScore: LEAGUE_SCORE,
    home,
    away,
    bonus,
    reason: buildReasons(home, away, bonus),
    tier,
    suggestedFold: score < 75,
  };
}

export type FindTopCandidatesOptions = ScoreMatchOptions & {
  limit?: number;
  /** 동점 시 exact 카운트 외 정렬용 */
  foldBelowScore?: number;
};

function exactCount(r: MatchCandidateResult): number {
  let n = 0;
  if (r.home.matchType === 'exact') n++;
  if (r.away.matchType === 'exact') n++;
  return n;
}

export function findTopCandidates(
  apiMatch: ApiMatchInput,
  crawlMatches: CrawlMatchInput[],
  confirmedMappings: ConfirmedTeamNamePair[],
  opts?: FindTopCandidatesOptions,
): MatchCandidateResult[] {
  const limit = Math.max(1, Math.min(50, opts?.limit ?? 5));
  const pairs = confirmedMappings.length
    ? confirmedMappings
    : opts?.confirmedPairs ?? [];

  const scored: MatchCandidateResult[] = [];
  for (const c of crawlMatches) {
    const row = scoreMatch(apiMatch, c, { ...opts, confirmedPairs: pairs });
    if (row) scored.push(row);
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ex = exactCount(b) - exactCount(a);
    if (ex !== 0) return ex;
    return a.crawlMatchId.localeCompare(b.crawlMatchId);
  });

  return scored.slice(0, limit);
}
