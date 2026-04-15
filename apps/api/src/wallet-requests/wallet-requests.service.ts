import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
import { PointsService } from '../points/points.service';
import { UpbitRateService } from '../usdt-deposit/upbit-rate.service';

@Injectable()
export class WalletRequestsService {
  constructor(
    private prisma: PrismaService,
    private rolling: RollingObligationService,
    private depositEvents: DepositEventsService,
    private points: PointsService,
    private upbit: UpbitRateService,
  ) {}

  private async getUsdtKrwRate(): Promise<Prisma.Decimal> {
    return this.upbit.getKrwPerUsdt();
  }

  private async toWalletKrwAmount(
    amount: Prisma.Decimal,
    currency: 'KRW' | 'USDT',
  ): Promise<Prisma.Decimal> {
    if (currency === 'USDT') {
      return amount.times(await this.getUsdtKrwRate());
    }
    return amount;
  }

  private assertPlatformAdmin(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (
      actor.role === UserRole.PLATFORM_ADMIN &&
      actor.platformId === platformId
    )
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
      select: {
        id: true,
        signupMode: true,
        bankCode: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        usdtWalletAddress: true,
      },
    });
    if (!user) throw new ForbiddenException();
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet)
      throw new BadRequestException('지갑이 없습니다. 승인을 기다려 주세요.');
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        minDepositKrw: true,
        minDepositUsdt: true,
        minWithdrawKrw: true,
        minWithdrawUsdt: true,
        semiVirtualEnabled: true,
      },
    });
    const amt = new Prisma.Decimal(amount);
    const walletKrwAmount = await this.toWalletKrwAmount(amt, currency);
    const isAnonymous = user.signupMode === 'anonymous';

    if (isAnonymous && currency !== 'USDT') {
      throw new BadRequestException(
        '무기명 회원은 테더 입출금만 사용할 수 있습니다',
      );
    }
    if (!isAnonymous && currency === 'USDT') {
      throw new BadRequestException(
        '일반 회원은 원화 입출금만 사용할 수 있습니다',
      );
    }

    if (type === WalletRequestType.WITHDRAWAL) {
      await this.rolling.assertWithdrawalAllowed(userId);
      if (wallet.balance.lt(walletKrwAmount)) {
        throw new BadRequestException('출금액이 잔액을 초과합니다');
      }
      if (currency === 'USDT' && !user.usdtWalletAddress?.trim()) {
        throw new BadRequestException('테더 지갑 주소를 먼저 등록해주세요');
      }
      if (
        currency !== 'USDT' &&
        (!user.bankCode || !user.bankAccountNumber || !user.bankAccountHolder)
      ) {
        throw new BadRequestException('출금 계좌를 먼저 등록해주세요');
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
      throw new BadRequestException(
        '출금 신청에는 입금자명을 넣을 수 없습니다',
      );
    }
    const registeredDepositorName = user.bankAccountHolder?.trim() || null;
    if (type === WalletRequestType.DEPOSIT && currency === 'KRW') {
      if (!user.bankCode || !user.bankAccountNumber || !registeredDepositorName) {
        throw new BadRequestException(
          '입금 신청 전 등록 계좌를 먼저 저장해주세요',
        );
      }
      if (dep && dep !== registeredDepositorName) {
        throw new BadRequestException(
          '원화 입금은 등록 계좌 예금주명으로만 신청할 수 있습니다',
        );
      }
      // 1시간 이내 중복 PENDING 입금 신청 차단
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await this.prisma.walletRequest.findFirst({
        where: {
          userId,
          platformId,
          type: WalletRequestType.DEPOSIT,
          status: WalletRequestStatus.PENDING,
          currency: 'KRW',
          createdAt: { gte: oneHourAgo },
        },
      });
      if (existing) {
        throw new ConflictException(
          '진행 중인 입금 신청이 있습니다. 취소 후 다시 신청하세요.',
        );
      }
    }

    const created = await this.prisma.walletRequest.create({
      data: {
        platformId,
        userId,
        type,
        amount,
        currency,
        note: note?.trim() || null,
        depositorName:
          type === WalletRequestType.DEPOSIT && currency === 'KRW'
            ? registeredDepositorName
            : null,
        status: WalletRequestStatus.PENDING,
      },
    });

    // KRW 입금 신청 시 플랫폼 입금 계좌 정보 함께 반환
    if (type === WalletRequestType.DEPOSIT && currency === 'KRW') {
      const plat = await this.prisma.platform.findUnique({
        where: { id: platformId },
        select: {
          semiVirtualBankName: true,
          semiVirtualAccountNumber: true,
          semiVirtualAccountHolder: true,
        },
      });
      return {
        ...created,
        depositAccount: {
          bankName: plat?.semiVirtualBankName ?? null,
          accountNumber: plat?.semiVirtualAccountNumber ?? null,
          accountHolder: plat?.semiVirtualAccountHolder ?? null,
        },
        expiresAt: new Date(created.createdAt.getTime() + 60 * 60 * 1000).toISOString(),
      };
    }

    return created;
  }

  /** 유저가 자신의 PENDING 입금 신청 취소 */
  async cancelMine(userId: string, requestId: string) {
    const req = await this.prisma.walletRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: WalletRequestStatus.PENDING,
        type: WalletRequestType.DEPOSIT,
      },
    });
    if (!req) throw new NotFoundException('취소할 수 있는 신청 내역이 없습니다');
    await this.prisma.walletRequest.update({
      where: { id: requestId },
      data: { status: WalletRequestStatus.REJECTED, note: '회원 취소' },
    });
    return { ok: true };
  }

  /** 1시간 이내 PENDING KRW 입금 신청 + 플랫폼 계좌 반환 */
  async getActivePendingDeposit(userId: string, platformId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const req = await this.prisma.walletRequest.findFirst({
      where: {
        userId,
        platformId,
        type: WalletRequestType.DEPOSIT,
        status: WalletRequestStatus.PENDING,
        currency: 'KRW',
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!req) return null;
    const plat = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        semiVirtualBankName: true,
        semiVirtualAccountNumber: true,
        semiVirtualAccountHolder: true,
      },
    });
    return {
      request: req,
      depositAccount: {
        bankName: plat?.semiVirtualBankName ?? null,
        accountNumber: plat?.semiVirtualAccountNumber ?? null,
        accountHolder: plat?.semiVirtualAccountHolder ?? null,
      },
      expiresAt: new Date(req.createdAt.getTime() + 60 * 60 * 1000).toISOString(),
    };
  }

  listMine(userId: string) {
    return this.prisma.walletRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listForPlatform(
    platformId: string,
    actor: JwtPayload,
    status?: WalletRequestStatus,
    currency?: string,
  ) {
    this.assertPlatformAdmin(actor, platformId);
    return this.prisma.walletRequest.findMany({
      where: {
        platformId,
        ...(status ? { status } : {}),
        ...(currency ? { currency } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            loginId: true,
            email: true,
            displayName: true,
            signupMode: true,
            bankCode: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
            usdtWalletAddress: true,
          },
        },
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
      const requestCurrency =
        req.currency === 'USDT' ? ('USDT' as const) : ('KRW' as const);
      const walletDeltaBase = await this.toWalletKrwAmount(amount, requestCurrency);
      let delta: Prisma.Decimal;
      if (req.type === WalletRequestType.DEPOSIT) {
        delta = walletDeltaBase;
      } else {
        delta = walletDeltaBase.negated();
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
            requestCurrency,
            requestAmount: amount.toFixed(2),
            walletKrwAmount: walletDeltaBase.toFixed(2),
          },
        },
      });
      if (req.type === WalletRequestType.DEPOSIT) {
        await this.rolling.createObligationIfNeeded(tx, {
          userId: req.userId,
          platformId,
          depositAmount: walletDeltaBase,
          sourceRef: `wr:${req.id}:principal`,
        });
        await this.depositEvents.applyEligibleBonus(tx, {
          userId: req.userId,
          platformId,
          depositAmount: walletDeltaBase,
          ledgerRefPrefix: `wr:${req.id}`,
        });
        await this.points.maybeCreditDepositPoints(tx, {
          userId: req.userId,
          platformId,
          depositAmount: walletDeltaBase,
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
