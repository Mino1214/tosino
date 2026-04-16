import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegistrationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomReferralSegment } from '../common/referral.util';
import { JwtPayload } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateSubAgentDto } from './dto/create-sub-agent.dto';
import { Prisma } from '@prisma/client';
import {
  computeEffectiveAgentShares,
  MasterCommissionNode,
} from '../common/agent-commission.util';
import { UpdateAgentCommissionDto } from './dto/update-agent-commission.dto';
import { RateRevisionService } from '../rate-revision/rate-revision.service';
import { normalizeLoginId } from '../common/login-id.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private rateRevision: RateRevisionService,
  ) {}

  private async generateUniqueReferralCode(
    platformId: string,
  ): Promise<string> {
    for (let i = 0; i < 24; i++) {
      const code = randomReferralSegment(6);
      const existing = await this.prisma.user.findFirst({
        where: { referralCode: code, platformId },
      });
      if (!existing) return code;
    }
    throw new ConflictException('추천 코드를 발급할 수 없습니다');
  }

  private readPointRules(json: unknown): Record<string, unknown> {
    return json && typeof json === 'object' && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  }

  private getUsdtKrwRate(): Prisma.Decimal {
    const raw =
      process.env.USDT_KRW_RATE ??
      process.env.NEXT_PUBLIC_USDT_KRW_RATE ??
      '1488';
    const num = Number(raw);
    return new Prisma.Decimal(Number.isFinite(num) && num > 0 ? num : 1488);
  }

  private assertCanManageRole(actor: JwtPayload, targetRole: UserRole) {
    if (actor.role === UserRole.SUPER_ADMIN) {
      if (targetRole === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Cannot create super admin here');
      }
      return;
    }
    if (actor.role === UserRole.PLATFORM_ADMIN) {
      if (
        targetRole !== UserRole.MASTER_AGENT &&
        targetRole !== UserRole.USER
      ) {
        throw new ForbiddenException();
      }
      return;
    }
    throw new ForbiddenException();
  }

  async list(platformId: string, actor: JwtPayload) {
    this.assertPlatformAccess(actor, platformId);
    const rows = await this.prisma.user.findMany({
      where: { platformId },
      select: {
        id: true,
        loginId: true,
        email: true,
        role: true,
        platformId: true,
        parentUserId: true,
        referredByUserId: true,
        displayName: true,
        signupMode: true,
        signupReferralInput: true,
        usdtWalletAddress: true,
        createdAt: true,
        registrationStatus: true,
        referralCode: true,
        agentMemo: true,
        userMemo: true,
        masterPrivateMemo: true,
        uplinePrivateMemo: true,
        agentPlatformSharePct: true,
        agentSplitFromParentPct: true,
        referredBy: {
          select: {
            id: true,
            loginId: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const roleById = new Map(rows.map((r) => [r.id, r.role]));
    const parentByUserId = new Map(
      rows.map((r) => [r.id, r.parentUserId ?? null]),
    );
    const masterNodes: MasterCommissionNode[] = rows
      .filter((r) => r.role === UserRole.MASTER_AGENT)
      .map((r) => ({
        id: r.id,
        parentUserId: r.parentUserId,
        agentPlatformSharePct: r.agentPlatformSharePct
          ? Number(r.agentPlatformSharePct)
          : null,
        agentSplitFromParentPct: r.agentSplitFromParentPct
          ? Number(r.agentSplitFromParentPct)
          : null,
      }));
    const effectiveMap = computeEffectiveAgentShares(
      masterNodes,
      roleById,
      (uid) => parentByUserId.get(uid) ?? null,
    );
    const isMasterAgentViewer = actor.role === UserRole.MASTER_AGENT;
    const isPlatformStaff =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.PLATFORM_ADMIN;
    return rows.map((r) => ({
      id: r.id,
      loginId: r.loginId,
      email: r.email,
      role: r.role,
      platformId: r.platformId,
      parentUserId: r.parentUserId,
      referredByUserId: r.referredByUserId,
      displayName: r.displayName,
      signupMode: r.signupMode,
      signupReferralInput: r.signupReferralInput,
      usdtWalletAddress: r.usdtWalletAddress,
      createdAt: r.createdAt,
      registrationStatus: r.registrationStatus,
      referralCode: r.referralCode,
      referredBy: r.referredBy,
      agentMemo: r.agentMemo,
      userMemo: r.userMemo,
      masterPrivateMemo: isPlatformStaff ? r.masterPrivateMemo : undefined,
      uplinePrivateMemo:
        isPlatformStaff || (isMasterAgentViewer && r.parentUserId === actor.sub)
          ? r.uplinePrivateMemo
          : undefined,
      agentPlatformSharePct:
        r.agentPlatformSharePct != null
          ? Number(r.agentPlatformSharePct)
          : null,
      agentSplitFromParentPct:
        r.agentSplitFromParentPct != null
          ? Number(r.agentSplitFromParentPct)
          : null,
      effectiveAgentSharePct:
        r.role === UserRole.MASTER_AGENT
          ? Math.round((effectiveMap.get(r.id) ?? 0) * 1e4) / 1e4
          : null,
    }));
  }

  async getUserOverview(
    platformId: string,
    targetUserId: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: {
        id: true,
        loginId: true,
        email: true,
        role: true,
        displayName: true,
        parentUserId: true,
        signupMode: true,
        signupReferralInput: true,
        registrationStatus: true,
        createdAt: true,
        referredBy: {
          select: {
            id: true,
            loginId: true,
            displayName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            loginId: true,
            displayName: true,
            email: true,
            referralCode: true,
          },
        },
        bankCode: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        usdtWalletAddress: true,
        rollingEnabled: true,
        rollingSportsDomesticPct: true,
        rollingSportsOverseasPct: true,
        rollingCasinoPct: true,
        rollingSlotPct: true,
        rollingMinigamePct: true,
      },
    });
    if (!target) throw new NotFoundException();

    if (actor.role === UserRole.MASTER_AGENT) {
      const canView =
        target.id === actor.sub ||
        (target.role === UserRole.USER && target.parentUserId === actor.sub);
      if (!canView) {
        throw new ForbiddenException(
          '총판은 본인 또는 직속 회원만 상세 조회할 수 있습니다',
        );
      }
    }

    const [wallet, platform, openRolling, recentWalletRequests, recentSms] =
      await Promise.all([
        this.prisma.wallet.findUnique({
          where: { userId: target.id },
          select: {
            balance: true,
            pointBalance: true,
          },
        }),
        this.prisma.platform.findUnique({
          where: { id: platformId },
          select: {
            rollingLockWithdrawals: true,
            rollingTurnoverMultiplier: true,
            minPointRedeemPoints: true,
            minPointRedeemKrw: true,
            minPointRedeemUsdt: true,
            pointRulesJson: true,
          },
        }),
        this.prisma.rollingObligation.findMany({
          where: {
            userId: target.id,
            satisfiedAt: null,
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            sourceRef: true,
            principalAmount: true,
            requiredTurnover: true,
            appliedTurnover: true,
            createdAt: true,
          },
        }),
        this.prisma.walletRequest.findMany({
          where: {
            userId: target.id,
            platformId,
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            depositorName: true,
            note: true,
            resolverNote: true,
            createdAt: true,
            resolvedAt: true,
          },
        }),
        this.prisma.bankSmsIngest.findMany({
          where: {
            platformId,
            matchedWalletRequest: {
              is: {
                userId: target.id,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            id: true,
            status: true,
            failureReason: true,
            recipientPhoneSnapshot: true,
            rawBody: true,
            createdAt: true,
          },
        }),
      ]);

    let required = new Prisma.Decimal(0);
    let applied = new Prisma.Decimal(0);
    for (const row of openRolling) {
      required = required.plus(row.requiredTurnover);
      applied = applied.plus(row.appliedTurnover);
    }
    const remaining = required.minus(applied);
    const rawAchievementPct = required.gt(0)
      ? applied.div(required).times(100).toNumber()
      : 100;
    const achievementPct = Math.min(
      100,
      Math.max(0, Math.round(rawAchievementPct * 100) / 100),
    );

    const balance = wallet?.balance ?? new Prisma.Decimal(0);
    const pointBalance = wallet?.pointBalance ?? new Prisma.Decimal(0);
    const withdrawBlocked = remaining.gt(0);
    const usdtRate = this.getUsdtKrwRate();
    const withdrawableKrw = withdrawBlocked ? new Prisma.Decimal(0) : balance;
    const withdrawableUsdt = withdrawBlocked
      ? new Prisma.Decimal(0)
      : balance.div(usdtRate);

    const rules = this.readPointRules(platform?.pointRulesJson);
    const redeemKrwPerPoint =
      rules.redeemKrwPerPoint !== undefined && rules.redeemKrwPerPoint !== null
        ? new Prisma.Decimal(String(rules.redeemKrwPerPoint))
        : null;
    const redeemUsdtPerPoint =
      rules.redeemUsdtPerPoint !== undefined &&
      rules.redeemUsdtPerPoint !== null
        ? new Prisma.Decimal(String(rules.redeemUsdtPerPoint))
        : null;
    const redeemableKrw = redeemKrwPerPoint
      ? pointBalance.times(redeemKrwPerPoint)
      : null;
    const redeemableUsdt = redeemUsdtPerPoint
      ? pointBalance.times(redeemUsdtPerPoint)
      : null;

    return {
      user: {
        id: target.id,
        loginId: target.loginId,
        email: target.email,
        role: target.role,
        displayName: target.displayName,
        signupMode: target.signupMode,
        signupReferralInput: target.signupReferralInput,
        registrationStatus: target.registrationStatus,
        createdAt: target.createdAt,
        referredBy: target.referredBy,
        parent: target.parent,
        bankCode: target.bankCode,
        bankAccountNumber: target.bankAccountNumber,
        bankAccountHolder: target.bankAccountHolder,
        usdtWalletAddress: target.usdtWalletAddress,
        rollingEnabled: target.rollingEnabled,
        rollingSportsDomesticPct:
          target.rollingSportsDomesticPct?.toString() ?? null,
        rollingSportsOverseasPct:
          target.rollingSportsOverseasPct?.toString() ?? null,
        rollingCasinoPct: target.rollingCasinoPct?.toString() ?? null,
        rollingSlotPct: target.rollingSlotPct?.toString() ?? null,
        rollingMinigamePct: target.rollingMinigamePct?.toString() ?? null,
      },
      wallet: {
        balance: balance.toFixed(2),
        pointBalance: pointBalance.toFixed(2),
        withdrawCurrency: target.signupMode === 'anonymous' ? 'USDT' : 'KRW',
        withdrawBlocked,
        withdrawableKrw: withdrawableKrw.toFixed(2),
        withdrawableUsdt: withdrawableUsdt.toFixed(6),
      },
      rolling: {
        lockWithdrawals: platform?.rollingLockWithdrawals ?? false,
        turnoverMultiplier:
          platform?.rollingTurnoverMultiplier?.toString() ?? '1',
        requiredTurnover: required.toFixed(2),
        appliedTurnover: applied.toFixed(2),
        remainingTurnover: remaining.gt(0) ? remaining.toFixed(2) : '0.00',
        achievementPct,
        openCount: openRolling.length,
        obligations: openRolling.map((row) => ({
          id: row.id,
          sourceRef: row.sourceRef,
          principalAmount: row.principalAmount.toFixed(2),
          requiredTurnover: row.requiredTurnover.toFixed(2),
          appliedTurnover: row.appliedTurnover.toFixed(2),
          createdAt: row.createdAt,
        })),
      },
      pointExchange: {
        minPointRedeemPoints: platform?.minPointRedeemPoints ?? null,
        minPointRedeemKrw: platform?.minPointRedeemKrw?.toFixed(2) ?? null,
        minPointRedeemUsdt: platform?.minPointRedeemUsdt?.toFixed(6) ?? null,
        redeemKrwPerPoint: redeemKrwPerPoint?.toString() ?? null,
        redeemUsdtPerPoint: redeemUsdtPerPoint?.toString() ?? null,
        redeemableKrw: redeemableKrw?.toFixed(2) ?? null,
        redeemableUsdt: redeemableUsdt?.toFixed(6) ?? null,
      },
      recentWalletRequests: recentWalletRequests.map((row) => ({
        id: row.id,
        type: row.type,
        amount: row.amount.toFixed(2),
        currency: row.currency,
        status: row.status,
        depositorName: row.depositorName,
        note: row.note,
        resolverNote: row.resolverNote,
        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt,
      })),
      recentSemiVirtualLogs: recentSms.map((row) => ({
        id: row.id,
        status: row.status,
        failureReason: row.failureReason,
        recipientPhoneSnapshot: row.recipientPhoneSnapshot,
        rawBody: row.rawBody,
        createdAt: row.createdAt,
      })),
    };
  }

  async updateAgentMemo(
    platformId: string,
    targetUserId: string,
    agentMemo: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { id: true, role: true, parentUserId: true },
    });
    if (!target) throw new NotFoundException();
    if (actor.role === UserRole.MASTER_AGENT) {
      if (target.role !== UserRole.USER || target.parentUserId !== actor.sub) {
        throw new ForbiddenException(
          '소속 회원에게만 총판 메모를 남길 수 있습니다',
        );
      }
    } else if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    const v = agentMemo.trim();
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { agentMemo: v.length ? v : null },
    });
    return { ok: true };
  }

  async updateUserMemoAdmin(
    platformId: string,
    targetUserId: string,
    userMemo: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException();
    const v = userMemo.trim();
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { userMemo: v.length ? v : null },
    });
    return { ok: true };
  }

  async create(platformId: string, dto: CreateUserDto, actor: JwtPayload) {
    this.assertPlatformAccess(actor, platformId);
    this.assertCanManageRole(actor, dto.role);
    const loginId = normalizeLoginId(dto.loginId);
    const existing = await this.prisma.user.findFirst({
      where: { loginId, platformId },
    });
    if (existing)
      throw new ConflictException('이 플랫폼에서 이미 등록된 아이디입니다');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const email =
      dto.contactEmail?.trim() != null && dto.contactEmail.trim().length > 0
        ? dto.contactEmail.trim().toLowerCase()
        : null;
    const parentUserId: string | null = dto.parentUserId ?? null;
    if (actor.role === UserRole.PLATFORM_ADMIN && dto.role === UserRole.USER) {
      // optional parent validation if provided
      if (parentUserId) {
        const parent = await this.prisma.user.findFirst({
          where: { id: parentUserId, platformId },
        });
        if (!parent) throw new ForbiddenException('Invalid parent');
      }
    }
    const data: Prisma.UserCreateInput = {
      loginId,
      email,
      passwordHash,
      role: dto.role,
      displayName: dto.displayName,
      registrationStatus: RegistrationStatus.APPROVED,
      platform: { connect: { id: platformId } },
    };
    if (dto.role === UserRole.MASTER_AGENT) {
      let code =
        dto.referralCode
          ?.trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '') || null;
      if (code) {
        const taken = await this.prisma.user.findFirst({
          where: { referralCode: code, platformId },
        });
        if (taken)
          throw new ConflictException('이미 사용 중인 추천 코드입니다');
      } else {
        code = await this.generateUniqueReferralCode(platformId);
      }
      data.referralCode = code;
      let parentMa = false;
      if (parentUserId) {
        const p = await this.prisma.user.findFirst({
          where: { id: parentUserId, platformId },
          select: { role: true },
        });
        if (!p) throw new ForbiddenException('유효하지 않은 상위 계정입니다');
        parentMa = p.role === UserRole.MASTER_AGENT;
      }
      if (parentMa) {
        if (
          dto.agentSplitFromParentPct === undefined ||
          dto.agentSplitFromParentPct === null
        ) {
          throw new BadRequestException(
            '하위 총판은 상위 대비 분배율(agentSplitFromParentPct, 0~100)이 필요합니다',
          );
        }
        data.agentSplitFromParentPct = new Prisma.Decimal(
          dto.agentSplitFromParentPct,
        );
        data.agentPlatformSharePct = null;
      } else {
        if (dto.agentSplitFromParentPct != null) {
          throw new BadRequestException(
            '최상위 총판에는 분배율 대신 플랫폼 부여 요율(agentPlatformSharePct)을 사용합니다',
          );
        }
        if (dto.agentPlatformSharePct != null) {
          data.agentPlatformSharePct = new Prisma.Decimal(
            dto.agentPlatformSharePct,
          );
        }
      }
    }
    if (parentUserId) {
      data.parent = { connect: { id: parentUserId } };
    }
    const user = await this.prisma.user.create({
      data,
      select: {
        id: true,
        loginId: true,
        email: true,
        role: true,
        platformId: true,
        parentUserId: true,
        displayName: true,
        createdAt: true,
        registrationStatus: true,
        referralCode: true,
        agentPlatformSharePct: true,
        agentSplitFromParentPct: true,
      },
    });
    await this.prisma.wallet.create({
      data: {
        userId: user.id,
        platformId,
        balance: 0,
      },
    });
    if (user.role === UserRole.MASTER_AGENT) {
      await this.rateRevision.appendAgentCommissionRevision(
        this.prisma,
        user.id,
        user.createdAt,
        {
          agentPlatformSharePct: user.agentPlatformSharePct,
          agentSplitFromParentPct: user.agentSplitFromParentPct,
        },
      );
    }
    return user;
  }

  async updateAgentCommission(
    platformId: string,
    targetUserId: string,
    dto: UpdateAgentCommissionDto,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    if (
      dto.agentPlatformSharePct === undefined &&
      dto.agentSplitFromParentPct === undefined
    ) {
      throw new BadRequestException(
        'agentPlatformSharePct 또는 agentSplitFromParentPct 중 하나 이상 필요합니다',
      );
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: {
        id: true,
        role: true,
        parentUserId: true,
        parent: { select: { role: true } },
      },
    });
    if (!target) throw new NotFoundException();
    if (target.role !== UserRole.MASTER_AGENT) {
      throw new BadRequestException('총판 계정만 요율을 설정할 수 있습니다');
    }
    const parentIsMa =
      target.parentUserId != null &&
      target.parent?.role === UserRole.MASTER_AGENT;
    const data: Prisma.UserUpdateInput = {};
    if (parentIsMa) {
      if (dto.agentPlatformSharePct !== undefined) {
        throw new BadRequestException(
          '하위 총판에는 플랫폼 부여 요율을 직접 넣을 수 없습니다',
        );
      }
      if (dto.agentSplitFromParentPct !== undefined) {
        data.agentSplitFromParentPct = new Prisma.Decimal(
          dto.agentSplitFromParentPct,
        );
      }
    } else {
      if (dto.agentSplitFromParentPct !== undefined) {
        throw new BadRequestException(
          '최상위 총판에는 상위 분배율이 적용되지 않습니다',
        );
      }
      if (dto.agentPlatformSharePct !== undefined) {
        data.agentPlatformSharePct = new Prisma.Decimal(
          dto.agentPlatformSharePct,
        );
      }
    }
    const effectiveFrom = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data,
      });
      const u = await tx.user.findUnique({
        where: { id: targetUserId },
        select: {
          agentPlatformSharePct: true,
          agentSplitFromParentPct: true,
        },
      });
      await this.rateRevision.appendAgentCommissionRevision(
        tx,
        targetUserId,
        effectiveFrom,
        {
          agentPlatformSharePct: u?.agentPlatformSharePct ?? null,
          agentSplitFromParentPct: u?.agentSplitFromParentPct ?? null,
        },
      );
    });
    return { ok: true, effectiveFrom };
  }

  async updateReferralCode(
    platformId: string,
    targetUserId: string,
    referralCode: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException();
    if (target.role !== UserRole.MASTER_AGENT) {
      throw new BadRequestException(
        '마스터 코드(추천코드)는 총판 계정만 설정할 수 있습니다',
      );
    }

    const sanitized =
      referralCode
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') || null;
    const nextCode =
      sanitized || (await this.generateUniqueReferralCode(platformId));

    const taken = await this.prisma.user.findFirst({
      where: {
        platformId,
        referralCode: nextCode,
        NOT: { id: targetUserId },
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('이미 사용 중인 마스터 코드입니다');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { referralCode: nextCode },
    });
    return { ok: true, referralCode: nextCode };
  }

  async listRollingRevisionsAdmin(
    platformId: string,
    targetUserId: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { role: true },
    });
    if (!target) throw new NotFoundException();
    if (target.role !== UserRole.USER) {
      throw new BadRequestException(
        '일반 회원만 롤링 이력을 조회할 수 있습니다',
      );
    }
    const items = await this.rateRevision.listRollingRevisions(targetUserId);
    return {
      hint: '정산 시각 기준으로 effectiveFrom ≤ T 인 최신 행이 적용됩니다.',
      items,
    };
  }

  async listAgentCommissionRevisionsAdmin(
    platformId: string,
    targetUserId: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { role: true },
    });
    if (!target) throw new NotFoundException();
    if (target.role !== UserRole.MASTER_AGENT) {
      throw new BadRequestException('총판만 요율 이력을 조회할 수 있습니다');
    }
    const items =
      await this.rateRevision.listAgentCommissionRevisions(targetUserId);
    return {
      hint: '정산 시각 기준으로 effectiveFrom ≤ T 인 최신 행이 적용됩니다.',
      items,
    };
  }

  private assertPlatformAccess(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (actor.platformId !== platformId) throw new ForbiddenException();
    if (
      actor.role !== UserRole.PLATFORM_ADMIN &&
      actor.role !== UserRole.MASTER_AGENT
    ) {
      throw new ForbiddenException();
    }
  }

  async updateMasterPrivateMemo(
    platformId: string,
    targetUserId: string,
    memo: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException();
    const v = memo.trim();
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { masterPrivateMemo: v.length ? v : null },
    });
    return { ok: true };
  }

  async updateUplinePrivateMemo(
    platformId: string,
    targetUserId: string,
    memo: string,
    actor: JwtPayload,
  ) {
    this.assertPlatformAccess(actor, platformId);
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, platformId },
      select: { id: true, parentUserId: true },
    });
    if (!target) throw new NotFoundException();
    if (actor.role === UserRole.MASTER_AGENT) {
      if (target.parentUserId !== actor.sub) {
        throw new ForbiddenException(
          '직속 하위에게만 식별 메모를 남길 수 있습니다',
        );
      }
    } else if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    const v = memo.trim();
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { uplinePrivateMemo: v.length ? v : null },
    });
    return { ok: true };
  }

  /** 로그인한 총판이 직속 하위 총판(MASTER_AGENT) 계정을 생성합니다. */
  async createSubAgent(actor: JwtPayload, dto: CreateSubAgentDto) {
    if (actor.role !== UserRole.MASTER_AGENT || !actor.platformId) {
      throw new ForbiddenException();
    }
    const platformId = actor.platformId;
    const parentUserId = actor.sub;
    const parent = await this.prisma.user.findFirst({
      where: { id: parentUserId, platformId, role: UserRole.MASTER_AGENT },
      select: { id: true },
    });
    if (!parent) {
      throw new ForbiddenException(
        '총판 계정만 하위 총판을 등록할 수 있습니다',
      );
    }
    const loginId = normalizeLoginId(dto.loginId);
    const existing = await this.prisma.user.findFirst({
      where: { loginId, platformId },
    });
    if (existing) throw new ConflictException('이미 등록된 아이디입니다');
    const email =
      dto.contactEmail?.trim() != null && dto.contactEmail.trim().length > 0
        ? dto.contactEmail.trim().toLowerCase()
        : null;
    const split = dto.splitFromParentPct;
    if (Number.isNaN(split) || split < 0 || split > 100) {
      throw new BadRequestException('분배율은 0~100 사이여야 합니다');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    let code =
      dto.referralCode
        ?.trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') || null;
    if (code) {
      const taken = await this.prisma.user.findFirst({
        where: { referralCode: code, platformId },
      });
      if (taken) throw new ConflictException('이미 사용 중인 추천 코드입니다');
    } else {
      code = await this.generateUniqueReferralCode(platformId);
    }
    const user = await this.prisma.user.create({
      data: {
        loginId,
        email,
        passwordHash,
        role: UserRole.MASTER_AGENT,
        displayName: dto.displayName?.trim() || null,
        registrationStatus: RegistrationStatus.APPROVED,
        platform: { connect: { id: platformId } },
        parent: { connect: { id: parentUserId } },
        referralCode: code,
        agentSplitFromParentPct: new Prisma.Decimal(split),
        agentPlatformSharePct: null,
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        role: true,
        platformId: true,
        parentUserId: true,
        displayName: true,
        createdAt: true,
        registrationStatus: true,
        referralCode: true,
        agentPlatformSharePct: true,
        agentSplitFromParentPct: true,
      },
    });
    await this.prisma.wallet.create({
      data: {
        userId: user.id,
        platformId,
        balance: 0,
      },
    });
    await this.rateRevision.appendAgentCommissionRevision(
      this.prisma,
      user.id,
      user.createdAt,
      {
        agentPlatformSharePct: user.agentPlatformSharePct,
        agentSplitFromParentPct: user.agentSplitFromParentPct,
      },
    );
    return user;
  }

  // ─── 어드민 유저 상세 조회 ─────────────────────────────────

  private assertAdminForPlatform(actor: JwtPayload, platformId: string) {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException();
    }
    if (actor.role === UserRole.PLATFORM_ADMIN && actor.platformId !== platformId) {
      throw new ForbiddenException();
    }
  }

  async getUserLedger(
    platformId: string,
    userId: string,
    actor: JwtPayload,
    limitRaw?: string,
  ) {
    this.assertAdminForPlatform(actor, platformId);
    const limit = Math.min(500, Math.max(1, Number.parseInt(limitRaw ?? '100', 10) || 100));
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { platformId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toFixed(2),
        balanceAfter: r.balanceAfter.toFixed(2),
        reference: r.reference,
        note: (r.metaJson as Record<string, unknown> | null)?.note ?? null,
        vertical: (r.metaJson as Record<string, unknown> | null)?.vertical ?? null,
        createdAt: r.createdAt,
      })),
    };
  }

  async getUserWalletRequests(
    platformId: string,
    userId: string,
    actor: JwtPayload,
    limitRaw?: string,
  ) {
    this.assertAdminForPlatform(actor, platformId);
    const limit = Math.min(500, Math.max(1, Number.parseInt(limitRaw ?? '100', 10) || 100));
    const rows = await this.prisma.walletRequest.findMany({
      where: { platformId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        amount: r.amount.toFixed(2),
        currency: r.currency,
        depositorName: r.depositorName,
        note: r.note,
        resolverNote: r.resolverNote,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
    };
  }

  async getUserUsdtTxs(
    platformId: string,
    userId: string,
    actor: JwtPayload,
    limitRaw?: string,
  ) {
    this.assertAdminForPlatform(actor, platformId);
    const limit = Math.min(200, Math.max(1, Number.parseInt(limitRaw ?? '50', 10) || 50));
    const rows = await this.prisma.usdtDepositTx.findMany({
      where: { platformId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        txHash: r.txHash,
        fromAddress: r.fromAddress,
        usdtAmount: r.usdtAmount.toFixed(8),
        krwRate: r.krwRate.toFixed(2),
        krwAmount: r.krwAmount.toFixed(2),
        status: r.status,
        resolverNote: r.resolverNote,
        createdAt: r.createdAt,
      })),
    };
  }

  async getUserPoints(
    platformId: string,
    userId: string,
    actor: JwtPayload,
    limitRaw?: string,
  ) {
    this.assertAdminForPlatform(actor, platformId);
    const limit = Math.min(500, Math.max(1, Number.parseInt(limitRaw ?? '100', 10) || 100));
    const [rows, wallet] = await Promise.all([
      this.prisma.pointLedgerEntry.findMany({
        where: { platformId, userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.wallet.findUnique({ where: { userId }, select: { pointBalance: true } }),
    ]);
    return {
      currentBalance: wallet?.pointBalance.toFixed(2) ?? '0.00',
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toFixed(2),
        balanceAfter: r.balanceAfter.toFixed(2),
        reference: r.reference,
        createdAt: r.createdAt,
      })),
    };
  }

  async getUserRollingObligations(
    platformId: string,
    userId: string,
    actor: JwtPayload,
  ) {
    this.assertAdminForPlatform(actor, platformId);
    const rows = await this.prisma.rollingObligation.findMany({
      where: { platformId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        sourceRef: r.sourceRef,
        principalAmount: r.principalAmount.toFixed(2),
        requiredTurnover: r.requiredTurnover.toFixed(2),
        appliedTurnover: r.appliedTurnover.toFixed(2),
        pct: r.requiredTurnover.gt(0)
          ? Math.round((r.appliedTurnover.toNumber() / r.requiredTurnover.toNumber()) * 100)
          : 100,
        satisfiedAt: r.satisfiedAt,
        createdAt: r.createdAt,
      })),
    };
  }
}
