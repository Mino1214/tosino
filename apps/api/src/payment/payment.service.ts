import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RollingObligationService } from '../rolling/rolling-obligation.service';
import { DepositEventsService } from '../deposit-events/deposit-events.service';
import { PointsService } from '../points/points.service';
import {
  pickBucketState,
  WalletBucketsService,
} from '../wallet-buckets/wallet-buckets.service';

export interface PaymentWebhookPayload {
  eventId: string;
  userId: string;
  platformId: string;
  amount: string;
  status: 'completed' | 'failed' | 'refunded';
  kind: 'deposit' | 'withdrawal';
}

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private rolling: RollingObligationService,
    private depositEvents: DepositEventsService,
    private points: PointsService,
    private buckets: WalletBucketsService,
  ) {}

  verifySignature(rawBody: Buffer, signatureHeader: string | undefined) {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Webhook not configured');
    if (!signatureHeader) throw new UnauthorizedException('Missing signature');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  async handleWebhook(payload: PaymentWebhookPayload) {
    const idemKey = payload.eventId;
    if (
      payload.status === 'completed' &&
      payload.kind === 'withdrawal'
    ) {
      await this.rolling.assertWithdrawalAllowed(payload.userId);
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.idempotencyKey.findUnique({
        where: {
          platformId_key: {
            platformId: payload.platformId,
            key: idemKey,
          },
        },
      });
      if (existing?.responseJson) {
        return existing.responseJson as Record<string, unknown>;
      }
      if (payload.status !== 'completed') {
        const snap = { ok: true, ignored: true, reason: payload.status };
        await tx.idempotencyKey.create({
          data: {
            platformId: payload.platformId,
            key: idemKey,
            responseJson: snap as object,
          },
        });
        return snap;
      }
      const amount = new Prisma.Decimal(payload.amount);
      if (amount.lte(0)) throw new BadRequestException('Invalid amount');
      const wallet = await tx.wallet.findUnique({
        where: { userId: payload.userId },
      });
      if (!wallet || wallet.platformId !== payload.platformId) {
        throw new BadRequestException('Wallet mismatch');
      }
      const wb = pickBucketState(wallet);
      let nextBuckets;
      if (payload.kind === 'deposit') {
        nextBuckets = this.buckets.creditLockedDeposit(wb, amount);
      } else {
        this.buckets.assertSufficientTotal(wb, amount);
        nextBuckets = this.buckets.applyWithdraw(wb, amount);
      }
      const { balance: newBal } = await this.buckets.persist(tx, wallet.id, nextBuckets);
      const delta =
        payload.kind === 'deposit' ? amount : amount.negated();
      if (newBal.lt(0)) throw new BadRequestException('Insufficient balance');
      await tx.ledgerEntry.create({
        data: {
          userId: payload.userId,
          platformId: payload.platformId,
          type: LedgerEntryType.PAYMENT_WEBHOOK,
          amount: delta,
          balanceAfter: newBal,
          reference: idemKey,
          metaJson: { kind: payload.kind },
        },
      });
      if (payload.kind === 'deposit') {
        await this.rolling.createObligationIfNeeded(tx, {
          userId: payload.userId,
          platformId: payload.platformId,
          depositAmount: amount,
          sourceRef: `pay:${idemKey}:principal`,
        });
        await this.depositEvents.applyEligibleBonus(tx, {
          userId: payload.userId,
          platformId: payload.platformId,
          depositAmount: amount,
          ledgerRefPrefix: `pay:${idemKey}`,
        });
        await this.points.maybeCreditDepositPoints(tx, {
          userId: payload.userId,
          platformId: payload.platformId,
          depositAmount: amount,
          ledgerRefPrefix: `pay:${idemKey}`,
        });
      }
      const snap = {
        ok: true,
        balance: newBal.toFixed(2),
        userId: payload.userId,
      };
      await tx.idempotencyKey.create({
        data: {
          platformId: payload.platformId,
          key: idemKey,
          responseJson: snap as object,
        },
      });
      return snap;
    });
    return result;
  }
}
