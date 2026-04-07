import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RegistrationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  private assertAdmin(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (actor.role === UserRole.PLATFORM_ADMIN && actor.platformId === platformId)
      return;
    throw new ForbiddenException();
  }

  listPending(platformId: string, actor: JwtPayload) {
    this.assertAdmin(actor, platformId);
    return this.prisma.user.findMany({
      where: {
        platformId,
        role: UserRole.USER,
        registrationStatus: RegistrationStatus.PENDING,
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        displayName: true,
        parentUserId: true,
        createdAt: true,
        parent: {
          select: {
            id: true,
            loginId: true,
            displayName: true,
            email: true,
            referralCode: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** 사이드바 배지·총판별 탭용 집계 */
  async pendingSummary(platformId: string, actor: JwtPayload) {
    this.assertAdmin(actor, platformId);
    const list = await this.prisma.user.findMany({
      where: {
        platformId,
        role: UserRole.USER,
        registrationStatus: RegistrationStatus.PENDING,
      },
      select: {
        parentUserId: true,
        parent: {
          select: {
            id: true,
            loginId: true,
            displayName: true,
            email: true,
            referralCode: true,
          },
        },
      },
    });
    const total = list.length;
    type G = {
      parentUserId: string | null;
      label: string;
      referralCode: string | null;
      count: number;
    };
    const map = new Map<string, G>();
    for (const r of list) {
      const key = r.parentUserId ?? '__none__';
      const label = r.parent
        ? r.parent.displayName?.trim() ||
          r.parent.loginId ||
          r.parent.email ||
          r.parent.id
        : '무소속';
      const referralCode = r.parent?.referralCode ?? null;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          parentUserId: r.parentUserId,
          label,
          referralCode,
          count: 1,
        });
      } else {
        cur.count += 1;
      }
    }
    const groups = [...map.values()].sort((a, b) => b.count - a.count);
    return { total, groups };
  }

  async approve(platformId: string, userId: string, actor: JwtPayload) {
    this.assertAdmin(actor, platformId);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: userId,
          platformId,
          role: UserRole.USER,
          registrationStatus: RegistrationStatus.PENDING,
        },
      });
      if (!user) throw new NotFoundException();
      await tx.user.update({
        where: { id: userId },
        data: {
          registrationStatus: RegistrationStatus.APPROVED,
          registrationResolvedAt: new Date(),
        },
      });
      const existingWallet = await tx.wallet.findUnique({
        where: { userId },
      });
      if (!existingWallet) {
        await tx.wallet.create({
          data: { userId, platformId, balance: 0 },
        });
      }
      return { ok: true };
    });
  }

  async reject(platformId: string, userId: string, actor: JwtPayload) {
    this.assertAdmin(actor, platformId);
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        platformId,
        role: UserRole.USER,
        registrationStatus: RegistrationStatus.PENDING,
      },
    });
    if (!user) throw new NotFoundException();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        registrationStatus: RegistrationStatus.REJECTED,
        registrationResolvedAt: new Date(),
      },
    });
    return { ok: true };
  }

  listRegistrationHistory(platformId: string, actor: JwtPayload) {
    this.assertAdmin(actor, platformId);
    return this.prisma.user.findMany({
      where: {
        platformId,
        role: UserRole.USER,
        registrationStatus: {
          in: [RegistrationStatus.APPROVED, RegistrationStatus.REJECTED],
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        registrationStatus: true,
        registrationResolvedAt: true,
        createdAt: true,
        parent: {
          select: {
            id: true,
            displayName: true,
            email: true,
            referralCode: true,
          },
        },
      },
      orderBy: [{ registrationResolvedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
    });
  }
}
