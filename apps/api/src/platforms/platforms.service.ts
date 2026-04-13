import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateSemiVirtualDto } from './dto/update-semi-virtual.dto';
import { Prisma, SyncJobType, UserRole } from '@prisma/client';
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
    if (actor.role !== UserRole.PLATFORM_ADMIN) throw new ForbiddenException();
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
    return {
      ...p,
      rollingTurnoverMultiplier: p.rollingTurnoverMultiplier?.toString() ?? '1',
      minDepositKrw: p.minDepositKrw?.toString() ?? null,
      minDepositUsdt: p.minDepositUsdt?.toString() ?? null,
      minWithdrawKrw: p.minWithdrawKrw?.toString() ?? null,
      minWithdrawUsdt: p.minWithdrawUsdt?.toString() ?? null,
      minPointRedeemKrw: p.minPointRedeemKrw?.toString() ?? null,
      minPointRedeemUsdt: p.minPointRedeemUsdt?.toString() ?? null,
    };
  }

  async updateOperational(
    platformId: string,
    actor: JwtPayload,
    dto: UpdatePlatformOperationalDto,
  ) {
    this.assertPlatformScope(actor, platformId);
    const data: Prisma.PlatformUpdateInput = {};
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
    await this.prisma.platform.update({
      where: { id: platformId },
      data: dto.enabled
        ? {
            semiVirtualEnabled: true,
            semiVirtualRecipientPhone: phone,
            semiVirtualAccountHint: hint,
          }
        : {
            semiVirtualEnabled: false,
            semiVirtualRecipientPhone: null,
            semiVirtualAccountHint: null,
          },
    });
    return this.getSemiVirtual(platformId, actor);
  }

  async listBankSmsIngests(platformId: string, actor: JwtPayload) {
    this.assertPlatformScope(actor, platformId);
    /** 플랫폼 미할당(PARSE_ERROR 등) 행은 슈퍼관리자만 같이 조회 (플랫폼 관리자는 소속 플랫폼만) */
    const where =
      actor.role === UserRole.SUPER_ADMIN
        ? { OR: [{ platformId }, { platformId: null }] }
        : { platformId };
    return this.prisma.bankSmsIngest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 150,
      select: {
        id: true,
        status: true,
        failureReason: true,
        sender: true,
        recipientPhoneSnapshot: true,
        parsedJson: true,
        rawBody: true,
        matchedWalletRequestId: true,
        createdAt: true,
      },
    });
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
}
