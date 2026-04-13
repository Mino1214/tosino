import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  LedgerEntryType,
  Prisma,
  RegistrationStatus,
  UserRole,
  WalletRequestStatus,
  WalletRequestType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { RollingObligationService } from '../rolling/rolling-obligation.service';
import { DepositEventsService } from '../deposit-events/deposit-events.service';

@Injectable()
export class WalletRequestsService {
  constructor(
    private prisma: PrismaService,
    private rolling: RollingObligationService,
    private depositEvents: DepositEventsService,
  ) {}

  private assertPlatformAdmin(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (actor.role === UserRole.PLATFORM_ADMIN && actor.platformId === platformId)
      return;
    throw new ForbiddenException();
  }

  async createForUser(
    userId: string,
    platformId: string | null,
    type: WalletRequestType,
    amount: number,
    note?: string,
    depositorName?: string,
    currency: 'KRW' | 'USDT' = 'KRW',
  ) {
    if (!platformId) throw new BadRequestException('Invalid user');
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        platformId,
        role: UserRole.USER,
        registrationStatus: RegistrationStatus.APPROVED,
      },
    });
    if (!user) throw new ForbiddenException();
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('지갑이 없습니다. 승인을 기다려 주세요.');
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        minDepositKrw: true,
        minDepositUsdt: true,
        minWithdrawKrw: true,
        minWithdrawUsdt: true,
      },
    });
    const amt = new Prisma.Decimal(amount);
    if (type === WalletRequestType.WITHDRAWAL) {
      await this.rolling.assertWithdrawalAllowed(userId);
      if (wallet.balance.lt(amt)) {
        throw new BadRequestException('출금액이 잔액을 초과합니다');
      }
      if (currency === 'USDT' && platform?.minWithdrawUsdt != null) {
        if (amt.lt(platform.minWithdrawUsdt)) {
          throw new BadRequestException(
            `USDT 출금 최소액은 ${platform.minWithdrawUsdt.toString()} 입니다`,
          );
        }
      }
      if (currency !== 'USDT' && platform?.minWithdrawKrw != null) {
        if (amt.lt(platform.minWithdrawKrw)) {
          throw new BadRequestException(
            `원화 출금 최소액은 ${platform.minWithdrawKrw.toString()} 원입니다`,
          );
        }
      }
    }
    if (type === WalletRequestType.DEPOSIT) {
      if (currency === 'USDT' && platform?.minDepositUsdt != null) {
        if (amt.lt(platform.minDepositUsdt)) {
          throw new BadRequestException(
            `USDT 입금 최소액은 ${platform.minDepositUsdt.toString()} 입니다`,
          );
        }
      }
      if (currency !== 'USDT' && platform?.minDepositKrw != null) {
        if (amt.lt(platform.minDepositKrw)) {
          throw new BadRequestException(
            `원화 입금 최소액은 ${platform.minDepositKrw.toString()} 원입니다`,
          );
        }
      }
    }
    const dep = depositorName?.trim() || null;
    if (type === WalletRequestType.WITHDRAWAL && dep) {
      throw new BadRequestException('출금 신청에는 입금자명을 넣을 수 없습니다');
    }
    return this.prisma.walletRequest.create({
      data: {
        platformId,
        userId,
        type,
        amount,
        note: note?.trim() || null,
        depositorName: type === WalletRequestType.DEPOSIT ? dep : null,
        status: WalletRequestStatus.PENDING,
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.walletRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listForPlatform(platformId: string, actor: JwtPayload, status?: WalletRequestStatus) {
    this.assertPlatformAdmin(actor, platformId);
    return this.prisma.walletRequest.findMany({
      where: {
        platformId,
        ...(status ? { status } : {}),
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async approve(
    platformId: string,
    requestId: string,
    actor: JwtPayload,
    resolverNote?: string,
  ) {
    this.assertPlatformAdmin(actor, platformId);
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.walletRequest.findFirst({
        where: {
          id: requestId,
          platformId,
          status: WalletRequestStatus.PENDING,
        },
      });
      if (!req) throw new NotFoundException();
      const wallet = await tx.wallet.findUnique({
        where: { userId: req.userId },
      });
      if (!wallet) throw new BadRequestException('User wallet missing');
      const amount = req.amount;
      let delta: Prisma.Decimal;
      if (req.type === WalletRequestType.DEPOSIT) {
        delta = amount;
      } else {
        delta = amount.negated();
      }
      const newBal = wallet.balance.plus(delta);
      if (newBal.lt(0)) throw new BadRequestException('Insufficient balance');
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBal },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: req.userId,
          platformId,
          type: LedgerEntryType.ADJUSTMENT,
          amount: delta,
          balanceAfter: newBal,
          reference: `wr:${req.id}`,
          metaJson: {
            demoWalletRequest: true,
            requestType: req.type,
          },
        },
      });
      if (req.type === WalletRequestType.DEPOSIT) {
        await this.rolling.createObligationIfNeeded(tx, {
          userId: req.userId,
          platformId,
          depositAmount: amount,
          sourceRef: `wr:${req.id}:principal`,
        });
        await this.depositEvents.applyEligibleBonus(tx, {
          userId: req.userId,
          platformId,
          depositAmount: amount,
          ledgerRefPrefix: `wr:${req.id}`,
        });
      }
      await tx.walletRequest.update({
        where: { id: req.id },
        data: {
          status: WalletRequestStatus.APPROVED,
          resolvedAt: new Date(),
          resolverNote: resolverNote?.trim() || null,
        },
      });
      return { ok: true, balance: newBal.toFixed(2) };
    });
  }

  async reject(
    platformId: string,
    requestId: string,
    actor: JwtPayload,
    resolverNote?: string,
  ) {
    this.assertPlatformAdmin(actor, platformId);
    const req = await this.prisma.walletRequest.findFirst({
      where: {
        id: requestId,
        platformId,
        status: WalletRequestStatus.PENDING,
      },
    });
    if (!req) throw new NotFoundException();
    await this.prisma.walletRequest.update({
      where: { id: req.id },
      data: {
        status: WalletRequestStatus.REJECTED,
        resolvedAt: new Date(),
        resolverNote: resolverNote?.trim() || null,
      },
    });
    return { ok: true };
  }
}
