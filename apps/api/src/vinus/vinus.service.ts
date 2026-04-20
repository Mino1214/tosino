import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LedgerEntryType,
  Prisma,
  RegistrationStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RollingObligationService } from '../rolling/rolling-obligation.service';
import { PointsService } from '../points/points.service';
import { ReserveBalanceService } from '../reserve-balance/reserve-balance.service';
import type { VinusLaunchDto } from './dto/vinus-launch.dto';
import {
  resolveLedgerVerticalFromVinus,
  withLedgerVerticalMeta,
} from './vinus-ledger-vertical.util';
import {
  pickBucketState,
  WalletBucketsService,
} from '../wallet-buckets/wallet-buckets.service';

/** 문서: 15~25자 토큰 (랜덤 + 시간 일부). 0/O·1/I/l 등 헷갈리는 문자 제외 */
function generateVinusToken(): string {
  const pattern =
    '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 12; i++) {
    s += pattern[Math.floor(Math.random() * pattern.length)];
  }
  s += String(Date.now()).slice(-8);
  if (s.length < 15 || s.length > 25) {
    return s.slice(0, 25);
  }
  return s;
}

function toDec(v: unknown): Prisma.Decimal | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number' && !Number.isFinite(v)) return null;
  try {
    return new Prisma.Decimal(String(v));
  } catch {
    return null;
  }
}

/** transaction_id·req_id 등 벤더가 문자열/숫자 혼용 시 */
function vinusStrId(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(v);
  }
  if (typeof v === 'string') {
    return v.replace(/\s/g, '');
  }
  return String(v).replace(/\s/g, '');
}

/** BT1 등: user_id가 빈 값이거나 UserId·member_id 등 다른 키로만 올 때 */
function coerceVinusUserIdFromPayload(
  data: Record<string, unknown>,
  raw: Record<string, unknown>,
): void {
  if (vinusStrId(data.user_id)) {
    data.user_id = vinusStrId(data.user_id);
    return;
  }
  const pools: Record<string, unknown>[] = [data];
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    pools.push(raw.data as Record<string, unknown>);
  }
  pools.push(raw);
  for (const obj of pools) {
    for (const k of Object.keys(obj)) {
      const compact = k.replace(/[\s_-]/g, '').toLowerCase();
      if (compact === 'userid' || compact === 'memberid') {
        const s = vinusStrId(obj[k]);
        if (s) {
          data.user_id = s;
          return;
        }
      }
    }
  }
}

/** reserve_id 키 누락·ReserveId·reservation_id 등 */
function coerceVinusReserveIdFromPayload(
  data: Record<string, unknown>,
  raw: Record<string, unknown>,
): void {
  const cur = vinusStrId(data.reserve_id);
  if (cur) {
    data.reserve_id = cur;
    return;
  }
  const pools: Record<string, unknown>[] = [data];
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    pools.push(raw.data as Record<string, unknown>);
  }
  pools.push(raw);
  for (const obj of pools) {
    for (const k of Object.keys(obj)) {
      const compact = k.replace(/[\s_-]/g, '').toLowerCase();
      if (
        compact === 'reserveid' ||
        compact === 'reservationid' ||
        compact === 'bookingid'
      ) {
        const s = vinusStrId(obj[k]);
        if (s) {
          data.reserve_id = s;
          return;
        }
      }
    }
  }
}

/** BT1 등: 확정 콜백에 reserve_id 없이 round_id·transaction_id 만 오는 경우 */
function coerceVinusReserveIdForCommitConfirm(
  command: string,
  data: Record<string, unknown>,
): void {
  if (command !== 'sports-bet-commit' && command !== 'sports-confirm') {
    return;
  }
  if (vinusStrId(data.reserve_id)) {
    return;
  }
  const fromRound = vinusStrId(data.round_id);
  if (fromRound) {
    data.reserve_id = fromRound;
    return;
  }
  const fromTid = vinusStrId(data.transaction_id);
  if (fromTid) {
    data.reserve_id = fromTid;
  }
}

function nickForVinus(displayName: string | null, loginId: string): string {
  const raw = (displayName?.trim() || loginId).slice(0, 25);
  return raw.length >= 2 ? raw : `${loginId}`.slice(0, 25).padEnd(2, '0');
}

/** 콜백 command 대소문자·공백·하이픈 정규화 ("w in" → win, bet-win ↔ betwin) */
function normalizeVinusCommand(rawCmd: unknown): string {
  const raw = String(rawCmd ?? '').trim().toLowerCase();
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, '').replace(/-/g, '');
  const m: Record<string, string> = {
    authenticate: 'authenticate',
    balance: 'balance',
    bet: 'bet',
    sportsbet: 'sports-bet',
    'sports-bet-change': 'sports-bet-change',
    sportsbetchange: 'sports-bet-change',
    betwin: 'bet-win',
    win: 'win',
    winadd: 'win-add',
    cancel: 'cancel',
    refund: 'refund',
    bonuswin: 'bonusWin',
    jackpotwin: 'jackpotWin',
    promowin: 'promoWin',
    bonus: 'bonus',
    confirm: 'confirm',
    sportsreserve: 'sports-reserve',
    sportsorder: 'sports-order',
    sportsconfirm: 'sports-confirm',
    /** 예약 베팅 확정 (BT1 sports-bet-commit): sports-confirm 과 동일 단계 */
    'sports-bet-commit': 'sports-bet-commit',
    sportsbetcommit: 'sports-bet-commit',
    /** 벤더 오타 conmit → commit */
    'sports-bet-conmit': 'sports-bet-commit',
    sportsbetconmit: 'sports-bet-commit',
    'sports-win': 'sports-win',
    sportswin: 'sports-win',
    /** 적중 후 금액 차감/조정 (BT1 sports-win-deduct) */
    'sports-win-deduct': 'sports-win-deduct',
    sportswindeduct: 'sports-win-deduct',
    /** 스포츠 베팅 취소 (BT1 sports-cancel) */
    'sports-cancel': 'sports-cancel',
    sportscancel: 'sports-cancel',
  };
  return m[raw] ?? m[compact] ?? raw;
}

/** data 객체 + JSON 루트에만 온 필드 병합 (벤더 페이로드 형태 차이) */
const VINUS_PAYLOAD_FIELDS_IN_DATA = [
  'token',
  'user_id',
  'transaction_id',
  'amount',
  'balance',
  'game_id',
  'round_id',
  'game_type',
  'game_sort',
  'vendor',
  'game',
  'bet',
  'win',
  'transfer',
  'bet_type',
  'req_id',
  'bet_count',
  'reserve_id',
  'original_transaction_id',
  /** 객체(JSON) — merge 시 별도 처리 */
  'bet_details',
  'bet_details_result',
] as const;

function asVinusCallbackRoot(input: unknown): Record<string, unknown> {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

/** 루트 키 앞뒤 공백만 다른 경우 (예: " command") → 표준 키로 복사 */
function normalizeVinusRootKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  const roots = new Set([
    'command',
    'check',
    'data',
    'timestamp',
    'transfer',
    'request_timestamp',
  ]);
  for (const k of Object.keys(raw)) {
    const t = k.trim();
    if (roots.has(t) && out[t] === undefined && raw[k] !== undefined) {
      out[t] = raw[k];
    }
  }
  /** timestap 등 벤더 오타 */
  if (out.timestamp === undefined || out.timestamp === null || out.timestamp === '') {
    for (const typo of ['timestap', 'timstamp', 'timesatmp', 'time_stamp']) {
      const v = raw[typo];
      if (typeof v === 'number' && Number.isFinite(v)) {
        out.timestamp = v;
        break;
      }
    }
  }
  return out;
}

/** 루트 command/check 벤더 오타·중첩 보정 (미인식 시 default→99 방지) */
function coerceVinusCallbackAliases(raw: Record<string, unknown>): void {
  const cmd = raw.command;
  if (
    cmd === undefined ||
    cmd === null ||
    (typeof cmd === 'string' && cmd.trim() === '')
  ) {
    for (const k of ['cormand', 'comand', 'commmand', 'conmand']) {
      const v = raw[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        raw.command = v;
        break;
      }
    }
  }
  if (
    raw.command === undefined ||
    raw.command === null ||
    (typeof raw.command === 'string' && raw.command.trim() === '')
  ) {
    const data = raw.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const d = data as Record<string, unknown>;
      for (const k of ['command', 'cormand', 'comand', 'commmand', 'conmand']) {
        const v = d[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          raw.command = v;
          break;
        }
      }
    }
  }
  const ck = raw.check;
  if (ck === undefined || ck === null || ck === '') {
    const data = raw.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const d = data as Record<string, unknown>;
      if (d.check !== undefined && d.check !== null && d.check !== '') {
        raw.check = d.check;
      }
    }
  }
}

/**
 * data 키에 끼는 공백·오타 보정 (JSON 키가 "game _id", "amoun t" 등일 때)
 * 공백 제거한 키명으로 표준 필드에 매핑
 */
function normalizeVinusDataKeys(data: Record<string, unknown>) {
  const byCompact: Record<string, string> = {
    token: 'token',
    user_id: 'user_id',
    userid: 'user_id',
    transaction_id: 'transaction_id',
    game_id: 'game_id',
    round_id: 'round_id',
    game_type: 'game_type',
    gametype: 'game_type',
    game_sort: 'game_sort',
    gamesort: 'game_sort',
    vendor: 'vendor',
    game: 'game',
    amount: 'amount',
    bet: 'bet',
    win: 'win',
    transfer: 'transfer',
    bet_type: 'bet_type',
    bettype: 'bet_type',
    req_id: 'req_id',
    reqid: 'req_id',
    request_id: 'req_id',
    requestid: 'req_id',
    bet_count: 'bet_count',
    betcount: 'bet_count',
    reserve_id: 'reserve_id',
    reserveid: 'reserve_id',
    original_transaction_id: 'original_transaction_id',
    originaltransactionid: 'original_transaction_id',
    bet_details_result: 'bet_details_result',
    betdetailsresult: 'bet_details_result',
    r: 'vendor',
    balance: 'balance',
  };
  const keys = Object.keys(data);
  for (const k of keys) {
    const compact = k.replace(/\s/g, '').toLowerCase();
    const canon = byCompact[compact];
    if (canon && data[canon] === undefined && data[k] !== undefined) {
      data[canon] = data[k];
    }
  }
  for (const k of [
    'user_id',
    'transaction_id',
    'game_id',
    'round_id',
    'token',
    'reserve_id',
    'original_transaction_id',
    'req_id',
  ]) {
    const v = data[k];
    if (typeof v === 'string') {
      data[k] = v.replace(/\s/g, '');
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      /** 벤더 JSON에서 id 필드를 숫자로 보내는 경우 */
      data[k] = String(v);
    }
  }
  for (const k of ['game', 'vendor', 'game_type', 'game_sort']) {
    if (typeof data[k] === 'string') {
      data[k] = (data[k] as string).trim();
    }
  }
}

function mergeVinusDataPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const nested =
    raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? { ...(raw.data as Record<string, unknown>) }
      : {};
  for (const k of VINUS_PAYLOAD_FIELDS_IN_DATA) {
    if (nested[k] === undefined && raw[k] !== undefined) {
      nested[k] = raw[k];
    }
  }
  /** data 안의 bet_details 가 루트에만 있을 때 등 보조 */
  if (
    nested.bet_details === undefined &&
    raw.data &&
    typeof raw.data === 'object' &&
    !Array.isArray(raw.data)
  ) {
    const d = raw.data as Record<string, unknown>;
    if (d.bet_details !== undefined) {
      nested.bet_details = d.bet_details;
    }
  }
  if (
    nested.bet_details_result === undefined &&
    raw.data &&
    typeof raw.data === 'object' &&
    !Array.isArray(raw.data)
  ) {
    const d = raw.data as Record<string, unknown>;
    if (d.bet_details_result !== undefined) {
      nested.bet_details_result = d.bet_details_result;
    }
  }
  return nested;
}

/** sports-win: bet_details_result.NewStatus → 적중/실패/적특/취소/조정 */
function parseSportsWinStatus(
  raw: unknown,
): 'won' | 'lost' | 'void' | 'cancel' | 'adjust' | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const s = String(o.NewStatus ?? o.newStatus ?? o.status ?? '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === 'won' || s === 'win') return 'won';
  if (s === 'lost' || s === 'lose' || s === 'loss') return 'lost';
  if (
    s === 'void' ||
    s === 'push' ||
    s === 'refund' ||
    s === 'tie' ||
    s === 'draw'
  ) {
    return 'void';
  }
  if (s === 'cancel' || s === 'cancelled' || s === 'canceled') {
    return 'cancel';
  }
  /** sports-win-deduct: 베팅 진행 중 금액 조정 (Opened / InPlay 등) */
  if (
    s === 'opened' ||
    s === 'open' ||
    s === 'inplay' ||
    s === 'in_play' ||
    s === 'pending' ||
    s === 'running' ||
    s === 'adjust' ||
    s === 'deduct'
  ) {
    return 'adjust';
  }
  return null;
}

/**
 * BT1 FAQ: transaction_id 앞/뒤 W 는 "결과 처리" 마커.
 * W12345(WIN TX) → "12345"(BET TX), 12345W(WIN TX) → "12345"(BET TX)
 */
function stripSportsWinTxMarker(tid: string): string {
  if (!tid) return tid;
  if (tid.length > 1 && (tid[0] === 'W' || tid[0] === 'w')) return tid.slice(1);
  if (tid.length > 1 && (tid[tid.length - 1] === 'W' || tid[tid.length - 1] === 'w')) return tid.slice(0, -1);
  return tid;
}

/** 벤더/전송 과정에서 토큰에 끼는 공백·줄바꿈 제거 */
function normalizeVinusTokenInData(data: Record<string, unknown>) {
  const t = data.token;
  if (typeof t === 'string') {
    data.token = t.replace(/\s/g, '');
  }
}

type VinusUserRow = {
  id: string;
  loginId: string;
  displayName: string | null;
  platformId: string | null;
  registrationStatus: RegistrationStatus;
  role: UserRole;
};

/** 스텁: 취소 가능한 거래 추적 (BET / WIN / bet-win) */
type VinusStubCancelRow =
  | { kind: 'bet'; stake: number; cancelled: boolean }
  | { kind: 'win'; payout: number; cancelled: boolean }
  | { kind: 'betwin'; bet: number; win: number; cancelled: boolean };

@Injectable()
export class VinusService {
  private readonly logger = new Logger(VinusService.name);

  /** 스텁: 멱등·잔액 시뮬 (프로세스 메모리, 재시작 시 초기화) */
  private stubWorkingBal: number | null = null;
  private stubTxEndingBalance = new Map<string, number>();
  /** win: transaction_id → 처리 후 잔액 (동일 tid 재요청 멱등) */
  private stubWinProcessed = new Map<string, number>();
  /** win-add: "tid:금액" → 처리 후 잔액 (동일 추가지급 재요청 멱등) */
  private stubWinAddIdem = new Map<string, number>();
  private stubCancelMeta = new Map<string, VinusStubCancelRow>();

  /** 스텁: 베팅 req_id → transaction_id (카지노 bet 스텁용) */
  private stubReqIdToBetTid = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private rolling: RollingObligationService,
    private points: PointsService,
    private reserve: ReserveBalanceService,
    private buckets: WalletBucketsService,
  ) {}

  private assertConfigured() {
    const key = this.config.get<string>('VINUS_AGENT_KEY')?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'Vinus 연동이 설정되지 않았습니다 (VINUS_AGENT_KEY).',
      );
    }
  }

  /** true / 1 / yes (대소문자 무관) */
  private envFlag(key: string): boolean {
    const v = this.config.get<string>(key)?.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }

  /** Vinus user_id: id 정확 일치 또는 loginId 대소문자 무시. 동일 loginId 다행 시 지갑 있는 행 우선. */
  private async findUserForVinus(uid: string): Promise<VinusUserRow | null> {
    const sel = {
      select: {
        id: true,
        loginId: true,
        displayName: true,
        platformId: true,
        registrationStatus: true,
        role: true,
      },
    };
    if (!uid) return null;
    const rows = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: uid },
          { loginId: { equals: uid, mode: 'insensitive' } },
        ],
      },
      ...sel,
      take: 25,
      orderBy: { updatedAt: 'desc' },
    });
    if (rows.length === 0) return null;
    if (rows.length === 1) return rows[0];
    const ranked = await Promise.all(
      rows.map(async (u) => {
        const w = await this.prisma.wallet.findUnique({
          where: { userId: u.id },
          select: { id: true },
        });
        return { u, hasWallet: !!w };
      }),
    );
    ranked.sort((a, b) => Number(b.hasWallet) - Number(a.hasWallet));
    return ranked[0].u;
  }

  /** 스텁 모드 공통 잔액 (authenticate·balance 동일) */
  private stubBalanceNumber(): number {
    const balRaw = this.config.get<string>('VINUS_STUB_BALANCE')?.trim();
    return Number(
      (balRaw !== undefined && balRaw !== ''
        ? parseFloat(balRaw)
        : 100000
      ).toFixed(2),
    );
  }

  /**
   * 벤더 연동 테스트용: 가능하면 DB 유저·지갑과 맞춰 user_id(cuid)·잔액 반환.
   * 그렇지 않으면 VINUS_STUB_* 고정값(스포츠 bet는 DB 경로로 이어지므로 DB 매칭 권장).
   */
  private async stubAuthenticateOk(): Promise<Record<string, unknown>> {
    const configured = (
      this.config.get<string>('VINUS_STUB_USER_ID')?.trim() || 'stub-user-dev'
    ).slice(0, 25);
    let userUsername = (
      this.config.get<string>('VINUS_STUB_USERNAME')?.trim() || 'stub_login'
    ).slice(0, 25);
    let userNickname = (
      this.config.get<string>('VINUS_STUB_NICKNAME')?.trim() || 'StubUser'
    ).slice(0, 25);
    const dbUser = await this.findUserForVinus(configured);
    let userId = (dbUser?.id ?? configured).slice(0, 25);
    if (dbUser) {
      userUsername = dbUser.loginId.slice(0, 25);
      userNickname = nickForVinus(
        dbUser.displayName,
        dbUser.loginId,
      ).slice(0, 25);
    }
    if (userUsername.length < 2) {
      userUsername = userUsername.padEnd(2, '0').slice(0, 25);
    }
    if (userNickname.length < 2) {
      userNickname = 'UU';
    }
    if (this.stubWorkingBal === null) {
      this.stubWorkingBal = this.stubBalanceNumber();
    }
    let balance = this.stubGetWorking();
    if (dbUser) {
      const w = await this.prisma.wallet.findUnique({
        where: { userId: dbUser.id },
      });
      if (w) {
        balance = Number(w.balance.toFixed(2));
        this.stubWorkingBal = balance;
      }
    }
    return {
      result: 0,
      status: 'OK',
      data: {
        user_id: userId,
        user_username: userUsername,
        user_nickname: userNickname,
        balance,
      },
    };
  }

  private resetStubWalletSimulation() {
    this.stubWorkingBal = null;
    this.stubTxEndingBalance.clear();
    this.stubWinProcessed.clear();
    this.stubWinAddIdem.clear();
    this.stubCancelMeta.clear();
    this.stubReqIdToBetTid.clear();
  }

  private stubGetWorking(): number {
    if (this.stubWorkingBal === null) {
      this.stubWorkingBal = this.stubBalanceNumber();
    }
    return this.stubWorkingBal;
  }

  /** 스텁: balance 명령 → 시뮬 잔액 (bet-win/bet 이후 반영) */
  private stubBalanceOk(): Record<string, unknown> {
    return {
      result: 0,
      status: 'OK',
      data: { balance: this.stubGetWorking() },
    };
  }

  /** 스텁: bet-win — 동일 transaction_id 재요청 시 잔액만 반환 (멱등) */
  private stubBetWinOk(data: Record<string, unknown>): Record<string, unknown> {
    const tid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    const bet = toDec(data.bet) ?? toDec(data.amount);
    const win = toDec(data.win);
    if (!tid || !bet || win === null) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    if (this.stubCancelMeta.get(tid)?.cancelled) {
      return {
        result: 41,
        status: 'ERROR',
        data: { balance: this.stubGetWorking() },
      };
    }
    const cached = this.stubTxEndingBalance.get(tid);
    if (cached !== undefined) {
      return { result: 0, status: 'OK', data: { balance: cached } };
    }
    const cur = new Prisma.Decimal(this.stubGetWorking());
    const newBal = Number(cur.minus(bet).plus(win).toFixed(2));
    this.stubTxEndingBalance.set(tid, newBal);
    this.stubWorkingBal = newBal;
    this.stubCancelMeta.set(tid, {
      kind: 'betwin',
      bet: Number(bet.toFixed(2)),
      win: Number(win.toFixed(2)),
      cancelled: false,
    });
    return { result: 0, status: 'OK', data: { balance: newBal } };
  }

  /** 스텁: bet — 동일 transaction_id 재요청 멱등 */
  private stubBetOk(data: Record<string, unknown>): Record<string, unknown> {
    const tid = vinusStrId(data.transaction_id);
    const amount = toDec(data.amount);
    if (!tid || !amount || amount.lte(0)) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    if (this.stubCancelMeta.get(tid)?.cancelled) {
      return {
        result: 41,
        status: 'ERROR',
        data: { balance: this.stubGetWorking() },
      };
    }
    const cached = this.stubTxEndingBalance.get(tid);
    if (cached !== undefined) {
      return { result: 0, status: 'OK', data: { balance: cached } };
    }
    const cur = new Prisma.Decimal(this.stubGetWorking());
    if (cur.lt(amount)) {
      return {
        result: 31,
        status: 'ERROR',
        data: { balance: Number(cur.toFixed(2)) },
      };
    }
    const newBal = Number(cur.minus(amount).toFixed(2));
    this.stubTxEndingBalance.set(tid, newBal);
    this.stubWorkingBal = newBal;
    this.stubCancelMeta.set(tid, {
      kind: 'bet',
      stake: Number(amount.toFixed(2)),
      cancelled: false,
    });
    const reqOnly = vinusStrId(data.req_id);
    if (reqOnly) {
      this.stubReqIdToBetTid.set(reqOnly, tid);
    }
    return { result: 0, status: 'OK', data: { balance: newBal } };
  }

  /** 스텁: win — 적중 금액만 가산, 동일 transaction_id 멱등 */
  private stubWinOk(data: Record<string, unknown>): Record<string, unknown> {
    const tid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    const amount = toDec(data.amount);
    if (!tid || amount === null) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const cached = this.stubWinProcessed.get(tid);
    if (cached !== undefined) {
      return { result: 0, status: 'OK', data: { balance: cached } };
    }
    const cur = new Prisma.Decimal(this.stubGetWorking());
    const newBal = Number(cur.plus(amount).toFixed(2));
    this.stubWinProcessed.set(tid, newBal);
    this.stubWorkingBal = newBal;
    this.stubCancelMeta.set(tid, {
      kind: 'win',
      payout: Number(amount.toFixed(2)),
      cancelled: false,
    });
    return { result: 0, status: 'OK', data: { balance: newBal } };
  }

  /** 스텁: win-add — 추가 지급, 동일 tid+금액 재요청 멱등 */
  private stubWinAddOk(data: Record<string, unknown>): Record<string, unknown> {
    const tid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    const amount = toDec(data.amount);
    if (!tid || amount === null || amount.lte(0)) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const idemKey = `${tid}:${amount.toFixed(2)}`;
    const cached = this.stubWinAddIdem.get(idemKey);
    if (cached !== undefined) {
      return { result: 0, status: 'OK', data: { balance: cached } };
    }
    const cur = new Prisma.Decimal(this.stubGetWorking());
    const newBal = Number(cur.plus(amount).toFixed(2));
    this.stubWinAddIdem.set(idemKey, newBal);
    this.stubWorkingBal = newBal;
    return { result: 0, status: 'OK', data: { balance: newBal } };
  }

  /** 스텁: cancel — BET(환급) / WIN(환수) / bet-win(순효과 역산), 동일 tid 재요청 멱등 */
  private stubCancelOk(data: Record<string, unknown>): Record<string, unknown> {
    const tid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    const uid = (
      this.config.get<string>('VINUS_STUB_USER_ID')?.trim() || 'stub-user-dev'
    )
      .replace(/\s/g, '')
      .slice(0, 25);
    if (!tid) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const row = this.stubCancelMeta.get(tid);
    if (!row) {
      return {
        result: 42,
        status: 'ERROR',
        data: { balance: this.stubGetWorking() },
      };
    }
    const okCancelBody = (bal: number) => ({
      result: 0,
      status: 'OK',
      data: {
        balance: bal,
        user_id: uid,
        transaction_id: tid,
        trasaction_id: tid,
      },
    });
    if (row.cancelled) {
      return okCancelBody(this.stubGetWorking());
    }
    let newBal = this.stubGetWorking();
    const d = new Prisma.Decimal(newBal);
    if (row.kind === 'bet') {
      newBal = Number(d.plus(row.stake).toFixed(2));
      this.stubTxEndingBalance.delete(tid);
    } else if (row.kind === 'win') {
      newBal = Number(d.minus(row.payout).toFixed(2));
      this.stubWinProcessed.delete(tid);
    } else {
      newBal = Number(d.plus(row.bet).minus(row.win).toFixed(2));
      this.stubTxEndingBalance.delete(tid);
    }
    row.cancelled = true;
    this.stubWorkingBal = newBal;
    return okCancelBody(newBal);
  }

  private get baseUrl(): string {
    return (
      this.config.get<string>('VINUS_GAME_BASE_URL')?.trim() ||
      'https://game.vinus-gaming.com'
    );
  }

  async launch(userId: string, platformId: string, dto: VinusLaunchDto) {
    this.assertConfigured();
    const agentKey = this.config.getOrThrow<string>('VINUS_AGENT_KEY').trim();

    const vendor = (dto.vendor ?? 'evolution').trim();
    const game = (dto.game ?? 'lobby').trim();
    const platform = dto.platform ?? 'WEB';
    /** 심리스만 사용 — 클라이언트 `method`는 무시 */
    const method = 'seamless';
    const lang = (dto.lang ?? 'ko').trim();

    const token = generateVinusToken();
    if (token.length < 15 || token.length > 25) {
      throw new BadRequestException('토큰 길이 생성 오류');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.vinusSessionToken.deleteMany({ where: { userId } });
      await tx.vinusSessionToken.create({
        data: { userId, platformId, token },
      });
    });

    const url = new URL('/game/play-game', this.baseUrl);
    url.searchParams.set('key', agentKey);
    url.searchParams.set('token', token);
    url.searchParams.set('game', game);
    url.searchParams.set('vendor', vendor);
    url.searchParams.set('platform', platform);
    url.searchParams.set('method', method);
    url.searchParams.set('lang', lang);

    const res = await fetch(url.toString(), { method: 'GET' });
    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Vinus 응답이 JSON이 아닙니다');
    }

    const result = json.result;
    if (result === 0 && typeof json.url === 'string') {
      return { url: json.url as string };
    }
    const msg =
      typeof json.message === 'string'
        ? json.message
        : `Vinus 오류 result=${String(result)}`;
    throw new BadRequestException(msg);
  }

  /** 예약 베팅: reserve_id·예약 금액·(선택) 주문 transaction_id 멱등 */
  private async sportsReserveProd(
    platformId: string,
    userId: string,
    data: Record<string, unknown>,
    fail: (code: number, balance?: Prisma.Decimal) => Record<string, unknown>,
    ok: (balance: Prisma.Decimal) => Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    const amt = toDec(data.amount);
    const orderTid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    if (!rid || !amt || amt.lte(0)) {
      return fail(99);
    }
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w) {
      return fail(99);
    }
    const existing = await this.prisma.sportsBetReservation.findUnique({
      where: { platformId_reserveId: { platformId, reserveId: rid } },
    });
    if (existing) {
      if (existing.userId !== userId) {
        return fail(99);
      }
      if (!existing.reservedAmount.eq(amt)) {
        return fail(99);
      }
      if (orderTid) {
        if (existing.orderIdempotencyKey === orderTid) {
          return ok(w.balance);
        }
        if (existing.orderIdempotencyKey) {
          return fail(99);
        }
        await this.prisma.sportsBetReservation.update({
          where: { id: existing.id },
          data: { orderIdempotencyKey: orderTid, status: 'ORDERED' },
        });
        const w2 = await this.prisma.wallet.findUnique({ where: { userId } });
        return ok(w2!.balance);
      }
      return ok(w.balance);
    }
    await this.prisma.sportsBetReservation.create({
      data: {
        platformId,
        userId,
        reserveId: rid,
        reservedAmount: amt,
        consumedAmount: new Prisma.Decimal(0),
        status: orderTid ? 'ORDERED' : 'PENDING',
        orderIdempotencyKey: orderTid || null,
      },
    });
    return ok(w.balance);
  }

  /** 예약 후 주문만 분리할 때: reserve_id + transaction_id(멱등) */
  private async sportsOrderProd(
    platformId: string,
    userId: string,
    data: Record<string, unknown>,
    fail: (code: number, balance?: Prisma.Decimal) => Record<string, unknown>,
    ok: (balance: Prisma.Decimal) => Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    const orderTid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    if (!rid || !orderTid) {
      return fail(99);
    }
    const existing = await this.prisma.sportsBetReservation.findUnique({
      where: { platformId_reserveId: { platformId, reserveId: rid } },
    });
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!existing || existing.userId !== userId || !w) {
      return fail(99);
    }
    if (existing.orderIdempotencyKey === orderTid) {
      return ok(w.balance);
    }
    if (existing.orderIdempotencyKey) {
      return fail(99);
    }
    await this.prisma.sportsBetReservation.update({
      where: { id: existing.id },
      data: { orderIdempotencyKey: orderTid, status: 'ORDERED' },
    });
    const w2 = await this.prisma.wallet.findUnique({ where: { userId } });
    return ok(w2!.balance);
  }

  private async sportsConfirmProd(
    platformId: string,
    userId: string,
    data: Record<string, unknown>,
    fail: (code: number, balance?: Prisma.Decimal) => Record<string, unknown>,
    ok: (balance: Prisma.Decimal) => Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const w0 = await this.prisma.wallet.findUnique({ where: { userId } });
    const balFail = w0?.balance ?? new Prisma.Decimal(0);
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    if (!rid) {
      return fail(99, balFail);
    }
    const existing = await this.prisma.sportsBetReservation.findUnique({
      where: { platformId_reserveId: { platformId, reserveId: rid } },
    });
    if (!existing || existing.userId !== userId || !w0) {
      return fail(99, balFail);
    }
    if (existing.status === 'CONFIRMED') {
      return ok(w0.balance);
    }
    await this.prisma.sportsBetReservation.update({
      where: { id: existing.id },
      data: { status: 'CONFIRMED' },
    });
    const w2 = await this.prisma.wallet.findUnique({ where: { userId } });
    return ok(w2!.balance);
  }

  /**
   * BT1 sports-bet-commit: 베팅이 스포츠북에 접수됐음을 알리는 확인 콜백.
   * amount=0, req_id='' 이 정상 — 금액 변동 없음.
   * reserve_id가 있으면 예약을 CONFIRMED로 두고, 없으면 현재 잔액을 그대로 OK.
   */
  private async sportsBetCommitProd(
    platformId: string,
    userId: string,
    data: Record<string, unknown>,
    ok: (balance: Prisma.Decimal) => Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    const bal = w?.balance ?? new Prisma.Decimal(0);

    const rid = vinusStrId(data.reserve_id);
    if (rid) {
      const res = await this.prisma.sportsBetReservation.findUnique({
        where: { platformId_reserveId: { platformId, reserveId: rid } },
      });
      if (res && res.userId === userId && res.status !== 'CONFIRMED') {
        await this.prisma.sportsBetReservation.update({
          where: { id: res.id },
          data: { status: 'CONFIRMED' },
        });
        const w2 = await this.prisma.wallet.findUnique({ where: { userId } });
        return ok(w2?.balance ?? bal);
      }
    }

    /** 예약 없어도(또는 이미 CONFIRMED) 현재 잔액으로 OK 반환 */
    return ok(bal);
  }

  /** 실제 베팅: reserve_id + req_id + amount, 합계 ≤ 예약 금액 */
  private async sportsBetWithReserveProd(
    platformId: string,
    userRow: VinusUserRow,
    data: Record<string, unknown>,
    timestamp: number | undefined,
    fail: (code: number, balance?: Prisma.Decimal) => Record<string, unknown>,
    ok: (balance: Prisma.Decimal) => Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rid = vinusStrId(data.reserve_id);
    const reqId = vinusStrId(data.req_id);
    const tid = vinusStrId(data.transaction_id);
    const amount = toDec(data.amount);
    if (!rid || !reqId || !tid || !amount || amount.lte(0)) {
      return fail(99);
    }

    const dupTx = await this.prisma.casinoVinusTx.findUnique({
      where: { externalId: tid },
    });
    if (dupTx) {
      const w = await this.prisma.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w) {
        return fail(99);
      }
      if (!dupTx.cancelledAt) {
        return ok(w.balance);
      }
      return fail(41, w.balance);
    }

    return this.prisma.$transaction(async (tx) => {
      const res = await tx.sportsBetReservation.findUnique({
        where: {
          platformId_reserveId: { platformId, reserveId: rid },
        },
      });
      if (!res || res.userId !== userRow.id) {
        return fail(99);
      }
      if (res.status === 'CONFIRMED') {
        return fail(99);
      }
      const remaining = res.reservedAmount.minus(res.consumedAmount);
      if (amount.gt(remaining)) {
        const w = await tx.wallet.findUnique({
          where: { userId: userRow.id },
        });
        return fail(31, w?.balance ?? new Prisma.Decimal(0));
      }

      const dupActual = await tx.sportsBetActual.findUnique({
        where: {
          reservationId_reqId: { reservationId: res.id, reqId },
        },
      });
      if (dupActual) {
        const w = await tx.wallet.findUnique({
          where: { userId: userRow.id },
        });
        if (!w) {
          return fail(99);
        }
        return ok(w.balance);
      }

      const w0 = await tx.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w0) {
        return fail(99);
      }
      if (w0.balance.lt(amount)) {
        return fail(31, w0.balance);
      }
      const next = this.buckets.deductStake(pickBucketState(w0), amount);
      const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
      await tx.sportsBetReservation.update({
        where: { id: res.id },
        data: {
          consumedAmount: res.consumedAmount.plus(amount),
        },
      });
      await tx.sportsBetActual.create({
        data: {
          platformId,
          userId: userRow.id,
          reservationId: res.id,
          reqId,
          externalId: tid,
          amount,
        },
      });
      await tx.casinoVinusTx.create({
        data: {
          platformId,
          userId: userRow.id,
          externalId: tid,
          kind: 'SPORTS_BET',
          gameId:
            typeof data.game_id === 'string' ? data.game_id : undefined,
          roundId:
            typeof data.round_id === 'string' ? data.round_id : undefined,
          stake: amount,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: userRow.id,
          platformId,
          type: LedgerEntryType.BET,
          amount: amount.negated(),
          balanceAfter: newBal,
          reference: tid,
          metaJson: withLedgerVerticalMeta('sports', {
            command: 'sports-bet',
            reserve_id: rid,
            req_id: reqId,
            vendor:
              typeof data.vendor === 'string' ? data.vendor : undefined,
            game_type:
              typeof data.game_type === 'string' ? data.game_type : undefined,
            game_sort:
              typeof data.game_sort === 'string' ? data.game_sort : undefined,
            bet_type:
              typeof data.bet_type === 'string' ? data.bet_type : undefined,
            bet_count:
              typeof data.bet_count === 'number' ? data.bet_count : undefined,
            timestamp,
          }) as Prisma.InputJsonValue,
        },
      });
      // 스포츠는 알 가상 복구 로직 대상 아님 (카지노 전용)
      await this.rolling.applyBetStake(tx, userRow.id, amount);
      await this.points.maybeCreditReferrerFirstBet(
        tx,
        userRow.id,
        platformId,
      );
      return ok(newBal);
    });
  }

  /**
   * 스포츠 베팅 변경. `transaction_id` = 본 요청 멱등 키.
   * 원베팅: `original_transaction_id`, 또는 `reserve_id`(원베팅 tid),
   * 또는 `req_id`+`round_id` / 예약 `reserve_id`+`req_id`로 조회.
   * 예약 확정(CONFIRMED) 후에도 금액 변경 가능.
   */
  private async sportsBetChangeProd(
    platformId: string,
    userRow: VinusUserRow,
    data: Record<string, unknown>,
    timestamp: number | undefined,
    fail: (code: number, balance?: Prisma.Decimal) => Record<string, unknown>,
    ok: (balance: Prisma.Decimal) => Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const changeTid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    const newAmt = toDec(data.amount);
    const origTid =
      typeof data.original_transaction_id === 'string'
        ? data.original_transaction_id.replace(/\s/g, '')
        : '';
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    const reqId =
      typeof data.req_id === 'string' ? data.req_id.replace(/\s/g, '') : '';
    const roundId =
      typeof data.round_id === 'string' ? data.round_id.replace(/\s/g, '') : '';

    if (!changeTid || !newAmt || newAmt.lte(0)) {
      return fail(99);
    }

    const dupChange = await this.prisma.casinoVinusTx.findUnique({
      where: { externalId: changeTid },
    });
    if (dupChange && !dupChange.cancelledAt) {
      const w = await this.prisma.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w) return fail(99);
      return ok(w.balance);
    }

    const betDetailsJson: Prisma.InputJsonValue | undefined =
      data.bet_details !== undefined &&
      data.bet_details !== null &&
      typeof data.bet_details === 'object' &&
      !Array.isArray(data.bet_details)
        ? (data.bet_details as Prisma.InputJsonValue)
        : undefined;

    let actual:
      | Awaited<ReturnType<typeof this.prisma.sportsBetActual.findUnique>>
      | null = null;

    if (origTid) {
      actual = await this.prisma.sportsBetActual.findUnique({
        where: { externalId: origTid },
      });
    }
    if (!actual && rid && reqId) {
      const res = await this.prisma.sportsBetReservation.findUnique({
        where: { platformId_reserveId: { platformId, reserveId: rid } },
      });
      if (res) {
        actual = await this.prisma.sportsBetActual.findUnique({
          where: {
            reservationId_reqId: { reservationId: res.id, reqId },
          },
        });
      }
    }
    if (!actual && reqId && roundId) {
      const candidates = await this.prisma.sportsBetActual.findMany({
        where: { userId: userRow.id, reqId, platformId },
      });
      for (const c of candidates) {
        const tx = await this.prisma.casinoVinusTx.findUnique({
          where: { externalId: c.externalId },
        });
        if (tx?.roundId === roundId) {
          actual = c;
          break;
        }
      }
    }
    if (!actual && reqId) {
      actual = await this.prisma.sportsBetActual.findFirst({
        where: { userId: userRow.id, reqId, platformId },
        orderBy: { createdAt: 'desc' },
      });
    }
    /** reserve_id가 예약 키가 아니라 원베팅 transaction_id로만 온 경우 */
    if (!actual && rid) {
      actual = await this.prisma.sportsBetActual.findUnique({
        where: { externalId: rid },
      });
    }

    if (actual) {
      if (actual.userId !== userRow.id) {
        const w21 = await this.prisma.wallet.findUnique({
          where: { userId: userRow.id },
        });
        return fail(21, w21?.balance ?? new Prisma.Decimal(0));
      }
      const res = await this.prisma.sportsBetReservation.findUnique({
        where: { id: actual.reservationId },
      });
      if (!res || res.userId !== userRow.id) {
        return fail(99);
      }
      const oldAmt = actual.amount;
      const delta = newAmt.minus(oldAmt);
      const newConsumed = res.consumedAmount.plus(delta);
      if (newConsumed.gt(res.reservedAmount)) {
        const w = await this.prisma.wallet.findUnique({
          where: { userId: userRow.id },
        });
        return fail(31, w?.balance ?? new Prisma.Decimal(0));
      }

      return this.prisma.$transaction(async (tx) => {
        const w0 = await tx.wallet.findUnique({
          where: { userId: userRow.id },
        });
        if (!w0) return fail(99);
        if (delta.gt(0) && w0.balance.lt(delta)) {
          return fail(31, w0.balance);
        }
        const next = this.buckets.applySportsBetChangeDelta(
          pickBucketState(w0),
          delta,
        );
        const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
        await tx.sportsBetActual.update({
          where: { id: actual!.id },
          data: { amount: newAmt },
        });
        await tx.sportsBetReservation.update({
          where: { id: res!.id },
          data: { consumedAmount: newConsumed },
        });
        await tx.casinoVinusTx.update({
          where: { externalId: actual!.externalId },
          data: { stake: newAmt },
        });
        await tx.casinoVinusTx.create({
          data: {
            platformId,
            userId: userRow.id,
            externalId: changeTid,
            kind: 'SPORTS_BET_CHANGE',
            gameId:
              typeof data.game_id === 'string' ? data.game_id : undefined,
            roundId:
              typeof data.round_id === 'string' ? data.round_id : undefined,
            stake: delta.abs(),
          },
        });
        await tx.ledgerEntry.create({
          data: {
            userId: userRow.id,
            platformId,
            type: LedgerEntryType.ADJUSTMENT,
            amount: delta.negated(),
            balanceAfter: newBal,
            reference: changeTid,
            metaJson: withLedgerVerticalMeta('sports', {
              command: 'sports-bet-change',
              original_transaction_id: actual!.externalId,
              req_id: reqId,
              bet_details: betDetailsJson ?? undefined,
              timestamp,
            }) as Prisma.InputJsonValue,
          },
        });
        return ok(newBal);
      });
    }

    let origTx =
      origTid
        ? await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: origTid },
          })
        : null;
    if (!origTx && rid) {
      origTx = await this.prisma.casinoVinusTx.findUnique({
        where: { externalId: rid },
      });
    }
    if (!origTx && reqId) {
      const tByReqExt = await this.prisma.casinoVinusTx.findUnique({
        where: { externalId: reqId },
      });
      if (
        tByReqExt &&
        tByReqExt.userId === userRow.id &&
        (tByReqExt.kind === 'SPORTS_BET' || tByReqExt.kind === 'BET')
      ) {
        origTx = tByReqExt;
      }
    }
    if (!origTx && reqId) {
      const txs = await this.prisma.casinoVinusTx.findMany({
        where: {
          userId: userRow.id,
          platformId,
          kind: { in: ['SPORTS_BET', 'BET'] },
          ...(roundId ? { roundId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 120,
      });
      for (const t of txs) {
        const le = await this.prisma.ledgerEntry.findFirst({
          where: { userId: userRow.id, reference: t.externalId },
        });
        const meta = le?.metaJson as Record<string, unknown> | null | undefined;
        if (meta && String(meta.req_id ?? '') === reqId) {
          origTx = t;
          break;
        }
      }
    }
    if (!origTx || origTx.userId !== userRow.id) {
      return fail(99);
    }
    if (origTx.kind !== 'SPORTS_BET' && origTx.kind !== 'BET') {
      return fail(99);
    }
    const oldStake = origTx.stake ?? new Prisma.Decimal(0);
    const legDelta = newAmt.minus(oldStake);

    return this.prisma.$transaction(async (tx) => {
      const w0 = await tx.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w0) return fail(99);
      if (legDelta.gt(0) && w0.balance.lt(legDelta)) {
        return fail(31, w0.balance);
      }
      const next = this.buckets.applySportsBetChangeDelta(
        pickBucketState(w0),
        legDelta,
      );
      const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
      await tx.casinoVinusTx.update({
        where: { externalId: origTx!.externalId },
        data: { stake: newAmt },
      });
      await tx.casinoVinusTx.create({
        data: {
          platformId,
          userId: userRow.id,
          externalId: changeTid,
          kind: 'SPORTS_BET_CHANGE',
          gameId: origTx!.gameId,
          roundId: origTx!.roundId,
          stake: legDelta.abs(),
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: userRow.id,
          platformId,
          type: LedgerEntryType.ADJUSTMENT,
          amount: legDelta.negated(),
          balanceAfter: newBal,
          reference: changeTid,
          metaJson: withLedgerVerticalMeta('sports', {
            command: 'sports-bet-change',
            original_transaction_id: origTx!.externalId,
            req_id: reqId,
            bet_details: betDetailsJson ?? undefined,
            timestamp,
          }) as Prisma.InputJsonValue,
        },
      });
      return ok(newBal);
    });
  }

  /**
   * 스포츠 적중/결과: `reserve_id` = 원베팅 transaction_id, `req_id`(또는 transaction_id) = 결과 처리 멱등 키.
   * bet_details_result.NewStatus: Won | Lost | Void/Push | Cancel
   */
  private async sportsWinProd(
    platformId: string,
    userRow: VinusUserRow,
    data: Record<string, unknown>,
    timestamp: number | undefined,
    fail: (code: number, balance?: Prisma.Decimal) => Record<string, unknown>,
    ok: (balance: Prisma.Decimal) => Record<string, unknown>,
    command = 'sports-win',
  ): Promise<Record<string, unknown>> {
    const reqId = vinusStrId(data.req_id);
    const tid = vinusStrId(data.transaction_id);

    /**
     * BT1 sports-win / sports-win-deduct 패턴 (PHP 샘플 기준):
     *   - reserve_id 있음   : reserveBetId = reserve_id,  resultTid = req_id || tid
     *   - reserve_id 없음   : reserveBetId = req_id,       resultTid = tid
     *     (req_id = 원 BET TX 참조,  transaction_id = 새 WIN 결과 TX)
     *   - W-prefix 패턴     : transaction_id = "W12345" → resultTid = "W12345", reserveBetId = "12345"
     */
    let reserveBetId = vinusStrId(data.reserve_id);
    let resultTid: string;

    if (reserveBetId) {
      resultTid = reqId || tid;
    } else if (reqId && tid) {
      // BT1 정석 패턴
      reserveBetId = reqId;
      resultTid = tid;
    } else if (tid) {
      // W-prefix 패턴: WIN TX 에 W 마커가 있으면 제거해서 BET TX 조회
      const stripped = stripSportsWinTxMarker(tid);
      if (stripped !== tid) {
        reserveBetId = stripped;
      }
      resultTid = tid;
    } else {
      resultTid = reqId;
    }

    const w0Fail = await this.prisma.wallet.findUnique({ where: { userId: userRow.id } });
    if (!resultTid) {
      return fail(99, w0Fail?.balance ?? new Prisma.Decimal(0));
    }

    const dup = await this.prisma.casinoVinusTx.findUnique({
      where: { externalId: resultTid },
    });
    if (dup && !dup.cancelledAt) {
      const w = await this.prisma.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w) return fail(99, w0Fail?.balance ?? new Prisma.Decimal(0));
      return ok(w.balance);
    }

    /** BET TX 조회: reserveBetId 없으면 game_id + round_id 로 폴백 */
    let betTx: {
      id: string; externalId: string; kind: string;
      stake: Prisma.Decimal | null; payout: Prisma.Decimal | null;
      cancelledAt: Date | null; refundedAt: Date | null;
      userId: string; gameId: string | null; roundId: string | null;
    } | null = null;

    if (reserveBetId) {
      betTx = await this.prisma.casinoVinusTx.findUnique({
        where: { externalId: reserveBetId },
      });
      if (!betTx) {
        const actual = await this.prisma.sportsBetActual.findUnique({
          where: { externalId: reserveBetId },
        });
        if (actual) {
          betTx = await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: actual.externalId },
          });
        }
      }
    }

    /** reserveBetId 로 못 찾으면 game_id + round_id 로 보조 조회 */
    if (!betTx) {
      const gid = vinusStrId(data.game_id) || undefined;
      const rid = vinusStrId(data.round_id) || undefined;
      if (gid || rid) {
        betTx = await this.prisma.casinoVinusTx.findFirst({
          where: {
            userId: userRow.id,
            kind: { in: ['SPORTS_BET', 'BET'] },
            cancelledAt: null,
            ...(gid ? { gameId: gid } : {}),
            ...(rid ? { roundId: rid } : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    /** sports-win-deduct 는 BET 미조회 시에도 조정 처리 허용 */
    if (command !== 'sports-win-deduct' && (!betTx || betTx.userId !== userRow.id)) {
      return fail(99, w0Fail?.balance ?? new Prisma.Decimal(0));
    }
    if (betTx && betTx.kind !== 'SPORTS_BET' && betTx.kind !== 'BET') {
      return fail(99, w0Fail?.balance ?? new Prisma.Decimal(0));
    }

    const outcome = parseSportsWinStatus(data.bet_details_result);
    /** sports-win-deduct 는 outcome null 허용 (amount 직접 적용) */
    if (!outcome && command !== 'sports-win-deduct') {
      return fail(99, w0Fail?.balance ?? new Prisma.Decimal(0));
    }

    const winAmount = toDec(data.amount);
    const stake = betTx?.stake ?? new Prisma.Decimal(0);

    let payout = new Prisma.Decimal(0);
    if (outcome === 'won') {
      if (winAmount === null || winAmount.lte(0)) {
        return fail(99, w0Fail?.balance ?? new Prisma.Decimal(0));
      }
      payout = winAmount;
    } else if (outcome === 'lost') {
      payout = new Prisma.Decimal(0);
    } else if (outcome === 'adjust' || command === 'sports-win-deduct') {
      /** 금액 직접 적용 (음수 포함) — 차감이면 w0.balance + payout < w0.balance */
      if (winAmount === null) {
        return fail(99, w0Fail?.balance ?? new Prisma.Decimal(0));
      }
      payout = winAmount;
    } else {
      /** void / cancel: 원 베팅액 환급 */
      payout = stake;
    }

    const resultJson: Prisma.InputJsonValue | undefined =
      data.bet_details_result !== undefined &&
      data.bet_details_result !== null &&
      typeof data.bet_details_result === 'object' &&
      !Array.isArray(data.bet_details_result)
        ? (data.bet_details_result as Prisma.InputJsonValue)
        : undefined;

    const txKind =
      command === 'sports-win-deduct' ? 'SPORTS_WIN_DEDUCT' : 'SPORTS_WIN';

    return this.prisma.$transaction(async (tx) => {
      const w0 = await tx.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w0) return fail(99);
      const openRolling = await this.buckets.hasOpenRollingTx(tx, userRow.id);
      const next = this.buckets.applySignedPayout(
        pickBucketState(w0),
        payout,
        openRolling,
      );
      const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
      await tx.casinoVinusTx.create({
        data: {
          platformId,
          userId: userRow.id,
          externalId: resultTid,
          kind: txKind,
          gameId: betTx?.gameId ?? (vinusStrId(data.game_id) || undefined),
          roundId: betTx?.roundId ?? (vinusStrId(data.round_id) || undefined),
          /** payout: 음수 차감도 그대로 저장 */
          payout,
        },
      });
      /** 잔액 변동이 있을 때만 원장 기록 */
      if (!payout.isZero()) {
        await tx.ledgerEntry.create({
          data: {
            userId: userRow.id,
            platformId,
            type:
              outcome === 'won'
                ? LedgerEntryType.WIN
                : LedgerEntryType.ADJUSTMENT,
            amount: payout,
            balanceAfter: newBal,
            reference: resultTid,
            metaJson: withLedgerVerticalMeta('sports', {
              command,
              reserve_id: reserveBetId ?? undefined,
              outcome: outcome ?? undefined,
              bet_details_result: resultJson ?? undefined,
              timestamp,
            }) as Prisma.InputJsonValue,
          },
        });
      }
      // 스포츠는 알 가상 복구 로직 대상 아님 (카지노 전용)
      return ok(newBal);
    });
  }

  async handleCallback(body: unknown) {
    this.assertConfigured();
    const raw = normalizeVinusRootKeys(asVinusCallbackRoot(body));
    coerceVinusCallbackAliases(raw);
    const command = normalizeVinusCommand(raw.command);
    const rawCheck = raw.check;
    const checks: number[] = Array.isArray(rawCheck)
      ? rawCheck
          .map((x) => Number(x))
          .filter((n) => !Number.isNaN(n))
      : String(rawCheck ?? '')
          .replace(/\s/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n));

    const data = mergeVinusDataPayload(raw);
    normalizeVinusDataKeys(data);
    coerceVinusUserIdFromPayload(data, raw);
    coerceVinusReserveIdFromPayload(data, raw);
    coerceVinusReserveIdForCommitConfirm(command, data);
    normalizeVinusTokenInData(data);
    const timestamp =
      typeof raw.timestamp === 'number'
        ? raw.timestamp
        : typeof raw.request_timestamp === 'number'
          ? raw.request_timestamp
          : undefined;

    if (this.envFlag('VINUS_STUB_AUTHENTICATE')) {
      if (command === 'authenticate') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: authenticate 고정 성공 (DB 유저 있으면 id·잔액 반영). 운영 전 끌 것.',
        );
        return await this.stubAuthenticateOk();
      }
      if (command === 'balance') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: balance 고정 성공 (check 21,22·DB 무시). 운영 전 끌 것.',
        );
        return this.stubBalanceOk();
      }
      if (command === 'bet-win') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: bet-win 스텁 (동일 transaction_id 멱등). 운영 전 끌 것.',
        );
        return this.stubBetWinOk(data);
      }
      if (command === 'bet') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: bet 스텁 (동일 transaction_id 멱등). 운영 전 끌 것.',
        );
        return this.stubBetOk(data);
      }
      /** sports-* 는 스텁 제외: CasinoVinusTx·원장·예약과 동일하게 DB에 저장 (실연동과 코드 경로 통일) */
      if (command === 'win') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: win 스텁 (동일 transaction_id 멱등). 운영 전 끌 것.',
        );
        return this.stubWinOk(data);
      }
      if (command === 'win-add') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: win-add 스텁 (동일 tid+금액 멱등). 운영 전 끌 것.',
        );
        return this.stubWinAddOk(data);
      }
      if (command === 'cancel') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: cancel 스텁 (check 21,42,22·멱등). 운영 전 끌 것.',
        );
        return this.stubCancelOk(data);
      }
    }

    let userRow: VinusUserRow | null = null;
    let walletBal: Prisma.Decimal | null = null;
    let existingTx: {
      id: string;
      externalId: string;
      kind: string;
      stake: Prisma.Decimal | null;
      payout: Prisma.Decimal | null;
      cancelledAt: Date | null;
      refundedAt: Date | null;
    } | null = null;

    /** BT1 등: ERROR 응답에도 data.balance 필수 — 없으면 "balance 항목이 빠졌습니다" */
    const fail = (code: number, balance?: Prisma.Decimal) => ({
      result: code,
      status: 'ERROR',
      data: {
        balance:
          balance !== undefined
            ? Number(balance.toFixed(2))
            : 0,
      },
    });

    /** 벤더 테스트 툴: 성공 시 status OK 포함 */
    const ok = (balance: Prisma.Decimal) => ({
      result: 0,
      status: 'OK',
      data: { balance: Number(balance.toFixed(2)) },
    });

    const okCancel = (balance: Prisma.Decimal, uid: string, tid: string) => ({
      result: 0,
      status: 'OK',
      data: {
        balance: Number(balance.toFixed(2)),
        user_id: uid.slice(0, 25),
        transaction_id: tid,
        trasaction_id: tid,
      },
    });

    for (const check of checks) {
      switch (check) {
        case 11: {
          const token = typeof data.token === 'string' ? data.token : '';
          if (!token) return fail(11, new Prisma.Decimal(0));
          const sess = await this.prisma.vinusSessionToken.findUnique({
            where: { token },
            include: {
              user: {
                select: {
                  id: true,
                  loginId: true,
                  displayName: true,
                  platformId: true,
                  registrationStatus: true,
                  role: true,
                },
              },
            },
          });
          if (!sess) return fail(11, new Prisma.Decimal(0));
          userRow = sess.user;
          const w = await this.prisma.wallet.findUnique({
            where: { userId: sess.userId },
          });
          walletBal = w?.balance ?? new Prisma.Decimal(0);
          break;
        }
        case 21: {
          const uid = vinusStrId(data.user_id);
          if (!uid) return fail(21, new Prisma.Decimal(0));
          const sameUser =
            userRow &&
            (userRow.id === uid ||
              userRow.loginId.toLowerCase() === uid.toLowerCase());
          if (!sameUser) {
            const resolved = await this.findUserForVinus(uid);
            if (!resolved) return fail(21, new Prisma.Decimal(0));
            userRow = resolved;
          }
          if (!userRow) return fail(21, new Prisma.Decimal(0));
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          walletBal = w?.balance ?? new Prisma.Decimal(0);
          break;
        }
        case 22: {
          if (!userRow) {
            return fail(22, walletBal ?? new Prisma.Decimal(0));
          }
          if (userRow.registrationStatus !== RegistrationStatus.APPROVED) {
            return fail(22, walletBal ?? new Prisma.Decimal(0));
          }
          break;
        }
        case 31: {
          if (!userRow) {
            return fail(31, walletBal ?? new Prisma.Decimal(0));
          }
          const amount = toDec(data.amount);
          if (!amount || amount.lte(0)) {
            return fail(31, walletBal ?? new Prisma.Decimal(0));
          }
          const bal = walletBal ?? new Prisma.Decimal(0);
          if (bal.lt(amount)) return fail(31, bal);
          break;
        }
        case 41: {
          if (!userRow) {
            return fail(41, walletBal ?? new Prisma.Decimal(0));
          }
          const tid =
            typeof data.transaction_id === 'string' ? data.transaction_id : '';
          if (!tid) return fail(41, walletBal ?? new Prisma.Decimal(0));
          const ex = await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: tid },
          });
          if (ex && !ex.cancelledAt) {
            const w = await this.prisma.wallet.findUnique({
              where: { userId: userRow.id },
            });
            const b = w?.balance ?? new Prisma.Decimal(0);
            return ok(b);
          }
          break;
        }
        case 42: {
          if (!userRow) {
            return fail(42, walletBal ?? new Prisma.Decimal(0));
          }
          const tid =
            typeof data.transaction_id === 'string' ? data.transaction_id : '';
          if (!tid) {
            return fail(42, walletBal ?? new Prisma.Decimal(0));
          }
          const ex = await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: tid },
          });
          if (!ex) {
            const w = await this.prisma.wallet.findUnique({
              where: { userId: userRow.id },
            });
            return fail(42, w?.balance ?? new Prisma.Decimal(0));
          }
          existingTx = ex;
          break;
        }
        /** check 51: 예약 키·또는 기존 BET tid(sports-win). 예약 없는 단건 sports-bet은 스킵 */
        case 51: {
          if (!userRow) {
            return fail(51, new Prisma.Decimal(0));
          }
          let reserveBet = vinusStrId(data.reserve_id);
          if (!reserveBet) {
            if (command === 'sports-bet') {
              break;
            }
            /**
             * sports-win / sports-win-deduct: reserve_id 없는 BT1 패턴.
             * 실제 BET 조회·검증은 sportsWinProd 에서 수행하므로 check 51 은 스킵.
             */
            if (
              (command === 'sports-win' || command === 'sports-win-deduct') &&
              (vinusStrId(data.req_id) || vinusStrId(data.transaction_id))
            ) {
              break;
            }
            if (!reserveBet) {
              return fail(51, walletBal ?? new Prisma.Decimal(0));
            }
          }
          const betRow = await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: reserveBet },
          });
          if (
            betRow &&
            betRow.userId === userRow.id &&
            (betRow.kind === 'SPORTS_BET' || betRow.kind === 'BET')
          ) {
            existingTx = betRow;
            break;
          }
          let platformForRes = userRow.platformId;
          if (!platformForRes) {
            const wPl = await this.prisma.wallet.findUnique({
              where: { userId: userRow.id },
              select: { platformId: true },
            });
            platformForRes = wPl?.platformId ?? null;
          }
          let reservation =
            platformForRes !== null
              ? await this.prisma.sportsBetReservation.findUnique({
                  where: {
                    platformId_reserveId: {
                      platformId: platformForRes,
                      reserveId: reserveBet,
                    },
                  },
                })
              : null;
          if (!reservation) {
            reservation = await this.prisma.sportsBetReservation.findFirst({
              where: { userId: userRow.id, reserveId: reserveBet },
            });
          }
          if (reservation) {
            break;
          }
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          return fail(51, w?.balance ?? new Prisma.Decimal(0));
        }
        /** 스포츠 베팅 변경 등: req_id·금액 유효성 (벤더 check 52) */
        case 52: {
          if (!userRow) {
            return fail(52, new Prisma.Decimal(0));
          }
          /** 확정·주문·예약·취소·차감: 금액·req_id가 없거나 0인 페이로드가 정상 (52는 변경 요청용) */
          if (
            command === 'sports-bet-commit' ||
            command === 'sports-confirm' ||
            command === 'sports-order' ||
            command === 'sports-reserve' ||
            command === 'sports-cancel' ||
            command === 'cancel' ||
            command === 'sports-win-deduct'
          ) {
            break;
          }
          const reqId = vinusStrId(data.req_id);
          if (!reqId) {
            return fail(52, walletBal ?? new Prisma.Decimal(0));
          }
          const amt52 = toDec(data.amount);
          if (!amt52 || amt52.lte(0)) {
            return fail(52, walletBal ?? new Prisma.Decimal(0));
          }
          break;
        }
        default:
          break;
      }
    }

    /** check에 11·21이 없어도 token·user_id로 사용자 복구 */
    if (!userRow) {
      const token = typeof data.token === 'string' ? data.token : '';
      if (token) {
        const sess = await this.prisma.vinusSessionToken.findUnique({
          where: { token },
          include: {
            user: {
              select: {
                id: true,
                loginId: true,
                displayName: true,
                platformId: true,
                registrationStatus: true,
                role: true,
              },
            },
          },
        });
        if (sess) {
          userRow = sess.user;
          const w = await this.prisma.wallet.findUnique({
            where: { userId: sess.userId },
          });
          walletBal = w?.balance ?? new Prisma.Decimal(0);
        }
      }
    }
    if (!userRow) {
      const uid = vinusStrId(data.user_id);
      if (uid) {
        const found = await this.findUserForVinus(uid);
        if (found) {
          userRow = found;
          const w = await this.prisma.wallet.findUnique({
            where: { userId: found.id },
          });
          walletBal = w?.balance ?? new Prisma.Decimal(0);
        }
      }
    }

    if (!userRow) {
      return fail(99, new Prisma.Decimal(0));
    }

    let platformId: string | null = userRow.platformId;
    if (!platformId) {
      const wPlat = await this.prisma.wallet.findUnique({
        where: { userId: userRow.id },
      });
      platformId = wPlat?.platformId ?? null;
    }
    if (!platformId) {
      const token = typeof data.token === 'string' ? data.token : '';
      if (token) {
        const sess = await this.prisma.vinusSessionToken.findUnique({
          where: { token },
          select: { platformId: true },
        });
        platformId = sess?.platformId ?? null;
      }
    }
    if (!platformId) {
      const wPf = await this.prisma.wallet.findUnique({
        where: { userId: userRow.id },
      });
      return fail(99, wPf?.balance ?? walletBal ?? new Prisma.Decimal(0));
    }

    switch (command) {
      case 'authenticate': {
        const w = await this.prisma.wallet.findUnique({
          where: { userId: userRow.id },
        });
        if (!w) return fail(99);
        return {
          result: 0,
          status: 'OK',
          data: {
            user_id: userRow.id.slice(0, 25),
            user_username: userRow.loginId.slice(0, 25),
            user_nickname: nickForVinus(userRow.displayName, userRow.loginId),
            balance: Number(w.balance.toFixed(2)),
          },
        };
      }

      case 'balance': {
        const w = await this.prisma.wallet.findUnique({
          where: { userId: userRow.id },
        });
        if (!w) return fail(99);
        return {
          result: 0,
          status: 'OK',
          data: { balance: Number(w.balance.toFixed(2)) },
        };
      }

      case 'sports-reserve': {
        return this.sportsReserveProd(
          platformId,
          userRow.id,
          data,
          fail,
          ok,
        );
      }

      case 'sports-order': {
        return this.sportsOrderProd(platformId, userRow.id, data, fail, ok);
      }

      case 'sports-confirm': {
        return this.sportsConfirmProd(platformId, userRow.id, data, fail, ok);
      }

      /** BT1: 베팅 접수 확인 콜백 — amount=0, req_id='' 이 정상. 잔액 그대로 OK. */
      case 'sports-bet-commit': {
        return this.sportsBetCommitProd(platformId, userRow.id, data, ok);
      }

      case 'sports-bet-change': {
        return this.sportsBetChangeProd(
          platformId,
          userRow,
          data,
          timestamp,
          fail,
          ok,
        );
      }

      case 'sports-win': {
        return this.sportsWinProd(
          platformId,
          userRow,
          data,
          timestamp,
          fail,
          ok,
          'sports-win',
        );
      }

      /** 적중 후 금액 차감/조정 (BT1 sports-win-deduct): 음수 amount 직접 적용 */
      case 'sports-win-deduct': {
        return this.sportsWinProd(
          platformId,
          userRow,
          data,
          timestamp,
          fail,
          ok,
          'sports-win-deduct',
        );
      }

      case 'bet':
      case 'sports-bet': {
        if (command === 'sports-bet' && vinusStrId(data.reserve_id) !== '') {
          return this.sportsBetWithReserveProd(
            platformId,
            userRow,
            data,
            timestamp,
            fail,
            ok,
          );
        }
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        const amount = toDec(data.amount);
        if (!tid || !amount) return fail(99);
        const txKind = command === 'sports-bet' ? 'SPORTS_BET' : 'BET';
        const gameSortBet =
          typeof data.game_sort === 'string' ? data.game_sort : undefined;
        const gameTypeBet =
          typeof data.game_type === 'string' ? data.game_type : undefined;
        const betVertical = resolveLedgerVerticalFromVinus({
          command,
          casinoTxKind: txKind,
          gameSort: gameSortBet,
          gameType: gameTypeBet,
        });
        const dup = await this.prisma.casinoVinusTx.findUnique({
          where: { externalId: tid },
        });
        if (dup) {
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          if (!w) return fail(99);
          if (!dup.cancelledAt) {
            return ok(w.balance);
          }
          /** 취소된 transaction_id 로 재베팅 불가 (문서·unique 제약) */
          return fail(41, w.balance);
        }
        return this.prisma.$transaction(async (tx) => {
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          if (w0.balance.lt(amount)) {
            return fail(31, w0.balance);
          }
          const next = this.buckets.deductStake(pickBucketState(w0), amount);
          const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
          await tx.casinoVinusTx.create({
            data: {
              platformId,
              userId: userRow!.id,
              externalId: tid,
              kind: txKind,
              gameId:
                typeof data.game_id === 'string' ? data.game_id : undefined,
              roundId:
                typeof data.round_id === 'string' ? data.round_id : undefined,
              stake: amount,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              userId: userRow!.id,
              platformId,
              type: LedgerEntryType.BET,
              amount: amount.negated(),
              balanceAfter: newBal,
              reference: tid,
              metaJson: withLedgerVerticalMeta(betVertical, {
                command,
                reserve_id:
                  typeof data.reserve_id === 'string'
                    ? data.reserve_id.replace(/\s/g, '')
                    : undefined,
                req_id:
                  typeof data.req_id === 'string'
                    ? data.req_id.replace(/\s/g, '')
                    : undefined,
                vendor:
                  typeof data.vendor === 'string' ? data.vendor : undefined,
                game_sort: gameSortBet,
                game_type: gameTypeBet,
                bet_type:
                  typeof data.bet_type === 'string' ? data.bet_type : undefined,
                bet_count:
                  typeof data.bet_count === 'number' ? data.bet_count : undefined,
                timestamp,
              }) as Prisma.InputJsonValue,
            },
          });
          // 알 가상 차감 — 카지노 계열만 (sports/SPORTS_BET 제외)
          if (betVertical !== 'sports') {
            await this.reserve.applyLedgerEvent(
              platformId,
              {
                kind: 'BET',
                amount,
                reference: tid,
                userId: userRow!.id,
                gameId:
                  typeof data.game_id === 'string' ? data.game_id : null,
                betId: tid,
                vertical: betVertical,
                note: `vinus-${command}`,
              },
              tx,
            );
          }
          await this.rolling.applyBetStake(tx, userRow!.id, amount);
          await this.points.maybeCreditReferrerFirstBet(
            tx,
            userRow!.id,
            platformId,
          );
          return ok(newBal);
        });
      }

      case 'bet-win': {
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        const bet = toDec(data.bet);
        const win = toDec(data.win);
        if (!tid || !bet || !win) return fail(99);
        const dup = await this.prisma.casinoVinusTx.findUnique({
          where: { externalId: tid },
        });
        if (dup) {
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          if (!w) return fail(99);
          if (!dup.cancelledAt) {
            return ok(w.balance);
          }
          return fail(41, w.balance);
        }
        const net = win.minus(bet);
        const gameSortBw =
          typeof data.game_sort === 'string' ? data.game_sort : undefined;
        const gameTypeBw =
          typeof data.game_type === 'string' ? data.game_type : undefined;
        const betWinVertical = resolveLedgerVerticalFromVinus({
          command: 'bet-win',
          gameSort: gameSortBw,
          gameType: gameTypeBw,
        });
        return this.prisma.$transaction(async (tx) => {
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          if (w0.balance.lt(bet)) {
            return fail(31, w0.balance);
          }
          const openRolling = await this.buckets.hasOpenRollingTx(
            tx,
            userRow!.id,
          );
          const next = this.buckets.applyBetAndWin(
            pickBucketState(w0),
            bet,
            win,
            openRolling,
          );
          const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
          await tx.casinoVinusTx.create({
            data: {
              platformId,
              userId: userRow!.id,
              externalId: tid,
              kind: 'BET_WIN',
              gameId:
                typeof data.game_id === 'string' ? data.game_id : undefined,
              roundId:
                typeof data.round_id === 'string' ? data.round_id : undefined,
              stake: bet,
              payout: win,
            },
          });
          const transferFlag =
            data.transfer === 'Y' ||
            data.transfer === 'y' ||
            raw.transfer === 'Y';
          await tx.ledgerEntry.create({
            data: {
              userId: userRow!.id,
              platformId,
              type: LedgerEntryType.BET,
              amount: net,
              balanceAfter: newBal,
              reference: tid,
              metaJson: withLedgerVerticalMeta(betWinVertical, {
                command: 'bet-win',
                transfer: transferFlag ? 'Y' : undefined,
                timestamp,
                game_sort: gameSortBw,
                game_type: gameTypeBw,
              }) as Prisma.InputJsonValue,
            },
          });
          // 알 가상: bet-win 은 카지노 전용 이벤트 — 스테이크/배당 동시 기록 (sports 는 별도 경로라 제외)
          if (betWinVertical !== 'sports') {
            if (bet.gt(0)) {
              await this.reserve.applyLedgerEvent(
                platformId,
                {
                  kind: 'BET',
                  amount: bet,
                  reference: tid,
                  userId: userRow!.id,
                  gameId:
                    typeof data.game_id === 'string' ? data.game_id : null,
                  betId: tid,
                  vertical: betWinVertical,
                  note: 'vinus-bet-win(stake)',
                },
                tx,
              );
            }
            if (win.gt(0)) {
              await this.reserve.applyLedgerEvent(
                platformId,
                {
                  kind: 'WIN',
                  amount: win,
                  reference: tid,
                  userId: userRow!.id,
                  gameId:
                    typeof data.game_id === 'string' ? data.game_id : null,
                  betId: tid,
                  vertical: betWinVertical,
                  note: 'vinus-bet-win(payout)',
                },
                tx,
              );
            }
          }
          await this.points.maybeCreditLoseBet(
            tx,
            userRow!.id,
            platformId,
            bet,
            win.gt(0),
          );
          return ok(newBal);
        });
      }

      /**
       * 에볼루션 등 라운드/베팅 확정 알림. 금액 변동 없이 성공·잔액만 반환하는 경우가 많음.
       * transaction_id 가 오면 멱등으로 한 번만 기록(CONFIRM).
       */
      case 'confirm': {
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        if (tid) {
          const dup = await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: tid },
          });
          if (dup && !dup.cancelledAt) {
            const w = await this.prisma.wallet.findUnique({
              where: { userId: userRow.id },
            });
            if (!w) return fail(99);
            return ok(w.balance);
          }
          await this.prisma.casinoVinusTx.create({
            data: {
              platformId,
              userId: userRow.id,
              externalId: tid,
              kind: 'CONFIRM',
              gameId:
                typeof data.game_id === 'string' ? data.game_id : undefined,
              roundId:
                typeof data.round_id === 'string' ? data.round_id : undefined,
            },
          });
        }
        const w = await this.prisma.wallet.findUnique({
          where: { userId: userRow.id },
        });
        if (!w) return fail(99);
        return ok(w.balance);
      }

      case 'win':
      case 'win-add': {
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        const amount = toDec(data.amount);
        if (!tid || amount === null) return fail(99);
        const gameSortW =
          typeof data.game_sort === 'string' ? data.game_sort : undefined;
        const gameTypeW =
          typeof data.game_type === 'string' ? data.game_type : undefined;
        const winVertical = resolveLedgerVerticalFromVinus({
          command,
          gameSort: gameSortW,
          gameType: gameTypeW,
        });
        const dup = await this.prisma.casinoVinusTx.findUnique({
          where: { externalId: tid },
        });
        if (dup && !dup.cancelledAt) {
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          return ok(w?.balance ?? new Prisma.Decimal(0));
        }
        return this.prisma.$transaction(async (tx) => {
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          const openRolling = await this.buckets.hasOpenRollingTx(
            tx,
            userRow!.id,
          );
          const next = this.buckets.creditWin(
            pickBucketState(w0),
            amount,
            openRolling,
          );
          const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
          await tx.casinoVinusTx.create({
            data: {
              platformId,
              userId: userRow!.id,
              externalId: tid,
              kind: 'WIN',
              gameId:
                typeof data.game_id === 'string' ? data.game_id : undefined,
              roundId:
                typeof data.round_id === 'string' ? data.round_id : undefined,
              payout: amount.gt(0) ? amount : new Prisma.Decimal(0),
            },
          });
          if (amount.gt(0)) {
            await tx.ledgerEntry.create({
              data: {
                userId: userRow!.id,
                platformId,
                type: LedgerEntryType.WIN,
                amount,
                balanceAfter: newBal,
                reference: tid,
                metaJson: withLedgerVerticalMeta(winVertical, {
                  command,
                  timestamp,
                  game_sort: gameSortW,
                  game_type: gameTypeW,
                }) as Prisma.InputJsonValue,
              },
            });
            // 알 가상 복구 — 카지노 계열만
            if (winVertical !== 'sports') {
              await this.reserve.applyLedgerEvent(
                platformId,
                {
                  kind: 'WIN',
                  amount,
                  reference: tid,
                  userId: userRow!.id,
                  gameId:
                    typeof data.game_id === 'string' ? data.game_id : null,
                  betId: tid,
                  vertical: winVertical,
                  note: `vinus-${command}`,
                },
                tx,
              );
            }
          }
          return ok(newBal);
        });
      }

      case 'sports-cancel':
      case 'cancel': {
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        if (!tid) return fail(99);
        const uid = userRow.id;
        let row = existingTx;
        if (!row) {
          const ex = await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: tid },
          });
          if (ex) row = ex;
        }
        if (!row) {
          /** sports-cancel: BET TX 없으면 멱등 성공으로 처리 (재요청 허용) */
          if (command === 'sports-cancel') {
            const wMiss = await this.prisma.wallet.findUnique({
              where: { userId: userRow.id },
            });
            return okCancel(
              wMiss?.balance ?? new Prisma.Decimal(0),
              uid,
              tid,
            );
          }
          return fail(99);
        }
        if (row.cancelledAt) {
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          return okCancel(
            w?.balance ?? new Prisma.Decimal(0),
            uid,
            tid,
          );
        }
        return this.prisma.$transaction(async (tx) => {
          const cur = await tx.casinoVinusTx.findUnique({
            where: { externalId: tid },
          });
          if (!cur || cur.cancelledAt) {
            const w = await tx.wallet.findUnique({
              where: { userId: userRow!.id },
            });
            return okCancel(w!.balance, uid, tid);
          }
          /** sports-cancel 은 BET/SPORTS_BET 만 취소 허용 */
          if (
            command === 'sports-cancel' &&
            cur.kind !== 'BET' &&
            cur.kind !== 'SPORTS_BET'
          ) {
            const w = await tx.wallet.findUnique({
              where: { userId: userRow!.id },
            });
            return fail(99, w?.balance ?? new Prisma.Decimal(0));
          }
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          let delta = new Prisma.Decimal(0);
          if (
            (cur.kind === 'BET' || cur.kind === 'SPORTS_BET') &&
            cur.stake
          ) {
            delta = cur.stake;
          } else if (cur.kind === 'WIN' && cur.payout) {
            delta = cur.payout.negated();
          } else if (cur.kind === 'BET_WIN' && cur.stake && cur.payout) {
            delta = cur.payout.minus(cur.stake).negated();
          }
          const next = this.buckets.applyCancelOrRefundDelta(
            pickBucketState(w0),
            delta,
          );
          const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
          await tx.casinoVinusTx.update({
            where: { id: cur.id },
            data: { cancelledAt: new Date() },
          });
          const cancelVertical =
            command === 'sports-cancel' || cur.kind === 'SPORTS_BET'
              ? ('sports' as const)
              : resolveLedgerVerticalFromVinus({
                  command: 'cancel',
                  casinoTxKind: cur.kind,
                });
          await tx.ledgerEntry.create({
            data: {
              userId: userRow!.id,
              platformId,
              type: LedgerEntryType.ADJUSTMENT,
              amount: delta,
              balanceAfter: newBal,
              reference: `cancel:${tid}`,
              metaJson: withLedgerVerticalMeta(cancelVertical, {
                command,
                timestamp,
                cancelledKind: cur.kind,
              }) as Prisma.InputJsonValue,
            },
          });
          // 알 가상 롤백 — 카지노 계열만. sports-cancel / SPORTS_BET 은 스킵
          if (
            command !== 'sports-cancel' &&
            cur.kind !== 'SPORTS_BET'
          ) {
            await this.reserve.rollbackLedgerEvent(
              cur.externalId,
              `cancel(${cur.kind})`,
            );
          }
          return okCancel(newBal, uid, tid);
        });
      }

      case 'refund': {
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        const amount = toDec(data.amount);
        const gameId =
          typeof data.game_id === 'string' ? data.game_id : undefined;
        const roundId =
          typeof data.round_id === 'string' ? data.round_id : undefined;
        if (!tid || !amount || !gameId || !roundId) return fail(99);
        const dup = await this.prisma.casinoVinusTx.findUnique({
          where: { externalId: tid },
        });
        if (dup && !dup.cancelledAt) {
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          if (!w) return fail(99);
          return ok(w.balance);
        }
        const openBet = await this.prisma.casinoVinusTx.findFirst({
          where: {
            userId: userRow.id,
            gameId,
            roundId,
            kind: { in: ['BET', 'BET_WIN', 'SPORTS_BET'] },
            refundedAt: null,
            cancelledAt: null,
          },
          orderBy: { createdAt: 'desc' },
        });
        if (!openBet || !openBet.stake) return fail(99);
        const refundVertical =
          openBet.kind === 'SPORTS_BET'
            ? ('sports' as const)
            : resolveLedgerVerticalFromVinus({
                command: 'refund',
                casinoTxKind: openBet.kind ?? undefined,
              });
        return this.prisma.$transaction(async (tx) => {
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          const refundAmt = openBet.stake!.lte(amount)
            ? openBet.stake!
            : amount;
          const next = this.buckets.refundToLockedDeposit(
            pickBucketState(w0),
            refundAmt,
          );
          const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
          await tx.casinoVinusTx.update({
            where: { id: openBet.id },
            data: { refundedAt: new Date() },
          });
          await tx.casinoVinusTx.create({
            data: {
              platformId,
              userId: userRow!.id,
              externalId: tid,
              kind: 'REFUND',
              gameId,
              roundId,
              stake: refundAmt,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              userId: userRow!.id,
              platformId,
              type: LedgerEntryType.ADJUSTMENT,
              amount: refundAmt,
              balanceAfter: newBal,
              reference: tid,
              metaJson: withLedgerVerticalMeta(refundVertical, {
                command: 'refund',
                timestamp,
              }) as Prisma.InputJsonValue,
            },
          });
          // 알 가상 롤백 — 카지노 계열만. SPORTS_BET 은 스킵
          if (openBet.kind !== 'SPORTS_BET') {
            await this.reserve.rollbackLedgerEvent(
              openBet.externalId,
              'refund',
            );
          }
          return ok(newBal);
        });
      }

      case 'bonusWin':
      case 'jackpotWin':
      case 'promoWin':
      case 'bonus': {
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        const amount = toDec(data.amount);
        const gameSortBn =
          typeof data.game_sort === 'string' ? data.game_sort : undefined;
        const gameTypeBn =
          typeof data.game_type === 'string' ? data.game_type : undefined;
        const bonusVertical = resolveLedgerVerticalFromVinus({
          command,
          gameSort: gameSortBn,
          gameType: gameTypeBn,
        });
        if (!tid || !amount || amount.lte(0)) return fail(99);
        const dup = await this.prisma.casinoVinusTx.findUnique({
          where: { externalId: tid },
        });
        if (dup && !dup.cancelledAt) {
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          if (!w) return fail(99);
          return ok(w.balance);
        }
        return this.prisma.$transaction(async (tx) => {
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          const openRolling = await this.buckets.hasOpenRollingTx(
            tx,
            userRow!.id,
          );
          const next = this.buckets.creditWin(
            pickBucketState(w0),
            amount,
            openRolling,
          );
          const { balance: newBal } = await this.buckets.persist(tx, w0.id, next);
          await tx.casinoVinusTx.create({
            data: {
              platformId,
              userId: userRow!.id,
              externalId: tid,
              kind: 'BONUS',
              gameId:
                typeof data.game_id === 'string' ? data.game_id : undefined,
              roundId:
                typeof data.round_id === 'string' ? data.round_id : undefined,
              payout: amount,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              userId: userRow!.id,
              platformId,
              type: LedgerEntryType.WIN,
              amount,
              balanceAfter: newBal,
              reference: tid,
              metaJson: withLedgerVerticalMeta(bonusVertical, {
                command,
                timestamp,
                game_sort: gameSortBn,
                game_type: gameTypeBn,
              }) as Prisma.InputJsonValue,
            },
          });
          return ok(newBal);
        });
      }

      default: {
        const wUnk = await this.prisma.wallet.findUnique({
          where: { userId: userRow.id },
        });
        return fail(
          99,
          wUnk?.balance ?? walletBal ?? new Prisma.Decimal(0),
        );
      }
    }
  }
}
