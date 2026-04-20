import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';

type MatchReason = 'phone' | 'loginId' | 'displayName' | 'bankAccount';

export type SimilarUserMatch = {
  userId: string;
  platformId: string | null;
  platformName: string | null;
  platformSlug: string | null;
  loginId: string | null;
  displayName: string | null;
  phone: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  /** 일치한 필드들 */
  matches: MatchReason[];
  /** 일치 개수 (matches.length) */
  matchCount: number;
};

/**
 * 블랙리스트 관리:
 *  1) 플랫폼별 회원 차단/해제
 *  2) 플랫폼 교차 유사도 검색 — 전화·아이디·예금주명·표시명·계좌번호 중
 *     2개 이상 일치 시 "의심" 매치로 반환 (회원가입 승인 플로우에서 감지용)
 */
@Injectable()
export class BlacklistService {
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

  /** 플랫폼의 차단 유저 목록 + 사유 */
  async listBlockedForPlatform(platformId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    const users = await this.prisma.user.findMany({
      where: { platformId, isBlocked: true },
      orderBy: { blockedAt: 'desc' },
      select: {
        id: true,
        loginId: true,
        email: true,
        displayName: true,
        phone: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        isBlocked: true,
        blockedReason: true,
        blockedAt: true,
        blockedByUserId: true,
      },
    });

    const blockerIds = Array.from(
      new Set(users.map((u) => u.blockedByUserId).filter(Boolean) as string[]),
    );
    const blockers = blockerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: blockerIds } },
          select: { id: true, loginId: true, displayName: true },
        })
      : [];
    const blockerMap = new Map(blockers.map((b) => [b.id, b]));

    return users.map((u) => ({
      id: u.id,
      loginId: u.loginId,
      email: u.email,
      displayName: u.displayName,
      phone: u.phone,
      bankAccountNumber: u.bankAccountNumber,
      bankAccountHolder: u.bankAccountHolder,
      isBlocked: u.isBlocked,
      blockedReason: u.blockedReason,
      blockedAt: u.blockedAt?.toISOString() ?? null,
      blockedByUserId: u.blockedByUserId,
      blockedByLoginId: u.blockedByUserId
        ? blockerMap.get(u.blockedByUserId)?.loginId ?? null
        : null,
    }));
  }

  /** HQ: 전 솔루션 차단 회원 집계 */
  async listAllBlockedForHq(actor: JwtPayload) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    const users = await this.prisma.user.findMany({
      where: { isBlocked: true, platformId: { not: null } },
      orderBy: { blockedAt: 'desc' },
      select: {
        id: true,
        loginId: true,
        email: true,
        displayName: true,
        phone: true,
        platformId: true,
        blockedReason: true,
        blockedAt: true,
        blockedByUserId: true,
        platform: { select: { id: true, slug: true, name: true } },
      },
    });
    const blockerIds = Array.from(
      new Set(users.map((u) => u.blockedByUserId).filter(Boolean) as string[]),
    );
    const blockers = blockerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: blockerIds } },
          select: { id: true, loginId: true },
        })
      : [];
    const blockerMap = new Map(blockers.map((b) => [b.id, b]));
    return users.map((u) => ({
      id: u.id,
      loginId: u.loginId,
      email: u.email,
      displayName: u.displayName,
      phone: u.phone,
      platformId: u.platformId,
      platform: u.platform,
      blockedReason: u.blockedReason,
      blockedAt: u.blockedAt?.toISOString() ?? null,
      blockedByUserId: u.blockedByUserId,
      blockedByLoginId: u.blockedByUserId
        ? blockerMap.get(u.blockedByUserId)?.loginId ?? null
        : null,
    }));
  }

  async block(
    platformId: string,
    targetUserId: string,
    actor: JwtPayload,
    reason?: string,
  ) {
    this.assertPlatformScope(actor, platformId);
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException();
    if (target.role !== UserRole.USER) {
      throw new BadRequestException('일반 회원만 차단할 수 있습니다');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBlocked: true,
        blockedReason: reason?.trim() || null,
        blockedAt: new Date(),
        blockedByUserId: actor.sub ?? null,
      },
    });
    return { ok: true };
  }

  async unblock(platformId: string, targetUserId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException();

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBlocked: false,
        blockedReason: null,
        blockedAt: null,
        blockedByUserId: null,
      },
    });
    return { ok: true };
  }

  /**
   * 플랫폼 교차 유사 회원 검색.
   * 다음 6개 키 중 2개 이상이 일치하는 타 플랫폼 회원(차단 여부 불문)을 반환.
   *  - phone
   *  - loginId
   *  - displayName (trim)
   *  - bankAccountNumber
   *  - bankAccountHolder (trim)
   *
   * @param opts.platformId 호출 플랫폼(자기 자신) — 결과에서 제외
   * @param opts.blockedOnly true 면 isBlocked=true 인 타 플랫폼 회원만 반환
   */
  async findSimilarAcrossPlatforms(
    actor: JwtPayload,
    opts: {
      platformId?: string | null;
      loginId?: string | null;
      phone?: string | null;
      displayName?: string | null;
      bankAccountNumber?: string | null;
      bankAccountHolder?: string | null;
      blockedOnly?: boolean;
      limit?: number;
    },
  ): Promise<SimilarUserMatch[]> {
    // PLATFORM_ADMIN 은 자기 플랫폼 이외의 결과도 "경고 목적"으로만 일부 필드 조회 허용.
    // SUPER_ADMIN 은 전부 허용.
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }

    const keys: Array<{ kind: MatchReason; value: string }> = [];
    const phone = opts.phone?.trim();
    const loginId = opts.loginId?.trim();
    const displayName = opts.displayName?.trim();
    const bankAccountNumber = opts.bankAccountNumber?.trim();
    const bankAccountHolder = opts.bankAccountHolder?.trim();
    if (phone) keys.push({ kind: 'phone', value: phone });
    if (loginId) keys.push({ kind: 'loginId', value: loginId });
    if (displayName) keys.push({ kind: 'displayName', value: displayName });
    if (bankAccountNumber)
      keys.push({ kind: 'bankAccount', value: bankAccountNumber });
    if (bankAccountHolder)
      keys.push({ kind: 'displayName', value: bankAccountHolder }); // holder ≈ 이름

    if (keys.length === 0) return [];

    const excludePlatformId = opts.platformId ?? null;

    const candidates = await this.prisma.user.findMany({
      where: {
        ...(excludePlatformId
          ? { NOT: { platformId: excludePlatformId } }
          : {}),
        ...(opts.blockedOnly ? { isBlocked: true } : {}),
        OR: [
          phone ? { phone: phone } : null,
          loginId ? { loginId: loginId } : null,
          displayName ? { displayName: displayName } : null,
          bankAccountNumber ? { bankAccountNumber: bankAccountNumber } : null,
          bankAccountHolder
            ? { bankAccountHolder: bankAccountHolder }
            : null,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        platformId: true,
        loginId: true,
        displayName: true,
        phone: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        isBlocked: true,
        blockedReason: true,
        blockedAt: true,
        platform: { select: { id: true, name: true, slug: true } },
      },
      take: Math.min(200, opts.limit ?? 50),
    });

    const results: SimilarUserMatch[] = [];
    for (const c of candidates) {
      const matches = new Set<MatchReason>();
      if (phone && c.phone && c.phone === phone) matches.add('phone');
      if (loginId && c.loginId && c.loginId === loginId) matches.add('loginId');
      if (
        displayName &&
        c.displayName &&
        c.displayName.trim() === displayName
      ) {
        matches.add('displayName');
      }
      if (
        bankAccountNumber &&
        c.bankAccountNumber &&
        c.bankAccountNumber === bankAccountNumber
      ) {
        matches.add('bankAccount');
      }
      if (
        bankAccountHolder &&
        c.bankAccountHolder &&
        c.bankAccountHolder.trim() === bankAccountHolder
      ) {
        matches.add('displayName');
      }
      if (matches.size >= 2) {
        results.push({
          userId: c.id,
          platformId: c.platformId,
          platformName: c.platform?.name ?? null,
          platformSlug: c.platform?.slug ?? null,
          loginId: c.loginId,
          displayName: c.displayName,
          phone: c.phone,
          bankAccountNumber: c.bankAccountNumber,
          bankAccountHolder: c.bankAccountHolder,
          isBlocked: c.isBlocked,
          blockedReason: c.blockedReason,
          blockedAt: c.blockedAt?.toISOString() ?? null,
          matches: Array.from(matches),
          matchCount: matches.size,
        });
      }
    }
    results.sort((a, b) => b.matchCount - a.matchCount);
    return results;
  }
}
