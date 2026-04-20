import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';

export type AccountInput = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  memo?: string | null;
  sortOrder?: number | null;
};

/**
 * 반가상 입금 계좌 번들 관리.
 * - 각 플랫폼은 "현재(CURRENT) 번들" 1개를 가진다.
 * - 새 번들을 만들면 이전 번들은 RETIRED 로 이동한다(삭제 X). 과거 계좌로 입금하는
 *   회원을 식별하기 위함.
 * - Platform 의 레거시 flat 필드(semiVirtualBankName/AccountNumber/AccountHolder)는
 *   CURRENT 번들의 첫 계좌 값으로 계속 미러링한다.
 */
@Injectable()
export class SemiVirtualBundlesService {
  constructor(private prisma: PrismaService) {}

  private assertPlatformScope(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (
      actor.role === UserRole.PLATFORM_ADMIN &&
      actor.platformId === platformId
    ) {
      return;
    }
    throw new ForbiddenException();
  }

  private serializeAccount(
    a: {
      id: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      memo: string | null;
      sortOrder: number;
      createdAt: Date;
    },
  ) {
    return {
      id: a.id,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      accountHolder: a.accountHolder,
      memo: a.memo,
      sortOrder: a.sortOrder,
      createdAt: a.createdAt.toISOString(),
    };
  }

  private async getCurrentBundleWithAccounts(platformId: string) {
    return this.prisma.semiVirtualBundle.findFirst({
      where: { platformId, status: 'CURRENT' },
      orderBy: { createdAt: 'desc' },
      include: {
        accounts: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
  }

  async listForPlatform(platformId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    const bundles = await this.prisma.semiVirtualBundle.findMany({
      where: { platformId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        accounts: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    return bundles.map((b) => ({
      id: b.id,
      platformId: b.platformId,
      label: b.label,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      retiredAt: b.retiredAt?.toISOString() ?? null,
      retiredReason: b.retiredReason,
      accounts: b.accounts.map((a) => this.serializeAccount(a)),
    }));
  }

  async getCurrent(platformId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    const bundle = await this.getCurrentBundleWithAccounts(platformId);
    if (!bundle) return null;
    return {
      id: bundle.id,
      platformId: bundle.platformId,
      label: bundle.label,
      status: bundle.status,
      createdAt: bundle.createdAt.toISOString(),
      retiredAt: null,
      retiredReason: null,
      accounts: bundle.accounts.map((a) => this.serializeAccount(a)),
    };
  }

  async createBundle(
    platformId: string,
    actor: JwtPayload,
    body: { label?: string | null; accounts: AccountInput[] },
  ) {
    this.assertPlatformScope(actor, platformId);
    if (!Array.isArray(body.accounts) || body.accounts.length === 0) {
      throw new BadRequestException('계좌를 1개 이상 등록해 주세요');
    }
    const cleaned: AccountInput[] = body.accounts.map((a, index) => {
      const bankName = a.bankName?.trim() ?? '';
      const accountNumber = a.accountNumber?.trim() ?? '';
      const accountHolder = a.accountHolder?.trim() ?? '';
      if (!bankName || !accountNumber || !accountHolder) {
        throw new BadRequestException(
          `계좌 #${index + 1}: 은행명·계좌번호·예금주는 필수입니다`,
        );
      }
      return {
        bankName,
        accountNumber,
        accountHolder,
        memo: a.memo?.trim() || null,
        sortOrder:
          typeof a.sortOrder === 'number' && Number.isFinite(a.sortOrder)
            ? Math.trunc(a.sortOrder)
            : index,
      };
    });

    const label = body.label?.trim() || null;

    const primary = cleaned[0];

    return this.prisma.$transaction(async (tx) => {
      await tx.semiVirtualBundle.updateMany({
        where: { platformId, status: 'CURRENT' },
        data: {
          status: 'RETIRED',
          retiredAt: new Date(),
          retiredReason: '신규 번들 등록으로 자동 보존',
        },
      });

      const bundle = await tx.semiVirtualBundle.create({
        data: {
          platformId,
          label,
          status: 'CURRENT',
          createdByUserId: actor.sub ?? null,
          accounts: {
            create: cleaned.map((a) => ({
              platformId,
              bankName: a.bankName,
              accountNumber: a.accountNumber,
              accountHolder: a.accountHolder,
              memo: a.memo ?? null,
              sortOrder: a.sortOrder ?? 0,
            })),
          },
        },
        include: {
          accounts: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        },
      });

      await tx.platform.update({
        where: { id: platformId },
        data: {
          semiVirtualBankName: primary.bankName,
          semiVirtualAccountNumber: primary.accountNumber,
          semiVirtualAccountHolder: primary.accountHolder,
        },
      });

      return {
        id: bundle.id,
        platformId: bundle.platformId,
        label: bundle.label,
        status: bundle.status,
        createdAt: bundle.createdAt.toISOString(),
        retiredAt: null,
        retiredReason: null,
        accounts: bundle.accounts.map((a) => this.serializeAccount(a)),
      };
    });
  }

  /** 특정 번들의 상태를 변경 (수동 폐기/복원 등 슈퍼어드민 전용) */
  async retireBundle(
    platformId: string,
    bundleId: string,
    actor: JwtPayload,
    reason?: string,
  ) {
    this.assertPlatformScope(actor, platformId);
    const bundle = await this.prisma.semiVirtualBundle.findFirst({
      where: { id: bundleId, platformId },
    });
    if (!bundle) throw new NotFoundException();
    if (bundle.status === 'RETIRED') return { ok: true };

    await this.prisma.semiVirtualBundle.update({
      where: { id: bundleId },
      data: {
        status: 'RETIRED',
        retiredAt: new Date(),
        retiredReason: reason?.trim() || null,
      },
    });
    return { ok: true };
  }

  /** 슈퍼어드민 전용: 모든 플랫폼의 번들 & 계좌 집계 */
  async listAllForSuperAdmin(actor: JwtPayload, onlyCurrent = false) {
    if (actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException();
    const where: Prisma.SemiVirtualBundleWhereInput = onlyCurrent
      ? { status: 'CURRENT' }
      : {};
    const bundles = await this.prisma.semiVirtualBundle.findMany({
      where,
      orderBy: [{ platformId: 'asc' }, { createdAt: 'desc' }],
      include: {
        accounts: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        platform: { select: { id: true, name: true, slug: true } },
      },
    });

    return bundles.map((b) => ({
      id: b.id,
      platformId: b.platformId,
      platform: b.platform
        ? { id: b.platform.id, name: b.platform.name, slug: b.platform.slug }
        : null,
      label: b.label,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      retiredAt: b.retiredAt?.toISOString() ?? null,
      retiredReason: b.retiredReason,
      accounts: b.accounts.map((a) => this.serializeAccount(a)),
    }));
  }
}
