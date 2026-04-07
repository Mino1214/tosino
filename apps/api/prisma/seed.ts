import {
  PrismaClient,
  Prisma,
  UserRole,
  SyncJobType,
  RegistrationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
};

function needsDemoSportsFeeds(integrationsJson: unknown): boolean {
  if (!integrationsJson || typeof integrationsJson !== 'object') return true;
  const feeds = (integrationsJson as { sportsFeeds?: unknown }).sportsFeeds;
  return !Array.isArray(feeds) || feeds.length === 0;
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
    if (needsDemoSportsFeeds(platform.integrationsJson)) {
      await prisma.platform.update({
        where: { id: platform.id },
        data: { integrationsJson: DEMO_INTEGRATIONS_JSON },
      });
      console.log('Updated demo platform: seeded sportsFeeds (was empty)');
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
