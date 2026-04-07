import {
  BadRequestException,
  Injectable,
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

/** 문서: 15~25자 토큰 (랜덤 + 시간 일부) */
function generateVinusToken(): string {
  const pattern =
    '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
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

/** 콜백 command 대소문자·표기 정규화 */
function normalizeVinusCommand(rawCmd: unknown): string {
  const lc = String(rawCmd ?? '')
    .trim()
    .toLowerCase();
  const m: Record<string, string> = {
    authenticate: 'authenticate',
    balance: 'balance',
    bet: 'bet',
    'bet-win': 'bet-win',
    win: 'win',
    'win-add': 'win-add',
    cancel: 'cancel',
    refund: 'refund',
    bonuswin: 'bonusWin',
    jackpotwin: 'jackpotWin',
    promowin: 'promoWin',
    bonus: 'bonus',
    confirm: 'confirm',
  };
  return m[lc] ?? lc;
}

type VinusUserRow = {
  id: string;
  loginId: string;
  displayName: string | null;
  platformId: string | null;
  registrationStatus: RegistrationStatus;
  role: UserRole;
};

@Injectable()
export class VinusService {
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
    const method = dto.method ?? 'transfer';
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

  async handleCallback(raw: Record<string, unknown>) {
    this.assertConfigured();
    const command = normalizeVinusCommand(raw.command);
    const checkStr = String(raw.check ?? '');
    const checks = checkStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s));

    const data = (raw.data ?? {}) as Record<string, unknown>;
    const timestamp =
      typeof raw.timestamp === 'number'
        ? raw.timestamp
        : typeof raw.request_timestamp === 'number'
          ? raw.request_timestamp
          : undefined;

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
      };
      if (balance !== undefined) {
        out.data = { balance: Number(balance.toFixed(2)) };
      }
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
        default:
          break;
      }
    }

    if (!userRow?.platformId) {
      return fail(99);
    }

    const platformId = userRow.platformId;

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

      case 'bet': {
        const tid =
          typeof data.transaction_id === 'string' ? data.transaction_id : '';
        const amount = toDec(data.amount);
        if (!tid || !amount) return fail(99);
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
              kind: 'BET',
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
                vendor:
                  typeof data.vendor === 'string' ? data.vendor : undefined,
                game_sort:
                  typeof data.game_sort === 'string'
                    ? data.game_sort
                    : undefined,
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
        if (dup && !dup.cancelledAt) {
          const w = await this.prisma.wallet.findUnique({
            where: { userId: userRow.id },
          });
          if (!w) return fail(99);
          return ok(w.balance);
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
          if (cur.kind === 'BET' && cur.stake) {
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
            kind: { in: ['BET', 'BET_WIN'] },
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
        return { result: 99, status: 'ERROR' };
    }
  }
}
