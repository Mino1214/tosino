import { Injectable, Logger } from '@nestjs/common';
import {
  LedgerEntryType,
  Prisma,
  RegistrationStatus,
  UsdtDepositTxStatus,
  UserRole,
  WalletRequestStatus,
  WalletRequestType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { WalletRequestsService } from '../wallet-requests/wallet-requests.service';
import { RollingObligationService } from '../rolling/rolling-obligation.service';
import { PointsService } from '../points/points.service';
import { UpbitRateService } from '../usdt-deposit/upbit-rate.service';

const TAG = '[TEST]';
const DEFAULT_PWD = 'Test1234!';
const KRW_DEPOSIT = 500_000;     // 테스트 입금액 (잔액이 배팅 후에도 남도록 충분히)
const USDT_DEPOSIT_OK = 55;      // 최소치 이상
const USDT_DEPOSIT_FAIL = 49;    // 최소치 미달 시나리오
const USDT_MIN_DEPOSIT = 50;
const CASINO_ROUNDS = 8;
const BET_UNIT_KRW = 20_000;     // 한 라운드 베팅금

export interface StepResult {
  step: number;
  name: string;
  status: 'ok' | 'skip' | 'error';
  data?: unknown;
  error?: string;
}

export type BetProfile = 'loser_extreme' | 'loser_heavy' | 'balanced' | 'winner_moderate' | 'winner_jackpot';

export interface ScenarioState {
  platformId: string;
  topAgents: { id: string; loginId: string }[];
  subAgents: { id: string; loginId: string; parentLoginId: string }[];
  krwUsers: { id: string; loginId: string; agentLoginId: string; betProfile?: BetProfile }[];
  usdtUsers: { id: string; loginId: string; wallet: string; betProfile?: BetProfile }[];
}

// loginId → betProfile 정적 매핑 (loadState 복원용)
const LOGIN_PROFILE_MAP: Record<string, BetProfile> = {
  'test_user_a1_1': 'winner_jackpot',
  'test_user_a1_2': 'loser_extreme',
  'test_user_a1_3': 'balanced',
  'test_user_a2_1': 'winner_moderate',
  'test_user_a2_2': 'loser_heavy',
  'test_user_a2_3': 'loser_extreme',
  'test_user_a2_4': 'winner_jackpot',
  'test_user_b1_1': 'balanced',
  'test_user_b1_2': 'loser_heavy',
  'test_user_b1_3': 'winner_jackpot',
  'test_user_b2_1': 'winner_moderate',
  'test_user_b2_2': 'loser_extreme',
  'test_user_b2_3': 'loser_heavy',
  'test_user_b2_4': 'balanced',
  'test_usdt_user_1': 'winner_moderate',
  'test_usdt_user_2': 'loser_heavy',
  'test_usdt_user_3_belowmin': 'balanced',
};

// 프로필별 배팅 라운드 시나리오
function getBetRounds(profile: BetProfile = 'balanced', unit: number) {
  switch (profile) {
    case 'loser_extreme':
      // 전패: 8전 8패
      return [
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit * 2, win: 0, label: '더블 배팅 패배' },
        { bet: unit * 2, win: 0, label: '더블 배팅 패배' },
        { bet: unit * 3, win: 0, label: '3배 배팅 패배' },
        { bet: unit * 3, win: 0, label: '3배 배팅 패배' },
      ];
    case 'loser_heavy':
      // 대패: 7전 6패 1승
      return [
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: unit * 1.5, label: '작은 승리(x1.5)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit * 2, win: 0, label: '더블 배팅 패배' },
        { bet: unit * 2, win: 0, label: '더블 배팅 패배' },
        { bet: unit * 3, win: 0, label: '3배 배팅 패배' },
      ];
    case 'balanced':
      // 승3 패5 혼합
      return [
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: unit * 1.95, label: '승리(x1.95)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: unit * 2.5, label: '승리(x2.5)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: unit * 1.8, label: '승리(x1.8)' },
        { bet: unit, win: 0, label: '패배' },
      ];
    case 'winner_moderate':
      // 승리 우세: 8전 5승 3패
      return [
        { bet: unit, win: unit * 1.9, label: '승리(x1.9)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: unit * 2.0, label: '승리(x2.0)' },
        { bet: unit, win: unit * 1.95, label: '승리(x1.95)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: unit * 2.2, label: '승리(x2.2)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit, win: unit * 1.8, label: '승리(x1.8)' },
      ];
    case 'winner_jackpot':
      // 대박: 고배율 연속 당첨
      return [
        { bet: unit * 2, win: unit * 2 * 5.0, label: '대박 당첨(x5.0)' },
        { bet: unit * 2, win: unit * 2 * 3.5, label: '당첨(x3.5)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit * 3, win: unit * 3 * 4.0, label: '잭팟(x4.0)' },
        { bet: unit, win: unit * 2.5, label: '승리(x2.5)' },
        { bet: unit * 2, win: unit * 2 * 3.0, label: '승리(x3.0)' },
        { bet: unit, win: 0, label: '패배' },
        { bet: unit * 3, win: unit * 3 * 6.0, label: '초대박(x6.0)' },
      ];
  }
}

@Injectable()
export class TestScenarioService {
  private readonly logger = new Logger(TestScenarioService.name);

  constructor(
    private prisma: PrismaService,
    private walletRequests: WalletRequestsService,
    private rolling: RollingObligationService,
    private points: PointsService,
    private upbit: UpbitRateService,
  ) {}

  // ─── 메인 진입점 ─────────────────────────────────────────
  async run(fromStep: number, platformId: string, currencies: ('KRW' | 'USDT')[]) {
    const results: StepResult[] = [];
    const runStep = (n: number) => fromStep <= n;

    // STEP 1: 테스트 데이터 셋업
    let state: ScenarioState;
    if (runStep(1)) {
      const r = await this.step1_setup(platformId);
      results.push(r);
      if (r.status === 'error') return { results, state: null };
      state = r.data as ScenarioState;
    } else {
      const s = await this.loadState(platformId);
      if (!s) return { results: [{ step: 1, name: 'LOAD_STATE', status: 'error' as const, error: 'step 1 데이터가 없습니다. fromStep=1 부터 다시 실행하세요.' }], state: null };
      state = s;
    }

    const usersKrw = state.krwUsers;
    const usersUsdt = state.usdtUsers;

    // STEP 2: 입금 신청
    if (runStep(2)) {
      if (currencies.includes('KRW')) results.push(await this.step2_krwDepositRequests(state));
      if (currencies.includes('USDT')) results.push(await this.step2_usdtDepositSimulate(state));
    }

    // STEP 3: 입금 승인 (반가상 확인 or USDT 자동 처리)
    if (runStep(3)) {
      if (currencies.includes('KRW')) results.push(await this.step3_krwApprove(state, platformId));
      if (currencies.includes('USDT')) results.push(await this.step3_usdtApprove(state, platformId));
    }

    // STEP 4: 카지노 플레이 시뮬레이션
    if (runStep(4)) {
      const allUsers = [
        ...(currencies.includes('KRW') ? usersKrw : []),
        ...(currencies.includes('USDT') ? usersUsdt : []),
      ];
      results.push(await this.step4_casinoPlay(platformId, allUsers));
    }

    // STEP 5: 롤링 충족 확인 + 추가 베팅
    if (runStep(5)) {
      const allUsers = [
        ...(currencies.includes('KRW') ? usersKrw : []),
        ...(currencies.includes('USDT') ? usersUsdt : []),
      ];
      results.push(await this.step5_fulfillRolling(platformId, allUsers));
    }

    // STEP 6: 콤프 + 포인트 지급
    if (runStep(6)) {
      results.push(await this.step6_compPoints(platformId));
    }

    // STEP 7: 출금 신청
    if (runStep(7)) {
      const allUsers = [
        ...(currencies.includes('KRW') ? usersKrw : []),
        ...(currencies.includes('USDT') ? usersUsdt : []),
      ];
      results.push(await this.step7_withdrawalRequests(state, allUsers));
    }

    // STEP 8: 출금 승인 (테더 환산 포함)
    if (runStep(8)) {
      results.push(await this.step8_withdrawalApprove(platformId));
    }

    return { results, state };
  }

  // ─── STEP 1: 셋업 ─────────────────────────────────────────
  private async step1_setup(platformId: string): Promise<StepResult> {
    try {
      const platform = await this.prisma.platform.findUnique({ where: { id: platformId } });
      if (!platform) throw new Error(`플랫폼 ${platformId}를 찾을 수 없습니다`);

      // 플랫폼 롤링 설정 업데이트
      await this.prisma.platform.update({
        where: { id: platformId },
        data: {
          rollingLockWithdrawals: true,
          rollingTurnoverMultiplier: new Prisma.Decimal(1),  // 테스트용 1배 (잔액 소진 방지)
          minDepositKrw: new Prisma.Decimal(10000),
          minDepositUsdt: new Prisma.Decimal(USDT_MIN_DEPOSIT),
          minWithdrawKrw: new Prisma.Decimal(10000),
          minWithdrawUsdt: new Prisma.Decimal(10),
        },
      });

      const hash = await bcrypt.hash(DEFAULT_PWD, 10);
      const created: ScenarioState = {
        platformId,
        topAgents: [],
        subAgents: [],
        krwUsers: [],
        usdtUsers: [],
      };

      // ── 최상위 총판 2명 ──
      const topAgentDefs = [
        { loginId: 'test_top_agent_a', name: `${TAG} 최상위총판A`, sharePct: 30 },
        { loginId: 'test_top_agent_b', name: `${TAG} 최상위총판B`, sharePct: 20 },
      ];

      for (const def of topAgentDefs) {
        const agent = await this.upsertAgent(platformId, hash, {
          loginId: def.loginId,
          displayName: def.name,
          agentPlatformSharePct: new Prisma.Decimal(def.sharePct),
          agentSplitFromParentPct: null,
          parentUserId: null,
        });
        created.topAgents.push({ id: agent.id, loginId: def.loginId });
      }

      // ── 각 최상위 총판의 하위 총판 ──
      const subAgentDefs = [
        { parentLoginId: 'test_top_agent_a', loginId: 'test_sub_agent_a1', name: `${TAG} 하위총판A-1`, splitPct: 50 },
        { parentLoginId: 'test_top_agent_a', loginId: 'test_sub_agent_a2', name: `${TAG} 하위총판A-2`, splitPct: 40 },
        { parentLoginId: 'test_top_agent_b', loginId: 'test_sub_agent_b1', name: `${TAG} 하위총판B-1`, splitPct: 60 },
        { parentLoginId: 'test_top_agent_b', loginId: 'test_sub_agent_b2', name: `${TAG} 하위총판B-2`, splitPct: 35 },
      ];

      for (const def of subAgentDefs) {
        const parent = created.topAgents.find((a) => a.loginId === def.parentLoginId);
        if (!parent) continue;
        const agent = await this.upsertAgent(platformId, hash, {
          loginId: def.loginId,
          displayName: def.name,
          agentPlatformSharePct: null,
          agentSplitFromParentPct: new Prisma.Decimal(def.splitPct),
          parentUserId: parent.id,
        });
        created.subAgents.push({ id: agent.id, loginId: def.loginId, parentLoginId: def.parentLoginId });
      }

      // ── KRW 유저 (하위총판별 3~4명, 프로필 다양화) ──
      const krwUserDefs: Array<{ agentLoginId: string; loginId: string; name: string; bankHolder: string; bankCode: string; bankNum: string; betProfile: BetProfile }> = [
        // 하위총판 A-1: 대박유저 + 전패유저
        { agentLoginId: 'test_sub_agent_a1', loginId: 'test_user_a1_1', name: `${TAG} 유저A1-1[대박]`, bankHolder: '김대박', bankCode: '4', bankNum: '123456789012', betProfile: 'winner_jackpot' },
        { agentLoginId: 'test_sub_agent_a1', loginId: 'test_user_a1_2', name: `${TAG} 유저A1-2[전패]`, bankHolder: '이전패', bankCode: '41', bankNum: '110123456789', betProfile: 'loser_extreme' },
        { agentLoginId: 'test_sub_agent_a1', loginId: 'test_user_a1_3', name: `${TAG} 유저A1-3[보통]`, bankHolder: '박보통', bankCode: '4', bankNum: '123456789099', betProfile: 'balanced' },
        // 하위총판 A-2: 승리우세 + 대패 + 보통
        { agentLoginId: 'test_sub_agent_a2', loginId: 'test_user_a2_1', name: `${TAG} 유저A2-1[승우세]`, bankHolder: '박승우', bankCode: '40', bankNum: '781234567890', betProfile: 'winner_moderate' },
        { agentLoginId: 'test_sub_agent_a2', loginId: 'test_user_a2_2', name: `${TAG} 유저A2-2[대패]`, bankHolder: '정대패', bankCode: '43', bankNum: '333012345678', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_sub_agent_a2', loginId: 'test_user_a2_3', name: `${TAG} 유저A2-3[전패]`, bankHolder: '홍전패', bankCode: '8', bankNum: '302123456789', betProfile: 'loser_extreme' },
        { agentLoginId: 'test_sub_agent_a2', loginId: 'test_user_a2_4', name: `${TAG} 유저A2-4[대박]`, bankHolder: '홍대박', bankCode: '8', bankNum: '302123456700', betProfile: 'winner_jackpot' },
        // 하위총판 B-1: 보통 + 대패
        { agentLoginId: 'test_sub_agent_b1', loginId: 'test_user_b1_1', name: `${TAG} 유저B1-1[보통]`, bankHolder: '최보통', bankCode: '10', bankNum: '1002123456789', betProfile: 'balanced' },
        { agentLoginId: 'test_sub_agent_b1', loginId: 'test_user_b1_2', name: `${TAG} 유저B1-2[대패]`, bankHolder: '오대패', bankCode: '11', bankNum: '23704567890', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_sub_agent_b1', loginId: 'test_user_b1_3', name: `${TAG} 유저B1-3[대박]`, bankHolder: '오대박', bankCode: '11', bankNum: '23704567891', betProfile: 'winner_jackpot' },
        // 하위총판 B-2: 승리우세 + 전패 + 보통
        { agentLoginId: 'test_sub_agent_b2', loginId: 'test_user_b2_1', name: `${TAG} 유저B2-1[승우세]`, bankHolder: '강승우', bankCode: '3', bankNum: '00432123456789', betProfile: 'winner_moderate' },
        { agentLoginId: 'test_sub_agent_b2', loginId: 'test_user_b2_2', name: `${TAG} 유저B2-2[전패]`, bankHolder: '윤전패', bankCode: '6', bankNum: '10301234567890', betProfile: 'loser_extreme' },
        { agentLoginId: 'test_sub_agent_b2', loginId: 'test_user_b2_3', name: `${TAG} 유저B2-3[대패]`, bankHolder: '윤대패', bankCode: '6', bankNum: '10301234567891', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_sub_agent_b2', loginId: 'test_user_b2_4', name: `${TAG} 유저B2-4[보통]`, bankHolder: '이보통', bankCode: '20', bankNum: '10321234567890', betProfile: 'balanced' },
      ];

      for (const def of krwUserDefs) {
        const agentRow = [...created.subAgents, ...created.topAgents].find((a) => a.loginId === def.agentLoginId);
        const user = await this.upsertUser(platformId, hash, {
          loginId: def.loginId,
          displayName: def.name,
          parentUserId: agentRow?.id ?? null,
          signupMode: null,
          bankCode: def.bankCode,
          bankAccountNumber: def.bankNum,
          bankAccountHolder: def.bankHolder,
          usdtWalletAddress: null,
        });
        created.krwUsers.push({ id: user.id, loginId: def.loginId, agentLoginId: def.agentLoginId, betProfile: def.betProfile });
      }

      // ── USDT(무기명) 유저 ──
      const usdtUserDefs: Array<{ agentLoginId: string; loginId: string; name: string; wallet: string; betProfile: BetProfile }> = [
        { agentLoginId: 'test_sub_agent_a1', loginId: 'test_usdt_user_1', name: `${TAG} USDT유저1[승우세]`, wallet: 'TTestWallet111111111111111111111', betProfile: 'winner_moderate' },
        { agentLoginId: 'test_sub_agent_b1', loginId: 'test_usdt_user_2', name: `${TAG} USDT유저2[대패]`, wallet: 'TTestWallet222222222222222222222', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_sub_agent_b2', loginId: 'test_usdt_user_3_belowmin', name: `${TAG} USDT유저3(최소미달)[보통]`, wallet: 'TTestWallet333333333333333333333', betProfile: 'balanced' },
      ];

      for (const def of usdtUserDefs) {
        const agentRow = [...created.subAgents, ...created.topAgents].find((a) => a.loginId === def.agentLoginId);
        const user = await this.upsertUser(platformId, hash, {
          loginId: def.loginId,
          displayName: def.name,
          parentUserId: agentRow?.id ?? null,
          signupMode: 'anonymous',
          bankCode: null,
          bankAccountNumber: null,
          bankAccountHolder: null,
          usdtWalletAddress: def.wallet,
        });
        created.usdtUsers.push({ id: user.id, loginId: def.loginId, wallet: def.wallet, betProfile: def.betProfile });
      }

      return {
        step: 1, name: 'SETUP', status: 'ok',
        data: {
          ...created,
          summary: `최상위총판 ${created.topAgents.length}명, 하위총판 ${created.subAgents.length}명, KRW유저 ${created.krwUsers.length}명, USDT유저 ${created.usdtUsers.length}명 생성`,
          defaultPassword: DEFAULT_PWD,
        },
      };
    } catch (e) {
      return { step: 1, name: 'SETUP', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 2a: KRW 입금 신청 ────────────────────────────────
  private async step2_krwDepositRequests(state: ScenarioState): Promise<StepResult> {
    try {
      const requests: unknown[] = [];
      const adminActor = this.makeAdminActor(state.platformId);

      for (const u of state.krwUsers) {
        // 이미 PENDING 있으면 스킵
        const existing = await this.prisma.walletRequest.findFirst({
          where: { userId: u.id, type: WalletRequestType.DEPOSIT, status: WalletRequestStatus.PENDING, currency: 'KRW' },
        });
        if (existing) { requests.push({ userId: u.id, loginId: u.loginId, requestId: existing.id, status: 'already_pending' }); continue; }

        const req = await this.prisma.walletRequest.create({
          data: {
            platformId: state.platformId,
            userId: u.id,
            type: WalletRequestType.DEPOSIT,
            currency: 'KRW',
            amount: KRW_DEPOSIT,
            status: WalletRequestStatus.PENDING,
            depositorName: (await this.prisma.user.findUnique({ where: { id: u.id }, select: { bankAccountHolder: true } }))?.bankAccountHolder ?? '테스트',
            note: `${TAG} 테스트 입금신청`,
          },
        });
        requests.push({ userId: u.id, loginId: u.loginId, requestId: req.id, amount: KRW_DEPOSIT });
      }
      return { step: 2, name: 'KRW_DEPOSIT_REQUEST', status: 'ok', data: { count: requests.length, requests } };
    } catch (e) {
      return { step: 2, name: 'KRW_DEPOSIT_REQUEST', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 2b: USDT 입금 시뮬레이션 ────────────────────────
  private async step2_usdtDepositSimulate(state: ScenarioState): Promise<StepResult> {
    try {
      const platform = await this.prisma.platform.findUnique({ where: { id: state.platformId }, select: { settlementUsdtWallet: true } });
      const toAddr = platform?.settlementUsdtWallet ?? 'TSettlementWalletAddress000000000';
      const rate = await this.upbit.getKrwPerUsdt();
      const txs: unknown[] = [];

      for (const u of state.usdtUsers) {
        const isBelowMin = u.loginId.includes('belowmin');
        const usdtAmt = isBelowMin ? USDT_DEPOSIT_FAIL : USDT_DEPOSIT_OK;
        const krwAmt = new Prisma.Decimal(usdtAmt).times(rate);
        const txHash = `TEST_TX_${u.loginId}_${Date.now()}`;

        const existing = await this.prisma.usdtDepositTx.findFirst({ where: { userId: u.id } });
        if (existing) { txs.push({ userId: u.id, txHash: existing.txHash, status: 'already_exists' }); continue; }

        const tx = await this.prisma.usdtDepositTx.create({
          data: {
            txHash,
            platformId: state.platformId,
            fromAddress: u.wallet,
            toAddress: toAddr,
            usdtAmount: new Prisma.Decimal(usdtAmt),
            krwRate: rate,
            krwAmount: krwAmt,
            status: isBelowMin ? UsdtDepositTxStatus.PENDING : UsdtDepositTxStatus.PENDING,
            userId: u.id,
            blockTimestamp: new Date(),
          },
        });
        txs.push({ userId: u.id, loginId: u.loginId, txHash: tx.txHash, usdtAmt, isbelowMin: isBelowMin, status: tx.status });
      }
      return { step: 2, name: 'USDT_DEPOSIT_SIMULATE', status: 'ok', data: { count: txs.length, txs, note: 'belowmin 유저는 최소입금 미달 → PENDING 상태, 관리자가 수동 처리해야 함' } };
    } catch (e) {
      return { step: 2, name: 'USDT_DEPOSIT_SIMULATE', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 3a: KRW 입금 승인 (반가상 자동확인 시뮬레이션) ──
  private async step3_krwApprove(state: ScenarioState, platformId: string): Promise<StepResult> {
    try {
      const adminActor = this.makeAdminActor(platformId);
      const approved: unknown[] = [];

      const pendingReqs = await this.prisma.walletRequest.findMany({
        where: {
          platformId,
          type: WalletRequestType.DEPOSIT,
          currency: 'KRW',
          status: WalletRequestStatus.PENDING,
          userId: { in: state.krwUsers.map((u) => u.id) },
        },
      });

      for (const req of pendingReqs) {
        try {
          const result = await this.walletRequests.approve(platformId, req.id, adminActor, `${TAG} 반가상 자동입금확인 시뮬레이션`);
          approved.push({ requestId: req.id, userId: req.userId, ...result });
        } catch (e) {
          approved.push({ requestId: req.id, userId: req.userId, error: String(e) });
        }
      }

      return { step: 3, name: 'KRW_DEPOSIT_APPROVE', status: 'ok', data: { count: approved.length, approved } };
    } catch (e) {
      return { step: 3, name: 'KRW_DEPOSIT_APPROVE', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 3b: USDT 입금 처리 (최소금액 이상만 자동 크레딧) ─
  private async step3_usdtApprove(state: ScenarioState, platformId: string): Promise<StepResult> {
    try {
      const adminActor = this.makeAdminActor(platformId);
      const processed: unknown[] = [];
      const rate = await this.upbit.getKrwPerUsdt();

      // 최소금액 이상 → 자동 크레딧
      const okTxs = await this.prisma.usdtDepositTx.findMany({
        where: {
          platformId,
          status: UsdtDepositTxStatus.PENDING,
          userId: { in: state.usdtUsers.filter((u) => !u.loginId.includes('belowmin')).map((u) => u.id) },
        },
      });

      for (const tx of okTxs) {
        if (!tx.userId) continue;
        const user = await this.prisma.user.findUnique({ where: { id: tx.userId } });
        if (!user) continue;

        const wallet = await this.prisma.wallet.findUnique({ where: { userId: tx.userId } });
        if (!wallet) continue;

        const krwCredit = tx.krwAmount;
        const newBal = wallet.balance.plus(krwCredit);
        const ref = `usdt:${tx.txHash}`;

        await this.prisma.$transaction(async (txn) => {
          await txn.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });
          await txn.ledgerEntry.create({
            data: { platformId, userId: tx.userId!, type: LedgerEntryType.DEPOSIT, amount: krwCredit, balanceAfter: newBal, reference: ref, metaJson: { note: `USDT ${tx.usdtAmount} 업비트환율 자동크레딧 ${TAG}` } },
          });
          await txn.usdtDepositTx.update({ where: { id: tx.id }, data: { status: UsdtDepositTxStatus.AUTO_CREDITED } });
          await this.rolling.createObligationIfNeeded(txn, { userId: tx.userId!, platformId, depositAmount: krwCredit, sourceRef: ref });
        });

        processed.push({ txHash: tx.txHash, userId: tx.userId, usdtAmt: tx.usdtAmount, krwCredit, newBalance: newBal });
      }

      // 최소금액 미달 → PENDING 유지 (관리자 판단)
      const failTxs = await this.prisma.usdtDepositTx.findMany({
        where: {
          platformId,
          status: UsdtDepositTxStatus.PENDING,
          userId: { in: state.usdtUsers.filter((u) => u.loginId.includes('belowmin')).map((u) => u.id) },
        },
      });

      return {
        step: 3, name: 'USDT_DEPOSIT_PROCESS', status: 'ok',
        data: {
          autoCredited: processed,
          pendingBelowMin: failTxs.map((t) => ({ txHash: t.txHash, userId: t.userId, usdtAmt: t.usdtAmount, status: t.status, note: `최소입금 ${USDT_MIN_DEPOSIT} USDT 미달 - 관리자 수동승인 필요` })),
        },
      };
    } catch (e) {
      return { step: 3, name: 'USDT_DEPOSIT_PROCESS', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 4: 카지노 플레이 시뮬레이션 ─────────────────────
  private async step4_casinoPlay(platformId: string, users: { id: string; loginId: string; betProfile?: BetProfile }[]): Promise<StepResult> {
    try {
      const summary: unknown[] = [];

      for (const u of users) {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: u.id } });
        if (!wallet || wallet.balance.lte(0)) {
          summary.push({ userId: u.id, loginId: u.loginId, skipped: true, reason: '잔액 없음 (입금 승인 필요)' });
          continue;
        }

        // 유저별 배팅 프로필 적용
        const rounds = getBetRounds(u.betProfile ?? 'balanced', BET_UNIT_KRW);

        let balance = wallet.balance;
        const userRounds: unknown[] = [];

        for (let i = 0; i < rounds.length; i++) {
          const round = rounds[i];
          const stake = new Prisma.Decimal(round.bet);
          const winAmt = new Prisma.Decimal(round.win);
          const didWin = winAmt.gt(0);

          if (balance.lt(stake)) break; // 잔액 부족 시 중단

          const ref = `bet:${TAG}:${u.loginId}:r${i + 1}:${Date.now()}`;

          await this.prisma.$transaction(async (txn) => {
            // BET: 차감
            balance = balance.minus(stake);
            await txn.wallet.update({ where: { id: wallet.id }, data: { balance } });
            await txn.ledgerEntry.create({
              data: {
                platformId,
                userId: u.id,
                type: LedgerEntryType.BET,
                amount: stake.negated(),
                balanceAfter: balance,
                reference: ref,
                metaJson: {
                  vertical: 'casino',
                  note: `${TAG} 카지노 라운드${i + 1} 배팅 - ${round.label}`,
                },
              },
            });

            // WIN: 지급
            if (didWin) {
              balance = balance.plus(winAmt);
              await txn.wallet.update({ where: { id: wallet.id }, data: { balance } });
              await txn.ledgerEntry.create({
                data: {
                  platformId,
                  userId: u.id,
                  type: LedgerEntryType.WIN,
                  amount: winAmt,
                  balanceAfter: balance,
                  reference: ref,
                  metaJson: {
                    vertical: 'casino',
                    note: `${TAG} 카지노 라운드${i + 1} 당첨`,
                  },
                },
              });
            }

            // 롤링 적립
            await this.rolling.applyBetStake(txn, u.id, stake);

            // 패배 포인트 적립
            await this.points.maybeCreditLoseBet(txn, u.id, platformId, stake, didWin);
          });

          userRounds.push({ round: i + 1, label: round.label, bet: round.bet, win: round.win, balanceAfter: balance.toFixed(2) });
        }

        summary.push({ userId: u.id, loginId: u.loginId, betProfile: u.betProfile ?? 'balanced', rounds: userRounds, finalBalance: balance.toFixed(2) });
      }

      return { step: 4, name: 'CASINO_PLAY', status: 'ok', data: { users: summary } };
    } catch (e) {
      return { step: 4, name: 'CASINO_PLAY', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 5: 롤링 충족 ────────────────────────────────────
  private async step5_fulfillRolling(platformId: string, users: { id: string; loginId: string; betProfile?: BetProfile }[]): Promise<StepResult> {
    try {
      const results: unknown[] = [];

      for (const u of users) {
        const summary = await this.rolling.getSummaryForUser(u.id);

        if (!summary.rollingEnabled || summary.openCount === 0) {
          results.push({ userId: u.id, loginId: u.loginId, status: '롤링 미적용 또는 충족 완료', summary });
          continue;
        }

        const remaining = new Prisma.Decimal(summary.remainingTurnover ?? '0');

        if (remaining.lte(0)) {
          results.push({ userId: u.id, loginId: u.loginId, status: '이미 충족', summary });
          continue;
        }

        // 추가 베팅으로 롤링 채우기 (실제 배팅처럼 처리)
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: u.id } });
        if (!wallet) continue;

        let balance = wallet.balance;
        // 최소 보호 잔액: 입금액의 30% (잔액이 여기까지 줄면 롤링 중단)
        const minBuffer = new Prisma.Decimal(KRW_DEPOSIT).times(0.3);
        let toFulfill = remaining;
        const extraRounds: unknown[] = [];
        let roundNum = 0;

        while (toFulfill.gt(0) && balance.gt(minBuffer)) {
          roundNum++;
          const usable = balance.minus(minBuffer);
          const stake = Prisma.Decimal.min(toFulfill, new Prisma.Decimal(BET_UNIT_KRW), usable);
          const didWin = roundNum % 3 === 0; // 3번에 1번 승리
          const winAmt = didWin ? stake.times(1.9) : new Prisma.Decimal(0);
          const ref = `roll:${TAG}:${u.loginId}:r${roundNum}:${Date.now()}`;

          await this.prisma.$transaction(async (txn) => {
            balance = balance.minus(stake);
            await txn.wallet.update({ where: { id: wallet.id }, data: { balance } });
            await txn.ledgerEntry.create({
              data: {
                platformId,
                userId: u.id,
                type: LedgerEntryType.BET,
                amount: stake.negated(),
                balanceAfter: balance,
                reference: ref,
                metaJson: {
                  vertical: 'casino',
                  note: `${TAG} 롤링충족 추가배팅 r${roundNum}`,
                },
              },
            });

            if (didWin) {
              balance = balance.plus(winAmt);
              await txn.wallet.update({ where: { id: wallet.id }, data: { balance } });
              await txn.ledgerEntry.create({
                data: {
                  platformId,
                  userId: u.id,
                  type: LedgerEntryType.WIN,
                  amount: winAmt,
                  balanceAfter: balance,
                  reference: ref,
                  metaJson: {
                    vertical: 'casino',
                    note: `${TAG} 롤링충족 당첨 r${roundNum}`,
                  },
                },
              });
            }

            await this.rolling.applyBetStake(txn, u.id, stake);
            await this.points.maybeCreditLoseBet(txn, u.id, platformId, stake, didWin);
          });

          toFulfill = toFulfill.minus(stake);
          extraRounds.push({ round: roundNum, stake: stake.toFixed(2), didWin, balanceAfter: balance.toFixed(2) });
        }

        const finalSummary = await this.rolling.getSummaryForUser(u.id);
        results.push({ userId: u.id, loginId: u.loginId, extraRounds: roundNum, finalBalance: balance.toFixed(2), rollingAfter: finalSummary });
      }

      return { step: 5, name: 'ROLLING_FULFILL', status: 'ok', data: { users: results } };
    } catch (e) {
      return { step: 5, name: 'ROLLING_FULFILL', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 6: 콤프 + 포인트 지급 ──────────────────────────
  private async step6_compPoints(platformId: string): Promise<StepResult> {
    try {
      // 플랫폼 전체 유저에게 일괄 포인트 지급 (테스트용 500포인트)
      await this.points.grantAllForPlatform(platformId, 500, `${TAG} 테스트 일괄 포인트 지급`);

      const users = await this.prisma.user.findMany({
        where: { platformId, role: UserRole.USER, registrationStatus: RegistrationStatus.APPROVED, loginId: { startsWith: 'test_' } },
        include: { wallet: true },
      });

      const data = users.map((u) => ({
        loginId: u.loginId,
        pointBalance: u.wallet?.pointBalance ?? '0',
        balance: u.wallet?.balance ?? '0',
      }));

      return { step: 6, name: 'COMP_POINTS', status: 'ok', data: { grantedPoints: 500, users: data } };
    } catch (e) {
      return { step: 6, name: 'COMP_POINTS', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 7: 출금 신청 ────────────────────────────────────
  private async step7_withdrawalRequests(state: ScenarioState, users: { id: string; loginId: string; betProfile?: BetProfile }[]): Promise<StepResult> {
    try {
      const requests: unknown[] = [];

      for (const u of users) {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: u.id } });
        if (!wallet || wallet.balance.lte(0)) {
          requests.push({ userId: u.id, loginId: u.loginId, skipped: true, reason: '잔액 없음' });
          continue;
        }

        // 롤링 미충족 시 스킵
        try {
          await this.rolling.assertWithdrawalAllowed(u.id);
        } catch {
          requests.push({ userId: u.id, loginId: u.loginId, skipped: true, reason: '롤링 미충족 (step 5 필요)', balance: wallet.balance.toFixed(2) });
          continue;
        }

        const existing = await this.prisma.walletRequest.findFirst({
          where: { userId: u.id, type: WalletRequestType.WITHDRAWAL, status: WalletRequestStatus.PENDING },
        });
        if (existing) { requests.push({ userId: u.id, loginId: u.loginId, requestId: existing.id, status: 'already_pending' }); continue; }

        const user = await this.prisma.user.findUnique({ where: { id: u.id }, select: { signupMode: true, bankCode: true, bankAccountNumber: true, bankAccountHolder: true, usdtWalletAddress: true } });
        const isAnonymous = user?.signupMode === 'anonymous';

        // 출금 가능 금액 = 잔액의 80% (일부 수수료 가정)
        const withdrawAmt = wallet.balance.times(0.8).toDecimalPlaces(0);

        const req = await this.prisma.walletRequest.create({
          data: {
            platformId: state.platformId,
            userId: u.id,
            type: WalletRequestType.WITHDRAWAL,
            currency: isAnonymous ? 'USDT' : 'KRW',
            amount: withdrawAmt,
            status: WalletRequestStatus.PENDING,
            note: `${TAG} 테스트 출금신청`,
          },
        });
        requests.push({ userId: u.id, loginId: u.loginId, requestId: req.id, amount: withdrawAmt.toFixed(2), currency: req.currency });
      }
      return { step: 7, name: 'WITHDRAWAL_REQUEST', status: 'ok', data: { count: requests.length, requests } };
    } catch (e) {
      return { step: 7, name: 'WITHDRAWAL_REQUEST', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 8: 출금 승인 + 테더 환산 표기 ──────────────────
  private async step8_withdrawalApprove(platformId: string): Promise<StepResult> {
    try {
      const adminActor = this.makeAdminActor(platformId);
      const rate = await this.upbit.getKrwPerUsdt();
      const approved: unknown[] = [];

      const pendingWithdraws = await this.prisma.walletRequest.findMany({
        where: { platformId, type: WalletRequestType.WITHDRAWAL, status: WalletRequestStatus.PENDING },
        include: { user: { select: { loginId: true, signupMode: true, bankCode: true, bankAccountNumber: true, bankAccountHolder: true, usdtWalletAddress: true } } },
      });

      for (const req of pendingWithdraws) {
        if (!req.user?.loginId?.startsWith('test_')) continue;

        try {
          const result = await this.walletRequests.approve(platformId, req.id, adminActor, `${TAG} 테스트 출금승인`);
          const krwAmt = new Prisma.Decimal(req.amount);
          const usdtEquivalent = krwAmt.div(rate).toDecimalPlaces(4);

          approved.push({
            requestId: req.id,
            loginId: req.user?.loginId,
            currency: req.currency,
            krwAmount: krwAmt.toFixed(2),
            usdtEquivalent: usdtEquivalent.toFixed(4),
            usdtRate: rate.toFixed(2),
            sendTo: req.currency === 'USDT' ? req.user?.usdtWalletAddress : `${req.user?.bankAccountHolder} ${req.user?.bankAccountNumber}`,
            note: req.currency === 'USDT' ? `테더로 ${usdtEquivalent} USDT 실제 송금 필요` : '원화 출금 처리',
            ...result,
          });
        } catch (e) {
          approved.push({ requestId: req.id, error: String(e) });
        }
      }

      return { step: 8, name: 'WITHDRAWAL_APPROVE', status: 'ok', data: { count: approved.length, usdtRate: rate.toFixed(2), approved } };
    } catch (e) {
      return { step: 8, name: 'WITHDRAWAL_APPROVE', status: 'error', error: String(e) };
    }
  }

  // ─── 유틸 ──────────────────────────────────────────────────
  private async upsertAgent(platformId: string, hash: string, data: {
    loginId: string; displayName: string;
    agentPlatformSharePct: Prisma.Decimal | null;
    agentSplitFromParentPct: Prisma.Decimal | null;
    parentUserId: string | null;
  }) {
    let agent = await this.prisma.user.findFirst({ where: { platformId, loginId: data.loginId } });
    if (!agent) {
      agent = await this.prisma.user.create({
        data: {
          platformId,
          loginId: data.loginId,
          passwordHash: hash,
          displayName: data.displayName,
          role: UserRole.MASTER_AGENT,
          registrationStatus: RegistrationStatus.APPROVED,
          agentPlatformSharePct: data.agentPlatformSharePct,
          agentSplitFromParentPct: data.agentSplitFromParentPct,
          parentUserId: data.parentUserId,
          rollingEnabled: true,
          rollingCasinoPct: new Prisma.Decimal(0.3),
          rollingSlotPct: new Prisma.Decimal(0.5),
          rollingSportsDomesticPct: new Prisma.Decimal(0.2),
        },
      });
      await this.prisma.wallet.create({ data: { userId: agent.id, platformId, balance: new Prisma.Decimal(0), pointBalance: new Prisma.Decimal(0) } });
      await this.prisma.agentCommissionRevision.create({
        data: {
          userId: agent.id,
          agentPlatformSharePct: data.agentPlatformSharePct ?? new Prisma.Decimal(0),
          agentSplitFromParentPct: data.agentSplitFromParentPct ?? new Prisma.Decimal(0),
          effectiveFrom: new Date(),
        },
      });
    }
    return agent;
  }

  private async upsertUser(platformId: string, hash: string, data: {
    loginId: string; displayName: string; parentUserId: string | null;
    signupMode: string | null; bankCode: string | null; bankAccountNumber: string | null;
    bankAccountHolder: string | null; usdtWalletAddress: string | null;
  }) {
    let user = await this.prisma.user.findFirst({ where: { platformId, loginId: data.loginId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          platformId,
          loginId: data.loginId,
          passwordHash: hash,
          displayName: data.displayName,
          role: UserRole.USER,
          registrationStatus: RegistrationStatus.APPROVED,
          parentUserId: data.parentUserId,
          signupMode: data.signupMode,
          bankCode: data.bankCode,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountHolder: data.bankAccountHolder,
          usdtWalletAddress: data.usdtWalletAddress,
          rollingEnabled: true,
          rollingCasinoPct: new Prisma.Decimal(0.3),
          rollingSlotPct: new Prisma.Decimal(0.5),
        },
      });
      await this.prisma.wallet.create({ data: { userId: user.id, platformId, balance: new Prisma.Decimal(0), pointBalance: new Prisma.Decimal(0) } });
    } else {
      // 재실행 시: 이전 테스트 데이터 초기화 (지갑·원장·입출금·롤링·포인트·USDT)
      await this.prisma.walletRequest.deleteMany({ where: { userId: user.id } });
      await this.prisma.usdtDepositTx.deleteMany({ where: { userId: user.id } });
      await this.prisma.rollingObligation.deleteMany({ where: { userId: user.id } });
      await this.prisma.ledgerEntry.deleteMany({ where: { userId: user.id } });
      await this.prisma.pointLedgerEntry.deleteMany({ where: { userId: user.id } });
      // 지갑 잔액 리셋
      const existingWallet = await this.prisma.wallet.findUnique({ where: { userId: user.id } });
      if (existingWallet) {
        await this.prisma.wallet.update({ where: { id: existingWallet.id }, data: { balance: new Prisma.Decimal(0), pointBalance: new Prisma.Decimal(0) } });
      } else {
        await this.prisma.wallet.create({ data: { userId: user.id, platformId, balance: new Prisma.Decimal(0), pointBalance: new Prisma.Decimal(0) } });
      }
      // 유저 정보 업데이트 (이름, 부모, 계좌 등)
      await this.prisma.user.update({
        where: { id: user.id },
        data: { displayName: data.displayName, parentUserId: data.parentUserId, bankCode: data.bankCode, bankAccountNumber: data.bankAccountNumber, bankAccountHolder: data.bankAccountHolder, usdtWalletAddress: data.usdtWalletAddress },
      });
    }
    return user;
  }

  private async loadState(platformId: string): Promise<ScenarioState | null> {
    const agents = await this.prisma.user.findMany({
      where: { platformId, loginId: { startsWith: 'test_' }, role: UserRole.MASTER_AGENT },
    });
    const users = await this.prisma.user.findMany({
      where: { platformId, loginId: { startsWith: 'test_' }, role: UserRole.USER },
    });
    if (agents.length === 0 && users.length === 0) return null;

    return {
      platformId,
      topAgents: agents.filter((a) => !a.parentUserId).map((a) => ({ id: a.id, loginId: a.loginId ?? '' })),
      subAgents: agents.filter((a) => a.parentUserId).map((a) => ({
        id: a.id, loginId: a.loginId ?? '',
        parentLoginId: agents.find((p) => p.id === a.parentUserId)?.loginId ?? '',
      })),
      krwUsers: users.filter((u) => u.signupMode !== 'anonymous').map((u) => ({
        id: u.id, loginId: u.loginId ?? '',
        agentLoginId: agents.find((a) => a.id === u.parentUserId)?.loginId ?? '',
        betProfile: LOGIN_PROFILE_MAP[u.loginId ?? ''] ?? 'balanced',
      })),
      usdtUsers: users.filter((u) => u.signupMode === 'anonymous').map((u) => ({
        id: u.id, loginId: u.loginId ?? '', wallet: u.usdtWalletAddress ?? '',
        betProfile: LOGIN_PROFILE_MAP[u.loginId ?? ''] ?? 'balanced',
      })),
    };
  }

  // ─── 상세 상태 조회 (로그인 계정·잔액·베팅·입출금 전체) ──────
  public async loadDetailedState(platformId: string) {
    const allTestUsers = await this.prisma.user.findMany({
      where: { platformId, loginId: { startsWith: 'test_' } },
      include: { wallet: true },
      orderBy: { createdAt: 'asc' },
    });

    if (allTestUsers.length === 0) return null;

    const ids = allTestUsers.map((u) => u.id);

    // parentLoginId 해소: parentUserId -> loginId 매핑
    const parentIds = [...new Set(allTestUsers.map((u) => u.parentUserId).filter(Boolean) as string[])];
    const parentUsers =
      parentIds.length > 0
        ? await this.prisma.user.findMany({ where: { id: { in: parentIds } }, select: { id: true, loginId: true } })
        : [];
    const parentMap = new Map(parentUsers.map((p) => [p.id, p.loginId ?? '']));

    const [ledgerEntries, walletRequests, usdtTxs, rollingObs, pointLedger] = await Promise.all([
      this.prisma.ledgerEntry.findMany({ where: { userId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.walletRequest.findMany({ where: { userId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.usdtDepositTx.findMany({ where: { userId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.rollingObligation.findMany({ where: { userId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.pointLedgerEntry.findMany({ where: { userId: { in: ids } }, orderBy: { createdAt: 'asc' } }),
    ]);

    const buildUserDetail = (u: typeof allTestUsers[0]) => {
      const userLedger = ledgerEntries.filter((l) => l.userId === u.id);
      const userRequests = walletRequests.filter((r) => r.userId === u.id);
      const userUsdtTxs = usdtTxs.filter((t) => t.userId === u.id);
      const userRolling = rollingObs.filter((r) => r.userId === u.id);
      const userPoints = pointLedger.filter((p) => p.userId === u.id);

      const totalBet = userLedger
        .filter((l) => l.type === LedgerEntryType.BET)
        .reduce((s, l) => s + Math.abs(Number(l.amount)), 0);
      const totalWin = userLedger
        .filter((l) => l.type === LedgerEntryType.WIN)
        .reduce((s, l) => s + Number(l.amount), 0);
      const totalRollingAccum = userRolling.reduce((s, r) => s + Number(r.appliedTurnover), 0);
      const totalRollingReq = userRolling.reduce((s, r) => s + Number(r.requiredTurnover), 0);
      const totalPoints = userPoints.reduce((s, p) => s + Number(p.amount), 0);

      return {
        id: u.id,
        loginId: u.loginId ?? '',
        password: DEFAULT_PWD,
        role: u.role,
        name: u.displayName ?? u.bankAccountHolder ?? u.loginId ?? '',
        signupMode: u.signupMode ?? 'standard',
        usdtWallet: u.usdtWalletAddress ?? null,
        parentLoginId: u.parentUserId ? (parentMap.get(u.parentUserId) ?? null) : null,
        wallet: u.wallet
          ? {
              balance: Number(u.wallet.balance),
              pointBalance: Number(u.wallet.pointBalance),
              compBalance: 0,
            }
          : null,
        summary: {
          totalBet,
          totalWin,
          netPnl: totalWin - totalBet,
          totalRollingAccum,
          totalRollingReq,
          rollingPct: totalRollingReq > 0 ? Math.round((totalRollingAccum / totalRollingReq) * 100) : 0,
          totalPoints,
        },
        ledger: (() => {
          // BET+WIN 쌍으로 묶어서 "당첨/낙첨" 표기용 betting rows 생성
          const bets = userLedger.filter((l) => l.type === LedgerEntryType.BET);
          const wins = userLedger.filter((l) => l.type === LedgerEntryType.WIN);
          const winMap = new Map(wins.map((w) => [w.reference ?? w.id, w]));
          const betRows = bets.map((b) => {
            const win = b.reference ? winMap.get(b.reference) : undefined;
            const betAmt = Math.abs(Number(b.amount));
            const winAmt = win ? Number(win.amount) : 0;
            const isWin = winAmt > 0;
            return {
              id: b.id,
              type: b.type,
              result: isWin ? '당첨' : '낙첨',
              betAmount: betAmt,
              winAmount: winAmt,
              netResult: winAmt - betAmt,
              balanceAfter: win ? Number(win.balanceAfter) : Number(b.balanceAfter),
              note: (b.metaJson as Record<string, unknown> | null)?.note ?? null,
              createdAt: b.createdAt,
            };
          });
          // CREDIT/DEBIT 등 나머지 항목도 포함
          const others = userLedger.filter(
            (l) => l.type !== LedgerEntryType.BET && l.type !== LedgerEntryType.WIN,
          ).map((l) => ({
            id: l.id,
            type: l.type,
            result: null,
            betAmount: 0,
            winAmount: 0,
            netResult: Number(l.amount),
            balanceAfter: Number(l.balanceAfter),
            note: (l.metaJson as Record<string, unknown> | null)?.note ?? null,
            createdAt: l.createdAt,
          }));
          return [...betRows, ...others].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        })(),
        walletRequests: userRequests.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          amount: Number(r.amount),
          currency: r.currency ?? 'KRW',
          depositorName: r.depositorName ?? null,
          note: r.note ?? null,
          createdAt: r.createdAt,
          processedAt: r.resolvedAt ?? null,
        })),
        usdtTxs: userUsdtTxs.map((t) => ({
          id: t.id,
          txHash: t.txHash,
          usdtAmount: Number(t.usdtAmount),
          krwAmount: t.krwAmount ? Number(t.krwAmount) : null,
          status: t.status,
          note: t.resolverNote ?? null,
          createdAt: t.createdAt,
        })),
        rolling: userRolling.map((r) => ({
          id: r.id,
          required: Number(r.requiredTurnover),
          accumulated: Number(r.appliedTurnover),
          fulfilled: r.satisfiedAt !== null,
          createdAt: r.createdAt,
        })),
        points: userPoints.map((p) => ({
          id: p.id,
          delta: Number(p.amount),
          reason: p.reference ?? null,
          createdAt: p.createdAt,
        })),
      };
    };

    const agents = allTestUsers.filter((u) => u.role === UserRole.MASTER_AGENT);
    const users = allTestUsers.filter((u) => u.role === UserRole.USER);

    return {
      password: DEFAULT_PWD,
      accounts: {
        topAgents: agents.filter((a) => !a.parentUserId).map(buildUserDetail),
        subAgents: agents.filter((a) => a.parentUserId).map(buildUserDetail),
        krwUsers: users.filter((u) => u.signupMode !== 'anonymous').map(buildUserDetail),
        usdtUsers: users.filter((u) => u.signupMode === 'anonymous').map(buildUserDetail),
      },
      totals: {
        agents: agents.length,
        users: users.length,
        ledgerEntries: ledgerEntries.length,
        walletRequests: walletRequests.length,
        usdtTxs: usdtTxs.length,
        rollingObs: rollingObs.length,
        pointEntries: pointLedger.length,
      },
    };
  }

  private makeAdminActor(platformId: string) {
    return {
      sub: 'test-admin',
      email: null,
      role: UserRole.PLATFORM_ADMIN,
      platformId,
      iat: 0,
      exp: 9999999999,
    } as any;
  }

  // ─── 테스트 데이터 초기화 ──────────────────────────────────
  async cleanup(platformId: string) {
    const users = await this.prisma.user.findMany({
      where: { platformId, loginId: { startsWith: 'test_' } },
    });
    const ids = users.map((u) => u.id);

    await this.prisma.walletRequest.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.usdtDepositTx.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.rollingObligation.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.ledgerEntry.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.pointLedgerEntry.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.agentCommissionRevision.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.rollingRateRevision.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.user.deleteMany({ where: { id: { in: ids } } });

    return { deleted: ids.length, message: `테스트 데이터 ${ids.length}명 삭제 완료` };
  }
}
