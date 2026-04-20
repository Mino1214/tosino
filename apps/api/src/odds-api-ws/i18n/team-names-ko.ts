/**
 * 팀명 → 한글 표기 사전.
 *
 * 운영 정책:
 *  - 정답이 사전에 없으면 원문(영문) 을 그대로 내려보낸다 (null 반환).
 *  - 키는 lower-case + suffix("FC","SC","CA","Club" 등) 제거한 정규화 키.
 *  - 추가는 점진적으로. 한국 사용자가 자주 보는 종목/리그 위주.
 */

const RAW: Record<string, string> = {
  // ─── EPL ───
  'manchester city': '맨체스터 시티',
  'manchester united': '맨체스터 유나이티드',
  'liverpool': '리버풀',
  'chelsea': '첼시',
  'arsenal': '아스널',
  'tottenham hotspur': '토트넘',
  'tottenham': '토트넘',
  'newcastle united': '뉴캐슬',
  'newcastle': '뉴캐슬',
  'aston villa': '아스턴 빌라',
  'west ham united': '웨스트햄',
  'west ham': '웨스트햄',
  'brighton & hove albion': '브라이튼',
  'brighton': '브라이튼',
  'crystal palace': '크리스탈 팰리스',
  'fulham': '풀럼',
  'brentford': '브렌트포드',
  'nottingham forest': '노팅엄 포레스트',
  'wolverhampton wanderers': '울버햄튼',
  'wolves': '울버햄튼',
  'everton': '에버턴',
  'bournemouth': '본머스',
  'leicester city': '레스터 시티',
  'leeds united': '리즈 유나이티드',
  'southampton': '사우샘프턴',
  'ipswich town': '입스위치 타운',

  // ─── La Liga ───
  'real madrid': '레알 마드리드',
  'fc barcelona': '바르셀로나',
  'barcelona': '바르셀로나',
  'atletico madrid': '아틀레티코 마드리드',
  'atletico de madrid': '아틀레티코 마드리드',
  'sevilla': '세비야',
  'valencia': '발렌시아',
  'real sociedad': '레알 소시에다드',
  'villarreal': '비야레알',
  'real betis': '레알 베티스',
  'athletic club': '아틀레틱 빌바오',
  'athletic bilbao': '아틀레틱 빌바오',
  'celta vigo': '셀타 비고',
  'celta de vigo': '셀타 비고',
  'osasuna': '오사수나',
  'getafe': '헤타페',
  'mallorca': '마요르카',
  'rayo vallecano': '라요 바예카노',
  'girona': '지로나',
  'las palmas': '라스 팔마스',
  'alaves': '알라베스',

  // ─── Serie A ───
  'juventus': '유벤투스',
  'inter milan': '인터 밀란',
  'internazionale': '인터 밀란',
  'ac milan': 'AC 밀란',
  'milan': 'AC 밀란',
  'as roma': 'AS 로마',
  'roma': 'AS 로마',
  'lazio': '라치오',
  'napoli': '나폴리',
  'atalanta': '아탈란타',
  'fiorentina': '피오렌티나',
  'bologna': '볼로냐',
  'torino': '토리노',
  'udinese': '우디네세',
  'genoa cfc': '제노아',
  'genoa': '제노아',
  'pisa sc': '피사',
  'pisa': '피사',
  'cagliari': '칼리아리',
  'sassuolo': '사수올로',
  'lecce': '레체',
  'monza': '몬차',
  'empoli': '엠폴리',
  'parma': '파르마',
  'verona': '베로나',
  'hellas verona': '베로나',
  'como': '코모',
  'venezia': '베네치아',

  // ─── Bundesliga ───
  'bayern munich': '바이에른 뮌헨',
  'fc bayern munchen': '바이에른 뮌헨',
  'borussia dortmund': '도르트문트',
  'rb leipzig': 'RB 라이프치히',
  'bayer leverkusen': '바이엘 레버쿠젠',
  'eintracht frankfurt': '프랑크푸르트',
  'wolfsburg': '볼프스부르크',
  'borussia monchengladbach': '묀헨글라드바흐',
  'vfb stuttgart': '슈투트가르트',
  'stuttgart': '슈투트가르트',
  'sc freiburg': '프라이부르크',
  'freiburg': '프라이부르크',
  'union berlin': '우니온 베를린',
  'mainz': '마인츠',
  'hoffenheim': '호펜하임',
  'augsburg': '아우크스부르크',
  'werder bremen': '베르더 브레멘',

  // ─── Ligue 1 ───
  'paris saint germain': '파리 생제르맹',
  'paris saint-germain': '파리 생제르맹',
  'psg': '파리 생제르맹',
  'olympique marseille': '마르세유',
  'marseille': '마르세유',
  'olympique lyonnais': '리옹',
  'lyon': '리옹',
  'as monaco': '모나코',
  'monaco': '모나코',
  'lille': '릴',
  'losc lille': '릴',
  'rennes': '렌',
  'stade rennais': '렌',
  'nice': '니스',
  'ogc nice': '니스',
  'nantes': '낭트',
  'lens': '랑스',

  // ─── 한국 K리그 ───
  'ulsan hyundai': '울산 현대',
  'jeonbuk hyundai motors': '전북 현대',
  'pohang steelers': '포항 스틸러스',
  'fc seoul': 'FC 서울',
  'incheon united': '인천 유나이티드',
  'suwon samsung bluewings': '수원 삼성',
  'gangwon fc': '강원 FC',
  'daegu fc': '대구 FC',
  'jeju united': '제주 유나이티드',
  'gwangju fc': '광주 FC',

  // ─── 일본 J리그 ───
  'kawasaki frontale': '가와사키 프론탈레',
  'yokohama f marinos': '요코하마 F 마리노스',
  'urawa red diamonds': '우라와 레드 다이아몬즈',
  'kashima antlers': '가시마 앤틀러스',
  'gamba osaka': '감바 오사카',
  'cerezo osaka': '세레소 오사카',
  'vissel kobe': '비셀 고베',
  'fc tokyo': 'FC 도쿄',

  // ─── 남미 (자주 보이는) ───
  'ca rosario central': '로사리오 센트랄',
  'rosario central': '로사리오 센트랄',
  'ca sarmiento junin': '사르미엔토 후닌',
  'sarmiento': '사르미엔토 후닌',
  'boca juniors': '보카 주니어스',
  'river plate': '리버 플레이트',
  'flamengo': '플라멩구',
  'palmeiras': '팔메이라스',
  'sao paulo': '상파울루',
  'corinthians': '코린치안스',
  'santos': '산투스',
  'fluminense': '플루미넨시',
  'gremio': '그레미우',
  'internacional': '인테르나시오나우',

  // ─── 멕시코 리가 MX (BET365 라이브에 자주 잡힘) ───
  'mazatlan fc': '마사틀란',
  'deportivo toluca fc': '톨루카',
  'toluca': '톨루카',
  'club america': '클럽 아메리카',
  'cruz azul': '크루스 아술',
  'chivas guadalajara': '치바스',
  'tigres uanl': '티그레스',
  'monterrey': '몬테레이',
  'pumas unam': '푸마스',

  // ─── NBA (참고용 — 자주 보이는 팀만) ───
  'los angeles lakers': '로스앤젤레스 레이커스',
  'la lakers': '로스앤젤레스 레이커스',
  'golden state warriors': '골든스테이트 워리어스',
  'boston celtics': '보스턴 셀틱스',
  'milwaukee bucks': '밀워키 벅스',
  'denver nuggets': '덴버 너기츠',
  'phoenix suns': '피닉스 선스',

  // ─── KBO ───
  'lg twins': 'LG 트윈스',
  'doosan bears': '두산 베어스',
  'kt wiz': 'KT 위즈',
  'samsung lions': '삼성 라이온즈',
  'ssg landers': 'SSG 랜더스',
  'kia tigers': 'KIA 타이거즈',
  'lotte giants': '롯데 자이언츠',
  'hanwha eagles': '한화 이글스',
  'nc dinos': 'NC 다이노스',
  'kiwoom heroes': '키움 히어로즈',
};

/** 팀 이름 정규화 — lookup 키. */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.()\/&]/g, ' ')
    .replace(/\bf\.?c\.?\b/g, 'fc')
    .replace(/\bs\.?c\.?\b/g, 'sc')
    .replace(/\bc\.?d\.?\b/g, 'cd')
    .replace(/\bc\.?a\.?\b/g, 'ca')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 팀 이름의 한글 표기를 반환. 없으면 null.
 * - 정확 매칭 → suffix 제거 매칭 → 불일치
 */
export function koreanTeamName(name: string | null | undefined): string | null {
  if (!name) return null;
  const k = normalizeTeamName(name);
  if (RAW[k]) return RAW[k];

  // suffix 제거 시도
  const stripped = k
    .replace(/\b(fc|sc|sk|cf|cd|ca|club|sport|sports|sportclub|football|futbol|fr|de)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped && stripped !== k && RAW[stripped]) return RAW[stripped];

  return null;
}
