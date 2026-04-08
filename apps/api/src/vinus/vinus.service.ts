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
import type { VinusLaunchDto } from './dto/vinus-launch.dto';

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
    'sports-win': 'sports-win',
    sportswin: 'sports-win',
  };
  return m[raw] ?? m[compact] ?? raw;
}

/** data 객체 + JSON 루트에만 온 필드 병합 (벤더 페이로드 형태 차이) */
const VINUS_PAYLOAD_FIELDS_IN_DATA = [
  'token',
  'user_id',
  'transaction_id',
  'amount',
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
    for (const k of ['cormand', 'comand', 'commmand']) {
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
      for (const k of ['command', 'cormand', 'comand', 'commmand']) {
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
    bet_count: 'bet_count',
    betcount: 'bet_count',
    reserve_id: 'reserve_id',
    reserveid: 'reserve_id',
    original_transaction_id: 'original_transaction_id',
    originaltransactionid: 'original_transaction_id',
    bet_details_result: 'bet_details_result',
    betdetailsresult: 'bet_details_result',
    r: 'vendor',
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
    if (typeof data[k] === 'string') {
      data[k] = (data[k] as string).replace(/\s/g, '');
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

/** sports-win: bet_details_result.NewStatus → 적중/실패/적특/취소 */
function parseSportsWinStatus(
  raw: unknown,
): 'won' | 'lost' | 'void' | 'cancel' | null {
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
  return null;
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

  /** 스텁: 스포츠 예약·실제 소비 (reserve_id 키) */
  private stubSportsReserve = new Map<
    string,
    {
      amount: number;
      consumed: number;
      orderTid?: string;
      status: string;
    }
  >();
  /** 스텁: reserve_id:req_id → 처리한 transaction_id */
  private stubSportsReqToTid = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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
   * 벤더 연동 테스트용: DB·토큰 매칭 없이 authenticate 성공 응답.
   * 운영 전에 VINUS_STUB_AUTHENTICATE 끄고 실제 유저·토큰 연동 사용.
   */
  private stubAuthenticateOk(): Record<string, unknown> {
    let userId = (
      this.config.get<string>('VINUS_STUB_USER_ID')?.trim() || 'stub-user-dev'
    ).slice(0, 25);
    let userUsername = (
      this.config.get<string>('VINUS_STUB_USERNAME')?.trim() || 'stub_login'
    ).slice(0, 25);
    let userNickname = (
      this.config.get<string>('VINUS_STUB_NICKNAME')?.trim() || 'StubUser'
    ).slice(0, 25);
    if (userUsername.length < 2) {
      userUsername = userUsername.padEnd(2, '0').slice(0, 25);
    }
    if (userNickname.length < 2) {
      userNickname = 'UU';
    }
    this.resetStubWalletSimulation();
    const balance = this.stubBalanceNumber();
    this.stubWorkingBal = balance;
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
    this.stubSportsReserve.clear();
    this.stubSportsReqToTid.clear();
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
    const tid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
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

  private stubSportsReserveOk(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    const amt = toDec(data.amount);
    const orderTid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    if (!rid || !amt || amt.lte(0)) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const cur = this.stubSportsReserve.get(rid);
    const bal = this.stubGetWorking();
    if (cur) {
      if (Math.abs(cur.amount - Number(amt.toFixed(2))) > 0.001) {
        return { result: 99, status: 'ERROR', data: {} };
      }
      if (orderTid) {
        if (cur.orderTid === orderTid) {
          return { result: 0, status: 'OK', data: { balance: bal } };
        }
        if (cur.orderTid) {
          return { result: 99, status: 'ERROR', data: {} };
        }
        cur.orderTid = orderTid;
        cur.status = 'ORDERED';
      }
      return { result: 0, status: 'OK', data: { balance: bal } };
    }
    this.stubSportsReserve.set(rid, {
      amount: Number(amt.toFixed(2)),
      consumed: 0,
      orderTid: orderTid || undefined,
      status: orderTid ? 'ORDERED' : 'PENDING',
    });
    return { result: 0, status: 'OK', data: { balance: bal } };
  }

  private stubSportsOrderOk(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    const orderTid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    if (!rid || !orderTid) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const cur = this.stubSportsReserve.get(rid);
    const bal = this.stubGetWorking();
    if (!cur) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    if (cur.orderTid === orderTid) {
      return { result: 0, status: 'OK', data: { balance: bal } };
    }
    if (cur.orderTid) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    cur.orderTid = orderTid;
    cur.status = 'ORDERED';
    return { result: 0, status: 'OK', data: { balance: bal } };
  }

  private stubSportsConfirmOk(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    if (!rid) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const cur = this.stubSportsReserve.get(rid);
    const bal = this.stubGetWorking();
    if (!cur) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    cur.status = 'CONFIRMED';
    return { result: 0, status: 'OK', data: { balance: bal } };
  }

  /** 스텁: 예약 연동 sports-bet (reserve_id + req_id) */
  private stubSportsBetReservedOk(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    const reqId =
      typeof data.req_id === 'string' ? data.req_id.replace(/\s/g, '') : '';
    const tid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    const amt = toDec(data.amount);
    if (!rid || !reqId || !tid || !amt || amt.lte(0)) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const res = this.stubSportsReserve.get(rid);
    if (!res || res.status === 'CONFIRMED') {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const rem = res.amount - res.consumed;
    if (Number(amt.toFixed(2)) > rem + 0.001) {
      return {
        result: 31,
        status: 'ERROR',
        data: { balance: this.stubGetWorking() },
      };
    }
    const rk = `${rid}:${reqId}`;
    const prevTid = this.stubSportsReqToTid.get(rk);
    if (prevTid !== undefined) {
      if (prevTid === tid) {
        const cached = this.stubTxEndingBalance.get(tid);
        if (cached !== undefined) {
          return { result: 0, status: 'OK', data: { balance: cached } };
        }
      }
      return { result: 99, status: 'ERROR', data: {} };
    }
    const curBal = this.stubGetWorking();
    if (curBal < Number(amt.toFixed(2))) {
      return {
        result: 31,
        status: 'ERROR',
        data: { balance: curBal },
      };
    }
    const newBal = Number(
      new Prisma.Decimal(curBal).minus(amt).toFixed(2),
    );
    this.stubTxEndingBalance.set(tid, newBal);
    this.stubWorkingBal = newBal;
    res.consumed += Number(amt.toFixed(2));
    this.stubSportsReqToTid.set(rk, tid);
    this.stubCancelMeta.set(tid, {
      kind: 'bet',
      stake: Number(amt.toFixed(2)),
      cancelled: false,
    });
    return { result: 0, status: 'OK', data: { balance: newBal } };
  }

  /** 스텁: sports-bet-change (원베팅 transaction_id → 금액 변경) */
  private stubSportsBetChangeOk(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const changeTid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
    const origFromField =
      typeof data.original_transaction_id === 'string'
        ? data.original_transaction_id.replace(/\s/g, '')
        : '';
    const origTid =
      origFromField ||
      (typeof data.reserve_id === 'string'
        ? data.reserve_id.replace(/\s/g, '')
        : '');
    const newAmt = toDec(data.amount);
    if (!changeTid || !origTid || !newAmt || newAmt.lte(0)) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    if (this.stubTxEndingBalance.has(changeTid)) {
      return {
        result: 0,
        status: 'OK',
        data: { balance: this.stubGetWorking() },
      };
    }
    const row = this.stubCancelMeta.get(origTid);
    if (!row || row.kind !== 'bet') {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const oldStake = row.stake;
    const delta = Number(newAmt.toFixed(2)) - oldStake;
    const cur = this.stubGetWorking();
    if (delta > 0 && cur < delta) {
      return {
        result: 31,
        status: 'ERROR',
        data: { balance: cur },
      };
    }
    const newBal = Number(new Prisma.Decimal(cur).minus(delta).toFixed(2));
    this.stubWorkingBal = newBal;
    this.stubTxEndingBalance.set(changeTid, newBal);
    this.stubCancelMeta.set(origTid, {
      kind: 'bet',
      stake: Number(newAmt.toFixed(2)),
      cancelled: false,
    });
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    if (rid) {
      const res = this.stubSportsReserve.get(rid);
      if (res) {
        res.consumed += delta;
      }
    }
    return { result: 0, status: 'OK', data: { balance: newBal } };
  }

  /** 스텁: sports-win (reserve_id=원베팅 tid, req_id=결과 멱등) */
  private stubSportsWinOk(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const reserveId =
      typeof data.reserve_id === 'string'
        ? data.reserve_id.replace(/\s/g, '')
        : '';
    const resultTid =
      (typeof data.req_id === 'string' ? data.req_id.replace(/\s/g, '') : '') ||
      (typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '');
    const amount = toDec(data.amount);
    if (!reserveId || !resultTid) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const cached = this.stubWinProcessed.get(resultTid);
    if (cached !== undefined) {
      return { result: 0, status: 'OK', data: { balance: cached } };
    }
    const betRow = this.stubCancelMeta.get(reserveId);
    if (!betRow || betRow.kind !== 'bet') {
      return { result: 99, status: 'ERROR', data: {} };
    }
    const stake = betRow.stake;
    const outcome = parseSportsWinStatus(data.bet_details_result);
    if (!outcome) {
      return { result: 99, status: 'ERROR', data: {} };
    }
    let payout = 0;
    if (outcome === 'won') {
      payout = amount ? Number(amount.toFixed(2)) : 0;
    } else if (outcome === 'lost') {
      payout = 0;
    } else {
      payout = stake;
    }
    const cur = this.stubGetWorking();
    const newBal = Number(new Prisma.Decimal(cur).plus(payout).toFixed(2));
    this.stubWorkingBal = newBal;
    this.stubWinProcessed.set(resultTid, newBal);
    this.stubCancelMeta.set(resultTid, {
      kind: 'win',
      payout,
      cancelled: false,
    });
    return { result: 0, status: 'OK', data: { balance: newBal } };
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
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    if (!rid) {
      return fail(99);
    }
    const existing = await this.prisma.sportsBetReservation.findUnique({
      where: { platformId_reserveId: { platformId, reserveId: rid } },
    });
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!existing || existing.userId !== userId || !w) {
      return fail(99);
    }
    if (existing.status === 'CONFIRMED') {
      return ok(w.balance);
    }
    await this.prisma.sportsBetReservation.update({
      where: { id: existing.id },
      data: { status: 'CONFIRMED' },
    });
    const w2 = await this.prisma.wallet.findUnique({ where: { userId } });
    return ok(w2!.balance);
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
    const rid =
      typeof data.reserve_id === 'string' ? data.reserve_id.replace(/\s/g, '') : '';
    const reqId =
      typeof data.req_id === 'string' ? data.req_id.replace(/\s/g, '') : '';
    const tid =
      typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '';
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
      const newBal = w0.balance.minus(amount);
      await tx.wallet.update({
        where: { id: w0.id },
        data: { balance: newBal },
      });
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
          metaJson: {
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
          },
        },
      });
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
        return fail(21);
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
        const newBal = w0.balance.minus(delta);
        await tx.wallet.update({
          where: { id: w0.id },
          data: { balance: newBal },
        });
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
            metaJson: {
              command: 'sports-bet-change',
              original_transaction_id: actual!.externalId,
              req_id: reqId,
              bet_details: betDetailsJson ?? undefined,
              timestamp,
            },
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
    if (!origTx && reqId && roundId) {
      const txs = await this.prisma.casinoVinusTx.findMany({
        where: {
          userId: userRow.id,
          roundId,
          kind: { in: ['SPORTS_BET', 'BET'] },
        },
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
      const newBal = w0.balance.minus(legDelta);
      await tx.wallet.update({
        where: { id: w0.id },
        data: { balance: newBal },
      });
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
          metaJson: {
            command: 'sports-bet-change',
            original_transaction_id: origTx!.externalId,
            req_id: reqId,
            bet_details: betDetailsJson ?? undefined,
            timestamp,
          },
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
  ): Promise<Record<string, unknown>> {
    const reserveBetId =
      typeof data.reserve_id === 'string'
        ? data.reserve_id.replace(/\s/g, '')
        : '';
    const resultTid =
      (typeof data.req_id === 'string' ? data.req_id.replace(/\s/g, '') : '') ||
      (typeof data.transaction_id === 'string'
        ? data.transaction_id.replace(/\s/g, '')
        : '');
    if (!reserveBetId || !resultTid) {
      return fail(99);
    }

    const dup = await this.prisma.casinoVinusTx.findUnique({
      where: { externalId: resultTid },
    });
    if (dup && !dup.cancelledAt) {
      const w = await this.prisma.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w) return fail(99);
      return ok(w.balance);
    }

    let betTx = await this.prisma.casinoVinusTx.findUnique({
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
    if (!betTx || betTx.userId !== userRow.id) {
      return fail(99);
    }
    if (betTx.kind !== 'SPORTS_BET' && betTx.kind !== 'BET') {
      return fail(99);
    }

    const outcome = parseSportsWinStatus(data.bet_details_result);
    if (!outcome) {
      return fail(99);
    }

    const winAmount = toDec(data.amount);
    const stake = betTx.stake ?? new Prisma.Decimal(0);

    let payout = new Prisma.Decimal(0);
    if (outcome === 'won') {
      if (winAmount === null || winAmount.lte(0)) {
        return fail(99);
      }
      payout = winAmount;
    } else if (outcome === 'lost') {
      payout = new Prisma.Decimal(0);
    } else {
      payout = stake;
    }

    const resultJson: Prisma.InputJsonValue | undefined =
      data.bet_details_result !== undefined &&
      data.bet_details_result !== null &&
      typeof data.bet_details_result === 'object' &&
      !Array.isArray(data.bet_details_result)
        ? (data.bet_details_result as Prisma.InputJsonValue)
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      const w0 = await tx.wallet.findUnique({
        where: { userId: userRow.id },
      });
      if (!w0) return fail(99);
      const newBal = w0.balance.plus(payout);
      await tx.wallet.update({
        where: { id: w0.id },
        data: { balance: newBal },
      });
      await tx.casinoVinusTx.create({
        data: {
          platformId,
          userId: userRow.id,
          externalId: resultTid,
          kind: 'SPORTS_WIN',
          gameId: betTx.gameId,
          roundId: betTx.roundId,
          payout,
        },
      });
      if (payout.gt(0)) {
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
            metaJson: {
              command: 'sports-win',
              reserve_id: reserveBetId,
              outcome,
              bet_details_result: resultJson ?? undefined,
              timestamp,
            },
          },
        });
      }
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
          'VINUS_STUB_AUTHENTICATE: authenticate 고정 성공 (토큰·DB 무시). 운영 전 끌 것.',
        );
        return this.stubAuthenticateOk();
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
      if (command === 'sports-bet') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: sports-bet 스텁 (reserve_id 있으면 예약 연동). 운영 전 끌 것.',
        );
        if (
          typeof data.reserve_id === 'string' &&
          data.reserve_id.replace(/\s/g, '') !== ''
        ) {
          return this.stubSportsBetReservedOk(data);
        }
        return this.stubBetOk(data);
      }
      if (command === 'sports-reserve') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: sports-reserve 스텁 (예약·주문 멱등). 운영 전 끌 것.',
        );
        return this.stubSportsReserveOk(data);
      }
      if (command === 'sports-order') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: sports-order 스텁 (주문 transaction_id 멱등). 운영 전 끌 것.',
        );
        return this.stubSportsOrderOk(data);
      }
      if (command === 'sports-confirm') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: sports-confirm 스텁. 운영 전 끌 것.',
        );
        return this.stubSportsConfirmOk(data);
      }
      if (command === 'sports-bet-change') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: sports-bet-change 스텁. 운영 전 끌 것.',
        );
        return this.stubSportsBetChangeOk(data);
      }
      if (command === 'sports-win') {
        this.logger.warn(
          'VINUS_STUB_AUTHENTICATE: sports-win 스텁 (reserve_id+req_id). 운영 전 끌 것.',
        );
        return this.stubSportsWinOk(data);
      }
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

    const fail = (code: number, balance?: Prisma.Decimal) => {
      const out: Record<string, unknown> = {
        result: code,
        status: 'ERROR',
        data:
          balance !== undefined
            ? { balance: Number(balance.toFixed(2)) }
            : {},
      };
      return out;
    };

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
          if (!token) return fail(11);
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
          if (!sess) return fail(11);
          userRow = sess.user;
          const w = await this.prisma.wallet.findUnique({
            where: { userId: sess.userId },
          });
          walletBal = w?.balance ?? new Prisma.Decimal(0);
          break;
        }
        case 21: {
          const uid = typeof data.user_id === 'string' ? data.user_id : '';
          if (!uid) return fail(21);
          if (!userRow || userRow.id !== uid) {
            const found: VinusUserRow | null = await this.prisma.user.findUnique({
              where: { id: uid },
              select: {
                id: true,
                loginId: true,
                displayName: true,
                platformId: true,
                registrationStatus: true,
                role: true,
              },
            });
            if (!found) return fail(21);
            userRow = found;
            const w = await this.prisma.wallet.findUnique({
              where: { userId: uid },
            });
            walletBal = w?.balance ?? new Prisma.Decimal(0);
          }
          break;
        }
        case 22: {
          if (!userRow) return fail(22);
          if (userRow.registrationStatus !== RegistrationStatus.APPROVED) {
            return fail(22, walletBal ?? undefined);
          }
          break;
        }
        case 31: {
          if (!userRow) return fail(31);
          const amount = toDec(data.amount);
          if (!amount || amount.lte(0)) return fail(31, walletBal ?? undefined);
          const bal = walletBal ?? new Prisma.Decimal(0);
          if (bal.lt(amount)) return fail(31, bal);
          break;
        }
        case 41: {
          if (!userRow) return fail(41);
          const tid =
            typeof data.transaction_id === 'string' ? data.transaction_id : '';
          if (!tid) return fail(41);
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
          if (!userRow) return fail(42);
          const tid =
            typeof data.transaction_id === 'string' ? data.transaction_id : '';
          if (!tid) return fail(42);
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
        /** sports-win: 원베팅(reserve_id = 베팅 transaction_id) 존재 (벤더 check 51) */
        case 51: {
          if (!userRow) return fail(51);
          const reserveBet =
            typeof data.reserve_id === 'string'
              ? data.reserve_id.replace(/\s/g, '')
              : '';
          if (!reserveBet) {
            return fail(51, walletBal ?? undefined);
          }
          const betRow = await this.prisma.casinoVinusTx.findUnique({
            where: { externalId: reserveBet },
          });
          if (
            !betRow ||
            betRow.userId !== userRow.id ||
            (betRow.kind !== 'SPORTS_BET' && betRow.kind !== 'BET')
          ) {
            const w = await this.prisma.wallet.findUnique({
              where: { userId: userRow.id },
            });
            return fail(51, w?.balance ?? new Prisma.Decimal(0));
          }
          existingTx = betRow;
          break;
        }
        /** 스포츠 베팅 변경 등: req_id·금액 유효성 (벤더 check 52) */
        case 52: {
          if (!userRow) return fail(52);
          const reqId =
            typeof data.req_id === 'string' ? data.req_id.replace(/\s/g, '') : '';
          if (!reqId) {
            return fail(52, walletBal ?? undefined);
          }
          const amt52 = toDec(data.amount);
          if (!amt52 || amt52.lte(0)) {
            return fail(52, walletBal ?? undefined);
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
      const uid = typeof data.user_id === 'string' ? data.user_id : '';
      if (uid) {
        const found: VinusUserRow | null = await this.prisma.user.findUnique({
          where: { id: uid },
          select: {
            id: true,
            loginId: true,
            displayName: true,
            platformId: true,
            registrationStatus: true,
            role: true,
          },
        });
        if (found) {
          userRow = found;
          const w = await this.prisma.wallet.findUnique({
            where: { userId: uid },
          });
          walletBal = w?.balance ?? new Prisma.Decimal(0);
        }
      }
    }

    if (!userRow) {
      return fail(99);
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
      return fail(99);
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
        );
      }

      case 'bet':
      case 'sports-bet': {
        if (
          command === 'sports-bet' &&
          typeof data.reserve_id === 'string' &&
          data.reserve_id.replace(/\s/g, '') !== ''
        ) {
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
          const newBal = w0.balance.minus(amount);
          await tx.wallet.update({
            where: { id: w0.id },
            data: { balance: newBal },
          });
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
              metaJson: {
                command,
                vendor:
                  typeof data.vendor === 'string' ? data.vendor : undefined,
                game_sort:
                  typeof data.game_sort === 'string'
                    ? data.game_sort
                    : undefined,
                game_type:
                  typeof data.game_type === 'string'
                    ? data.game_type
                    : undefined,
                bet_type:
                  typeof data.bet_type === 'string' ? data.bet_type : undefined,
                bet_count:
                  typeof data.bet_count === 'number' ? data.bet_count : undefined,
                timestamp,
              },
            },
          });
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
        return this.prisma.$transaction(async (tx) => {
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          if (w0.balance.lt(bet)) {
            return fail(31, w0.balance);
          }
          const newBal = w0.balance.plus(net);
          await tx.wallet.update({
            where: { id: w0.id },
            data: { balance: newBal },
          });
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
              metaJson: {
                command: 'bet-win',
                transfer: transferFlag ? 'Y' : undefined,
                timestamp,
              },
            },
          });
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
          const newBal = w0.balance.plus(amount);
          await tx.wallet.update({
            where: { id: w0.id },
            data: { balance: newBal },
          });
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
                metaJson: { command, timestamp },
              },
            });
          }
          return ok(newBal);
        });
      }

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
        if (!row) return fail(99);
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
          const newBal = w0.balance.plus(delta);
          await tx.wallet.update({
            where: { id: w0.id },
            data: { balance: newBal },
          });
          await tx.casinoVinusTx.update({
            where: { id: cur.id },
            data: { cancelledAt: new Date() },
          });
          await tx.ledgerEntry.create({
            data: {
              userId: userRow!.id,
              platformId,
              type: LedgerEntryType.ADJUSTMENT,
              amount: delta,
              balanceAfter: newBal,
              reference: `cancel:${tid}`,
              metaJson: { command: 'cancel', timestamp },
            },
          });
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
        return this.prisma.$transaction(async (tx) => {
          const w0 = await tx.wallet.findUnique({
            where: { userId: userRow!.id },
          });
          if (!w0) return fail(99);
          const refundAmt = openBet.stake!.lte(amount)
            ? openBet.stake!
            : amount;
          const newBal = w0.balance.plus(refundAmt);
          await tx.wallet.update({
            where: { id: w0.id },
            data: { balance: newBal },
          });
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
              metaJson: { command: 'refund', timestamp },
            },
          });
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
          const newBal = w0.balance.plus(amount);
          await tx.wallet.update({
            where: { id: w0.id },
            data: { balance: newBal },
          });
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
              metaJson: { command, timestamp },
            },
          });
          return ok(newBal);
        });
      }

      default:
        return { result: 99, status: 'ERROR', data: {} };
    }
  }
}
