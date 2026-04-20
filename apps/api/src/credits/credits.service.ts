import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── HQ Vendor Deposits ── */

  async addVendorDeposit(amountKrw: number, note: string | null, createdByUserId: string) {
    return this.prisma.hqVendorDeposit.create({
      data: {
        amountKrw: new Decimal(amountKrw),
        note,
        createdByUserId,
      },
    });
  }

  async listVendorDeposits(limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.hqVendorDeposit.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.hqVendorDeposit.count(),
    ]);
    return { items, total };
  }

  async deleteVendorDeposit(id: string) {
    return this.prisma.hqVendorDeposit.delete({ where: { id } });
  }

  /* ── Credit Requests ── */

  async listCreditRequests(status?: string, platformId?: string, limit = 50, offset = 0) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (platformId) where.platformId = platformId;

    const [items, total] = await Promise.all([
      this.prisma.platformCreditRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          platform: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.platformCreditRequest.count({ where }),
    ]);
    return { items, total };
  }

  async createCreditRequest(
    platformId: string,
    requestedAmountKrw: number,
    requesterNote: string | null,
  ) {
    return this.prisma.platformCreditRequest.create({
      data: {
        platformId,
        requestedAmountKrw: new Decimal(requestedAmountKrw),
        requesterNote,
        status: 'PENDING',
      },
      include: {
        platform: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async resolveCreditRequest(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    approvedAmountKrw: number | null,
    adminNote: string | null,
    resolvedByUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.platformCreditRequest.findUnique({
        where: { id },
        select: { platformId: true, status: true },
      });
      if (!request) throw new Error('Credit request not found');

      const updated = await tx.platformCreditRequest.update({
        where: { id },
        data: {
          status,
          approvedAmountKrw: approvedAmountKrw != null ? new Decimal(approvedAmountKrw) : null,
          adminNote,
          resolvedAt: new Date(),
          resolvedByUserId,
        },
        include: {
          platform: { select: { id: true, name: true, slug: true } },
        },
      });

      // APPROVE 시 Platform.creditBalance 증가 (이미 APPROVED 상태이면 중복 반영 방지)
      // 동시에 reserveInitialAmount(알 상한) 도 같은 금액만큼 증가시켜 invariant 유지.
      if (status === 'APPROVED' && approvedAmountKrw != null && request.status !== 'APPROVED') {
        const delta = new Decimal(approvedAmountKrw);
        await tx.platform.update({
          where: { id: request.platformId },
          data: {
            creditBalance: { increment: delta },
            reserveInitialAmount: { increment: delta },
          },
        });
      }

      return updated;
    });
  }

  /* ── Summary ── */

  async getSummary() {
    const [deposits, approvedRequests, pendingRequests] = await Promise.all([
      this.prisma.hqVendorDeposit.aggregate({ _sum: { amountKrw: true } }),
      this.prisma.platformCreditRequest.aggregate({
        where: { status: 'APPROVED' },
        _sum: { approvedAmountKrw: true },
      }),
      this.prisma.platformCreditRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const totalDeposited = Number(deposits._sum.amountKrw ?? 0);
    const totalAllocated = Number(approvedRequests._sum.approvedAmountKrw ?? 0);
    const remaining = totalDeposited - totalAllocated;

    return {
      totalDeposited,
      totalAllocated,
      remaining,
      pendingRequestCount: pendingRequests,
    };
  }

  /* ── Per-platform summary ── */

  async getPlatformCreditSummary() {
    const platforms = await this.prisma.platform.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    const allocations = await this.prisma.platformCreditRequest.groupBy({
      by: ['platformId'],
      where: { status: 'APPROVED' },
      _sum: { approvedAmountKrw: true },
      _count: true,
    });

    const allocationMap = new Map(
      allocations.map((a) => [a.platformId, Number(a._sum.approvedAmountKrw ?? 0)]),
    );

    return platforms.map((p) => ({
      ...p,
      totalAllocated: allocationMap.get(p.id) ?? 0,
    }));
  }
}
