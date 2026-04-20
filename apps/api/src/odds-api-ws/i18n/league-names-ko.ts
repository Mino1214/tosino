/**
 * 리그명 → 한글 표기 + 로고 URL 사전.
 *
 * 운영 정책:
 *  - 정답이 사전에 없으면 nameKr=null, logoUrl=null 로 내려보낸다 (원문 그대로 표시).
 *  - 로고는 솔루션 정적 자산 경로(/league-logos/{slug}.png) 또는 외부 CDN URL.
 *    파일 없으면 프론트가 placeholder 로 폴백하면 됨.
 *  - 키 정규화: lower-case + 공백 정리.
 *
 * Phase 2 1차 — 한국 사용자가 자주 보는 메이저 리그 위주.
 * 추가는 점진적 (운영 중 발견된 새 리그명을 RAW 에 한 줄씩 추가).
 */

type Entry = { nameKr: string; logoUrl?: string };

const RAW: Record<string, Entry> = {
  // ─── 축구 (메이저) ───
  'premier league': { nameKr: '프리미어리그', logoUrl: '/league-logos/epl.png' },
  'english premier league': { nameKr: '프리미어리그', logoUrl: '/league-logos/epl.png' },
  'epl': { nameKr: '프리미어리그', logoUrl: '/league-logos/epl.png' },
  'efl championship': { nameKr: '챔피언십', logoUrl: '/league-logos/efl-championship.png' },
  'championship': { nameKr: '챔피언십', logoUrl: '/league-logos/efl-championship.png' },
  'efl league one': { nameKr: '리그 원', logoUrl: '/league-logos/efl-l1.png' },
  'efl league two': { nameKr: '리그 투', logoUrl: '/league-logos/efl-l2.png' },

  'la liga': { nameKr: '라리가', logoUrl: '/league-logos/laliga.png' },
  'laliga': { nameKr: '라리가', logoUrl: '/league-logos/laliga.png' },
  'la liga ea sports': { nameKr: '라리가', logoUrl: '/league-logos/laliga.png' },
  'la liga 2': { nameKr: '라리가 2', logoUrl: '/league-logos/laliga2.png' },
  'segunda division': { nameKr: '라리가 2', logoUrl: '/league-logos/laliga2.png' },

  'serie a': { nameKr: '세리에 A', logoUrl: '/league-logos/serie-a.png' },
  'italy serie a': { nameKr: '세리에 A', logoUrl: '/league-logos/serie-a.png' },
  'serie b': { nameKr: '세리에 B', logoUrl: '/league-logos/serie-b.png' },

  'bundesliga': { nameKr: '분데스리가', logoUrl: '/league-logos/bundesliga.png' },
  'german bundesliga': { nameKr: '분데스리가', logoUrl: '/league-logos/bundesliga.png' },
  '2. bundesliga': { nameKr: '2. 분데스리가', logoUrl: '/league-logos/bundesliga2.png' },

  'ligue 1': { nameKr: '리그 1', logoUrl: '/league-logos/ligue1.png' },
  'french ligue 1': { nameKr: '리그 1', logoUrl: '/league-logos/ligue1.png' },
  'ligue 2': { nameKr: '리그 2', logoUrl: '/league-logos/ligue2.png' },

  'eredivisie': { nameKr: '에레디비시', logoUrl: '/league-logos/eredivisie.png' },
  'dutch eredivisie': { nameKr: '에레디비시', logoUrl: '/league-logos/eredivisie.png' },
  'primeira liga': { nameKr: '프리메이라 리가', logoUrl: '/league-logos/primeira.png' },
  'liga portugal': { nameKr: '프리메이라 리가', logoUrl: '/league-logos/primeira.png' },
  'super lig': { nameKr: '쉬페르 리그', logoUrl: '/league-logos/super-lig.png' },
  'belgian pro league': { nameKr: '벨기에 프로리그', logoUrl: '/league-logos/jupiler.png' },
  'jupiler pro league': { nameKr: '벨기에 프로리그', logoUrl: '/league-logos/jupiler.png' },

  // ─── 유럽 클럽 대회 ───
  'uefa champions league': { nameKr: 'UEFA 챔피언스리그', logoUrl: '/league-logos/ucl.png' },
  'champions league': { nameKr: 'UEFA 챔피언스리그', logoUrl: '/league-logos/ucl.png' },
  'uefa europa league': { nameKr: 'UEFA 유로파리그', logoUrl: '/league-logos/uel.png' },
  'europa league': { nameKr: 'UEFA 유로파리그', logoUrl: '/league-logos/uel.png' },
  'uefa europa conference league': {
    nameKr: 'UEFA 컨퍼런스리그',
    logoUrl: '/league-logos/uecl.png',
  },
  'uefa nations league': { nameKr: 'UEFA 네이션스리그', logoUrl: '/league-logos/unl.png' },

  // ─── 한국/일본/중국/사우디 ───
  'k league 1': { nameKr: 'K리그1', logoUrl: '/league-logos/k1.png' },
  'k league': { nameKr: 'K리그1', logoUrl: '/league-logos/k1.png' },
  'k league 2': { nameKr: 'K리그2', logoUrl: '/league-logos/k2.png' },
  'j1 league': { nameKr: 'J1 리그', logoUrl: '/league-logos/j1.png' },
  'j league': { nameKr: 'J1 리그', logoUrl: '/league-logos/j1.png' },
  'chinese super league': { nameKr: '중국 슈퍼리그', logoUrl: '/league-logos/csl.png' },
  'saudi pro league': { nameKr: '사우디 프로리그', logoUrl: '/league-logos/spl.png' },

  // ─── 남미 ───
  'copa libertadores': { nameKr: '코파 리베르타도레스', logoUrl: '/league-logos/libertadores.png' },
  'copa sudamericana': { nameKr: '코파 수다메리카나', logoUrl: '/league-logos/sudamericana.png' },
  'brasileirao': { nameKr: '브라질 세리에 A', logoUrl: '/league-logos/brasileirao.png' },
  'brasileirao serie a': { nameKr: '브라질 세리에 A', logoUrl: '/league-logos/brasileirao.png' },
  'argentine primera': { nameKr: '아르헨티나 프리메라', logoUrl: '/league-logos/arg-primera.png' },
  'liga profesional': { nameKr: '아르헨티나 프리메라', logoUrl: '/league-logos/arg-primera.png' },

  // ─── 북중미 ───
  'liga mx': { nameKr: '리가 MX', logoUrl: '/league-logos/liga-mx.png' },
  'mls': { nameKr: 'MLS', logoUrl: '/league-logos/mls.png' },
  'major league soccer': { nameKr: 'MLS', logoUrl: '/league-logos/mls.png' },

  // ─── 농구 ───
  'nba': { nameKr: 'NBA', logoUrl: '/league-logos/nba.png' },
  'wnba': { nameKr: 'WNBA', logoUrl: '/league-logos/wnba.png' },
  'kbl': { nameKr: 'KBL', logoUrl: '/league-logos/kbl.png' },
  'euroleague': { nameKr: '유로리그', logoUrl: '/league-logos/euroleague.png' },
  'eurocup': { nameKr: '유로컵', logoUrl: '/league-logos/eurocup.png' },

  // ─── 야구 ───
  mlb: { nameKr: 'MLB', logoUrl: '/league-logos/mlb.png' },
  kbo: { nameKr: 'KBO 리그', logoUrl: '/league-logos/kbo.png' },
  npb: { nameKr: 'NPB', logoUrl: '/league-logos/npb.png' },

  // ─── 아이스하키 ───
  nhl: { nameKr: 'NHL', logoUrl: '/league-logos/nhl.png' },
  khl: { nameKr: 'KHL', logoUrl: '/league-logos/khl.png' },

  // ─── 미식축구 ───
  nfl: { nameKr: 'NFL', logoUrl: '/league-logos/nfl.png' },

  // ─── 테니스 ───
  atp: { nameKr: 'ATP 투어', logoUrl: '/league-logos/atp.png' },
  wta: { nameKr: 'WTA 투어', logoUrl: '/league-logos/wta.png' },
  'grand slam': { nameKr: '그랜드 슬램', logoUrl: '/league-logos/grandslam.png' },
};

function normLeagueKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.()/&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type KoreanLeague = { nameKr: string | null; logoUrl: string | null };

/**
 * 리그명을 받아 한글 표기 + 로고 URL 을 반환.
 * 사전에 없으면 둘 다 null.
 */
export function koreanLeague(name: string | null | undefined): KoreanLeague {
  if (!name) return { nameKr: null, logoUrl: null };
  const k = normLeagueKey(name);
  const e = RAW[k];
  if (e) return { nameKr: e.nameKr, logoUrl: e.logoUrl ?? null };

  // 부분 매칭 (리그명 안에 키워드 포함)
  for (const [key, entry] of Object.entries(RAW)) {
    if (key.length >= 6 && k.includes(key)) {
      return { nameKr: entry.nameKr, logoUrl: entry.logoUrl ?? null };
    }
  }
  return { nameKr: null, logoUrl: null };
}
