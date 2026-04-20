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
import { computeEffectiveAgentShares } from '../common/agent-commission.util';
import { ReserveBalanceService } from '../reserve-balance/reserve-balance.service';
import { derivePlatformBillingPctFromPolicy } from '../platforms/solution-rate-derive.util';
import {
  pickBucketState,
  WalletBucketsService,
} from '../wallet-buckets/wallet-buckets.service';

const TAG = '[TEST]';
const DEFAULT_PWD = 'Test1234!';
const KRW_DEPOSIT = 500_000;     // 테스트 입금액 (잔액이 배팅 후에도 남도록 충분히)
const USDT_DEPOSIT_OK = 55;      // 최소치 이상
const USDT_DEPOSIT_FAIL = 49;    // 최소치 미달 시나리오
const USDT_MIN_DEPOSIT = 50;
const CASINO_ROUNDS = 8;
const BET_UNIT_KRW = 20_000;     // 한 라운드 베팅금

/** Step 2~7 에 쓰는 금액 묶음 (randomize 시 매 실행마다 새로 뽑음) */
export interface ScenarioAmounts {
  krwDeposit: number;
  betUnit: number;
  usdtOk: number;
  usdtFail: number;
  grantPoints: number;
  /** 출금 신청 시 잔액 대비 비율 */
  withdrawPct: number;
}

function drawScenarioAmounts(randomize: boolean): ScenarioAmounts {
  if (!randomize) {
    return {
      krwDeposit: KRW_DEPOSIT,
      betUnit: BET_UNIT_KRW,
      usdtOk: USDT_DEPOSIT_OK,
      usdtFail: USDT_DEPOSIT_FAIL,
      grantPoints: 500,
      withdrawPct: 0.8,
    };
  }
  const round1k = (n: number) => Math.max(1_000, Math.round(n / 1000) * 1000);
  const betUnit = round1k(BET_UNIT_KRW + (Math.random() * 28_000 - 8_000));
  const krwDeposit = round1k(380_000 + Math.random() * 340_000);
  const usdtOk = USDT_MIN_DEPOSIT + Math.floor(Math.random() * 31);
  const usdtFail = 40 + Math.floor(Math.random() * (USDT_MIN_DEPOSIT - 40));
  const grantPoints = 220 + Math.floor(Math.random() * 780);
  const withdrawPct = 0.62 + Math.random() * 0.26;
  return { krwDeposit, betUnit, usdtOk, usdtFail, grantPoints, withdrawPct };
}

export interface StepResult {
  step: number;
  name: string;
  status: 'ok' | 'skip' | 'error';
  data?: unknown;
  error?: string;
}

export type BetProfile = 'loser_extreme' | 'loser_heavy' | 'balanced' | 'winner_moderate' | 'winner_jackpot';

export type GameVertical = 'casino' | 'slot' | 'sports' | 'minigame';

export interface BetRound {
  bet: number;
  win: number;
  label: string;
  vertical: GameVertical;
  gameType: string;   // 바카라|블랙잭|룰렛|드래곤타이거|sweet_bonanza|gates_of_olympus|basketball|soccer|powerball 등
  sport?: string;     // sports 전용: basketball|soccer|baseball
  matchType?: string; // sports 전용: match|special|live
}

export interface ScenarioState {
  platformId: string;
  topAgents: { id: string; loginId: string }[];
  subAgents: { id: string; loginId: string; parentLoginId: string }[];
  krwUsers: { id: string; loginId: string; agentLoginId: string; betProfile?: BetProfile }[];
  usdtUsers: { id: string; loginId: string; wallet: string; betProfile?: BetProfile }[];
  /** Step 1 직후 주입. Step 1 생략 시 없으면 고정 기본값 사용 */
  scenarioAmounts?: ScenarioAmounts;
}

/**
 * loginId → betProfile (loadState 복원용).
 * 계정 ID는 aa / aaa / aaaa … , bb / bbb … 처럼 글자를 늘려 서로 안 겹치게 함.
 */
const LOGIN_PROFILE_MAP: Record<string, BetProfile> = {
  test_aaaaa: 'winner_jackpot',
  test_aaaaaa: 'loser_extreme',
  test_aaaaaaa: 'balanced',
  test_aaaaaaaa: 'winner_moderate',
  test_aaaaaaaaa: 'loser_heavy',
  test_aaaaaaaaaa: 'loser_extreme',
  test_aaaaaaaaaaa: 'winner_jackpot',
  test_bbbbb: 'balanced',
  test_bbbbbb: 'loser_heavy',
  test_bbbbbbb: 'winner_jackpot',
  test_bbbbbbbbb: 'winner_moderate',
  test_bbbbbbbbbb: 'loser_extreme',
  test_bbbbbbbbbbb: 'loser_heavy',
  test_bbbbbbbbbbbb: 'balanced',
  test_bbbbbbbbbbbbb: 'winner_moderate',
  test_bbbbbbbbbbbbbb: 'loser_heavy',
  test_bbbbbbbbbbbbbbb_belowmin: 'balanced',
};

// 프로필별 배팅 라운드 시나리오 (vertical + gameType 분류 포함)
function getBetRounds(profile: BetProfile = 'balanced', unit: number): BetRound[] {
  switch (profile) {
    case 'loser_extreme':
      // 전패: 카지노(바카라·블랙잭) + 슬롯 혼합 — 전부 낙첨
      return [
        { bet: unit,     win: 0, label: '바카라 낙첨',           vertical: 'casino',  gameType: '바카라' },
        { bet: unit,     win: 0, label: '바카라 낙첨',           vertical: 'casino',  gameType: '바카라' },
        { bet: unit,     win: 0, label: '블랙잭 낙첨',           vertical: 'casino',  gameType: '블랙잭' },
        { bet: unit,     win: 0, label: '슬롯 낙첨',             vertical: 'slot',    gameType: 'sweet_bonanza' },
        { bet: unit * 2, win: 0, label: '바카라 더블 낙첨',      vertical: 'casino',  gameType: '바카라' },
        { bet: unit * 2, win: 0, label: '슬롯 더블 낙첨',        vertical: 'slot',    gameType: 'gates_of_olympus' },
        { bet: unit * 3, win: 0, label: '스포츠 농구매치 낙첨',  vertical: 'sports',  gameType: '농구', sport: '농구', matchType: 'match' },
        { bet: unit * 3, win: 0, label: '미니게임 파워볼 낙첨',  vertical: 'minigame',gameType: '파워볼' },
      ];

    case 'loser_heavy':
      // 대패: 카지노·슬롯·스포츠 혼합, 1승
      return [
        { bet: unit,     win: 0,            label: '바카라 낙첨',           vertical: 'casino',  gameType: '바카라' },
        { bet: unit,     win: 0,            label: '슬롯 낙첨',             vertical: 'slot',    gameType: 'sweet_bonanza' },
        { bet: unit,     win: unit * 1.5,   label: '블랙잭 소승(x1.5)',     vertical: 'casino',  gameType: '블랙잭' },
        { bet: unit,     win: 0,            label: '스포츠 축구매치 낙첨',  vertical: 'sports',  gameType: '축구', sport: '축구', matchType: 'match' },
        { bet: unit * 2, win: 0,            label: '바카라 더블 낙첨',      vertical: 'casino',  gameType: '바카라' },
        { bet: unit * 2, win: 0,            label: '슬롯 더블 낙첨',        vertical: 'slot',    gameType: 'gates_of_olympus' },
        { bet: unit * 3, win: 0,            label: '미니게임 사다리 낙첨',  vertical: 'minigame',gameType: '사다리' },
      ];

    case 'balanced':
      // 승3 패5: 4개 버티컬 골고루
      return [
        { bet: unit, win: 0,          label: '바카라 낙첨',              vertical: 'casino',  gameType: '바카라' },
        { bet: unit, win: unit * 1.95,label: '바카라 승리(x1.95)',       vertical: 'casino',  gameType: '바카라' },
        { bet: unit, win: 0,          label: '슬롯 낙첨',                vertical: 'slot',    gameType: 'sweet_bonanza' },
        { bet: unit, win: 0,          label: '스포츠 농구라이브 낙첨',   vertical: 'sports',  gameType: '농구', sport: '농구', matchType: 'live' },
        { bet: unit, win: unit * 2.5, label: '룰렛 대승(x2.5)',          vertical: 'casino',  gameType: '룰렛' },
        { bet: unit, win: 0,          label: '미니게임 파워볼 낙첨',     vertical: 'minigame',gameType: '파워볼' },
        { bet: unit, win: unit * 1.8, label: '슬롯 승리(x1.8)',          vertical: 'slot',    gameType: 'gates_of_olympus' },
        { bet: unit, win: 0,          label: '드래곤타이거 낙첨',        vertical: 'casino',  gameType: '드래곤타이거' },
      ];

    case 'winner_moderate':
      // 승리 우세: 5승 3패, 다양한 게임 분산
      return [
        { bet: unit, win: unit * 1.9, label: '바카라 승리(x1.9)',         vertical: 'casino',  gameType: '바카라' },
        { bet: unit, win: 0,          label: '슬롯 낙첨',                 vertical: 'slot',    gameType: 'sweet_bonanza' },
        { bet: unit, win: unit * 2.0, label: '블랙잭 승리(x2.0)',         vertical: 'casino',  gameType: '블랙잭' },
        { bet: unit, win: unit * 1.95,label: '스포츠 농구스페셜 승리',    vertical: 'sports',  gameType: '농구', sport: '농구', matchType: 'special' },
        { bet: unit, win: 0,          label: '미니게임 스피드키노 낙첨',  vertical: 'minigame',gameType: '스피드키노' },
        { bet: unit, win: unit * 2.2, label: '슬롯 대승(x2.2)',           vertical: 'slot',    gameType: 'gates_of_olympus' },
        { bet: unit, win: 0,          label: '드래곤타이거 낙첨',         vertical: 'casino',  gameType: '드래곤타이거' },
        { bet: unit, win: unit * 1.8, label: '스포츠 야구매치 승리',      vertical: 'sports',  gameType: '야구', sport: '야구', matchType: 'match' },
      ];

    case 'winner_jackpot':
      // 대박: 승리 우세, 하우스 엣지 양수 유지 (총 베팅 300k, 당첨 426k)
      return [
        { bet: unit * 2, win: unit * 2 * 2.5, label: '바카라 대박(x2.5)',         vertical: 'casino',  gameType: '바카라' },
        { bet: unit * 2, win: unit * 2 * 2.0, label: '슬롯 잭팟(x2.0)',           vertical: 'slot',    gameType: 'sweet_bonanza' },
        { bet: unit,     win: 0,              label: '블랙잭 낙첨',               vertical: 'casino',  gameType: '블랙잭' },
        { bet: unit * 3, win: unit * 3 * 2.0, label: '스포츠 농구라이브 대박(x2.0)',vertical: 'sports', gameType: '농구', sport: '농구', matchType: 'live' },
        { bet: unit,     win: unit * 1.8,     label: '룰렛 승리(x1.8)',           vertical: 'casino',  gameType: '룰렛' },
        { bet: unit * 2, win: 0,              label: '슬롯 낙첨',                 vertical: 'slot',    gameType: 'gates_of_olympus' },
        { bet: unit,     win: 0,              label: '미니게임 파워볼 낙첨',       vertical: 'minigame',gameType: '파워볼' },
        { bet: unit * 3, win: unit * 3 * 1.5, label: '슬롯 대박(x1.5)',           vertical: 'slot',    gameType: 'gates_of_olympus' },
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
    private reserve: ReserveBalanceService,
    private buckets: WalletBucketsService,
  ) {}

  private resolveAmounts(state: ScenarioState): ScenarioAmounts {
    return state.scenarioAmounts ?? drawScenarioAmounts(false);
  }

  // ─── 메인 진입점 ─────────────────────────────────────────
  async run(
    fromStep: number,
    toStep: number,
    platformId: string,
    currencies: ('KRW' | 'USDT')[],
    randomize = true,
  ) {
    const results: StepResult[] = [];
    const start = Math.max(1, Math.min(9, fromStep));
    const end = Math.max(start, Math.min(9, toStep));
    const runStep = (n: number) => start <= n && n <= end;
    const useRandomAmounts = randomize && runStep(1);
    const scenarioAmounts = drawScenarioAmounts(useRandomAmounts);

    // STEP 1: 테스트 데이터 셋업
    let state: ScenarioState;
    if (runStep(1)) {
      const r = await this.step1_setup(platformId);
      results.push(r);
      if (r.status === 'error') return { results, state: null };
      state = r.data as ScenarioState;
      state.scenarioAmounts = scenarioAmounts;
    } else {
      const s = await this.loadState(platformId);
      if (!s) return { results: [{ step: 1, name: 'LOAD_STATE', status: 'error' as const, error: 'step 1 데이터가 없습니다. fromStep=1 부터 다시 실행하세요.' }], state: null };
      state = s;
      state.scenarioAmounts = state.scenarioAmounts ?? drawScenarioAmounts(false);
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
      results.push(
        await this.step4_casinoPlay(
          platformId,
          allUsers,
          this.resolveAmounts(state).betUnit,
        ),
      );
    }

    // STEP 5: 롤링 충족 확인 + 추가 베팅
    if (runStep(5)) {
      const allUsers = [
        ...(currencies.includes('KRW') ? usersKrw : []),
        ...(currencies.includes('USDT') ? usersUsdt : []),
      ];
      results.push(await this.step5_fulfillRolling(platformId, allUsers, state));
    }

    // STEP 6: 콤프 + 포인트 지급
    if (runStep(6)) {
      results.push(await this.step6_compPoints(platformId, state));
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

    // STEP 9: 총판 정산 시뮬 — 범위에 9가 포함되거나, 출금(8)까지 돌렸을 때(end===8) 자동으로 이어서 실행
    // (종료 Step을 9로 두지 않아도 1→8 전체 실행이면 요율 반영 적립이 되도록)
    const runAgentSettlement = runStep(9) || (runStep(8) && end === 8);
    if (runAgentSettlement) {
      results.push(await this.step9_agentSettlement(platformId));
    }

    // STEP 10: 알값 크레딧 시뮬 — 본사 상위 원가 납입 & 플랫폼 크레딧 소진 기록
    const runCreditSim = runStep(10) || (runAgentSettlement && end <= 9);
    if (runCreditSim) {
      results.push(await this.step10_creditSim(platformId));
    }

    return { results, state, scenarioAmounts: state.scenarioAmounts };
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
      // 상위 총판은 플랫폼 GGR의 일정 %를 받음 (하위 총판에 split 후 순수익 = 상위% - 하위실효%)
      const topAgentDefs = [
        { loginId: 'test_aa', name: `${TAG} 최상위총판A(aa)`, sharePct: 10 },
        { loginId: 'test_bb', name: `${TAG} 최상위총판B(bb)`, sharePct: 8 },
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
        { parentLoginId: 'test_aa', loginId: 'test_aaa', name: `${TAG} 하위총판(aaa)`, splitPct: 40 },
        { parentLoginId: 'test_aa', loginId: 'test_aaaa', name: `${TAG} 하위총판(aaaa)`, splitPct: 35 },
        { parentLoginId: 'test_bb', loginId: 'test_bbb', name: `${TAG} 하위총판(bbb)`, splitPct: 40 },
        { parentLoginId: 'test_bb', loginId: 'test_bbbb', name: `${TAG} 하위총판(bbbb)`, splitPct: 30 },
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
        { agentLoginId: 'test_aaa', loginId: 'test_aaaaa', name: `${TAG} KRW(aaaaa)[대박]`, bankHolder: '김대박', bankCode: '4', bankNum: '123456789012', betProfile: 'winner_jackpot' },
        { agentLoginId: 'test_aaa', loginId: 'test_aaaaaa', name: `${TAG} KRW(aaaaaa)[전패]`, bankHolder: '이전패', bankCode: '41', bankNum: '110123456789', betProfile: 'loser_extreme' },
        { agentLoginId: 'test_aaa', loginId: 'test_aaaaaaa', name: `${TAG} KRW(aaaaaaa)[보통]`, bankHolder: '박보통', bankCode: '4', bankNum: '123456789099', betProfile: 'balanced' },
        { agentLoginId: 'test_aaaa', loginId: 'test_aaaaaaaa', name: `${TAG} KRW(aaaaaaaa)[승우세]`, bankHolder: '박승우', bankCode: '40', bankNum: '781234567890', betProfile: 'winner_moderate' },
        { agentLoginId: 'test_aaaa', loginId: 'test_aaaaaaaaa', name: `${TAG} KRW(aaaaaaaaa)[대패]`, bankHolder: '정대패', bankCode: '43', bankNum: '333012345678', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_aaaa', loginId: 'test_aaaaaaaaaa', name: `${TAG} KRW(aaaaaaaaaa)[전패]`, bankHolder: '홍전패', bankCode: '8', bankNum: '302123456789', betProfile: 'loser_extreme' },
        { agentLoginId: 'test_aaaa', loginId: 'test_aaaaaaaaaaa', name: `${TAG} KRW(aaaaaaaaaaa)[대박]`, bankHolder: '홍대박', bankCode: '8', bankNum: '302123456700', betProfile: 'winner_jackpot' },
        { agentLoginId: 'test_bbb', loginId: 'test_bbbbb', name: `${TAG} KRW(bbbbb)[보통]`, bankHolder: '최보통', bankCode: '10', bankNum: '1002123456789', betProfile: 'balanced' },
        { agentLoginId: 'test_bbb', loginId: 'test_bbbbbb', name: `${TAG} KRW(bbbbbb)[대패]`, bankHolder: '오대패', bankCode: '11', bankNum: '23704567890', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_bbb', loginId: 'test_bbbbbbb', name: `${TAG} KRW(bbbbbbb)[대박]`, bankHolder: '오대박', bankCode: '11', bankNum: '23704567891', betProfile: 'winner_jackpot' },
        { agentLoginId: 'test_bbbb', loginId: 'test_bbbbbbbbb', name: `${TAG} KRW(bbbbbbbbb)[승우세]`, bankHolder: '강승우', bankCode: '3', bankNum: '00432123456789', betProfile: 'winner_moderate' },
        { agentLoginId: 'test_bbbb', loginId: 'test_bbbbbbbbbb', name: `${TAG} KRW(bbbbbbbbbb)[전패]`, bankHolder: '윤전패', bankCode: '6', bankNum: '10301234567890', betProfile: 'loser_extreme' },
        { agentLoginId: 'test_bbbb', loginId: 'test_bbbbbbbbbbb', name: `${TAG} KRW(bbbbbbbbbb)[대패]`, bankHolder: '윤대패', bankCode: '6', bankNum: '10301234567891', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_bbbb', loginId: 'test_bbbbbbbbbbbb', name: `${TAG} KRW(bbbbbbbbbbb)[보통]`, bankHolder: '이보통', bankCode: '20', bankNum: '10321234567890', betProfile: 'balanced' },
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
        { agentLoginId: 'test_aaa', loginId: 'test_bbbbbbbbbbbbb', name: `${TAG} USDT(b…)[승우세]`, wallet: 'TTestWallet111111111111111111111', betProfile: 'winner_moderate' },
        { agentLoginId: 'test_bbb', loginId: 'test_bbbbbbbbbbbbbb', name: `${TAG} USDT(b…)[대패]`, wallet: 'TTestWallet222222222222222222222', betProfile: 'loser_heavy' },
        { agentLoginId: 'test_bbbb', loginId: 'test_bbbbbbbbbbbbbbb_belowmin', name: `${TAG} USDT(최소미달)[보통]`, wallet: 'TTestWallet333333333333333333333', betProfile: 'balanced' },
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
          summary: `최상위총판 ${created.topAgents.length}명, 하위총판 ${created.subAgents.length}명, KRW유저 ${created.krwUsers.length}명, USDT유저 ${created.usdtUsers.length}명 생성 (이후 스텝 금액은 run()에서 주입)`,
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
      const krwDeposit = this.resolveAmounts(state).krwDeposit;

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
            amount: krwDeposit,
            status: WalletRequestStatus.PENDING,
            depositorName: (await this.prisma.user.findUnique({ where: { id: u.id }, select: { bankAccountHolder: true } }))?.bankAccountHolder ?? '테스트',
            note: `${TAG} 테스트 입금신청`,
          },
        });
        requests.push({ userId: u.id, loginId: u.loginId, requestId: req.id, amount: krwDeposit });
      }
      return { step: 2, name: 'KRW_DEPOSIT_REQUEST', status: 'ok', data: { count: requests.length, requests, krwDepositPerUser: krwDeposit } };
    } catch (e) {
      return { step: 2, name: 'KRW_DEPOSIT_REQUEST', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 2b: USDT 입금 시뮬레이션 ────────────────────────
  private async step2_usdtDepositSimulate(state: ScenarioState): Promise<StepResult> {
    try {
      const { usdtOk, usdtFail } = this.resolveAmounts(state);
      const platform = await this.prisma.platform.findUnique({ where: { id: state.platformId }, select: { settlementUsdtWallet: true } });
      const toAddr = platform?.settlementUsdtWallet ?? 'TSettlementWalletAddress000000000';
      const rate = await this.upbit.getKrwPerUsdt();
      const txs: unknown[] = [];

      for (const u of state.usdtUsers) {
        const isBelowMin = u.loginId.includes('belowmin');
        const usdtAmt = isBelowMin ? usdtFail : usdtOk;
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
      return { step: 2, name: 'USDT_DEPOSIT_SIMULATE', status: 'ok', data: { count: txs.length, txs, usdtOk, usdtFail, note: 'belowmin 유저는 최소입금 미달 → PENDING 상태, 관리자가 수동 처리해야 함' } };
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
        const ref = `usdt:${tx.txHash}`;

        let newBal = wallet.balance;
        await this.prisma.$transaction(async (txn) => {
          const next = this.buckets.creditLockedDeposit(
            pickBucketState(wallet),
            krwCredit,
          );
          const persisted = await this.buckets.persist(txn, wallet.id, next);
          newBal = persisted.balance;
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
  private async step4_casinoPlay(
    platformId: string,
    users: { id: string; loginId: string; betProfile?: BetProfile }[],
    betUnitKrw: number,
  ): Promise<StepResult> {
    try {
      const summary: unknown[] = [];

      for (const u of users) {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: u.id } });
        if (!wallet || wallet.balance.lte(0)) {
          summary.push({ userId: u.id, loginId: u.loginId, skipped: true, reason: '잔액 없음 (입금 승인 필요)' });
          continue;
        }

        // 유저별 배팅 프로필 적용
        const rounds = getBetRounds(u.betProfile ?? 'balanced', betUnitKrw);

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
            const wNow = await txn.wallet.findUnique({ where: { id: wallet.id } });
            if (!wNow) return;
            const openRolling = await this.buckets.hasOpenRollingTx(txn, u.id);
            let b = pickBucketState(wNow);
            b = this.buckets.deductStake(b, stake);
            let { balance: balAfterBet } = await this.buckets.persist(
              txn,
              wallet.id,
              b,
            );
            balance = balAfterBet;
            await txn.ledgerEntry.create({
              data: {
                platformId,
                userId: u.id,
                type: LedgerEntryType.BET,
                amount: stake.negated(),
                balanceAfter: balance,
                reference: ref,
                metaJson: {
                  vertical: round.vertical,
                  gameType: round.gameType,
                  ...(round.sport ? { sport: round.sport } : {}),
                  ...(round.matchType ? { matchType: round.matchType } : {}),
                  note: `${TAG} 라운드${i + 1} 배팅 - ${round.label}`,
                },
              },
            });

            if (didWin) {
              b = this.buckets.creditWin(b, winAmt, openRolling);
              const persisted = await this.buckets.persist(txn, wallet.id, b);
              balance = persisted.balance;
              await txn.ledgerEntry.create({
                data: {
                  platformId,
                  userId: u.id,
                  type: LedgerEntryType.WIN,
                  amount: winAmt,
                  balanceAfter: balance,
                  reference: ref,
                  metaJson: {
                    vertical: round.vertical,
                    gameType: round.gameType,
                    ...(round.sport ? { sport: round.sport } : {}),
                    ...(round.matchType ? { matchType: round.matchType } : {}),
                    note: `${TAG} 라운드${i + 1} 당첨`,
                  },
                },
              });
            }

            // 롤링 적립
            await this.rolling.applyBetStake(txn, u.id, stake);

            // 패배 포인트 적립
            await this.points.maybeCreditLoseBet(txn, u.id, platformId, stake, didWin);

            // 낙첨 즉시 에이전트 커미션 지급 (실시간 모델)
            const roundGgr = stake.minus(winAmt); // 낙첨: 양수, 당첨: 음수
            await this.creditAgentOnBetGgr(txn, platformId, u.id, roundGgr, ref);
          });

          userRounds.push({ round: i + 1, label: round.label, bet: round.bet, win: round.win, balanceAfter: balance.toFixed(2) });
        }

        summary.push({ userId: u.id, loginId: u.loginId, betProfile: u.betProfile ?? 'balanced', rounds: userRounds, finalBalance: balance.toFixed(2) });
      }

      return { step: 4, name: 'CASINO_PLAY', status: 'ok', data: { users: summary, betUnitKrw } };
    } catch (e) {
      return { step: 4, name: 'CASINO_PLAY', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 5: 롤링 충족 ────────────────────────────────────
  private async step5_fulfillRolling(
    platformId: string,
    users: { id: string; loginId: string; betProfile?: BetProfile }[],
    state: ScenarioState,
  ): Promise<StepResult> {
    try {
      const results: unknown[] = [];
      const { krwDeposit, betUnit } = this.resolveAmounts(state);

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
        const minBuffer = new Prisma.Decimal(krwDeposit).times(0.3);
        let toFulfill = remaining;
        const extraRounds: unknown[] = [];
        let roundNum = 0;

        while (toFulfill.gt(0) && balance.gt(minBuffer)) {
          roundNum++;
          const usable = balance.minus(minBuffer);
          const stake = Prisma.Decimal.min(toFulfill, new Prisma.Decimal(betUnit), usable);
          const didWin = roundNum % 3 === 0; // 3번에 1번 승리
          const winAmt = didWin ? stake.times(1.9) : new Prisma.Decimal(0);
          const ref = `roll:${TAG}:${u.loginId}:r${roundNum}:${Date.now()}`;

          await this.prisma.$transaction(async (txn) => {
            const wNow = await txn.wallet.findUnique({ where: { id: wallet.id } });
            if (!wNow) return;
            const openRolling = await this.buckets.hasOpenRollingTx(txn, u.id);
            let b = pickBucketState(wNow);
            b = this.buckets.deductStake(b, stake);
            let { balance: balAfterBet } = await this.buckets.persist(
              txn,
              wallet.id,
              b,
            );
            balance = balAfterBet;
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
                  gameType: '바카라',
                  note: `${TAG} 롤링충족 추가배팅 r${roundNum}`,
                },
              },
            });

            if (didWin) {
              b = this.buckets.creditWin(b, winAmt, openRolling);
              const persisted = await this.buckets.persist(txn, wallet.id, b);
              balance = persisted.balance;
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
                    gameType: '바카라',
                    note: `${TAG} 롤링충족 당첨 r${roundNum}`,
                  },
                },
              });
            }

            await this.rolling.applyBetStake(txn, u.id, stake);
            await this.points.maybeCreditLoseBet(txn, u.id, platformId, stake, didWin);

            // 낙첨 즉시 에이전트 커미션 (롤링 추가 베팅도 동일 처리)
            const roundGgr = stake.minus(winAmt);
            await this.creditAgentOnBetGgr(txn, platformId, u.id, roundGgr, ref);
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
  private async step6_compPoints(platformId: string, state: ScenarioState): Promise<StepResult> {
    try {
      const grantPoints = this.resolveAmounts(state).grantPoints;
      await this.points.grantAllForPlatform(platformId, grantPoints, `${TAG} 테스트 일괄 포인트 지급`);

      const users = await this.prisma.user.findMany({
        where: { platformId, role: UserRole.USER, registrationStatus: RegistrationStatus.APPROVED, loginId: { startsWith: 'test_' } },
        include: { wallet: true },
      });

      const data = users.map((u) => ({
        loginId: u.loginId,
        pointBalance: u.wallet?.pointBalance ?? '0',
        balance: u.wallet?.balance ?? '0',
      }));

      return { step: 6, name: 'COMP_POINTS', status: 'ok', data: { grantedPoints: grantPoints, users: data } };
    } catch (e) {
      return { step: 6, name: 'COMP_POINTS', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 7: 출금 신청 ────────────────────────────────────
  private async step7_withdrawalRequests(state: ScenarioState, users: { id: string; loginId: string; betProfile?: BetProfile }[]): Promise<StepResult> {
    try {
      const requests: unknown[] = [];
      const usdtKrwRate = await this.upbit.getKrwPerUsdt();

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

        const pct = this.resolveAmounts(state).withdrawPct;
        const withdrawKrw = wallet.balance.times(pct).toDecimalPlaces(0);
        const currency = isAnonymous ? 'USDT' : 'KRW';
        const amount = isAnonymous
          ? withdrawKrw.div(usdtKrwRate).toDecimalPlaces(6)
          : withdrawKrw;

        const req = await this.prisma.walletRequest.create({
          data: {
            platformId: state.platformId,
            userId: u.id,
            type: WalletRequestType.WITHDRAWAL,
            currency,
            amount,
            status: WalletRequestStatus.PENDING,
            note: `${TAG} 테스트 출금신청`,
          },
        });
        requests.push({
          userId: u.id,
          loginId: u.loginId,
          requestId: req.id,
          amount: amount.toFixed(isAnonymous ? 6 : 2),
          currency: req.currency,
          withdrawKrw: withdrawKrw.toFixed(0),
          usdtKrwRate: usdtKrwRate.toFixed(2),
        });
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
          const krwAmt =
            req.currency === 'USDT'
              ? new Prisma.Decimal(req.amount).times(rate)
              : new Prisma.Decimal(req.amount);
          const usdtEquivalent =
            req.currency === 'USDT'
              ? new Prisma.Decimal(req.amount)
              : krwAmt.div(rate).toDecimalPlaces(4);

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

  /**
   * 에이전트 정산 검증 (실시간 모델 전환 후):
   * - 충전 즉시 커미션: WalletRequestsService.approve() (DEPOSIT)
   * - 낙첨 즉시 커미션: step4_casinoPlay → creditAgentOnBetGgr()
   * - 출금 즉시 차감:  WalletRequestsService.approve() (WITHDRAWAL)
   * → 이제 배치 GGR 크레딧은 없음. 본 step은 실제 잔액 vs 기대 정산금 비교만 수행.
   */
  private async step9_agentSettlement(platformId: string): Promise<StepResult> {
    try {
      const agents = await this.prisma.user.findMany({
        where: {
          platformId,
          role: UserRole.MASTER_AGENT,
          loginId: { startsWith: 'test_' },
        },
        select: {
          id: true,
          loginId: true,
          parentUserId: true,
          agentPlatformSharePct: true,
          agentSplitFromParentPct: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (agents.length === 0) {
        return { step: 9, name: 'AGENT_SETTLEMENT', status: 'skip', data: { message: '테스트 총판 계정이 없습니다' } };
      }

      const testChain = await this.prisma.user.findMany({
        where: { platformId, loginId: { startsWith: 'test_' } },
        select: { id: true, role: true, parentUserId: true },
      });
      const parentByUserId = new Map(testChain.map((r) => [r.id, r.parentUserId ?? null]));
      const roleById = new Map(testChain.map((r) => [r.id, r.role]));
      const masters = agents.map((a) => ({
        id: a.id,
        parentUserId: a.parentUserId,
        agentPlatformSharePct: a.agentPlatformSharePct != null ? Number(a.agentPlatformSharePct) : null,
        agentSplitFromParentPct: a.agentSplitFromParentPct != null ? Number(a.agentSplitFromParentPct) : null,
      }));
      const effectiveMap = computeEffectiveAgentShares(masters, roleById, (uid) => parentByUserId.get(uid) ?? null);

      const getDownlineUserIds = async (agentId: string): Promise<string[]> => {
        const userIds: string[] = [];
        const queue = [agentId];
        while (queue.length > 0) {
          const cur = queue.shift()!;
          const ch = await this.prisma.user.findMany({
            where: { platformId, parentUserId: cur },
            select: { id: true, role: true },
          });
          for (const c of ch) {
            if (c.role === UserRole.USER) userIds.push(c.id);
            else if (c.role === UserRole.MASTER_AGENT) queue.push(c.id);
          }
        }
        return userIds;
      };

      const summary: unknown[] = [];

      for (const agent of agents) {
        const userIds = await getDownlineUserIds(agent.id);
        if (userIds.length === 0) {
          summary.push({ agentId: agent.id, loginId: agent.loginId, status: 'no_downline' });
          continue;
        }

        const [betAgg, winAgg, depAgg, wdrAgg] = await Promise.all([
          this.prisma.ledgerEntry.aggregate({
            where: { platformId, userId: { in: userIds }, type: LedgerEntryType.BET, amount: { lt: 0 } },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: { platformId, userId: { in: userIds }, type: LedgerEntryType.WIN, amount: { gt: 0 } },
            _sum: { amount: true },
          }),
          this.prisma.walletRequest.aggregate({
            where: { platformId, userId: { in: userIds }, type: WalletRequestType.DEPOSIT, status: WalletRequestStatus.APPROVED },
            _sum: { amount: true },
          }),
          this.prisma.walletRequest.aggregate({
            where: { platformId, userId: { in: userIds }, type: WalletRequestType.WITHDRAWAL, status: WalletRequestStatus.APPROVED },
            _sum: { amount: true },
          }),
        ]);

        const stakeAbs = Math.abs(betAgg._sum.amount?.toNumber() ?? 0);
        const totalWin = winAgg._sum.amount?.toNumber() ?? 0;
        const dep = depAgg._sum.amount?.toNumber() ?? 0;
        const wdr = wdrAgg._sum.amount?.toNumber() ?? 0;
        const ggr = stakeAbs - totalWin;
        // 낙첨금액 = 유저가 진 금액만 (GGR > 0인 라운드 합계 = 전체 배팅 - 당첨금)
        // 적중 시 에이전트 차감 없음 → 기대 공식: (충전 + 낙첨 - 환전) × 실효요율
        // 단순화: 낙첨분만 있으면 (dep + ggr_positive - wdr) × rate
        const ggrPositive = Math.max(0, ggr); // 유저 순손실(낙첨 지배적일 때)

        const effPct = effectiveMap.get(agent.id) ?? 0;
        // 기대 정산금 = (충전 + 낙첨GGR - 환전) × 실효요율
        const expectedSettlement = ((dep + ggrPositive - wdr) * effPct) / 100;

        // 실제 에이전트 지갑 잔액 (이미 실시간으로 적립된 금액)
        const agentWallet = await this.prisma.wallet.findUnique({ where: { userId: agent.id } });
        const actualBalance = agentWallet ? Number(agentWallet.balance) : 0;

        summary.push({
          agentId: agent.id,
          loginId: agent.loginId,
          effectivePct: effPct,
          dep: dep.toFixed(2),
          wdr: wdr.toFixed(2),
          stakeAbs: stakeAbs.toFixed(2),
          totalWin: totalWin.toFixed(2),
          ggr: ggr.toFixed(2),
          ggrPositive: ggrPositive.toFixed(2),
          expectedSettlement: expectedSettlement.toFixed(2),
          actualBalance: actualBalance.toFixed(2),
          diff: (actualBalance - expectedSettlement).toFixed(2),
          status: Math.abs(actualBalance - expectedSettlement) < 1 ? 'matched' : 'mismatch',
          note: '실시간 지급 모델: 충전즉시+낙첨즉시+출금즉시차감',
        });
      }

      return { step: 9, name: 'AGENT_SETTLEMENT_VERIFY', status: 'ok', data: { summary, note: '배치 GGR 크레딧 없음 — 실시간 모델로 step4/3/8에서 처리' } };
    } catch (e) {
      return { step: 9, name: 'AGENT_SETTLEMENT_VERIFY', status: 'error', error: String(e) };
    }
  }

  // ─── STEP 10: 알값 크레딧 시뮬 ───────────────────────────────
  private async step10_creditSim(platformId: string): Promise<StepResult> {
    try {
      const platform = await this.prisma.platform.findUnique({
        where: { id: platformId },
        select: { id: true, name: true, flagsJson: true },
      });
      if (!platform) throw new Error(`플랫폼 ${platformId}를 찾을 수 없습니다`);

      const flags = (platform.flagsJson ?? {}) as Record<string, unknown>;
      const ratePolicy = (flags.solutionRatePolicy ?? {}) as Record<string, unknown>;
      const upstreamPct = Number(ratePolicy.upstreamCasinoPct ?? 0);
      const platformPct = Number(
        derivePlatformBillingPctFromPolicy(ratePolicy, 'casino'),
      );
      if (upstreamPct === 0 && platformPct === 0) {
        return {
          step: 10,
          name: 'CREDIT_SIM',
          status: 'skip',
          data: { message: '알값 요율이 설정되지 않았습니다 (알값/정책 탭에서 설정해주세요)' },
        };
      }

      // 기간 GGR: 테스트 시나리오 기간의 입출금 집계 (기존 마진 표시용)
      const [depAgg, wdrAgg] = await Promise.all([
        this.prisma.walletRequest.aggregate({
          where: {
            platformId,
            type: WalletRequestType.DEPOSIT,
            status: WalletRequestStatus.APPROVED,
          },
          _sum: { amount: true },
        }),
        this.prisma.walletRequest.aggregate({
          where: {
            platformId,
            type: WalletRequestType.WITHDRAWAL,
            status: WalletRequestStatus.APPROVED,
          },
          _sum: { amount: true },
        }),
      ]);

      const dep = depAgg._sum.amount?.toNumber() ?? 0;
      const wdr = wdrAgg._sum.amount?.toNumber() ?? 0;
      const ggr = dep - wdr;

      // 알 가상 복구 로직용: ledger BET / WIN 실제 합계 — **카지노 계열만** (스포츠 제외).
      // Prisma JSON 필터는 `in` 미지원이라 버티컬별로 합산 후 누적한다.
      // (stake = 낙첨 원금, win = 승리 금액)
      const casinoVerticals = ['casino', 'slot', 'minigame'];
      const perVertical = await Promise.all(
        casinoVerticals.map(async (vertical) => {
          const [betAgg, winAgg] = await Promise.all([
            this.prisma.ledgerEntry.aggregate({
              where: {
                platformId,
                type: LedgerEntryType.BET,
                metaJson: { path: ['vertical'], equals: vertical },
              },
              _sum: { amount: true },
            }),
            this.prisma.ledgerEntry.aggregate({
              where: {
                platformId,
                type: LedgerEntryType.WIN,
                metaJson: { path: ['vertical'], equals: vertical },
              },
              _sum: { amount: true },
            }),
          ]);
          return {
            stake: Math.abs(betAgg._sum?.amount?.toNumber() ?? 0),
            win: winAgg._sum?.amount?.toNumber() ?? 0,
          };
        }),
      );
      const stakeSum = perVertical.reduce((a, b) => a + b.stake, 0);
      const winSum = perVertical.reduce((a, b) => a + b.win, 0);

      const upstreamCostKrw = Math.round((ggr * upstreamPct) / 100);
      const platformChargeKrw = Math.round((ggr * platformPct) / 100);
      const marginKrw = platformChargeKrw - upstreamCostKrw;

      const reference = `testscenario:creditsim:${platformId}`;

      // 기존 테스트 크레딧 항목 삭제 (재실행 허용)
      // 동시에 이전 실행의 reserve 로그도 함께 정리하여 깨끗한 상태로 다시 시뮬레이션.
      await this.prisma.hqVendorDeposit.deleteMany({
        where: { note: reference },
      });
      const oldRequests = await this.prisma.platformCreditRequest.findMany({
        where: { platformId, requesterNote: reference },
        select: { id: true, approvedAmountKrw: true },
      });
      const oldCreditAmount = oldRequests.reduce(
        (acc, r) => acc.plus(r.approvedAmountKrw ?? 0),
        new Prisma.Decimal(0),
      );
      await this.prisma.platformCreditRequest.deleteMany({
        where: { platformId, requesterNote: reference },
      });
      // 이전 회차가 "시뮬용 상한 확보" 로 부풀려 놓은 delta 를 읽어서 정확히 되돌린다.
      // 이 delta 는 아래 [1b] 에서 `${reference}:sim_bump` eventKey 의 ADJUST 로그로 기록된다.
      const priorBump = await this.prisma.platformReserveLog.findUnique({
        where: { eventKey: `${reference}:sim_bump` },
        select: {
          baseAmount: true, // = initial 증분
          changedAmount: true, // = balance 실제 증분
        },
      });
      await this.prisma.platformReserveLog.deleteMany({
        where: {
          platformId,
          eventKey: { startsWith: `${reference}:` },
        },
      });
      // 재실행 클린업: 이전 회차가 덧붙인 정산용 creditRequest 증분 + 시뮬 headroom 증분을
      // 모두 빼고, 잔액이 음수가 되지 않도록 0 하한 + balance<=initial 불변식을 유지.
      const cur = await this.prisma.platform.findUnique({
        where: { id: platformId },
        select: { creditBalance: true, reserveInitialAmount: true },
      });
      if (cur) {
        const zero = new Prisma.Decimal(0);
        const priorInitialBump = priorBump?.baseAmount ?? zero;
        const priorBalanceBump = priorBump?.changedAmount ?? zero;
        const removeFromInitial = oldCreditAmount.plus(priorInitialBump);
        const removeFromBalance = oldCreditAmount.plus(priorBalanceBump);
        const rawInitial = cur.reserveInitialAmount.minus(removeFromInitial);
        const rawBalance = cur.creditBalance.minus(removeFromBalance);
        const nextInitial = rawInitial.lt(zero) ? zero : rawInitial;
        let nextBalance = rawBalance.lt(zero) ? zero : rawBalance;
        if (nextBalance.gt(nextInitial)) nextBalance = nextInitial;
        if (
          !nextInitial.eq(cur.reserveInitialAmount) ||
          !nextBalance.eq(cur.creditBalance)
        ) {
          await this.prisma.platform.update({
            where: { id: platformId },
            data: {
              creditBalance: nextBalance,
              reserveInitialAmount: nextInitial,
            },
          });
        }
      }

      // 본사 상위 원가 납입 시뮬
      const superAdmin = await this.prisma.user.findFirst({
        where: { role: UserRole.SUPER_ADMIN },
        select: { id: true },
      });
      if (upstreamCostKrw > 0 && superAdmin) {
        await this.prisma.hqVendorDeposit.create({
          data: {
            amountKrw: new Prisma.Decimal(upstreamCostKrw),
            note: reference,
            createdByUserId: superAdmin.id,
          },
        });
      }

      /**
       * 전체 알(크레딧) flow 시뮬레이션 (v2 — 가상 복구 로직 통합):
       * 1) platformChargeKrw 만큼 크레딧 요청 생성 + 승인 → creditBalance & reserveInitialAmount 증가
       * 2) 유저 낙첨(stake) * rate 만큼 DEDUCT → 알 잔액 차감 + 로그
       * 3) restoreEnabled=true 면 유저 승리(win) * rate 만큼 RESTORE → 가상 복구 + 로그
       *
       * 결과적으로 관리자 화면에는:
       *   - 최초 충전 (reserveInitialAmount)
       *   - 현재 잔액 (creditBalance)
       *   - 오늘 차감/복구 합계 + 건수
       *   - 변동 로그 목록
       * 가 모두 노출된다.
       */
      const rate = platformPct > 0 ? platformPct / 100 : 0;
      let deductResult: Awaited<ReturnType<ReserveBalanceService['deduct']>> | null = null;
      let restoreResult: Awaited<ReturnType<ReserveBalanceService['restore']>> | null = null;

      // ── 알 시뮬용 한도(reserveInitialAmount) 계산 ──────────────────────────
      // platformChargeKrw(= GGR × rate) 는 "정산 청구 금액" 기준이라 stake × rate 보다 작을 수 있다.
      // 그대로 상한으로 쓰면 DEDUCT 한 번에 0 까지 찍혀서 이후 RESTORE 도 0 → 0 으로 보이게 된다.
      // 테스트 시나리오에서는 DEDUCT(stake × rate) 는 물론, RESTORE 여유까지 확보해야
      // 관리자 UI 에 "원금 + 실제 적용 + 잔액 변화" 가 또렷이 나타난다.
      //   후보 1: stake × rate       (= DEDUCT 최대)
      //   후보 2: win × rate         (= RESTORE 최대)
      //   후보 3: platformChargeKrw  (= 실제 정산 금액)
      // 셋 중 최대값을 상한으로 잡는다. 정산 청구 금액(platformChargeKrw)을 초과하는 부분은
      // "시뮬 headroom bump" 로 별도 ADJUST 로그에 기록 → 재실행 시 정확히 되돌림.
      const dedSim = Math.round(stakeSum * rate);
      const resSim = Math.round(winSum * rate);
      const targetInitial = Math.max(dedSim, resSim, platformChargeKrw, 0);
      const simBumpDelta = Math.max(0, targetInitial - platformChargeKrw);

      if (platformChargeKrw > 0 || simBumpDelta > 0) {
        await this.prisma.$transaction(async (tx) => {
          // [1a] 알 구매 요청(실제 정산 금액 기준) — 기존 정산/마진 리포트 유지.
          if (platformChargeKrw > 0) {
            await tx.platformCreditRequest.create({
              data: {
                platformId,
                requestedAmountKrw: new Prisma.Decimal(platformChargeKrw),
                approvedAmountKrw: new Prisma.Decimal(platformChargeKrw),
                requesterNote: reference,
                status: 'APPROVED',
                resolvedAt: new Date(),
              },
            });
            await tx.platform.update({
              where: { id: platformId },
              data: {
                creditBalance: {
                  increment: new Prisma.Decimal(platformChargeKrw),
                },
                reserveInitialAmount: {
                  increment: new Prisma.Decimal(platformChargeKrw),
                },
              },
            });
          }

          // [1b] 시뮬용 headroom bump: initial 과 balance 를 동일 크기로 끌어올려
          //      DEDUCT / RESTORE 가 자연스럽게 발생하도록 한다. delta 는 ADJUST 로그로 기록.
          if (simBumpDelta > 0) {
            const cur = await tx.platform.findUnique({
              where: { id: platformId },
              select: { creditBalance: true, reserveInitialAmount: true },
            });
            if (cur) {
              const bumpDec = new Prisma.Decimal(simBumpDelta);
              const nextInitial = cur.reserveInitialAmount.plus(bumpDec);
              const nextBalance = cur.creditBalance.plus(bumpDec);
              await tx.platform.update({
                where: { id: platformId },
                data: {
                  reserveInitialAmount: nextInitial,
                  creditBalance: nextBalance,
                },
              });
              await tx.platformReserveLog.create({
                data: {
                  platformId,
                  type: 'ADJUST',
                  eventKey: `${reference}:sim_bump`,
                  baseAmount: bumpDec, // = initial 증분
                  rate: new Prisma.Decimal(0),
                  computedAmount: bumpDec,
                  changedAmount: bumpDec, // = balance 실제 증분
                  balanceBefore: cur.creditBalance,
                  balanceAfter: nextBalance,
                  initialAmount: nextInitial,
                  note: `test-scenario: 시뮬 상한 확보 +${simBumpDelta.toLocaleString()} (DEDUCT/RESTORE 흡수용)`,
                },
              });
            }
          }

          // [1c] 정산 금액만 충전됐는데 balance < initial 인 상태라면
          //      balance 를 initial 까지 끌어올려 "가득 찬 상태" 로 시작.
          const after = await tx.platform.findUnique({
            where: { id: platformId },
            select: { creditBalance: true, reserveInitialAmount: true },
          });
          if (
            after &&
            after.creditBalance.lt(after.reserveInitialAmount)
          ) {
            await tx.platform.update({
              where: { id: platformId },
              data: { creditBalance: after.reserveInitialAmount },
            });
          }
        });
      }

      // [2] DEDUCT / RESTORE 를 **베팅 한 건씩** 적용 — 실시간 처리와 동일한 1 entry = 1 log 원칙.
      //     카지노 계열(`casino|slot|minigame`) LedgerEntry 를 개별 조회해서 각각 이벤트화한다.
      //     - eventKey 는 entry.id 기반으로 고유 → 재실행 시 reference prefix 삭제 로직과 맞물려 깨끗이 재계산.
      //     - 집계값(deductTotal / restoreTotal)은 관리자 화면 상단 카드용.
      let deductTotal = new Prisma.Decimal(0);
      let restoreTotal = new Prisma.Decimal(0);
      let deductCount = 0;
      let restoreCount = 0;

      if (rate > 0) {
        const betEntries = await this.prisma.ledgerEntry.findMany({
          where: {
            platformId,
            type: LedgerEntryType.BET,
            OR: casinoVerticals.map((v) => ({
              metaJson: { path: ['vertical'], equals: v },
            })),
          },
          select: {
            id: true,
            userId: true,
            amount: true,
            reference: true,
            metaJson: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        for (const e of betEntries) {
          const base = e.amount.isNegative()
            ? e.amount.negated()
            : e.amount;
          if (base.lte(0)) continue;
          const r = await this.reserve.deduct(platformId, {
            baseAmount: base,
            rate,
            relatedUserId: e.userId,
            relatedBetId: e.reference ?? e.id,
            eventKey: `${reference}:bet:${e.id}`,
            note: `베팅 ${base.toString()}원 낙첨분 × ${(rate * 100).toFixed(2)}%`,
          });
          if (r?.changedAmount) {
            deductTotal = deductTotal.plus(r.changedAmount);
            if (!r.idempotent) deductCount += 1;
          }
          deductResult = r; // 최종 1건 유지 (UI 하위 호환)
        }

        const winEntries = await this.prisma.ledgerEntry.findMany({
          where: {
            platformId,
            type: LedgerEntryType.WIN,
            OR: casinoVerticals.map((v) => ({
              metaJson: { path: ['vertical'], equals: v },
            })),
          },
          select: {
            id: true,
            userId: true,
            amount: true,
            reference: true,
            metaJson: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        for (const e of winEntries) {
          const base = e.amount.isNegative() ? e.amount.negated() : e.amount;
          if (base.lte(0)) continue;
          const r = await this.reserve.restore(platformId, {
            baseAmount: base,
            rate,
            relatedUserId: e.userId,
            relatedBetId: e.reference ?? e.id,
            eventKey: `${reference}:win:${e.id}`,
            note: `베팅 ${base.toString()}원 승리분 × ${(rate * 100).toFixed(2)}%`,
          });
          if (r?.changedAmount) {
            restoreTotal = restoreTotal.plus(r.changedAmount);
            if (!r.idempotent) restoreCount += 1;
          }
          restoreResult = r;
        }
      }

      const reserveSummary = await this.reserve.getSummary(platformId);

      return {
        step: 10,
        name: 'CREDIT_SIM',
        status: 'ok',
        data: {
          platform: platform.name,
          ggr,
          upstreamPct,
          platformPct,
          upstreamCostKrw,
          platformChargeKrw,
          marginKrw,
          stake: stakeSum,
          win: winSum,
          reserve: {
            restoreEnabled: reserveSummary.restoreEnabled,
            initialAmount: reserveSummary.initialAmount,
            currentAmount: reserveSummary.currentAmount,
            todayDeduct: reserveSummary.todayDeductAmount,
            todayRestore: reserveSummary.todayRestoreAmount,
            todayNetChange: reserveSummary.todayNetChange,
            // 마지막 1건 (하위 호환) + 베팅별 집계
            deductApplied: deductResult?.changedAmount ?? '0.00',
            restoreApplied: restoreResult?.changedAmount ?? '0.00',
            deductTotal: deductTotal.toFixed(2),
            restoreTotal: restoreTotal.toFixed(2),
            deductCount,
            restoreCount,
          },
          message:
            `GGR ${ggr.toLocaleString()}원 · 베팅 ${deductCount}건 낙첨분 차감(합계 ${deductTotal.toFixed(0)}) / ` +
            `${restoreCount}건 승리분 복구(합계 ${restoreTotal.toFixed(0)}) ` +
            `(${reserveSummary.restoreEnabled ? '복구 ON' : '복구 OFF'}) / 현재 잔액 ${reserveSummary.currentAmount}`,
        },
      };
    } catch (e) {
      return {
        step: 10,
        name: 'CREDIT_SIM',
        status: 'error',
        error: String(e),
      };
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
    } else {
      // 재실행 시: 요율·부모 관계를 항상 최신 설정으로 업데이트
      agent = await this.prisma.user.update({
        where: { id: agent.id },
        data: {
          agentPlatformSharePct: data.agentPlatformSharePct,
          agentSplitFromParentPct: data.agentSplitFromParentPct,
          parentUserId: data.parentUserId,
        },
      });
      await this.prisma.agentCommissionRevision.create({
        data: {
          userId: agent.id,
          agentPlatformSharePct: data.agentPlatformSharePct ?? new Prisma.Decimal(0),
          agentSplitFromParentPct: data.agentSplitFromParentPct ?? new Prisma.Decimal(0),
          effectiveFrom: new Date(),
        },
      });
      // 재실행 시: 이전 커미션 원장 및 지갑 잔액도 초기화 (유저와 동일하게)
      await this.prisma.ledgerEntry.deleteMany({ where: { userId: agent.id } });
      const existingWallet = await this.prisma.wallet.findUnique({ where: { userId: agent.id } });
      if (existingWallet) {
        await this.prisma.wallet.update({
          where: { id: existingWallet.id },
          data: {
            balance: new Prisma.Decimal(0),
            lockedDeposit: new Prisma.Decimal(0),
            lockedWin: new Prisma.Decimal(0),
            compFree: new Prisma.Decimal(0),
            pointFree: new Prisma.Decimal(0),
            pointBalance: new Prisma.Decimal(0),
          },
        });
      } else {
        await this.prisma.wallet.create({ data: { userId: agent.id, platformId, balance: new Prisma.Decimal(0), pointBalance: new Prisma.Decimal(0) } });
      }
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
        await this.prisma.wallet.update({
          where: { id: existingWallet.id },
          data: {
            balance: new Prisma.Decimal(0),
            lockedDeposit: new Prisma.Decimal(0),
            lockedWin: new Prisma.Decimal(0),
            compFree: new Prisma.Decimal(0),
            pointFree: new Prisma.Decimal(0),
            pointBalance: new Prisma.Decimal(0),
          },
        });
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

    const parentByUserId = new Map<string, string | null>(
      allTestUsers.map((x) => [x.id, x.parentUserId ?? null]),
    );
    const roleById = new Map(allTestUsers.map((x) => [x.id, x.role]));
    for (;;) {
      const missing = new Set<string>();
      for (const pid of parentByUserId.values()) {
        if (pid != null && !parentByUserId.has(pid)) missing.add(pid);
      }
      if (missing.size === 0) break;
      const chainRows = await this.prisma.user.findMany({
        where: { platformId, id: { in: [...missing] } },
        select: { id: true, parentUserId: true, role: true },
      });
      const found = new Set(chainRows.map((r) => r.id));
      for (const id of missing) {
        if (!found.has(id)) parentByUserId.set(id, null);
      }
      for (const r of chainRows) {
        parentByUserId.set(r.id, r.parentUserId ?? null);
        roleById.set(r.id, r.role);
      }
    }

    const testMasterNodes = allTestUsers
      .filter((x) => x.role === UserRole.MASTER_AGENT)
      .map((x) => ({
        id: x.id,
        parentUserId: x.parentUserId ?? null,
        agentPlatformSharePct:
          x.agentPlatformSharePct != null ? Number(x.agentPlatformSharePct) : null,
        agentSplitFromParentPct:
          x.agentSplitFromParentPct != null ? Number(x.agentSplitFromParentPct) : null,
      }));
    const effectiveAgentShareMap = computeEffectiveAgentShares(
      testMasterNodes,
      roleById,
      (uid) => parentByUserId.get(uid) ?? null,
    );

    const metaNote = (meta: Record<string, unknown> | null | undefined): string | null => {
      const raw = meta?.note;
      if (raw == null) return null;
      if (typeof raw === 'string') return raw;
      try {
        return JSON.stringify(raw);
      } catch {
        return String(raw);
      }
    };

    const iso = (d: Date) => d.toISOString();

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
              balance: Number(u.wallet.balance ?? 0),
              pointBalance: Number(u.wallet.pointBalance ?? 0),
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
        agentCommission:
          u.role === UserRole.MASTER_AGENT
            ? {
                platformSharePct:
                  u.agentPlatformSharePct != null ? Number(u.agentPlatformSharePct) : null,
                splitFromParentPct:
                  u.agentSplitFromParentPct != null ? Number(u.agentSplitFromParentPct) : null,
                effectiveSharePct:
                  Math.round((effectiveAgentShareMap.get(u.id) ?? 0) * 1e4) / 1e4,
              }
            : null,
        ledger: (() => {
          // BET+WIN 쌍으로 묶어서 "당첨/낙첨" 표기용 betting rows 생성
          const bets = userLedger.filter((l) => l.type === LedgerEntryType.BET);
          const wins = userLedger.filter((l) => l.type === LedgerEntryType.WIN);
          const winMap = new Map(wins.map((w) => [w.reference ?? w.id, w]));
          const betRows = bets.map((b) => {
            const win = b.reference ? winMap.get(b.reference) : undefined;
            const betAmt = Math.abs(Number(b.amount ?? 0));
            const winAmt = win ? Number(win.amount ?? 0) : 0;
            const isWin = winAmt > 0;
            const meta = (b.metaJson as Record<string, unknown> | null) ?? {};
            return {
              id: b.id,
              type: b.type,
              result: isWin ? '당첨' : '낙첨',
              betAmount: betAmt,
              winAmount: winAmt,
              netResult: winAmt - betAmt,
              balanceAfter: Number(
                win ? (win.balanceAfter ?? 0) : (b.balanceAfter ?? 0),
              ),
              vertical: String(meta.vertical ?? '').toLowerCase() || null,
              gameType: String(meta.gameType ?? '').trim() || null,
              sport: meta.sport ? String(meta.sport) : null,
              matchType: meta.matchType ? String(meta.matchType) : null,
              note: metaNote(b.metaJson as Record<string, unknown> | null),
              createdAt: iso(b.createdAt),
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
            netResult: Number(l.amount ?? 0),
            balanceAfter: Number(l.balanceAfter ?? 0),
            note: metaNote(l.metaJson as Record<string, unknown> | null),
            createdAt: iso(l.createdAt),
          }));
          return [...betRows, ...others].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        })(),
        gameSummary: (() => {
          // 유저별 vertical × gameType 집계
          const acc = new Map<string, { betStake: number; win: number }>();
          const key = (v: string, g: string) => `${v}::${g}`;
          for (const l of userLedger) {
            const meta = (l.metaJson as Record<string, unknown> | null) ?? {};
            const v = String(meta.vertical ?? '').toLowerCase() || 'unknown';
            const g = String(meta.gameType ?? '').trim() || '';
            const k = key(v, g);
            if (!acc.has(k)) acc.set(k, { betStake: 0, win: 0 });
            const a = acc.get(k)!;
            if (l.type === LedgerEntryType.BET) a.betStake += Math.abs(Number(l.amount));
            if (l.type === LedgerEntryType.WIN) a.win += Number(l.amount);
          }
          return [...acc.entries()].map(([k, a]) => {
            const [vertical, gameType] = k.split('::');
            return {
              vertical,
              gameType: gameType || null,
              betStake: Number(a.betStake.toFixed(2)),
              win: Number(a.win.toFixed(2)),
              ggr: Number((a.betStake - a.win).toFixed(2)),
            };
          }).sort((a, b) => b.betStake - a.betStake);
        })(),
        walletRequests: userRequests.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          amount: Number(r.amount ?? 0),
          currency: r.currency ?? 'KRW',
          depositorName: r.depositorName ?? null,
          note: r.note ?? null,
          createdAt: iso(r.createdAt),
          processedAt: r.resolvedAt ? iso(r.resolvedAt) : null,
        })),
        usdtTxs: userUsdtTxs.map((t) => ({
          id: t.id,
          txHash: t.txHash,
          usdtAmount: Number(t.usdtAmount ?? 0),
          krwAmount: t.krwAmount != null ? Number(t.krwAmount) : null,
          status: t.status,
          note: t.resolverNote ?? null,
          createdAt: iso(t.createdAt),
        })),
        rolling: userRolling.map((r) => ({
          id: r.id,
          required: Number(r.requiredTurnover ?? 0),
          accumulated: Number(r.appliedTurnover ?? 0),
          fulfilled: r.satisfiedAt !== null,
          createdAt: iso(r.createdAt),
        })),
        points: userPoints.map((p) => ({
          id: p.id,
          delta: Number(p.amount ?? 0),
          reason: p.reference ?? null,
          createdAt: iso(p.createdAt),
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

  /**
   * 배팅 GGR 즉시 에이전트 커미션 처리 — 전체 체인 지급 모델
   *
   * roundGgr = stake - win
   *   양수(낙첨): 각 에이전트에 순 요율(net)만큼 즉시 적립
   *   음수(당첨): 각 에이전트에서 순 요율만큼 차감 (잔액 0 하한)
   *
   * 플랫폼 총 지출 = 최상위 요율 × roundGgr 만큼만.
   */
  private async creditAgentOnBetGgr(
    tx: Prisma.TransactionClient,
    platformId: string,
    memberId: string,
    roundGgr: Prisma.Decimal,
    betReference: string,
  ): Promise<void> {
    try {
      // 낙첨(유저 패배, GGR > 0)일 때만 즉시 지급
      // 적중(유저 승리, GGR < 0)은 에이전트에서 차감하지 않음
      if (roundGgr.lte(0)) return;

      // 1. 유저부터 위로 MASTER_AGENT 체인 수집 [직속부모, ..., 최상위]
      const chain: string[] = [];
      const memberRow = await tx.user.findUnique({ where: { id: memberId }, select: { parentUserId: true } });
      if (!memberRow?.parentUserId) return;
      let cur: string | null = memberRow.parentUserId;
      const seen = new Set<string>();
      while (cur) {
        if (seen.has(cur)) break;
        seen.add(cur);
        const row: { role: UserRole; parentUserId: string | null } | null =
          await tx.user.findFirst({ where: { id: cur, platformId }, select: { role: true, parentUserId: true } });
        if (!row) break;
        if (row.role === UserRole.MASTER_AGENT) chain.push(cur);
        cur = row.parentUserId;
      }
      if (chain.length === 0) return;

      // 2. 플랫폼 전체 MASTER_AGENT 실효 요율 맵
      const agents = await tx.user.findMany({
        where: { platformId, role: UserRole.MASTER_AGENT },
        select: { id: true, parentUserId: true, role: true, agentPlatformSharePct: true, agentSplitFromParentPct: true },
      });
      const roleById = new Map<string, UserRole>(agents.map((a) => [a.id, a.role]));
      const parentById = new Map<string, string | null>(agents.map((a) => [a.id, a.parentUserId]));
      const nodes = agents.map((a) => ({
        id: a.id,
        parentUserId: a.parentUserId,
        agentPlatformSharePct: a.agentPlatformSharePct != null ? Number(a.agentPlatformSharePct) : null,
        agentSplitFromParentPct: a.agentSplitFromParentPct != null ? Number(a.agentSplitFromParentPct) : null,
      }));
      const effMap = computeEffectiveAgentShares(nodes, roleById, (uid) => parentById.get(uid) ?? null);

      // 3. 체인 순서대로 순 요율만큼 적립/차감
      for (let i = 0; i < chain.length; i++) {
        const agentId = chain[i];
        const myEff = effMap.get(agentId) ?? 0;
        const childEff = i > 0 ? (effMap.get(chain[i - 1]) ?? 0) : 0;
        const netPct = myEff - childEff;
        if (netPct <= 0) continue;

        const commission = roundGgr.times(new Prisma.Decimal(netPct).div(100));
        if (commission.isZero()) continue;

        const agentWallet = await tx.wallet.findUnique({ where: { userId: agentId } });
        if (!agentWallet) continue;

        let agentDelta: Prisma.Decimal;
        if (commission.gt(0)) {
          agentDelta = commission;
        } else {
          // 하우스 손실(유저 당첨)시 차감, 잔액 0 하한
          agentDelta = agentWallet.balance.plus(commission).gte(0)
            ? commission
            : agentWallet.balance.negated();
        }

        const awb = pickBucketState(agentWallet);
        let nextAgent;
        if (agentDelta.gt(0)) {
          nextAgent = this.buckets.creditLockedDeposit(awb, agentDelta);
        } else {
          const take = agentDelta.abs();
          this.buckets.assertSufficientTotal(awb, take);
          nextAgent = this.buckets.applyWithdraw(awb, take);
        }
        const { balance: newBal } = await this.buckets.persist(
          tx,
          agentWallet.id,
          nextAgent,
        );
        await tx.ledgerEntry.create({
          data: {
            userId: agentId,
            platformId,
            type: LedgerEntryType.ADJUSTMENT,
            amount: agentDelta,
            balanceAfter: newBal,
            reference: `agent_bet_commission:${betReference}:lv${i}`,
            metaJson: {
              agentBetCommission: true,
              memberId,
              roundGgr: roundGgr.toFixed(2),
              effectiveRate: myEff,
              netRate: netPct,
              chainLevel: i,
              commission: agentDelta.toFixed(2),
            },
          },
        });
      }
    } catch {
      // 커미션 실패는 본 거래를 롤백하지 않음 (silent)
    }
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
    await this.prisma.pointRedeemLog.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.compSettlementLedgerLog.deleteMany({
      where: { userId: { in: ids } },
    });
    await this.prisma.walletTransaction.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.agentCommissionRevision.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.rollingRateRevision.deleteMany({ where: { userId: { in: ids } } });
    await this.prisma.user.deleteMany({ where: { id: { in: ids } } });

    return { deleted: ids.length, message: `테스트 데이터 ${ids.length}명 삭제 완료` };
  }
}
