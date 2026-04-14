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
import { PrismaService } from '../prisma/prisma.service';
import { UpbitRateService } from './upbit-rate.service';
import { TrongridService } from './trongrid.service';
import { RollingObligationService } from '../rolling/rolling-obligation.service';
import { DepositEventsService } from '../deposit-events/deposit-events.service';
import { PointsService } from '../points/points.service';

@Injectable()
export class UsdtDepositService {
  private readonly log = new Logger(UsdtDepositService.name);

  constructor(
    private prisma: PrismaService,
    private upbit: UpbitRateService,
    private trongrid: TrongridService,
    private rolling: RollingObligationService,
    private depositEvents: DepositEventsService,
    private points: PointsService,
  ) {}

  /** 모든 플랫폼의 USDT 입금을 폴링·처리 */
  async pollAllPlatforms(): Promise<void> {
    const platforms = await this.prisma.platform.findMany({
      where: { settlementUsdtWallet: { not: null } },
      select: {
        id: true,
        settlementUsdtWallet: true,
        minDepositUsdt: true,
      },
    });

    if (platforms.length === 0) return;

    const krwRate = await this.upbit.getKrwPerUsdt();

    for (const platform of platforms) {
      try {
        await this.pollPlatform(platform, krwRate);
      } catch (e) {
        this.log.error(
          `플랫폼 ${platform.id} USDT 폴링 실패: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }

  private async pollPlatform(
    platform: {
      id: string;
      settlementUsdtWallet: string | null;
      minDepositUsdt: Prisma.Decimal | null;
    },
    krwRate: Prisma.Decimal,
  ) {
    const wallet = platform.settlementUsdtWallet!;

    // 마지막 처리된 tx의 blockTimestamp 이후만 조회
    const lastTx = await this.prisma.usdtDepositTx.findFirst({
      where: { platformId: platform.id },
      orderBy: { blockTimestamp: 'desc' },
      select: { blockTimestamp: true },
    });
    const since = lastTx?.blockTimestamp
      ? lastTx.blockTimestamp.getTime() + 1
      : undefined;

    const txs = await this.trongrid.fetchIncomingUsdtTxs(wallet, since);
    if (txs.length === 0) return;

    for (const tx of txs) {
      await this.processTx(tx, platform, krwRate);
    }
  }

  private async processTx(
    tx: import('./trongrid.service').TrongridTrc20Tx,
    platform: {
      id: string;
      settlementUsdtWallet: string | null;
      minDepositUsdt: Prisma.Decimal | null;
    },
    krwRate: Prisma.Decimal,
  ) {
    // 중복 처리 방지
    const exists = await this.prisma.usdtDepositTx.findUnique({
      where: { txHash: tx.transaction_id },
    });
    if (exists) return;

    const decimals = tx.token_info?.decimals ?? 6;
    const usdtAmount = new Prisma.Decimal(tx.value).div(
      new Prisma.Decimal(10).pow(decimals),
    );
    const krwAmount = usdtAmount.times(krwRate).toDecimalPlaces(2);
    const blockTs = tx.block_timestamp
      ? new Date(tx.block_timestamp)
      : new Date();

    // 보낸 주소로 유저 매칭
    const user = await this.prisma.user.findFirst({
      where: {
        platformId: platform.id,
        usdtWalletAddress: { equals: tx.from, mode: 'insensitive' },
        signupMode: 'anonymous',
        role: UserRole.USER,
        registrationStatus: RegistrationStatus.APPROVED,
      },
      select: { id: true },
    });

    if (!user) {
      // 매칭 유저 없음 — 기록만
      await this.prisma.usdtDepositTx.create({
        data: {
          txHash: tx.transaction_id,
          platformId: platform.id,
          fromAddress: tx.from,
          toAddress: tx.to,
          usdtAmount,
          krwRate,
          krwAmount,
          status: UsdtDepositTxStatus.UNMATCHED,
          blockTimestamp: blockTs,
        },
      });
      this.log.warn(
        `USDT 입금 미매칭: ${tx.from} → ${usdtAmount} USDT (tx: ${tx.transaction_id})`,
      );
      return;
    }

    const minUsdt = platform.minDepositUsdt ?? new Prisma.Decimal(0);
    const isBelowMin = usdtAmount.lt(minUsdt);

    if (isBelowMin) {
      // 최소 미달 → PENDING WalletRequest 생성, 관리자 판단
      const wr = await this.prisma.walletRequest.create({
        data: {
          platformId: platform.id,
          userId: user.id,
          type: WalletRequestType.DEPOSIT,
          amount: usdtAmount,
          currency: 'USDT',
          status: WalletRequestStatus.PENDING,
          note: `USDT 온체인 입금 (최소 미달: ${minUsdt} USDT 기준) | tx: ${tx.transaction_id}`,
        },
      });
      await this.prisma.usdtDepositTx.create({
        data: {
          txHash: tx.transaction_id,
          platformId: platform.id,
          fromAddress: tx.from,
          toAddress: tx.to,
          usdtAmount,
          krwRate,
          krwAmount,
          status: UsdtDepositTxStatus.PENDING,
          userId: user.id,
          walletRequestId: wr.id,
          blockTimestamp: blockTs,
        },
      });
      this.log.log(
        `USDT 입금 대기: ${user.id} | ${usdtAmount} USDT (최소 ${minUsdt}) | tx: ${tx.transaction_id}`,
      );
      return;
    }

    // 최소 이상 → 자동 크레딧
    await this.prisma.$transaction(async (tx2) => {
      const wallet = await tx2.wallet.findUnique({
        where: { userId: user.id },
      });
      if (!wallet) {
        this.log.warn(`지갑 없음: userId=${user.id}`);
        return;
      }

      const wr = await tx2.walletRequest.create({
        data: {
          platformId: platform.id,
          userId: user.id,
          type: WalletRequestType.DEPOSIT,
          amount: usdtAmount,
          currency: 'USDT',
          status: WalletRequestStatus.APPROVED,
          resolvedAt: new Date(),
          note: `USDT 온체인 자동 입금 | tx: ${tx.transaction_id}`,
          resolverNote: `업비트 환율 ${krwRate.toFixed(2)} 원/USDT → ${krwAmount.toFixed(0)} 원`,
        },
      });

      const newBal = wallet.balance.plus(krwAmount);
      await tx2.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBal },
      });

      await tx2.ledgerEntry.create({
        data: {
          userId: user.id,
          platformId: platform.id,
          type: LedgerEntryType.DEPOSIT,
          amount: krwAmount,
          balanceAfter: newBal,
          reference: `usdt:${tx.transaction_id}`,
          metaJson: {
            usdtAmount: usdtAmount.toFixed(8),
            krwRate: krwRate.toFixed(2),
            txHash: tx.transaction_id,
            fromAddress: tx.from,
          },
        },
      });

      await tx2.usdtDepositTx.create({
        data: {
          txHash: tx.transaction_id,
          platformId: platform.id,
          fromAddress: tx.from,
          toAddress: tx.to,
          usdtAmount,
          krwRate,
          krwAmount,
          status: UsdtDepositTxStatus.AUTO_CREDITED,
          userId: user.id,
          walletRequestId: wr.id,
          blockTimestamp: blockTs,
        },
      });

      // 롤링 의무 / 입금 이벤트 / 포인트 (WalletRequestsService와 동일 로직)
      await this.rolling.createObligationIfNeeded(tx2, {
        userId: user.id,
        platformId: platform.id,
        depositAmount: krwAmount,
        sourceRef: `usdt:${tx.transaction_id}:principal`,
      });
      await this.depositEvents.applyEligibleBonus(tx2, {
        userId: user.id,
        platformId: platform.id,
        depositAmount: krwAmount,
        ledgerRefPrefix: `usdt:${tx.transaction_id}`,
      });
      await this.points.maybeCreditDepositPoints(tx2, {
        userId: user.id,
        platformId: platform.id,
        depositAmount: krwAmount,
        ledgerRefPrefix: `usdt:${tx.transaction_id}`,
      });
    });

    this.log.log(
      `USDT 자동 크레딧: ${user.id} | ${usdtAmount} USDT → ${krwAmount} 원 (tx: ${tx.transaction_id})`,
    );
  }

  /** 관리자: 플랫폼의 USDT 입금 트랜잭션 목록 */
  async listTxs(platformId: string, status?: UsdtDepositTxStatus) {
    return this.prisma.usdtDepositTx.findMany({
      where: { platformId, ...(status ? { status } : {}) },
      include: {
        user: { select: { id: true, loginId: true, displayName: true } },
        walletRequest: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
