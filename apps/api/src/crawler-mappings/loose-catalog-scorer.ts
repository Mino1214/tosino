/**
 * HQ 리그/팀 확정 매핑 없이 카탈로그 이벤트 ↔ raw 를 맞출 때 쓰는 퍼지 점수.
 * (종목=sport 안에서 리그 slug 버킷으로 좁힌 뒤 호출하는 것을 권장)
 */
import { ratio, token_sort_ratio } from 'fuzzball';
import {
  type ConfirmedTeamNamePair,
  type SideScoreDetail,
  calculateNameSimilarity,
} from './match-candidate-scorer';

export type LooseCatalogEventShape = {
  id: string;
  leagueSlug: string | null;
  home: string | null;
  away: string | null;
  date: string | null;
};

export type LooseRawShape = {
  rawLeagueLabel: string | null;
  rawLeagueSlug: string | null;
  rawHomeName: string;
  rawAwayName: string;
  rawKickoffUtc: Date | null;
};

export type LooseCatalogScoreRow = {
  score: number;
  leagueFuzz: number;
  home: SideScoreDetail;
  away: SideScoreDetail;
  kickoffDeltaSec: number | null;
};

function normalizeLeagueForFuzz(s: string): string {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0~100 */
export function fuzzyLeagueSimilarity(a: string, b: string): number {
  const na = normalizeLeagueForFuzz(a);
  const nb = normalizeLeagueForFuzz(b);
  if (!na || !nb) return 0;
  return Math.round((ratio(na, nb) + token_sort_ratio(na, nb)) / 2);
}

function computeBonus(home: SideScoreDetail, away: SideScoreDetail): number {
  if (home.matchType === 'mapping' && away.matchType === 'mapping') return 15;
  if (home.matchType === 'exact' && away.matchType === 'exact') return 10;
  if (home.matchType === 'normalized' && away.matchType === 'normalized')
    return 5;
  return 0;
}

/**
 * sport 전체 이벤트 중 raw 리그 문자열과 비슷한 리그 slug 버킷만 골라 후보 집합을 만든다.
 * 리그 힌트가 없으면 sport 전체를 반환한다.
 */
export function selectEventsInLooseLeagueBuckets(
  sportEvents: LooseCatalogEventShape[],
  rawLeagueLabel: string | null,
  rawLeagueSlug: string | null,
  opts?: { maxBuckets?: number; minBucketLeagueFuzz?: number },
): LooseCatalogEventShape[] {
  const maxBuckets = Math.max(3, Math.min(24, opts?.maxBuckets ?? 12));
  const minFuzz = Math.max(0, Math.min(90, opts?.minBucketLeagueFuzz ?? 36));

  const parts = [rawLeagueLabel, rawLeagueSlug]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean);
  const rawLeagueStr = parts.join(' ').trim();
  if (!rawLeagueStr) return [...sportEvents];

  const byLeague = new Map<string, LooseCatalogEventShape[]>();
  for (const ev of sportEvents) {
    const k = (ev.leagueSlug ?? '').trim() || '__none__';
    const arr = byLeague.get(k) ?? [];
    arr.push(ev);
    byLeague.set(k, arr);
  }

  const scoredKeys = [...byLeague.keys()].map((key) => ({
    key,
    fuzz: key === '__none__' ? 0 : fuzzyLeagueSimilarity(rawLeagueStr, key),
  }));
  scoredKeys.sort((a, b) => b.fuzz - a.fuzz);

  const selectedKeys = new Set<string>();
  for (const row of scoredKeys.slice(0, maxBuckets)) {
    selectedKeys.add(row.key);
  }
  for (const row of scoredKeys) {
    if (row.fuzz >= minFuzz) selectedKeys.add(row.key);
  }

  const out: LooseCatalogEventShape[] = [];
  for (const key of selectedKeys) {
    const arr = byLeague.get(key);
    if (arr) out.push(...arr);
  }
  return out.length > 0 ? out : [...sportEvents];
}

export type ScoreLooseOpts = {
  confirmedPairs?: ConfirmedTeamNamePair[];
  kickoffToleranceSec?: number;
  /** 이 이상이면 후보 제외 */
  maxKickoffDisqualifySec?: number;
};

/**
 * 단일 카탈로그 이벤트에 대해 raw 와의 느슨한 점수(0~100)를 계산한다.
 * 킥오프가 양쪽 모두 있는데 차이가 너무 크면 null.
 */
export function scoreCatalogAgainstRawLoose(
  raw: LooseRawShape,
  ev: LooseCatalogEventShape,
  opts?: ScoreLooseOpts,
): LooseCatalogScoreRow | null {
  const homeS = String(ev.home ?? '').trim();
  const awayS = String(ev.away ?? '').trim();
  if (!homeS || !awayS) return null;

  const rawLeagueStr = [raw.rawLeagueLabel, raw.rawLeagueSlug]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  const evLeagueKey = String(ev.leagueSlug ?? '').trim();
  const leagueFuzz = rawLeagueStr
    ? fuzzyLeagueSimilarity(rawLeagueStr, evLeagueKey || '__none__')
    : 48;

  const pairs = opts?.confirmedPairs ?? [];
  const home = calculateNameSimilarity(homeS, raw.rawHomeName, {
    confirmedPairs: pairs,
  });
  const away = calculateNameSimilarity(awayS, raw.rawAwayName, {
    confirmedPairs: pairs,
  });
  const bonus = computeBonus(home, away);

  const tol = opts?.kickoffToleranceSec ?? 90 * 60;
  const maxDisq = opts?.maxKickoffDisqualifySec ?? 6 * 3600;

  let kickoffDeltaSec: number | null = null;
  const rawKick = raw.rawKickoffUtc;
  const evKick = ev.date ? new Date(ev.date) : null;
  if (rawKick && evKick && !Number.isNaN(evKick.getTime())) {
    kickoffDeltaSec = Math.round(
      Math.abs(rawKick.getTime() - evKick.getTime()) / 1000,
    );
    if (kickoffDeltaSec > maxDisq) {
      return null;
    }
  }

  const LEAGUE_WEIGHT = 24;
  const leaguePart = rawLeagueStr
    ? (LEAGUE_WEIGHT * leagueFuzz) / 100
    : LEAGUE_WEIGHT * 0.42;

  let kickoffPenalty = 0;
  if (kickoffDeltaSec !== null && kickoffDeltaSec > tol) {
    kickoffPenalty = Math.min(
      28,
      Math.round(((kickoffDeltaSec - tol) / 600) * 2.5),
    );
  }

  const base = leaguePart + home.score + away.score + bonus - kickoffPenalty;
  const score = Math.max(0, Math.min(100, Math.round(base)));

  return {
    score,
    leagueFuzz,
    home,
    away,
    kickoffDeltaSec,
  };
}
