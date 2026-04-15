import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateSemiVirtualDto } from './dto/update-semi-virtual.dto';
import {
  BankSmsIngestStatus,
  LedgerEntryType,
  Prisma,
  SyncJobType,
  UserRole,
  WalletRequestStatus,
  WalletRequestType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { UpdatePlatformThemeDto } from './dto/update-platform-theme.dto';
import { UpdatePlatformOperationalDto } from './dto/update-platform-operational.dto';
import { JwtPayload } from '../auth/auth.service';
import { access, copyFile, cp, mkdir } from 'fs/promises';
import { constants as FsConstants } from 'fs';
import { dirname, join } from 'path';

@Injectable()
export class PlatformsService {
  constructor(private prisma: PrismaService) {}

  assertPlatformScope(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (actor.platformId !== platformId) throw new ForbiddenException();
    if (
      actor.role !== UserRole.PLATFORM_ADMIN &&
      actor.role !== UserRole.MASTER_AGENT
    ) {
      throw new ForbiddenException();
    }
  }

  list(user: JwtPayload) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.prisma.platform.findMany({
        orderBy: { createdAt: 'desc' },
        include: { domains: true },
      });
    }
    if (user.role === UserRole.PLATFORM_ADMIN && user.platformId) {
      return this.prisma.platform.findMany({
        where: { id: user.platformId },
        include: { domains: true },
      });
    }
    if (user.role === UserRole.MASTER_AGENT && user.platformId) {
      return this.prisma.platform.findMany({
        where: { id: user.platformId },
        include: { domains: true },
      });
    }
    throw new ForbiddenException();
  }

  private uploadRoot(): string {
    return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  }

  /** 업로드 경로 내 announcements/{source}/ → announcements/{target}/ 치환 (절대 URL은 유지) */
  private rewriteAnnouncementImageUrl(
    imageUrl: string,
    sourcePlatformId: string,
    targetPlatformId: string,
  ): string {
    const s = imageUrl.trim();
    if (!s) return s;
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const needle = `announcements/${sourcePlatformId}/`;
    if (s.includes(needle)) {
      return s.split(needle).join(`announcements/${targetPlatformId}/`);
    }
    return s;
  }

  /** 플랫폼 복제 시 공지 팝업 슬롯·이미지 폴더·에셋 메타 복사 */
  private async clonePlatformAnnouncementsFrom(
    sourcePlatformId: string,
    targetPlatformId: string,
  ) {
    const root = this.uploadRoot();
    const srcDir = join(root, 'announcements', sourcePlatformId);
    const destDir = join(root, 'announcements', targetPlatformId);
    let copiedTree = false;
    try {
      await access(srcDir, FsConstants.F_OK);
      await mkdir(join(root, 'announcements'), { recursive: true });
      await cp(srcDir, destDir, { recursive: true });
      copiedTree = true;
    } catch {
      /* 원본에 공지 업로드 디렉터리 없음 — DB만 있을 수 있음 */
    }

    const assets = await this.prisma.platformAnnouncementAsset.findMany({
      where: { platformId: sourcePlatformId },
    });

    if (assets.length > 0) {
      if (copiedTree) {
        for (const a of assets) {
          const fileName = a.storagePath.includes('/')
            ? a.storagePath.slice(a.storagePath.lastIndexOf('/') + 1)
            : a.storagePath;
          const newRel = `announcements/${targetPlatformId}/${fileName}`;
          await this.prisma.platformAnnouncementAsset.create({
            data: {
              platformId: targetPlatformId,
              storagePath: newRel,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              width: a.width,
              height: a.height,
              originalName: a.originalName,
            },
          });
        }
      } else {
        for (const a of assets) {
          const newRel = a.storagePath.replace(
            `announcements/${sourcePlatformId}/`,
            `announcements/${targetPlatformId}/`,
          );
          const srcFile = join(root, a.storagePath);
          const destFile = join(root, newRel);
          try {
            await mkdir(dirname(destFile), { recursive: true });
            await copyFile(srcFile, destFile);
          } catch {
            continue;
          }
          await this.prisma.platformAnnouncementAsset.create({
            data: {
              platformId: targetPlatformId,
              storagePath: newRel,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              width: a.width,
              height: a.height,
              originalName: a.originalName,
            },
          });
        }
      }
    }

    const slots = await this.prisma.platformAnnouncement.findMany({
      where: { platformId: sourcePlatformId },
      orderBy: { sortOrder: 'asc' },
    });
    if (slots.length === 0) return;
    await this.prisma.platformAnnouncement.createMany({
      data: slots.map((row) => ({
        platformId: targetPlatformId,
        imageUrl: this.rewriteAnnouncementImageUrl(
          row.imageUrl,
          sourcePlatformId,
          targetPlatformId,
        ),
        imageWidth: row.imageWidth,
        imageHeight: row.imageHeight,
        sortOrder: row.sortOrder,
        active: row.active,
      })),
    });
  }

  private async allocatePreviewPort(): Promise<number> {
    const MIN = 3200;
    const MAX = 3299;
    const rows = await this.prisma.platform.findMany({
      where: { previewPort: { not: null } },
      select: { previewPort: true },
    });
    const used = new Set(rows.map((r) => r.previewPort!));
    for (let port = MIN; port <= MAX; port++) {
      if (!used.has(port)) return port;
    }
    throw new BadRequestException(
      '미리보기 포트(3200–3299)가 모두 사용 중입니다.',
    );
  }

  private async seedDefaultSyncStates(platformId: string) {
    await this.prisma.syncState.createMany({
      data: [SyncJobType.ODDS, SyncJobType.CASINO, SyncJobType.AFFILIATE].map(
        (jobType) => ({ platformId, jobType }),
      ),
      skipDuplicates: true,
    });
  }

  async create(dto: CreatePlatformDto) {
    const host = dto.primaryHost.toLowerCase().split(':')[0];
    let previewPort: number;
    if (dto.previewPort != null) {
      const taken = await this.prisma.platform.findFirst({
        where: { previewPort: dto.previewPort },
      });
      if (taken) {
        throw new ConflictException('이미 사용 중인 미리보기 포트입니다');
      }
      previewPort = dto.previewPort;
    } else {
      previewPort = await this.allocatePreviewPort();
    }

    const cloneId = dto.cloneFromPlatformId?.trim();
    let themeJson: Prisma.InputJsonValue = (dto.themeJson ??
      {}) as Prisma.InputJsonValue;
    let flagsJson: Prisma.InputJsonValue = (dto.flagsJson ??
      {}) as Prisma.InputJsonValue;
    let integrationsJson: Prisma.InputJsonValue = {};

    if (cloneId) {
      const src = await this.prisma.platform.findUnique({
        where: { id: cloneId },
        select: { themeJson: true, flagsJson: true, integrationsJson: true },
      });
      if (!src) {
        throw new BadRequestException('복제할 플랫폼을 찾을 수 없습니다');
      }
      const tOverride = (dto.themeJson ?? {}) as Record<string, unknown>;
      const fOverride = (dto.flagsJson ?? {}) as Record<string, unknown>;
      themeJson = {
        ...(src.themeJson as object),
        ...tOverride,
      } as Prisma.InputJsonValue;
      flagsJson = {
        ...(src.flagsJson as object),
        ...fOverride,
      } as Prisma.InputJsonValue;
      integrationsJson = (src.integrationsJson ?? {}) as Prisma.InputJsonValue;
    }

    const platform = await this.prisma.platform.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        previewPort,
        themeJson,
        flagsJson,
        integrationsJson,
        domains: {
          create: { host },
        },
      },
      include: { domains: true },
    });

    if (cloneId) {
      const srcStates = await this.prisma.syncState.findMany({
        where: { platformId: cloneId },
      });
      if (srcStates.length > 0) {
        await this.prisma.syncState.createMany({
          data: srcStates.map((r) => ({
            platformId: platform.id,
            jobType: r.jobType,
            stubPayload: r.stubPayload ?? undefined,
          })),
        });
      } else {
        await this.seedDefaultSyncStates(platform.id);
      }
      await this.clonePlatformAnnouncementsFrom(cloneId, platform.id);
    } else {
      await this.seedDefaultSyncStates(platform.id);
    }

    return platform;
  }

  async getDetail(platformId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    const p = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        id: true,
        slug: true,
        name: true,
        previewPort: true,
        themeJson: true,
        flagsJson: true,
        rollingLockWithdrawals: true,
        rollingTurnoverMultiplier: true,
        agentCanEditMemberRolling: true,
        minDepositKrw: true,
        minDepositUsdt: true,
        minWithdrawKrw: true,
        minWithdrawUsdt: true,
        minPointRedeemPoints: true,
        minPointRedeemKrw: true,
        minPointRedeemUsdt: true,
        pointRulesJson: true,
      },
    });
    if (!p) throw new NotFoundException('Platform not found');
    const flags =
      p.flagsJson &&
      typeof p.flagsJson === 'object' &&
      !Array.isArray(p.flagsJson)
        ? (p.flagsJson as Record<string, unknown>)
        : {};
    const compPolicy =
      flags.compPolicy &&
      typeof flags.compPolicy === 'object' &&
      !Array.isArray(flags.compPolicy)
        ? (flags.compPolicy as Record<string, unknown>)
        : {};
    return {
      ...p,
      rollingTurnoverMultiplier: p.rollingTurnoverMultiplier?.toString() ?? '1',
      minDepositKrw: p.minDepositKrw?.toString() ?? null,
      minDepositUsdt: p.minDepositUsdt?.toString() ?? null,
      minWithdrawKrw: p.minWithdrawKrw?.toString() ?? null,
      minWithdrawUsdt: p.minWithdrawUsdt?.toString() ?? null,
      minPointRedeemKrw: p.minPointRedeemKrw?.toString() ?? null,
      minPointRedeemUsdt: p.minPointRedeemUsdt?.toString() ?? null,
      publicSignupCode:
        typeof flags.publicSignupCode === 'string'
          ? flags.publicSignupCode
          : null,
      defaultSignupReferrerUserId:
        typeof flags.defaultSignupReferrerUserId === 'string'
          ? flags.defaultSignupReferrerUserId
          : null,
      compPolicy: {
        enabled: compPolicy.enabled === true,
        settlementCycle:
          compPolicy.settlementCycle === 'DAILY_MIDNIGHT' ||
          compPolicy.settlementCycle === 'BET_DAY_PLUS'
            ? compPolicy.settlementCycle
            : 'INSTANT',
        settlementOffsetDays:
          typeof compPolicy.settlementOffsetDays === 'number' &&
          Number.isFinite(compPolicy.settlementOffsetDays)
            ? Math.max(0, Math.trunc(compPolicy.settlementOffsetDays))
            : null,
        ratePct:
          typeof compPolicy.ratePct === 'string' ? compPolicy.ratePct : null,
      },
    };
  }

  async updateOperational(
    platformId: string,
    actor: JwtPayload,
    dto: UpdatePlatformOperationalDto,
  ) {
    this.assertPlatformScope(actor, platformId);
    const data: Prisma.PlatformUpdateInput = {};
    const current = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { flagsJson: true },
    });
    if (!current) throw new NotFoundException('Platform not found');
    const nextFlags =
      current.flagsJson &&
      typeof current.flagsJson === 'object' &&
      !Array.isArray(current.flagsJson)
        ? { ...(current.flagsJson as Record<string, unknown>) }
        : {};
    if (dto.rollingLockWithdrawals !== undefined) {
      data.rollingLockWithdrawals = dto.rollingLockWithdrawals;
    }
    if (dto.rollingTurnoverMultiplier !== undefined) {
      data.rollingTurnoverMultiplier = new Prisma.Decimal(
        dto.rollingTurnoverMultiplier,
      );
    }
    if (dto.agentCanEditMemberRolling !== undefined) {
      data.agentCanEditMemberRolling = dto.agentCanEditMemberRolling;
    }
    if (dto.minDepositKrw !== undefined) {
      data.minDepositKrw =
        dto.minDepositKrw.trim() === ''
          ? null
          : new Prisma.Decimal(dto.minDepositKrw);
    }
    if (dto.minDepositUsdt !== undefined) {
      data.minDepositUsdt =
        dto.minDepositUsdt.trim() === ''
          ? null
          : new Prisma.Decimal(dto.minDepositUsdt);
    }
    if (dto.minWithdrawKrw !== undefined) {
      data.minWithdrawKrw =
        dto.minWithdrawKrw.trim() === ''
          ? null
          : new Prisma.Decimal(dto.minWithdrawKrw);
    }
    if (dto.minWithdrawUsdt !== undefined) {
      data.minWithdrawUsdt =
        dto.minWithdrawUsdt.trim() === ''
          ? null
          : new Prisma.Decimal(dto.minWithdrawUsdt);
    }
    if (dto.minPointRedeemPoints !== undefined) {
      data.minPointRedeemPoints = dto.minPointRedeemPoints;
    }
    if (dto.minPointRedeemKrw !== undefined) {
      data.minPointRedeemKrw =
        dto.minPointRedeemKrw.trim() === ''
          ? null
          : new Prisma.Decimal(dto.minPointRedeemKrw);
    }
    if (dto.minPointRedeemUsdt !== undefined) {
      data.minPointRedeemUsdt =
        dto.minPointRedeemUsdt.trim() === ''
          ? null
          : new Prisma.Decimal(dto.minPointRedeemUsdt);
    }
    if (dto.pointRulesJson !== undefined) {
      data.pointRulesJson = dto.pointRulesJson as Prisma.InputJsonValue;
    }
    if (dto.compPolicy !== undefined) {
      const raw = dto.compPolicy;
      const cycleRaw =
        typeof raw.settlementCycle === 'string' ? raw.settlementCycle : '';
      const settlementCycle =
        cycleRaw === 'DAILY_MIDNIGHT' || cycleRaw === 'BET_DAY_PLUS'
          ? cycleRaw
          : 'INSTANT';
      const offsetRaw =
        typeof raw.settlementOffsetDays === 'number'
          ? raw.settlementOffsetDays
          : Number(raw.settlementOffsetDays ?? 0);
      const settlementOffsetDays =
        settlementCycle === 'BET_DAY_PLUS' && Number.isFinite(offsetRaw)
          ? Math.max(0, Math.trunc(offsetRaw))
          : null;
      const ratePct =
        typeof raw.ratePct === 'string'
          ? raw.ratePct.trim()
          : String(raw.ratePct ?? '').trim();
      nextFlags.compPolicy = {
        enabled: raw.enabled === true,
        settlementCycle,
        settlementOffsetDays,
        ratePct: ratePct || null,
      };
      data.flagsJson = nextFlags as Prisma.InputJsonValue;
    }
    if (dto.publicSignupCode !== undefined) {
      const code = dto.publicSignupCode.trim().toUpperCase();
      if (code) {
        nextFlags.publicSignupCode = code;
      } else {
        delete nextFlags.publicSignupCode;
      }
      data.flagsJson = nextFlags as Prisma.InputJsonValue;
    }
    if (dto.defaultSignupReferrerUserId !== undefined) {
      const userId = dto.defaultSignupReferrerUserId?.trim() || '';
      if (userId) {
        const target = await this.prisma.user.findFirst({
          where: {
            id: userId,
            platformId,
            role: UserRole.MASTER_AGENT,
          },
          select: { id: true },
        });
        if (!target) {
          throw new BadRequestException(
            '공통 가입코드에 연결할 마스터를 찾을 수 없습니다',
          );
        }
        nextFlags.defaultSignupReferrerUserId = userId;
      } else {
        delete nextFlags.defaultSignupReferrerUserId;
      }
      data.flagsJson = nextFlags as Prisma.InputJsonValue;
    }
    await this.prisma.platform.update({
      where: { id: platformId },
      data,
    });
    return this.getDetail(platformId, actor);
  }

  async updateTheme(
    platformId: string,
    actor: JwtPayload,
    dto: UpdatePlatformThemeDto,
  ) {
    this.assertPlatformScope(actor, platformId);
    const existing = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { previewPort: true },
    });
    if (!existing) throw new NotFoundException('Platform not found');
    let previewPort = existing.previewPort;
    if (previewPort == null) {
      previewPort = await this.allocatePreviewPort();
    }
    await this.prisma.platform.update({
      where: { id: platformId },
      data: {
        themeJson: dto.themeJson as Prisma.InputJsonValue,
        previewPort,
      },
    });
    return this.getDetail(platformId, actor);
  }

  async getIntegrations(platformId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    const p = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { integrationsJson: true, slug: true, name: true },
    });
    if (!p) throw new NotFoundException('Platform not found');
    return {
      platformId,
      slug: p.slug,
      name: p.name,
      integrationsJson: p.integrationsJson as Record<string, unknown>,
    };
  }

  normalizeSemiVirtualPhone(input: string | undefined | null): string | null {
    if (!input?.trim()) return null;
    let d = input.replace(/\D/g, '');
    if (d.startsWith('82') && d.length >= 10) {
      d = `0${d.slice(2)}`;
    }
    return d || null;
  }

  async getSemiVirtual(platformId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    const p = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        semiVirtualEnabled: true,
        semiVirtualRecipientPhone: true,
        semiVirtualAccountHint: true,
        semiVirtualBankName: true,
        semiVirtualAccountNumber: true,
        semiVirtualAccountHolder: true,
        settlementUsdtWallet: true,
      },
    });
    if (!p) throw new NotFoundException('Platform not found');
    return p;
  }

  async updateSemiVirtual(
    platformId: string,
    actor: JwtPayload,
    dto: UpdateSemiVirtualDto,
  ) {
    this.assertPlatformScope(actor, platformId);
    const phone = this.normalizeSemiVirtualPhone(dto.recipientPhone ?? null);
    const hint = dto.accountHint?.trim() || null;
    const bankName = dto.bankName?.trim() || null;
    const accountNumber = dto.accountNumber?.trim() || null;
    const accountHolder = dto.accountHolder?.trim() || null;
    if (dto.enabled && !phone && !hint) {
      throw new BadRequestException(
        '반가상 사용 시 수신 휴대번호 또는 계좌 힌트 중 하나 이상이 필요합니다',
      );
    }
    if (phone) {
      const taken = await this.prisma.platform.findFirst({
        where: {
          semiVirtualRecipientPhone: phone,
          NOT: { id: platformId },
        },
      });
      if (taken) {
        throw new ConflictException(
          '다른 플랫폼에서 이미 사용 중인 수신 번호입니다',
        );
      }
    }
    const settlementUsdtWallet =
      dto.settlementUsdtWallet?.trim() || null;

    await this.prisma.platform.update({
      where: { id: platformId },
      data: {
        semiVirtualEnabled: dto.enabled,
        semiVirtualRecipientPhone: dto.enabled ? phone : null,
        semiVirtualAccountHint: dto.enabled ? hint : null,
        semiVirtualBankName: bankName,
        semiVirtualAccountNumber: accountNumber,
        semiVirtualAccountHolder: accountHolder,
        settlementUsdtWallet,
      },
    });
    return this.getSemiVirtual(platformId, actor);
  }

  private bankSmsStatusLabelKo(status: BankSmsIngestStatus): string {
    const m: Record<BankSmsIngestStatus, string> = {
      RECEIVED: '수신(미처리)',
      PARSE_ERROR: '본문 파싱 실패',
      NO_PLATFORM: '플랫폼·힌트 불일치',
      NO_MATCH: '입금 신청 없음/불일치',
      AUTO_CREDITED: '자동 입금 완료',
      IGNORE_WITHDRAWAL: '출금 문자(무시)',
      DUPLICATE: '중복 문자',
    };
    return m[status] ?? status;
  }

  /** 콘솔용: 기기(등록 수신번호) 귀속 여부와 처리 결과를 한눈에 */
  private bankSmsOutcomeCategory(
    status: BankSmsIngestStatus,
    deviceMatch: boolean,
  ): string {
    if (status === BankSmsIngestStatus.AUTO_CREDITED) {
      return '자동입금';
    }
    if (status === BankSmsIngestStatus.NO_MATCH) {
      return deviceMatch ? '기기수신_신청없음' : '기타';
    }
    if (status === BankSmsIngestStatus.PARSE_ERROR) {
      return deviceMatch ? '기기수신_파싱실패' : '파싱실패';
    }
    if (status === BankSmsIngestStatus.NO_PLATFORM) {
      return deviceMatch ? '기기수신_힌트불일치' : '미등록번호_미전달';
    }
    if (status === BankSmsIngestStatus.IGNORE_WITHDRAWAL) {
      return '출금알림';
    }
    if (status === BankSmsIngestStatus.DUPLICATE) {
      return '중복';
    }
    return '기타';
  }

  async listBankSmsIngests(
    platformId: string,
    actor: JwtPayload,
    query?: { status?: string; deviceMatchOnly?: boolean },
  ) {
    this.assertPlatformScope(actor, platformId);
    /** 플랫폼 미할당(PARSE_ERROR 등) 행은 슈퍼관리자만 같이 조회 (플랫폼 관리자는 소속 플랫폼만) */
    const base: Prisma.BankSmsIngestWhereInput =
      actor.role === UserRole.SUPER_ADMIN
        ? { OR: [{ platformId }, { platformId: null }] }
        : { platformId };

    const filters: Prisma.BankSmsIngestWhereInput[] = [];
    if (query?.status?.trim()) {
      const st = query.status.trim() as BankSmsIngestStatus;
      if (Object.values(BankSmsIngestStatus).includes(st)) {
        filters.push({ status: st });
      }
    }
    if (query?.deviceMatchOnly) {
      filters.push({ semiVirtualDeviceMatch: true });
    }

    const where: Prisma.BankSmsIngestWhereInput =
      filters.length === 0 ? base : { AND: [base, ...filters] };

    const rows = await this.prisma.bankSmsIngest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        platformId: true,
        status: true,
        failureReason: true,
        sender: true,
        recipientPhoneSnapshot: true,
        parsedJson: true,
        rawBody: true,
        matchedWalletRequestId: true,
        semiVirtualDeviceMatch: true,
        createdAt: true,
      },
    });

    return rows.map((r) => {
      const cat = this.bankSmsOutcomeCategory(
        r.status,
        r.semiVirtualDeviceMatch,
      );
      const outcomeCategoryKo = this.bankSmsOutcomeCategoryKo(cat);
      return {
        ...r,
        statusLabelKo: this.bankSmsStatusLabelKo(r.status),
        outcomeCategory: cat,
        outcomeCategoryKo,
      };
    });
  }

  private bankSmsOutcomeCategoryKo(cat: string): string {
    const map: Record<string, string> = {
      자동입금: '자동 입금 처리됨',
      기기수신_신청없음:
        '등록 기기로 수신 · 대기 입금 신청 없음 또는 정보 불일치',
      기기수신_파싱실패: '등록 기기로 수신 · 본문 형식을 읽지 못함',
      기기수신_힌트불일치:
        '등록 기기로 수신 · 계좌 힌트/번호 조합이 설정과 맞지 않음',
      미등록번호_미전달: '수신번호가 앱에 전달되지 않았거나 반가상 미등록 번호',
      파싱실패: '본문 파싱 실패',
      출금알림: '출금 알림(자동 입금 처리 안 함)',
      중복: '이미 처리된 동일 문자',
      기타: '기타',
    };
    return map[cat] ?? cat;
  }

  async updateIntegrations(
    platformId: string,
    actor: JwtPayload,
    dto: UpdateIntegrationsDto,
  ) {
    this.assertPlatformScope(actor, platformId);
    return this.prisma.platform.update({
      where: { id: platformId },
      data: {
        integrationsJson: dto.integrationsJson as Prisma.InputJsonValue,
      },
      select: { id: true, integrationsJson: true },
    });
  }

  /**
   * 플랫폼과 소속 유저·연관 데이터(캐스케이드)를 제거합니다.
   * confirmSlug 는 실수 방지용으로 플랫폼 slug 와 정확히 일치해야 합니다.
   */
  async remove(
    platformId: string,
    confirmSlug: string,
    actor: JwtPayload,
  ): Promise<{ ok: true }> {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    const slug = confirmSlug?.trim();
    if (!slug) {
      throw new BadRequestException(
        'confirmSlug 쿼리에 플랫폼 슬러그를 넣어 주세요.',
      );
    }
    const p = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { id: true, slug: true },
    });
    if (!p) throw new NotFoundException('플랫폼을 찾을 수 없습니다');
    if (p.slug !== slug) {
      throw new BadRequestException(
        '슬러그가 일치하지 않습니다. 목록에 표시된 slug를 정확히 입력하세요.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { platformId } });
      await tx.platform.delete({ where: { id: platformId } });
    });
    return { ok: true };
  }

  // ─── 매출 현황 ────────────────────────────────────────────

  private assertPlatformAdmin(actor: JwtPayload, platformId: string) {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.PLATFORM_ADMIN)
      throw new ForbiddenException();
    if (actor.role === UserRole.PLATFORM_ADMIN && actor.platformId !== platformId)
      throw new ForbiddenException();
  }

  async getSalesSummary(platformId: string, actor: JwtPayload, from?: string, to?: string) {
    this.assertPlatformAdmin(actor, platformId);
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const hasDate = Object.keys(dateFilter).length > 0;

    const [betAgg, winAgg, depositAgg, withdrawAgg, userCnt, agentCnt] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { platformId, type: LedgerEntryType.BET, ...(hasDate ? { createdAt: dateFilter } : {}) },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { platformId, type: LedgerEntryType.WIN, ...(hasDate ? { createdAt: dateFilter } : {}) },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletRequest.aggregate({
        where: { platformId, type: WalletRequestType.DEPOSIT, status: WalletRequestStatus.APPROVED, ...(hasDate ? { createdAt: dateFilter } : {}) },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletRequest.aggregate({
        where: { platformId, type: WalletRequestType.WITHDRAWAL, status: WalletRequestStatus.APPROVED, ...(hasDate ? { createdAt: dateFilter } : {}) },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.user.count({ where: { platformId, role: UserRole.USER } }),
      this.prisma.user.count({ where: { platformId, role: UserRole.MASTER_AGENT } }),
    ]);

    const betStake = betAgg._sum.amount ? Math.abs(betAgg._sum.amount.toNumber()) : 0;
    const winTotal = winAgg._sum.amount?.toNumber() ?? 0;
    const ggr = betStake - winTotal;
    const depositTotal = depositAgg._sum.amount?.toNumber() ?? 0;
    const withdrawTotal = withdrawAgg._sum.amount?.toNumber() ?? 0;

    // per-vertical breakdown
    const verticals = ['casino', 'sports', 'minigame', 'slot'] as const;
    const vertBreakdown: Record<string, { betStake: string; winTotal: string; ggr: string; rounds: number }> = {};
    for (const v of verticals) {
      const [vBet, vWin] = await Promise.all([
        this.prisma.ledgerEntry.aggregate({
          where: {
            platformId,
            type: LedgerEntryType.BET,
            ...(hasDate ? { createdAt: dateFilter } : {}),
            metaJson: { path: ['vertical'], equals: v },
          },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.ledgerEntry.aggregate({
          where: {
            platformId,
            type: LedgerEntryType.WIN,
            ...(hasDate ? { createdAt: dateFilter } : {}),
            metaJson: { path: ['vertical'], equals: v },
          },
          _sum: { amount: true },
        }),
      ]);
      const vStake = Math.abs(vBet._sum.amount?.toNumber() ?? 0);
      const vWinTotal = vWin._sum.amount?.toNumber() ?? 0;
      vertBreakdown[v] = {
        betStake: vStake.toFixed(2),
        winTotal: vWinTotal.toFixed(2),
        ggr: (vStake - vWinTotal).toFixed(2),
        rounds: vBet._count,
      };
    }

    // 낙첨금액 = 총입금 - 총출금 (유저가 실제로 잃은 현금)
    const houseEdge = depositTotal - withdrawTotal;

    return {
      period: { from: from ?? null, to: to ?? null },
      platform: { userCnt, agentCnt },
      betting: {
        rounds: betAgg._count,
        betStake: betStake.toFixed(2),
        winTotal: winTotal.toFixed(2),
        ggr: ggr.toFixed(2),
        rtp: betStake > 0 ? ((winTotal / betStake) * 100).toFixed(2) : '0.00',
      },
      wallet: {
        depositCount: depositAgg._count,
        depositTotal: depositTotal.toFixed(2),
        withdrawCount: withdrawAgg._count,
        withdrawTotal: withdrawTotal.toFixed(2),
        netInflow: (depositTotal - withdrawTotal).toFixed(2),
        houseEdge: houseEdge.toFixed(2),
      },
      verticals: vertBreakdown,
    };
  }

  async getSalesAgents(platformId: string, actor: JwtPayload, from?: string, to?: string) {
    this.assertPlatformAdmin(actor, platformId);
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const hasDate = Object.keys(dateFilter).length > 0;

    const agents = await this.prisma.user.findMany({
      where: { platformId, role: UserRole.MASTER_AGENT },
      select: {
        id: true, loginId: true, displayName: true, agentMemo: true,
        agentPlatformSharePct: true, agentSplitFromParentPct: true,
        parentUserId: true,
        children: { select: { id: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // BFS helper to get all downline USER ids
    const getDownlineUserIds = async (agentId: string): Promise<string[]> => {
      const userIds: string[] = [];
      const queue = [agentId];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const ch = await this.prisma.user.findMany({
          where: { platformId, parentUserId: cur },
          select: { id: true, role: true },
        });
        for (const c of ch) {
          if (c.role === UserRole.USER) userIds.push(c.id);
          else if (c.role === UserRole.MASTER_AGENT) queue.push(c.id);
        }
      }
      return userIds;
    };

    // Direct users (parentUserId = agent): period deposit/withdraw + current wallet balance
    const agentIds = agents.map((x) => x.id);
    const directUsersAll =
      agentIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: {
              platformId,
              role: UserRole.USER,
              parentUserId: { in: agentIds },
            },
            select: {
              id: true,
              loginId: true,
              displayName: true,
              parentUserId: true,
              wallet: { select: { balance: true } },
            },
          });
    const duIds = directUsersAll.map((u) => u.id);
    const duByParent = new Map<string, typeof directUsersAll>();
    for (const u of directUsersAll) {
      const pid = u.parentUserId as string;
      const arr = duByParent.get(pid) ?? [];
      arr.push(u);
      duByParent.set(pid, arr);
    }
    let depByUser = new Map<string, number>();
    let wdrByUser = new Map<string, number>();
    if (duIds.length > 0) {
      const [depGroups, wdrGroups] = await Promise.all([
        this.prisma.walletRequest.groupBy({
          by: ['userId'],
          where: {
            userId: { in: duIds },
            type: WalletRequestType.DEPOSIT,
            status: WalletRequestStatus.APPROVED,
            ...(hasDate ? { createdAt: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.walletRequest.groupBy({
          by: ['userId'],
          where: {
            userId: { in: duIds },
            type: WalletRequestType.WITHDRAWAL,
            status: WalletRequestStatus.APPROVED,
            ...(hasDate ? { createdAt: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
      ]);
      depByUser = new Map(
        depGroups.map((g) => [g.userId, g._sum.amount?.toNumber() ?? 0]),
      );
      wdrByUser = new Map(
        wdrGroups.map((g) => [g.userId, g._sum.amount?.toNumber() ?? 0]),
      );
    }

    const buildDirectUsers = (agentId: string) => {
      const list = duByParent.get(agentId) ?? [];
      return list.map((u) => {
        const dep = depByUser.get(u.id) ?? 0;
        const wdr = wdrByUser.get(u.id) ?? 0;
        return {
          userId: u.id,
          loginId: u.loginId ?? '',
          displayName: u.displayName ?? '',
          depositTotal: dep.toFixed(2),
          withdrawTotal: wdr.toFixed(2),
          houseEdge: (dep - wdr).toFixed(2),
          balance: (u.wallet?.balance?.toNumber() ?? 0).toFixed(2),
        };
      });
    };

    const rows = await Promise.all(
      agents.map(async (a) => {
        const userIds = await getDownlineUserIds(a.id);
        const directUsers = buildDirectUsers(a.id);
        if (userIds.length === 0) {
          return {
          agentId: a.id,
          parentAgentId: a.parentUserId ?? null,
          loginId: a.loginId ?? '',
          displayName: a.displayName ?? '',
          memo: a.agentMemo ?? '',
          isTopAgent: !a.parentUserId,
          platformSharePct: Number(a.agentPlatformSharePct ?? 0),
          splitFromParentPct: Number(a.agentSplitFromParentPct ?? 0),
          effectivePct: 0,
          downlineUsers: 0,
          betStake: '0.00',
          winTotal: '0.00',
          ggr: '0.00',
          depositTotal: '0.00',
          withdrawTotal: '0.00',
          houseEdge: '0.00',
          myEstimatedSettlement: '0.00',
          directUsers,
        };
        }

        const [betAgg, winAgg, depAgg, wdrAgg] = await Promise.all([
          this.prisma.ledgerEntry.aggregate({
            where: { userId: { in: userIds }, type: LedgerEntryType.BET, ...(hasDate ? { createdAt: dateFilter } : {}) },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: { userId: { in: userIds }, type: LedgerEntryType.WIN, ...(hasDate ? { createdAt: dateFilter } : {}) },
            _sum: { amount: true },
          }),
          this.prisma.walletRequest.aggregate({
            where: { userId: { in: userIds }, type: WalletRequestType.DEPOSIT, status: WalletRequestStatus.APPROVED, ...(hasDate ? { createdAt: dateFilter } : {}) },
            _sum: { amount: true },
          }),
          this.prisma.walletRequest.aggregate({
            where: { userId: { in: userIds }, type: WalletRequestType.WITHDRAWAL, status: WalletRequestStatus.APPROVED, ...(hasDate ? { createdAt: dateFilter } : {}) },
            _sum: { amount: true },
          }),
        ]);

        const stake = Math.abs(betAgg._sum.amount?.toNumber() ?? 0);
        const win = winAgg._sum.amount?.toNumber() ?? 0;
        const ggr = stake - win;
        const dep = depAgg._sum.amount?.toNumber() ?? 0;
        const wdr = wdrAgg._sum.amount?.toNumber() ?? 0;
        // 낙첨금액 = 입금 - 출금 (총판 정산의 기준)
        const houseEdge = dep - wdr;
        // effectivePct: how much of platform houseEdge this agent keeps
        const effPct = Number(a.agentPlatformSharePct ?? 0) * Number(a.agentSplitFromParentPct ?? 0) / 100;
        const settlement = (houseEdge * effPct) / 100;

        return {
          agentId: a.id,
          parentAgentId: a.parentUserId ?? null,
          loginId: a.loginId ?? '',
          displayName: a.displayName ?? '',
          memo: a.agentMemo ?? '',
          isTopAgent: !a.parentUserId,
          platformSharePct: Number(a.agentPlatformSharePct ?? 0),
          splitFromParentPct: Number(a.agentSplitFromParentPct ?? 0),
          effectivePct: Math.round(effPct * 1e4) / 1e4,
          downlineUsers: userIds.length,
          betStake: stake.toFixed(2),
          winTotal: win.toFixed(2),
          ggr: ggr.toFixed(2),
          depositTotal: dep.toFixed(2),
          withdrawTotal: wdr.toFixed(2),
          houseEdge: houseEdge.toFixed(2),
          myEstimatedSettlement: settlement.toFixed(2),
          directUsers,
        };
      }),
    );

    const byId = new Map(rows.map((r) => [r.agentId, r]));
    return rows.map((r) => {
      const childSum = agents
        .filter((ag) => ag.parentUserId === r.agentId)
        .reduce((s, ag) => s + Number(byId.get(ag.id)?.myEstimatedSettlement ?? 0), 0);
      return {
        ...r,
        childrenSettlementTotal: childSum.toFixed(2),
      };
    });
  }

  async getSalesLedger(platformId: string, actor: JwtPayload, from?: string, to?: string, limitRaw?: string) {
    this.assertPlatformAdmin(actor, platformId);
    const limit = Math.min(500, Math.max(1, Number.parseInt(limitRaw ?? '100', 10) || 100));
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const hasDate = Object.keys(dateFilter).length > 0;

    const rows = await this.prisma.ledgerEntry.findMany({
      where: {
        platformId,
        type: { in: [LedgerEntryType.BET, LedgerEntryType.WIN] },
        ...(hasDate ? { createdAt: dateFilter } : {}),
      },
      include: { user: { select: { loginId: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => {
      const meta = (r.metaJson as Record<string, unknown>) || {};
      return {
        id: r.id,
        userId: r.userId,
        userLoginId: r.user.loginId ?? '',
        userDisplayName: r.user.displayName ?? '',
        type: r.type,
        amount: r.amount.toFixed(2),
        balanceAfter: r.balanceAfter.toFixed(2),
        reference: r.reference,
        vertical: (meta.vertical as string | undefined) ?? 'casino',
        gameName: (meta.gameName as string | undefined) ?? (meta.providerName as string | undefined) ?? '',
        createdAt: r.createdAt.toISOString(),
      };
    });
  }
}
