import {
  PrismaClient,
  Prisma,
  UserRole,
  SyncJobType,
  RegistrationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PLATFORM_HOSTS = [
  'localhost',
  '127.0.0.1',
  'i-on.bet',
  'www.i-on.bet',
  'user.i-on.bet',
  'mod.i-on.bet',
  'agent.i-on.bet',
];

/** 모든 데모 계정 공통 비밀번호 */
const DEMO_PASSWORD = 'Admin123!';

function loginIdOf(emailLike: string): string {
  return emailLike.trim().toLowerCase();
}

type EnsureDemoUserOpts = {
  loginIdRaw: string;
  contactEmail?: string | null;
  role: UserRole;
  platformId: string;
  parentUserId: string | null;
  displayName: string;
  registrationStatus?: RegistrationStatus;
  referralCode?: string | null;
  agentPlatformSharePct?: Prisma.Decimal | null;
  agentSplitFromParentPct?: Prisma.Decimal | null;
};

async function ensureDemoUser(
  passwordHash: string,
  opts: EnsureDemoUserOpts,
): Promise<void> {
  const loginId = loginIdOf(opts.loginIdRaw);
  const hit = await prisma.user.findFirst({
    where: { loginId, platformId: opts.platformId },
  });
  if (hit) return;

  const email =
    opts.contactEmail != null && String(opts.contactEmail).trim().length > 0
      ? String(opts.contactEmail).trim().toLowerCase()
      : null;
  const reg = opts.registrationStatus ?? RegistrationStatus.APPROVED;

  const user = await prisma.user.create({
    data: {
      loginId,
      email,
      passwordHash,
      role: opts.role,
      platformId: opts.platformId,
      parentUserId: opts.parentUserId,
      displayName: opts.displayName,
      registrationStatus: reg,
      referralCode: opts.referralCode ?? undefined,
      agentPlatformSharePct: opts.agentPlatformSharePct ?? undefined,
      agentSplitFromParentPct: opts.agentSplitFromParentPct ?? undefined,
    },
  });

  if (reg === RegistrationStatus.APPROVED && opts.role === UserRole.USER) {
    await prisma.wallet.create({
      data: { userId: user.id, platformId: opts.platformId, balance: 0 },
    });
  }
  if (reg === RegistrationStatus.APPROVED && opts.role === UserRole.MASTER_AGENT) {
    await prisma.wallet.create({
      data: { userId: user.id, platformId: opts.platformId, balance: 0 },
    });
  }

  console.log(
    `Created test account: ${loginId} (${opts.role}${reg !== RegistrationStatus.APPROVED ? ` · ${reg}` : ''})`,
  );
}

/** odds-api.io 저장 스냅샷·Live Odds Control Room 용 (서버 ODDS_API_KEY + 주기/수동 refresh 와 함께 씀) */
const DEMO_ODDS_API_JSON: Prisma.InputJsonValue = {
  enabled: true,
  sports: ['football', 'basketball'],
  /** 비우면 REST 카탈로그가 multi-odds 후 전부 걸러질 수 있음 — 코드에서도 selected 로 폴백하지만 시드는 명시 */
  bookmakers: ['Bet365'],
  status: 'all',
  cacheTtlSeconds: 30,
  matchLimit: 120,
  useDisplayWhitelist: false,
};

/** 데모 플랫폼에 항상 채울 연동 예시 — 솔루션 화면에서 탭·피드 목록 확인용 */
const DEMO_INTEGRATIONS_JSON: Prisma.InputJsonValue = {
  sportsFeeds: [
    {
      id: 'demo-soccer',
      sportLabel: '축구',
      market: 'EUROPEAN',
      kind: 'graphql_persisted',
      baseUrl: 'https://example-bookie.example/api',
      operationName: 'OddsQuery',
      persistedQueryHash:
        'a7b8c2d3084b3d374e3e9f869c7986a21f242d4d26cd566cc8b692f84e019731',
      credentialEnvKey: 'DEMO_SPORTS_SESSION_TOKEN',
      cacheTtlSeconds: 30,
      notes: 'variables.id·filter 등은 동기화 로직에서 조합',
    },
    {
      id: 'demo-vfl',
      sportLabel: '가상축구',
      market: 'EUROPEAN',
      kind: 'rest_json',
      baseUrl: 'https://example-vfl.example',
      resourcePath: '/vfl/feeds/.../match_odds2/{matchId}',
      cacheTtlSeconds: 15,
    },
    {
      id: 'demo-kr-baseball',
      sportLabel: '야구(국내)',
      market: 'DOMESTIC',
      kind: 'graphql_persisted',
      baseUrl: 'https://example-kr.example/api',
      operationName: 'OddsQuery',
      cacheTtlSeconds: 30,
      notes: '국내 북메이커/피드 예시',
    },
  ],
  oddsApi: DEMO_ODDS_API_JSON,
};

function needsDemoSportsFeeds(integrationsJson: unknown): boolean {
  if (!integrationsJson || typeof integrationsJson !== 'object') return true;
  const feeds = (integrationsJson as { sportsFeeds?: unknown }).sportsFeeds;
  return !Array.isArray(feeds) || feeds.length === 0;
}

function needsDemoOddsApi(integrationsJson: unknown): boolean {
  if (!integrationsJson || typeof integrationsJson !== 'object') return true;
  const oa = (integrationsJson as { oddsApi?: { enabled?: boolean } }).oddsApi;
  if (!oa || typeof oa !== 'object') return true;
  return oa.enabled !== true;
}

/** oddsApi 켜져 있는데 bookmakers 만 비어 있으면 REST 스냅샷이 0건 — 시드로 보강 */
function needsDemoOddsApiBookmakers(integrationsJson: unknown): boolean {
  if (!integrationsJson || typeof integrationsJson !== 'object') return false;
  const oa = (integrationsJson as { oddsApi?: { enabled?: boolean } }).oddsApi;
  if (!oa || typeof oa !== 'object' || oa.enabled !== true) return false;
  const bm = (oa as { bookmakers?: unknown }).bookmakers;
  return !Array.isArray(bm) || bm.length === 0;
}

/** SEED_PLATFORM_HOSTS / SEED_DEMO_PLATFORM_HOSTS — 쉼표·공백 구분, demo 플랫폼에 platform_domains 행 추가 */
/**
 * 운영 시드 스케줄 기준 시각(한국 2026-04-13 02:05).
 * sports-live / sports-prematch 의 start_ts·update_time·DB fetchedAt 를 이 순간에 맞춤.
 */
const SEED_SPORTS_SCHEDULE_ANCHOR = new Date('2026-04-13T02:05:00+09:00');

/** OddsHost 인플레이 목록·sync upsert 와 동일: DB payloadJson = { games: [...] } */
function demoSportsLiveGames(anchor: Date): Prisma.InputJsonValue {
  const iso = anchor.toISOString();
  return [
    {
      game_id: 'seed-live-1',
      status: '1',
      start_ts: '2026-04-13 00:30:00',
      competition_id: 'seed-kr',
      competition_name: 'K League · Demo',
      competition_name_kor: 'K리그 (시드)',
      competition_cc_name: 'KR',
      competition_cc_name_kor: '한국',
      team: [
        {
          team1_id: 's1',
          team1_name: 'Seoul FC',
          team1_name_kor: '서울 FC',
        },
        {
          team2_id: 's2',
          team2_name: 'Busan United',
          team2_name_kor: '부산 유나이티드',
        },
      ],
      location: 'KR',
      round: 'R12',
      series: '',
      timer: { time_mark: '1H', time_mark_kor: '전반 35′' },
      score: '1-0',
      update_time: iso,
      odds_1x2: { home: '2.18', draw: '3.15', away: '3.05' },
      live_ui_url: 'https://example.com/inplay/seed-live-1',
    },
    {
      game_id: 'seed-live-2',
      status: '1',
      start_ts: '2026-04-13 01:15:00',
      competition_id: 'seed-epl',
      competition_name: 'Premier Demo',
      competition_name_kor: '프리미어 (시드)',
      competition_cc_name: 'GB',
      competition_cc_name_kor: '영국',
      team: [
        {
          team1_id: 'e1',
          team1_name: 'North City',
          team1_name_kor: '노스 시티',
        },
        {
          team2_id: 'e2',
          team2_name: 'South Town',
          team2_name_kor: '사우스 타운',
        },
      ],
      location: 'UK',
      round: 'MD32',
      series: '',
      timer: { time_mark: '2H', time_mark_kor: '후반 8′' },
      score: '2-2',
      update_time: iso,
      odds_1x2: { home: '2.45', draw: '3.40', away: '2.62' },
      live_ui_url: 'https://example.com/inplay/seed-live-2',
    },
  ];
}

type PmSlot = {
  start_ts: string;
  competition_id: string;
  competition_name: string;
  competition_name_kor: string;
  cc: string;
  cc_kor: string;
  loc: string;
  round: string;
  t1: { id: string; en: string; ko: string };
  t2: { id: string; en: string; ko: string };
};

/** 2026-04-13 오전~ 이후 일정 위주 다건 (스냅샷은 { games } — sports-live 와 동일 키) */
function demoPrematchSlots(): PmSlot[] {
  return [
    {
      start_ts: '2026-04-13 10:00:00',
      competition_id: 'seed-k1',
      competition_name: 'K League 1',
      competition_name_kor: 'K리그1',
      cc: 'KR',
      cc_kor: '한국',
      loc: 'KR',
      round: 'R8',
      t1: { id: 'pm-a1', en: 'Ulsan HD', ko: '울산 HD' },
      t2: { id: 'pm-a2', en: 'Pohang Steelers', ko: '포항 스틸러스' },
    },
    {
      start_ts: '2026-04-13 12:00:00',
      competition_id: 'seed-k1',
      competition_name: 'K League 1',
      competition_name_kor: 'K리그1',
      cc: 'KR',
      cc_kor: '한국',
      loc: 'KR',
      round: 'R8',
      t1: { id: 'pm-b1', en: 'Jeonbuk Hyundai', ko: '전북 현대' },
      t2: { id: 'pm-b2', en: 'Suwon FC', ko: '수원 FC' },
    },
    {
      start_ts: '2026-04-13 14:00:00',
      competition_id: 'seed-k2',
      competition_name: 'K League 2',
      competition_name_kor: 'K리그2',
      cc: 'KR',
      cc_kor: '한국',
      loc: 'KR',
      round: 'R9',
      t1: { id: 'pm-c1', en: 'Seoul E-Land', ko: '서울 이랜드' },
      t2: { id: 'pm-c2', en: 'Ansan Greeners', ko: '안산 그리너스' },
    },
    {
      start_ts: '2026-04-13 15:30:00',
      competition_id: 'seed-epl',
      competition_name: 'Premier League',
      competition_name_kor: '프리미어리그',
      cc: 'GB',
      cc_kor: '영국',
      loc: 'UK',
      round: 'MD33',
      t1: { id: 'pm-d1', en: 'Arsenal FC', ko: '아스널' },
      t2: { id: 'pm-d2', en: 'Chelsea FC', ko: '첼시' },
    },
    {
      start_ts: '2026-04-13 17:00:00',
      competition_id: 'seed-laliga',
      competition_name: 'La Liga',
      competition_name_kor: '라리가',
      cc: 'ES',
      cc_kor: '스페인',
      loc: 'ES',
      round: 'R31',
      t1: { id: 'pm-e1', en: 'Real Madrid', ko: '레알 마드리드' },
      t2: { id: 'pm-e2', en: 'Barcelona', ko: '바르셀로나' },
    },
    {
      start_ts: '2026-04-13 18:30:00',
      competition_id: 'seed-seriea',
      competition_name: 'Serie A',
      competition_name_kor: '세리에 A',
      cc: 'IT',
      cc_kor: '이탈리아',
      loc: 'IT',
      round: 'R32',
      t1: { id: 'pm-f1', en: 'Inter Milan', ko: '인테르' },
      t2: { id: 'pm-f2', en: 'AC Milan', ko: 'AC 밀란' },
    },
    {
      start_ts: '2026-04-13 19:30:00',
      competition_id: 'seed-bundes',
      competition_name: 'Bundesliga',
      competition_name_kor: '분데스리가',
      cc: 'DE',
      cc_kor: '독일',
      loc: 'DE',
      round: 'R29',
      t1: { id: 'pm-g1', en: 'Bayern Munich', ko: '바이에른 뮌헨' },
      t2: { id: 'pm-g2', en: 'Borussia Dortmund', ko: '도르트문트' },
    },
    {
      start_ts: '2026-04-13 21:00:00',
      competition_id: 'seed-ligue1',
      competition_name: 'Ligue 1',
      competition_name_kor: '리그1',
      cc: 'FR',
      cc_kor: '프랑스',
      loc: 'FR',
      round: 'R30',
      t1: { id: 'pm-h1', en: 'PSG', ko: 'PSG' },
      t2: { id: 'pm-h2', en: 'Marseille', ko: '마르세유' },
    },
    {
      start_ts: '2026-04-14 01:00:00',
      competition_id: 'seed-ucl',
      competition_name: 'Champions League',
      competition_name_kor: '챔피언스리그',
      cc: 'EU',
      cc_kor: '유럽',
      loc: 'EU',
      round: 'QF-L1',
      t1: { id: 'pm-i1', en: 'Man City', ko: '맨시티' },
      t2: { id: 'pm-i2', en: 'Bayern Munich', ko: '바이에른' },
    },
    {
      start_ts: '2026-04-14 03:00:00',
      competition_id: 'seed-ucl',
      competition_name: 'Champions League',
      competition_name_kor: '챔피언스리그',
      cc: 'EU',
      cc_kor: '유럽',
      loc: 'EU',
      round: 'QF-L1',
      t1: { id: 'pm-j1', en: 'Real Madrid', ko: '레알 마드리드' },
      t2: { id: 'pm-j2', en: 'Arsenal', ko: '아스널' },
    },
    {
      start_ts: '2026-04-14 14:00:00',
      competition_id: 'seed-k1',
      competition_name: 'K League 1',
      competition_name_kor: 'K리그1',
      cc: 'KR',
      cc_kor: '한국',
      loc: 'KR',
      round: 'R8',
      t1: { id: 'pm-k1', en: 'Gangwon FC', ko: '강원 FC' },
      t2: { id: 'pm-k2', en: 'Daegu FC', ko: '대구 FC' },
    },
    {
      start_ts: '2026-04-14 16:00:00',
      competition_id: 'seed-j1',
      competition_name: 'J1 League',
      competition_name_kor: 'J1리그',
      cc: 'JP',
      cc_kor: '일본',
      loc: 'JP',
      round: 'R10',
      t1: { id: 'pm-l1', en: 'Kashima Antlers', ko: '가시마' },
      t2: { id: 'pm-l2', en: 'Yokohama F·Marinos', ko: '요코하마 F·마리노스' },
    },
    {
      start_ts: '2026-04-14 18:00:00',
      competition_id: 'seed-mls',
      competition_name: 'MLS',
      competition_name_kor: 'MLS',
      cc: 'US',
      cc_kor: '미국',
      loc: 'US',
      round: 'R7',
      t1: { id: 'pm-m1', en: 'LA Galaxy', ko: 'LA 갤럭시' },
      t2: { id: 'pm-m2', en: 'Seattle Sounders', ko: '시애틀' },
    },
    {
      start_ts: '2026-04-15 10:00:00',
      competition_id: 'seed-kfa',
      competition_name: 'KFA Cup',
      competition_name_kor: 'FA컵',
      cc: 'KR',
      cc_kor: '한국',
      loc: 'KR',
      round: 'R16',
      t1: { id: 'pm-n1', en: 'Daejeon Hana', ko: '대전 하나' },
      t2: { id: 'pm-n2', en: 'Gimcheon Sangmu', ko: '김천 상무' },
    },
    {
      start_ts: '2026-04-15 13:00:00',
      competition_id: 'seed-epl',
      competition_name: 'Premier League',
      competition_name_kor: '프리미어리그',
      cc: 'GB',
      cc_kor: '영국',
      loc: 'UK',
      round: 'MD33',
      t1: { id: 'pm-o1', en: 'Liverpool FC', ko: '리버풀' },
      t2: { id: 'pm-o2', en: 'Tottenham', ko: '토트넘' },
    },
    {
      start_ts: '2026-04-15 16:00:00',
      competition_id: 'seed-laliga',
      competition_name: 'La Liga',
      competition_name_kor: '라리가',
      cc: 'ES',
      cc_kor: '스페인',
      loc: 'ES',
      round: 'R31',
      t1: { id: 'pm-p1', en: 'Atletico Madrid', ko: 'AT마드리드' },
      t2: { id: 'pm-p2', en: 'Sevilla FC', ko: '세비야' },
    },
    {
      start_ts: '2026-04-15 19:00:00',
      competition_id: 'seed-bundes',
      competition_name: 'Bundesliga',
      competition_name_kor: '분데스리가',
      cc: 'DE',
      cc_kor: '독일',
      loc: 'DE',
      round: 'R29',
      t1: { id: 'pm-q1', en: 'RB Leipzig', ko: '라이프치히' },
      t2: { id: 'pm-q2', en: 'Leverkusen', ko: '레버쿠젠' },
    },
    {
      start_ts: '2026-04-16 11:00:00',
      competition_id: 'seed-k2',
      competition_name: 'K League 2',
      competition_name_kor: 'K리그2',
      cc: 'KR',
      cc_kor: '한국',
      loc: 'KR',
      round: 'R9',
      t1: { id: 'pm-r1', en: 'Gyeongnam FC', ko: '경남 FC' },
      t2: { id: 'pm-r2', en: 'Chungbuk Cheongju', ko: '충북 청주' },
    },
    {
      start_ts: '2026-04-16 14:30:00',
      competition_id: 'seed-k1',
      competition_name: 'K League 1',
      competition_name_kor: 'K리그1',
      cc: 'KR',
      cc_kor: '한국',
      loc: 'KR',
      round: 'R9',
      t1: { id: 'pm-s1', en: 'Incheon United', ko: '인천 유나이티드' },
      t2: { id: 'pm-s2', en: 'Gwangju FC', ko: '광주 FC' },
    },
    {
      start_ts: '2026-04-16 19:00:00',
      competition_id: 'seed-epl',
      competition_name: 'Premier League',
      competition_name_kor: '프리미어리그',
      cc: 'GB',
      cc_kor: '영국',
      loc: 'UK',
      round: 'MD34',
      t1: { id: 'pm-t1', en: 'Newcastle Utd', ko: '뉴캐슬' },
      t2: { id: 'pm-t2', en: 'Brighton', ko: '브라이턴' },
    },
    {
      start_ts: '2026-04-17 20:00:00',
      competition_id: 'seed-friendly',
      competition_name: 'International Friendly',
      competition_name_kor: '친선경기',
      cc: 'INT',
      cc_kor: '국제',
      loc: 'INT',
      round: 'Ex',
      t1: { id: 'pm-u1', en: 'Korea Rep.', ko: '대한민국' },
      t2: { id: 'pm-u2', en: 'Japan', ko: '일본' },
    },
  ];
}

function demoPrematchPayload(anchor: Date): Prisma.InputJsonValue {
  const iso = anchor.toISOString();
  const games = demoPrematchSlots().map((row, idx) => ({
    game_id: `seed-pm-${idx + 1}`,
    status: '0',
    start_ts: row.start_ts,
    competition_id: row.competition_id,
    competition_name: row.competition_name,
    competition_name_kor: row.competition_name_kor,
    competition_cc_name: row.cc,
    competition_cc_name_kor: row.cc_kor,
    team: [
      {
        team1_id: row.t1.id,
        team1_name: row.t1.en,
        team1_name_kor: row.t1.ko,
      },
      {
        team2_id: row.t2.id,
        team2_name: row.t2.en,
        team2_name_kor: row.t2.ko,
      },
    ],
    location: row.loc,
    round: row.round,
    series: '',
    score: '0-0',
    update_time: iso,
    odds_1x2: {
      home: (1.68 + (idx % 7) * 0.05).toFixed(2),
      draw: (3.0 + (idx % 5) * 0.08).toFixed(2),
      away: (2.12 + (idx % 6) * 0.06).toFixed(2),
    },
    live_ui_url: `https://example.com/prematch/seed-pm-${idx + 1}`,
  }));
  return { games };
}

/**
 * 데모 플랫폼에 sports-live / sports-prematch 스냅샷이 비어 있으면 시드.
 * 기존 경기를 덮어쓰려면 SEED_FORCE_SPORTS_SNAPSHOTS=1
 */
async function ensureDemoSportsBroadcastSnapshots(
  platformId: string,
): Promise<void> {
  const force = ['1', 'true', 'yes', 'on'].includes(
    (process.env.SEED_FORCE_SPORTS_SNAPSHOTS || '').trim().toLowerCase(),
  );

  const liveRow = await prisma.sportsOddsSnapshot.findUnique({
    where: {
      platformId_sourceFeedId: {
        platformId,
        sourceFeedId: 'sports-live',
      },
    },
  });
  let gamesLen = 0;
  if (liveRow?.payloadJson && typeof liveRow.payloadJson === 'object') {
    const p = liveRow.payloadJson as { games?: unknown; game?: unknown };
    if (Array.isArray(p.games)) gamesLen = p.games.length;
    else if (Array.isArray(p.game)) gamesLen = p.game.length;
  }

  /** 스포츠 시드 일정·fetchedAt 은 고정 앵커(2026-04-13 02:05 KST)와 맞춤 */
  const anchor = SEED_SPORTS_SCHEDULE_ANCHOR;

  if (force || gamesLen === 0) {
    const games = demoSportsLiveGames(anchor);
    await prisma.sportsOddsSnapshot.upsert({
      where: {
        platformId_sourceFeedId: { platformId, sourceFeedId: 'sports-live' },
      },
      create: {
        platformId,
        sourceFeedId: 'sports-live',
        sportLabel: 'sports',
        market: null,
        payloadJson: { games } as Prisma.InputJsonValue,
        fetchedAt: anchor,
      },
      update: {
        payloadJson: { games } as Prisma.InputJsonValue,
        fetchedAt: anchor,
      },
    });
    console.log(
      `Seeded sports-live (${(games as unknown[]).length} games) for platform ${platformId}`,
    );
  } else {
    console.log(
      `sports-live already has ${gamesLen} games (set SEED_FORCE_SPORTS_SNAPSHOTS=1 to replace)`,
    );
  }

  const pmRow = await prisma.sportsOddsSnapshot.findUnique({
    where: {
      platformId_sourceFeedId: {
        platformId,
        sourceFeedId: 'sports-prematch',
      },
    },
  });
  let pmLen = 0;
  if (pmRow?.payloadJson && typeof pmRow.payloadJson === 'object') {
    const p = pmRow.payloadJson as { games?: unknown; game?: unknown };
    if (Array.isArray(p.games)) pmLen = p.games.length;
    else if (Array.isArray(p.game)) pmLen = p.game.length;
  }

  if (force || pmLen === 0) {
    const pmPayload = demoPrematchPayload(anchor);
    const pmGameCount = Array.isArray(
      (pmPayload as { games?: unknown }).games,
    )
      ? ((pmPayload as { games: unknown[] }).games as unknown[]).length
      : 0;
    await prisma.sportsOddsSnapshot.upsert({
      where: {
        platformId_sourceFeedId: {
          platformId,
          sourceFeedId: 'sports-prematch',
        },
      },
      create: {
        platformId,
        sourceFeedId: 'sports-prematch',
        sportLabel: 'prematch-seed',
        market: null,
        payloadJson: pmPayload as Prisma.InputJsonValue,
        fetchedAt: anchor,
      },
      update: {
        payloadJson: pmPayload as Prisma.InputJsonValue,
        fetchedAt: anchor,
      },
    });
    console.log(
      `Seeded sports-prematch (${pmGameCount} games) for platform ${platformId}`,
    );
  } else {
    console.log(
      `sports-prematch already has ${pmLen} games (set SEED_FORCE_SPORTS_SNAPSHOTS=1 to replace)`,
    );
  }
}

async function ensureHostsOnPlatform(
  platformId: string,
  rawEnv: string | undefined,
): Promise<void> {
  const hosts = (rawEnv || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  for (const host of hosts) {
    const taken = await prisma.platformDomain.findUnique({
      where: { host },
    });
    if (taken) {
      if (taken.platformId !== platformId) {
        console.warn(
          `시드 스킵: host "${host}" 는 이미 다른 플랫폼(${taken.platformId})에 연결됨`,
        );
      }
      continue;
    }
    await prisma.platformDomain.create({
      data: { host, platformId },
    });
    console.log(`Seeded platform_domain: ${host} → platform ${platformId}`);
  }
}

/**
 * SEED_EXTRA_DEMO_COUNT=N (1~5) — 본 데모(demo) 외에 `demo-sat-1` … 플랫폼을 추가합니다.
 * 각 솔루션: 도메인 `demo-sat-{i}.seed.local`, 플랫폼관리·총판·전용 회원 1명씩 (비밀번호 동일 DEMO_PASSWORD).
 * 회원 loginId 는 `user-sat{i}@tosino.local` — 메인 데모 `user@tosino.local` 과 구분됩니다.
 * 테스트 시나리오는 슈퍼어드민에서 플랫폼 선택 후 솔루션마다 실행하면 됩니다.
 */
async function seedExtraDemoPlatforms(passwordHash: string): Promise<void> {
  const raw = Number.parseInt(process.env.SEED_EXTRA_DEMO_COUNT ?? '0', 10);
  if (!Number.isFinite(raw) || raw < 1) return;
  const cap = Math.min(raw, 5);
  for (let i = 1; i <= cap; i++) {
    const slug = `demo-sat-${i}`;
    const name = `데모 솔루션 ${i}`;
    const host = `demo-sat-${i}.seed.local`;
    let p = await prisma.platform.findUnique({ where: { slug } });
    if (!p) {
      const portTaken = await prisma.platform.findFirst({
        where: { previewPort: 3200 + i },
      });
      const previewPort = portTaken ? null : 3200 + i;
      p = await prisma.platform.create({
        data: {
          slug,
          name,
          previewPort,
          themeJson: {
            primaryColor: '#6b7280',
            logoUrl: null,
            siteName: name,
            bannerUrls: [],
          },
          flagsJson: { sports: true, casino: true },
          integrationsJson: DEMO_INTEGRATIONS_JSON,
          domains: { create: [{ host }] },
        },
      });
      console.log(`Created satellite demo platform ${slug} (host ${host})`);
    }
    const paEmail = `platform-sat${i}@tosino.local`;
    let pa = await prisma.user.findFirst({
      where: { loginId: loginIdOf(paEmail), platformId: p.id },
    });
    if (!pa) {
      pa = await prisma.user.create({
        data: {
          loginId: loginIdOf(paEmail),
          email: paEmail,
          passwordHash,
          role: UserRole.PLATFORM_ADMIN,
          platformId: p.id,
          displayName: `위성 관리자 ${i}`,
        },
      });
      await prisma.wallet.create({
        data: { userId: pa.id, platformId: p.id, balance: 0 },
      });
      console.log(`  → PLATFORM_ADMIN ${paEmail}`);
    }
    const maEmail = `master-sat${i}@tosino.local`;
    let ma = await prisma.user.findFirst({
      where: { loginId: loginIdOf(maEmail), platformId: p.id },
    });
    if (!ma) {
      ma = await prisma.user.create({
        data: {
          loginId: loginIdOf(maEmail),
          email: maEmail,
          passwordHash,
          role: UserRole.MASTER_AGENT,
          platformId: p.id,
          displayName: `위성 총판 ${i}`,
          referralCode: `DEMOSAT${i}K`,
          agentPlatformSharePct: new Prisma.Decimal(35),
        },
      });
      await prisma.wallet.create({
        data: { userId: ma.id, platformId: p.id, balance: 0 },
      });
      console.log(`  → MASTER_AGENT ${maEmail} (추천 ${`DEMOSAT${i}K`})`);
    }
    const uEmail = `user-sat${i}@tosino.local`;
    let demoUser = await prisma.user.findFirst({
      where: { loginId: loginIdOf(uEmail), platformId: p.id },
    });
    if (!demoUser && ma) {
      demoUser = await prisma.user.create({
        data: {
          loginId: loginIdOf(uEmail),
          email: uEmail,
          passwordHash,
          role: UserRole.USER,
          platformId: p.id,
          parentUserId: ma.id,
          displayName: `위성 데모 회원 ${i}`,
          registrationStatus: RegistrationStatus.APPROVED,
        },
      });
      await prisma.wallet.create({
        data: { userId: demoUser.id, platformId: p.id, balance: 0 },
      });
      console.log(`  → USER ${uEmail} (전용 · 상위 ${maEmail})`);
    }
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const superEmail = 'super@tosino.local';
  const superLid = loginIdOf(superEmail);
  let superUser = await prisma.user.findFirst({
    where: { loginId: superLid, platformId: null },
  });
  if (!superUser) {
    superUser = await prisma.user.create({
      data: {
        loginId: superLid,
        email: superEmail,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        platformId: null,
      },
    });
    console.log('Created SUPER_ADMIN', superLid);
  }

  let platform = await prisma.platform.findUnique({ where: { slug: 'demo' } });
  if (!platform) {
    platform = await prisma.platform.create({
      data: {
        slug: 'demo',
        name: 'Demo Platform',
        previewPort: 3200,
        themeJson: {
          primaryColor: '#c9a227',
          logoUrl: null,
          siteName: 'Demo Casino',
          bannerUrls: ['/banner1.svg'],
        },
        flagsJson: { sports: true, casino: true },
        integrationsJson: DEMO_INTEGRATIONS_JSON,
        domains: {
          create: [{ host: 'localhost' }],
        },
      },
    });
    console.log('Created platform demo + domain localhost + sportsFeeds');
  } else {
    const needFeeds = needsDemoSportsFeeds(platform.integrationsJson);
    const needOdds = needsDemoOddsApi(platform.integrationsJson);
    if (needFeeds || needOdds) {
      const base =
        platform.integrationsJson && typeof platform.integrationsJson === 'object'
          ? { ...(platform.integrationsJson as Record<string, unknown>) }
          : {};
      const merged: Record<string, unknown> = {
        ...base,
        ...(needFeeds
          ? {
              sportsFeeds: (DEMO_INTEGRATIONS_JSON as { sportsFeeds: unknown })
                .sportsFeeds,
            }
          : {}),
        ...(needOdds ? { oddsApi: DEMO_ODDS_API_JSON } : {}),
      };
      await prisma.platform.update({
        where: { id: platform.id },
        data: { integrationsJson: merged as Prisma.InputJsonValue },
      });
      console.log(
        `Updated demo platform integrations: sportsFeeds=${needFeeds ? 'patched' : 'keep'} oddsApi=${needOdds ? 'patched' : 'keep'}`,
      );
    } else if (needsDemoOddsApiBookmakers(platform.integrationsJson)) {
      const base =
        platform.integrationsJson && typeof platform.integrationsJson === 'object'
          ? { ...(platform.integrationsJson as Record<string, unknown>) }
          : {};
      const prevOa =
        base.oddsApi && typeof base.oddsApi === 'object'
          ? { ...(base.oddsApi as Record<string, unknown>) }
          : {};
      const merged: Record<string, unknown> = {
        ...base,
        oddsApi: { ...prevOa, bookmakers: ['Bet365'] },
      };
      await prisma.platform.update({
        where: { id: platform.id },
        data: { integrationsJson: merged as Prisma.InputJsonValue },
      });
      console.log('Updated demo platform: oddsApi.bookmakers → Bet365 (REST 스냅샷용)');
    }
    if (platform.previewPort == null) {
      const portTaken = await prisma.platform.findFirst({
        where: { previewPort: 3200, NOT: { id: platform.id } },
      });
      if (!portTaken) {
        await prisma.platform.update({
          where: { id: platform.id },
          data: { previewPort: 3200 },
        });
        console.log('Updated demo platform: previewPort 3200');
      } else {
        console.log(
          'Skip demo previewPort 3200 (다른 플랫폼이 이미 사용 중)',
        );
      }
    }
  }

  const extraHosts =
    process.env.SEED_PLATFORM_HOSTS ||
    process.env.SEED_DEMO_PLATFORM_HOSTS ||
    DEFAULT_PLATFORM_HOSTS.join(',');
  await ensureHostsOnPlatform(platform.id, extraHosts);

  await ensureDemoSportsBroadcastSnapshots(platform.id);

  const paEmail = 'platform@tosino.local';
  const paLid = loginIdOf(paEmail);
  let pa = await prisma.user.findFirst({
    where: { loginId: paLid, platformId: platform.id },
  });
  if (!pa) {
    pa = await prisma.user.create({
      data: {
        loginId: paLid,
        email: paEmail,
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
        platformId: platform.id,
        displayName: 'Platform Admin',
      },
    });
    await prisma.wallet.create({
      data: { userId: pa.id, platformId: platform.id, balance: 0 },
    });
    console.log('Created PLATFORM_ADMIN', paEmail);
  }

  const maEmail = 'master@tosino.local';
  const maLid = loginIdOf(maEmail);
  let ma = await prisma.user.findFirst({
    where: { loginId: maLid, platformId: platform.id },
  });
  if (!ma) {
    ma = await prisma.user.create({
      data: {
        loginId: maLid,
        email: maEmail,
        passwordHash,
        role: UserRole.MASTER_AGENT,
        platformId: platform.id,
        displayName: '총판',
        referralCode: 'DEMO7K',
        agentPlatformSharePct: new Prisma.Decimal(40),
      },
    });
    await prisma.wallet.create({
      data: { userId: ma.id, platformId: platform.id, balance: 0 },
    });
    console.log('Created MASTER_AGENT', maEmail, 'referral DEMO7K');
  } else {
    const patch: {
      referralCode?: string;
      agentPlatformSharePct?: Prisma.Decimal;
    } = {};
    if (!ma.referralCode) patch.referralCode = 'DEMO7K';
    if (ma.agentPlatformSharePct == null) {
      patch.agentPlatformSharePct = new Prisma.Decimal(40);
    }
    if (Object.keys(patch).length > 0) {
      await prisma.user.update({ where: { id: ma.id }, data: patch });
      console.log('Updated demo master agent defaults', patch);
    }
  }

  const uEmail = 'user@tosino.local';
  const uLid = loginIdOf(uEmail);
  let u = await prisma.user.findFirst({
    where: { loginId: uLid, platformId: platform.id },
  });
  if (!u) {
    u = await prisma.user.create({
      data: {
        loginId: uLid,
        email: uEmail,
        passwordHash,
        role: UserRole.USER,
        platformId: platform.id,
        parentUserId: ma.id,
        displayName: '플레이어',
      },
    });
    await prisma.wallet.create({
      data: { userId: u.id, platformId: platform.id, balance: 0 },
    });
    console.log('Created USER', uEmail);
  }

  /** Vinus/BT1 콜백 시드: user_id·loginId·PK 모두 `stub-user-dev` (VINUS_STUB_USER_ID 기본값과 일치) */
  const vinusStubId = 'stub-user-dev';
  const maForVinus = await prisma.user.findFirst({
    where: { loginId: maLid, platformId: platform.id },
  });
  if (maForVinus) {
    const vinusStubBal = new Prisma.Decimal(
      Number(process.env.VINUS_STUB_SEED_BALANCE ?? '100000') || 100000,
    );
    await prisma.user.upsert({
      where: { id: vinusStubId },
      create: {
        id: vinusStubId,
        loginId: vinusStubId,
        email: 'vinus-stub@tosino.local',
        passwordHash,
        role: UserRole.USER,
        platformId: platform.id,
        parentUserId: maForVinus.id,
        displayName: 'Vinus Stub (BT1)',
        registrationStatus: RegistrationStatus.APPROVED,
      },
      update: {
        platformId: platform.id,
        registrationStatus: RegistrationStatus.APPROVED,
      },
    });
    await prisma.wallet.upsert({
      where: { userId: vinusStubId },
      create: {
        userId: vinusStubId,
        platformId: platform.id,
        balance: vinusStubBal,
      },
      update: {
        platformId: platform.id,
        balance: vinusStubBal,
      },
    });
    console.log(
      `Vinus stub user: id/loginId ${vinusStubId} · wallet ${vinusStubBal.toFixed(2)}`,
    );
  }

  /** E2E·문서용: BT1과 동일 지갑 규모의 별도 로그인 계정 */
  const stevId = 'user-stev';
  if (maForVinus) {
    const stevBal = new Prisma.Decimal(
      Number(process.env.VINUS_STUB_SEED_BALANCE ?? '100000') || 100000,
    );
    await prisma.user.upsert({
      where: { id: stevId },
      create: {
        id: stevId,
        loginId: stevId,
        email: 'user-stev@tosino.local',
        passwordHash,
        role: UserRole.USER,
        platformId: platform.id,
        parentUserId: maForVinus.id,
        displayName: 'User Stev (테스트)',
        registrationStatus: RegistrationStatus.APPROVED,
        rollingEnabled: true,
      },
      update: {
        platformId: platform.id,
        registrationStatus: RegistrationStatus.APPROVED,
        rollingEnabled: true,
      },
    });
    await prisma.wallet.upsert({
      where: { userId: stevId },
      create: {
        userId: stevId,
        platformId: platform.id,
        balance: stevBal,
      },
      update: {
        platformId: platform.id,
        balance: stevBal,
      },
    });
    console.log(
      `테스트 회원 user-stev: loginId ${stevId} · wallet ${stevBal.toFixed(2)} · rollingEnabled`,
    );
  }

  await prisma.syncState.createMany({
    data: [
      SyncJobType.ODDS,
      SyncJobType.CASINO,
      SyncJobType.AFFILIATE,
    ].map((jobType) => ({
      platformId: platform.id,
      jobType,
    })),
    skipDuplicates: true,
  });

  // 시점별 정산 데모: 총판 플랫폼 요율 변경(40% → 35%), 회원 롤링 단계 변경, 하위 총판 분배% 변경
  const maRef = await prisma.user.findFirst({
    where: { loginId: maLid, platformId: platform.id },
  });
  const uRef = await prisma.user.findFirst({
    where: { loginId: uLid, platformId: platform.id },
  });
  if (maRef) {
    const nComm = await prisma.agentCommissionRevision.count({
      where: { userId: maRef.id },
    });
    if (nComm <= 1) {
      const t35 = new Date();
      t35.setDate(t35.getDate() - 5);
      await prisma.agentCommissionRevision.create({
        data: {
          userId: maRef.id,
          agentPlatformSharePct: new Prisma.Decimal(35),
          agentSplitFromParentPct: null,
          effectiveFrom: t35,
        },
      });
      await prisma.user.update({
        where: { id: maRef.id },
        data: { agentPlatformSharePct: new Prisma.Decimal(35) },
      });
      console.log(
        'Demo commission history: master@tosino.local 40%(가입~5일전) → 35%(5일전~)',
      );
    }
  }
  if (uRef) {
    const nRoll = await prisma.rollingRateRevision.count({
      where: { userId: uRef.id },
    });
    if (nRoll <= 1) {
      const tA = new Date();
      tA.setDate(tA.getDate() - 20);
      const tB = new Date();
      tB.setDate(tB.getDate() - 3);
      await prisma.rollingRateRevision.create({
        data: {
          userId: uRef.id,
          effectiveFrom: tA,
          rollingEnabled: true,
          rollingSportsDomesticPct: new Prisma.Decimal(1),
          rollingSportsOverseasPct: new Prisma.Decimal(1),
          rollingCasinoPct: new Prisma.Decimal(1),
          rollingSlotPct: new Prisma.Decimal(1),
          rollingMinigamePct: new Prisma.Decimal(1),
        },
      });
      await prisma.rollingRateRevision.create({
        data: {
          userId: uRef.id,
          effectiveFrom: tB,
          rollingEnabled: true,
          rollingSportsDomesticPct: new Prisma.Decimal(2),
          rollingSportsOverseasPct: new Prisma.Decimal(2),
          rollingCasinoPct: new Prisma.Decimal(1.5),
          rollingSlotPct: new Prisma.Decimal(1.5),
          rollingMinigamePct: new Prisma.Decimal(1.5),
        },
      });
      await prisma.user.update({
        where: { id: uRef.id },
        data: {
          rollingEnabled: true,
          rollingSportsDomesticPct: new Prisma.Decimal(2),
          rollingSportsOverseasPct: new Prisma.Decimal(2),
          rollingCasinoPct: new Prisma.Decimal(1.5),
          rollingSlotPct: new Prisma.Decimal(1.5),
          rollingMinigamePct: new Prisma.Decimal(1.5),
        },
      });
      console.log(
        'Demo rolling history: user@tosino.local 가입 시각 → 20일전 1% → 3일전 2%/1.5%',
      );
    }
  }

  const subEmail = 'subagent@tosino.local';
  const subLid = loginIdOf(subEmail);
  let sub = await prisma.user.findFirst({
    where: { loginId: subLid, platformId: platform.id },
  });
  const maForSub = await prisma.user.findFirst({
    where: { loginId: maLid, platformId: platform.id },
  });
  if (!sub && maForSub) {
    sub = await prisma.user.create({
      data: {
        loginId: subLid,
        email: subEmail,
        passwordHash,
        role: UserRole.MASTER_AGENT,
        platformId: platform.id,
        parentUserId: maForSub.id,
        displayName: '하위총판 데모',
        referralCode: 'SUBDEMO',
        agentSplitFromParentPct: new Prisma.Decimal(25),
      },
    });
    await prisma.wallet.create({
      data: { userId: sub.id, platformId: platform.id, balance: 0 },
    });
    const tSub2 = new Date();
    tSub2.setDate(tSub2.getDate() - 3);
    await prisma.agentCommissionRevision.createMany({
      data: [
        {
          userId: sub.id,
          agentPlatformSharePct: null,
          agentSplitFromParentPct: new Prisma.Decimal(30),
          effectiveFrom: sub.createdAt,
        },
        {
          userId: sub.id,
          agentPlatformSharePct: null,
          agentSplitFromParentPct: new Prisma.Decimal(25),
          effectiveFrom: tSub2,
        },
      ],
    });
    console.log(
      'Created subagent@tosino.local — 분배% 30%(생성~3일전) → 25%(3일전~). 상위: master@tosino.local',
    );
  }

  const maRow = await prisma.user.findFirst({
    where: { loginId: maLid, platformId: platform.id },
  });
  const subRow = await prisma.user.findFirst({
    where: { loginId: subLid, platformId: platform.id },
  });

  if (maRow) {
    await ensureDemoUser(passwordHash, {
      loginIdRaw: 'demo_player2',
      contactEmail: 'demo_player2@tosino.local',
      role: UserRole.USER,
      platformId: platform.id,
      parentUserId: maRow.id,
      displayName: '테스트회원2',
    });
    await ensureDemoUser(passwordHash, {
      loginIdRaw: 'demo_pending',
      contactEmail: 'demo_pending@tosino.local',
      role: UserRole.USER,
      platformId: platform.id,
      parentUserId: maRow.id,
      displayName: '승인대기테스트',
      registrationStatus: RegistrationStatus.PENDING,
    });
  }

  if (subRow) {
    await ensureDemoUser(passwordHash, {
      loginIdRaw: 'demo_subplayer',
      contactEmail: 'demo_subplayer@tosino.local',
      role: UserRole.USER,
      platformId: platform.id,
      parentUserId: subRow.id,
      displayName: '하위총판소속회원',
    });
  }

  await ensureDemoUser(passwordHash, {
    loginIdRaw: 'demo_master2',
    contactEmail: 'demo_master2@tosino.local',
    role: UserRole.MASTER_AGENT,
    platformId: platform.id,
    parentUserId: null,
    displayName: '최상위총판2',
    referralCode: 'DEMO8K',
    agentPlatformSharePct: new Prisma.Decimal(38),
  });

  const ma2 = await prisma.user.findFirst({
    where: { loginId: loginIdOf('demo_master2'), platformId: platform.id },
  });
  if (ma2) {
    await ensureDemoUser(passwordHash, {
      loginIdRaw: 'demo_user_m2',
      contactEmail: 'demo_user_m2@tosino.local',
      role: UserRole.USER,
      platformId: platform.id,
      parentUserId: ma2.id,
      displayName: '총판2소속회원',
    });
  }

  await seedExtraDemoPlatforms(passwordHash);
  if (Number.parseInt(process.env.SEED_EXTRA_DEMO_COUNT ?? '0', 10) > 0) {
    console.log(
      '위성 데모 플랫폼이 추가되었습니다. 각각 `platform-satN@tosino.local` / `master-satN@tosino.local` (동일 비밀번호). 테스트 시나리오는 솔루션마다 실행하세요.',
    );
  }

  console.log('');
  console.log('========== 데모 테스트 계정 (비밀번호 공통: ' + DEMO_PASSWORD + ') ==========');
  console.log('슈퍼관리자   loginId: super@tosino.local          → admin 콘솔');
  console.log('플랫폼관리   loginId: platform@tosino.local      → admin 콘솔 (데모 플랫폼)');
  console.log('총판(상위)   loginId: master@tosino.local        → agent 콘솔 · 추천코드 DEMO7K');
  console.log('총판(하위)   loginId: subagent@tosino.local      → agent 콘솔 · 상위: master');
  console.log('총판(상위2)  loginId: demo_master2               → agent 콘솔 · 추천코드 DEMO8K');
  console.log('회원         loginId: user@tosino.local          → 솔루션(회원) 로그인');
  console.log('회원         loginId: demo_player2              → 상위 총판 master');
  console.log('회원         loginId: demo_subplayer            → 상위 총판 subagent');
  console.log('회원         loginId: demo_user_m2              → 상위 총판 demo_master2');
  console.log('회원/Vinus   id·loginId: stub-user-dev         → BT1 콜백·VINUS_STUB_USER_ID (시드 지갑 기본 100000)');
  console.log('회원(테스트) loginId: user-stev               → 동일 규모 지갑·롤링 ON (문서/E2E)');
  console.log('회원(대기)   loginId: demo_pending              → 로그인 불가 · 관리자 승인 대기');
  console.log('================================================================');
  console.log('');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
