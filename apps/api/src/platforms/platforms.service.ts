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
  PointLedgerEntryType,
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
import { ExecuteCompSettlementDto } from './dto/execute-comp-settlement.dto';
import { JwtPayload } from '../auth/auth.service';
import { access, copyFile, cp, mkdir } from 'fs/promises';
import { constants as FsConstants } from 'fs';
import { dirname, join } from 'path';
import { computeEffectiveAgentShares } from '../common/agent-commission.util';
import {
  buildDefaultPlatformHost,
  getPlatformTemplatePreset,
  listPlatformTemplatePresets,
} from './platform-template.util';

@Injectable()
export class PlatformsService {
  constructor(private prisma: PrismaService) {}

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private toValidDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} 날짜가 올바르지 않습니다.`);
    }
    return parsed;
  }

  private readCompPolicy(flagsJson: unknown) {
    const flags = this.asRecord(flagsJson);
    const compPolicy = this.asRecord(flags.compPolicy);
    return {
      enabled: compPolicy.enabled === true,
      settlementCycle:
        compPolicy.settlementCycle === 'DAILY_MIDNIGHT' ||
        compPolicy.settlementCycle === 'BET_DAY_PLUS'
          ? compPolicy.settlementCycle
          : ('INSTANT' as const),
      settlementOffsetDays:
        typeof compPolicy.settlementOffsetDays === 'number' &&
        Number.isFinite(compPolicy.settlementOffsetDays)
          ? Math.max(0, Math.trunc(compPolicy.settlementOffsetDays))
          : null,
      ratePct:
        typeof compPolicy.ratePct === 'string' ? compPolicy.ratePct : null,
    };
  }

  private readCompAutomation(flagsJson: unknown) {
    const flags = this.asRecord(flagsJson);
    const automation = this.asRecord(flags.compAutomation);
    const compPolicy = this.readCompPolicy(flagsJson);
    const envCronRaw = (process.env.COMP_SETTLEMENT_CRON || '5 0 * * *').trim();
    const fallbackCron = ['false', 'off', '0', 'disabled'].includes(
      envCronRaw.toLowerCase(),
    )
      ? null
      : envCronRaw;
    const cronRaw =
      typeof automation.cron === 'string' ? automation.cron.trim() : '';
    const cron = cronRaw
      ? ['false', 'off', '0', 'disabled'].includes(cronRaw.toLowerCase())
        ? null
        : cronRaw
      : fallbackCron;

    const envBackfillRaw = Number(
      process.env.COMP_SETTLEMENT_BACKFILL_DAYS ?? '7',
    );
    const fallbackBackfill =
      Number.isFinite(envBackfillRaw) && envBackfillRaw > 0
        ? Math.min(31, Math.max(1, Math.trunc(envBackfillRaw)))
        : 7;
    const backfillRaw =
      typeof automation.backfillDays === 'number'
        ? automation.backfillDays
        : Number(automation.backfillDays ?? fallbackBackfill);
    const backfillDays =
      Number.isFinite(backfillRaw) && backfillRaw > 0
        ? Math.min(31, Math.max(1, Math.trunc(backfillRaw)))
        : fallbackBackfill;

    const autoEnabled =
      typeof automation.autoEnabled === 'boolean'
        ? automation.autoEnabled
        : compPolicy.enabled &&
          compPolicy.settlementCycle !== 'INSTANT' &&
          Boolean(cron);

    return {
      autoEnabled,
      cron,
      backfillDays,
    };
  }

  private normalizePctString(value: unknown): string | null {
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value.trim())
          : NaN;
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.min(100, num).toFixed(2);
  }

  private readSolutionRatePolicy(flagsJson: unknown) {
    const flags = this.asRecord(flagsJson);
    const raw = this.asRecord(flags.solutionRatePolicy);
    const upstreamCasinoPct = this.normalizePctString(raw.upstreamCasinoPct);
    const upstreamSportsPct = this.normalizePctString(raw.upstreamSportsPct);
    const autoMarginPct =
      this.normalizePctString(raw.autoMarginPct) ?? '1.00';
    const marginNum = Number(autoMarginPct);
    const platformCasinoPct =
      this.normalizePctString(raw.platformCasinoPct) ??
      ((Number(upstreamCasinoPct ?? '0') + marginNum).toFixed(2) as string);
    const platformSportsPct =
      this.normalizePctString(raw.platformSportsPct) ??
      ((Number(upstreamSportsPct ?? '0') + marginNum).toFixed(2) as string);
    return {
      upstreamCasinoPct,
      upstreamSportsPct,
      platformCasinoPct,
      platformSportsPct,
      autoMarginPct,
    };
  }

  private buildSolutionRatePolicy(
    input: unknown,
    fallback?: {
      upstreamCasinoPct?: string | null;
      upstreamSportsPct?: string | null;
      platformCasinoPct?: string | null;
      platformSportsPct?: string | null;
      autoMarginPct?: string | null;
    },
  ) {
    const raw = this.asRecord(input);
    const upstreamCasinoPct =
      this.normalizePctString(raw.upstreamCasinoPct) ??
      this.normalizePctString(fallback?.upstreamCasinoPct);
    const upstreamSportsPct =
      this.normalizePctString(raw.upstreamSportsPct) ??
      this.normalizePctString(fallback?.upstreamSportsPct);
    const autoMarginPct =
      this.normalizePctString(raw.autoMarginPct) ??
      this.normalizePctString(fallback?.autoMarginPct) ??
      '1.00';
    const marginNum = Number(autoMarginPct);
    const platformCasinoPct =
      this.normalizePctString(raw.platformCasinoPct) ??
      this.normalizePctString(fallback?.platformCasinoPct) ??
      (Number(upstreamCasinoPct ?? '0') + marginNum).toFixed(2);
    const platformSportsPct =
      this.normalizePctString(raw.platformSportsPct) ??
      this.normalizePctString(fallback?.platformSportsPct) ??
      (Number(upstreamSportsPct ?? '0') + marginNum).toFixed(2);

    return {
      upstreamCasinoPct,
      upstreamSportsPct,
      platformCasinoPct,
      platformSportsPct,
      autoMarginPct,
    };
  }

  private sanitizeSolutionRatePolicy(
    actor: JwtPayload,
    policy: {
      upstreamCasinoPct?: string | null;
      upstreamSportsPct?: string | null;
      platformCasinoPct?: string | null;
      platformSportsPct?: string | null;
      autoMarginPct?: string | null;
    },
  ) {
    return actor.role === UserRole.SUPER_ADMIN ? policy : null;
  }

  private hiddenSolutionRateSummary() {
    return {
      upstreamCasinoPct: null,
      upstreamSportsPct: null,
      platformCasinoPct: null,
      platformSportsPct: null,
      autoMarginPct: null,
      casinoBaseGgr: '0.00',
      sportsBaseGgr: '0.00',
      upstreamCostKrw: '0.00',
      platformChargeKrw: '0.00',
      solutionMarginKrw: '0.00',
      modeledBase: 'HIDDEN',
    };
  }

  private computeSolutionRateMetrics(
    flagsJson: unknown,
    casinoGgr: number,
    sportsGgr: number,
  ) {
    const solutionRatePolicy = this.readSolutionRatePolicy(flagsJson);
    const casinoBaseGgr = Math.max(0, casinoGgr);
    const sportsBaseGgr = Math.max(0, sportsGgr);
    const upstreamCasinoPctNum = Number(
      solutionRatePolicy.upstreamCasinoPct ?? '0',
    );
    const upstreamSportsPctNum = Number(
      solutionRatePolicy.upstreamSportsPct ?? '0',
    );
    const platformCasinoPctNum = Number(
      solutionRatePolicy.platformCasinoPct ?? '0',
    );
    const platformSportsPctNum = Number(
      solutionRatePolicy.platformSportsPct ?? '0',
    );
    const upstreamVendorCost =
      casinoBaseGgr * (upstreamCasinoPctNum / 100) +
      sportsBaseGgr * (upstreamSportsPctNum / 100);
    const platformBilledRate =
      casinoBaseGgr * (platformCasinoPctNum / 100) +
      sportsBaseGgr * (platformSportsPctNum / 100);
    const solutionRateMargin = platformBilledRate - upstreamVendorCost;

    return {
      solutionRatePolicy,
      casinoBaseGgr,
      sportsBaseGgr,
      upstreamVendorCost,
      platformBilledRate,
      solutionRateMargin,
    };
  }

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
    const canSeeSolutionRates = user.role === UserRole.SUPER_ADMIN;
    const decorate = (
      rows: Array<{
        id: string;
        slug: string;
        name: string;
        previewPort: number | null;
        flagsJson: unknown;
        domains: { host: string }[];
      }>,
    ) =>
      rows.map((row) => {
        const flags = this.asRecord(row.flagsJson);
        return {
          ...row,
          solutionTemplateKey:
            typeof flags.solutionTemplateKey === 'string'
              ? flags.solutionTemplateKey
              : 'HYBRID',
          solutionHostSuffix:
            typeof flags.solutionHostSuffix === 'string'
              ? flags.solutionHostSuffix
              : buildDefaultPlatformHost(row.slug).split('.').slice(1).join('.'),
          solutionRatePolicy: canSeeSolutionRates
            ? this.readSolutionRatePolicy(row.flagsJson)
            : undefined,
        };
      });

    if (user.role === UserRole.SUPER_ADMIN) {
      return this.prisma.platform
        .findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          name: true,
          previewPort: true,
          flagsJson: true,
          domains: { select: { host: true } },
        },
      })
        .then(decorate);
    }
    if (user.role === UserRole.PLATFORM_ADMIN && user.platformId) {
      return this.prisma.platform
        .findMany({
        where: { id: user.platformId },
        select: {
          id: true,
          slug: true,
          name: true,
          previewPort: true,
          flagsJson: true,
          domains: { select: { host: true } },
        },
      })
        .then(decorate);
    }
    if (user.role === UserRole.MASTER_AGENT && user.platformId) {
      return this.prisma.platform
        .findMany({
        where: { id: user.platformId },
        select: {
          id: true,
          slug: true,
          name: true,
          previewPort: true,
          flagsJson: true,
          domains: { select: { host: true } },
        },
      })
        .then(decorate);
    }
    throw new ForbiddenException();
  }

  listTemplates() {
    return {
      defaultHostSuffix:
        process.env.PLATFORM_HOST_SUFFIX?.trim().toLowerCase() ||
        'mod.tozinosolution.com',
      items: listPlatformTemplatePresets().map((preset) => ({
        key: preset.key,
        label: preset.label,
        description: preset.description,
        defaultHostSuffix: preset.defaultHostSuffix,
        defaultRatePolicy: preset.defaultRatePolicy,
        defaultOperational: preset.defaultOperational,
      })),
    };
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
    const src = cloneId
      ? await this.prisma.platform.findUnique({
          where: { id: cloneId },
          select: {
            themeJson: true,
            flagsJson: true,
            integrationsJson: true,
            rollingLockWithdrawals: true,
            rollingTurnoverMultiplier: true,
            agentCanEditMemberRolling: true,
            pointRulesJson: true,
          },
        })
      : null;
    if (cloneId && !src) {
      throw new BadRequestException('복제할 플랫폼을 찾을 수 없습니다');
    }

    const sourceFlags = this.asRecord(src?.flagsJson);
    const template = getPlatformTemplatePreset(
      dto.templateKey ??
        (typeof sourceFlags.solutionTemplateKey === 'string'
          ? sourceFlags.solutionTemplateKey
          : null),
    );
    const host = (
      dto.primaryHost?.trim() || buildDefaultPlatformHost(dto.slug, template.defaultHostSuffix)
    )
      .toLowerCase()
      .split(':')[0];
    let themeJson: Prisma.InputJsonValue = {
      ...template.defaultThemeJson,
    } as Prisma.InputJsonValue;
    let flagsJson: Prisma.InputJsonValue = {
      ...template.defaultFlagsJson,
      solutionTemplateKey: template.key,
      solutionHostSuffix: template.defaultHostSuffix,
      solutionRatePolicy: this.buildSolutionRatePolicy(
        dto.solutionRatePolicy,
        template.defaultRatePolicy,
      ),
    } as Prisma.InputJsonValue;
    let integrationsJson: Prisma.InputJsonValue = {};

    if (src) {
      const tOverride = (dto.themeJson ?? {}) as Record<string, unknown>;
      const fOverride = (dto.flagsJson ?? {}) as Record<string, unknown>;
      themeJson = {
        ...(template.defaultThemeJson as object),
        ...(src.themeJson as object),
        ...tOverride,
      } as Prisma.InputJsonValue;
      const mergedFlags = {
        ...(template.defaultFlagsJson as object),
        ...(src.flagsJson as object),
        ...fOverride,
      } as Record<string, unknown>;
      mergedFlags.solutionTemplateKey = template.key;
      mergedFlags.solutionHostSuffix = template.defaultHostSuffix;
      mergedFlags.solutionRatePolicy = this.buildSolutionRatePolicy(
        dto.solutionRatePolicy ?? mergedFlags.solutionRatePolicy,
        template.defaultRatePolicy,
      );
      flagsJson = mergedFlags as Prisma.InputJsonValue;
      integrationsJson = (src.integrationsJson ?? {}) as Prisma.InputJsonValue;
    } else {
      const tOverride = (dto.themeJson ?? {}) as Record<string, unknown>;
      const fOverride = (dto.flagsJson ?? {}) as Record<string, unknown>;
      themeJson = {
        ...(template.defaultThemeJson as object),
        ...tOverride,
      } as Prisma.InputJsonValue;
      const mergedFlags = {
        ...(template.defaultFlagsJson as object),
        ...fOverride,
      } as Record<string, unknown>;
      mergedFlags.solutionTemplateKey = template.key;
      mergedFlags.solutionHostSuffix = template.defaultHostSuffix;
      mergedFlags.solutionRatePolicy = this.buildSolutionRatePolicy(
        dto.solutionRatePolicy ?? mergedFlags.solutionRatePolicy,
        template.defaultRatePolicy,
      );
      flagsJson = mergedFlags as Prisma.InputJsonValue;
    }

    const platform = await this.prisma.platform.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        previewPort,
        themeJson,
        flagsJson,
        integrationsJson,
        rollingLockWithdrawals:
          src?.rollingLockWithdrawals ??
          template.defaultOperational.rollingLockWithdrawals,
        rollingTurnoverMultiplier:
          src?.rollingTurnoverMultiplier ??
          new Prisma.Decimal(template.defaultOperational.rollingTurnoverMultiplier),
        agentCanEditMemberRolling:
          src?.agentCanEditMemberRolling ??
          template.defaultOperational.agentCanEditMemberRolling,
        pointRulesJson:
          (src?.pointRulesJson as Prisma.InputJsonValue | undefined) ??
          (template.defaultOperational.pointRulesJson as Prisma.InputJsonValue),
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
    const flags = this.asRecord(p.flagsJson);
    const compPolicy = this.readCompPolicy(p.flagsJson);
    const compAutomation = this.readCompAutomation(p.flagsJson);
    const solutionRatePolicy = this.readSolutionRatePolicy(p.flagsJson);
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
      solutionTemplateKey:
        typeof flags.solutionTemplateKey === 'string'
          ? flags.solutionTemplateKey
          : 'HYBRID',
      solutionHostSuffix:
        typeof flags.solutionHostSuffix === 'string'
          ? flags.solutionHostSuffix
          : 'mod.tozinosolution.com',
      compPolicy,
      compAutomation,
      solutionRatePolicy: this.sanitizeSolutionRatePolicy(
        actor,
        solutionRatePolicy,
      ),
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
    if (dto.compAutomation !== undefined) {
      const raw = this.asRecord(dto.compAutomation);
      const cronRaw =
        typeof raw.cron === 'string'
          ? raw.cron.trim()
          : String(raw.cron ?? '').trim();
      const cron =
        cronRaw &&
        !['false', 'off', '0', 'disabled'].includes(cronRaw.toLowerCase())
          ? cronRaw
          : null;
      const backfillRaw =
        typeof raw.backfillDays === 'number'
          ? raw.backfillDays
          : Number(raw.backfillDays ?? NaN);
      nextFlags.compAutomation = {
        autoEnabled: raw.autoEnabled === true,
        cron,
        backfillDays:
          Number.isFinite(backfillRaw) && backfillRaw > 0
            ? Math.min(31, Math.max(1, Math.trunc(backfillRaw)))
            : null,
      };
      data.flagsJson = nextFlags as Prisma.InputJsonValue;
    }
    if (dto.solutionRatePolicy !== undefined) {
      if (actor.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          '상위업체 요율은 슈퍼관리자만 수정할 수 있습니다.',
        );
      }
      nextFlags.solutionRatePolicy = this.buildSolutionRatePolicy(
        dto.solutionRatePolicy,
        this.readSolutionRatePolicy(nextFlags),
      );
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

  async listCompSettlements(
    platformId: string,
    actor: JwtPayload,
    take = 20,
  ) {
    this.assertPlatformScope(actor, platformId);
    const limit = Number.isFinite(take)
      ? Math.min(100, Math.max(1, Math.trunc(take)))
      : 20;
    const [count, totalAgg, items] = await Promise.all([
      this.prisma.compSettlement.count({ where: { platformId } }),
      this.prisma.compSettlement.aggregate({
        where: { platformId },
        _sum: { amount: true },
      }),
      this.prisma.compSettlement.findMany({
        where: { platformId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              loginId: true,
              displayName: true,
            },
          },
        },
      }),
    ]);
    return {
      count,
      totalAmount: totalAgg._sum.amount?.toFixed(2) ?? '0.00',
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        loginId: item.user.loginId ?? '',
        displayName: item.user.displayName ?? '',
        periodFrom: item.periodFrom.toISOString(),
        periodTo: item.periodTo.toISOString(),
        baseAmount: item.baseAmount.toFixed(2),
        ratePct: item.ratePct.toFixed(4),
        amount: item.amount.toFixed(2),
        settlementCycle: item.settlementCycle,
        settlementOffsetDays: item.settlementOffsetDays,
        note: item.note,
        settledByUserId: item.settledByUserId,
        settledByLoginId: item.settledByLoginId,
        ledgerReference: item.ledgerReference,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async listSolutionBillingSettlements(
    platformId: string,
    actor: JwtPayload,
    take = 20,
  ) {
    this.assertPlatformScope(actor, platformId);
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    const limit = Number.isFinite(take)
      ? Math.min(100, Math.max(1, Math.trunc(take)))
      : 20;
    const [count, totals, items] = await Promise.all([
      this.prisma.solutionBillingSettlement.count({ where: { platformId } }),
      this.prisma.solutionBillingSettlement.aggregate({
        where: { platformId },
        _sum: {
          upstreamCost: true,
          platformCharge: true,
          solutionMargin: true,
        },
      }),
      this.prisma.solutionBillingSettlement.findMany({
        where: { platformId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);
    return {
      count,
      totalUpstreamCost: totals._sum.upstreamCost?.toFixed(2) ?? '0.00',
      totalPlatformCharge: totals._sum.platformCharge?.toFixed(2) ?? '0.00',
      totalSolutionMargin: totals._sum.solutionMargin?.toFixed(2) ?? '0.00',
      items: items.map((item) => ({
        id: item.id,
        periodFrom: item.periodFrom.toISOString(),
        periodTo: item.periodTo.toISOString(),
        casinoBaseGgr: item.casinoBaseGgr.toFixed(2),
        sportsBaseGgr: item.sportsBaseGgr.toFixed(2),
        upstreamCasinoPct: item.upstreamCasinoPct.toFixed(4),
        upstreamSportsPct: item.upstreamSportsPct.toFixed(4),
        platformCasinoPct: item.platformCasinoPct.toFixed(4),
        platformSportsPct: item.platformSportsPct.toFixed(4),
        upstreamCost: item.upstreamCost.toFixed(2),
        platformCharge: item.platformCharge.toFixed(2),
        solutionMargin: item.solutionMargin.toFixed(2),
        note: item.note,
        settledByUserId: item.settledByUserId,
        settledByLoginId: item.settledByLoginId,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  private kstYmd(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private shiftKstYmd(baseYmd: string, deltaDays: number): string {
    const base = new Date(`${baseYmd}T00:00:00+09:00`);
    base.setUTCDate(base.getUTCDate() + deltaDays);
    return this.kstYmd(base);
  }

  private kstDayRange(targetYmd: string) {
    return {
      from: new Date(`${targetYmd}T00:00:00+09:00`),
      to: new Date(`${targetYmd}T23:59:59.999+09:00`),
    };
  }

  private async executeCompSettlement(
    platformId: string,
    params: {
      periodFrom: Date;
      periodTo: Date;
      dryRun: boolean;
      note?: string | null;
      settledByUserId?: string | null;
      settledByLoginId?: string | null;
    },
  ) {
    const { periodFrom, periodTo, dryRun, note, settledByUserId, settledByLoginId } =
      params;

    if (periodFrom > periodTo) {
      throw new BadRequestException('콤프 정산 시작일은 종료일보다 늦을 수 없습니다.');
    }

    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { flagsJson: true },
    });
    if (!platform) throw new NotFoundException('Platform not found');

    const compPolicy = this.readCompPolicy(platform.flagsJson);
    if (!compPolicy.enabled) {
      throw new BadRequestException('콤프 정책이 비활성화되어 있습니다.');
    }

    const rateNum = compPolicy.ratePct ? Number(compPolicy.ratePct) : NaN;
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      throw new BadRequestException('유효한 콤프률이 설정되어 있지 않습니다.');
    }

    const ratePct = new Prisma.Decimal(String(rateNum)).toDecimalPlaces(
      4,
      Prisma.Decimal.ROUND_HALF_UP,
    );
    const approvedInPeriod = this.approvedWalletWhere(platformId, undefined, {
      gte: periodFrom,
      lte: periodTo,
    });

    const [depByUser, wdrByUser, existingSettlements] = await Promise.all([
      this.prisma.walletRequest.groupBy({
        by: ['userId'],
        where: {
          ...approvedInPeriod,
          type: WalletRequestType.DEPOSIT,
          user: { role: UserRole.USER },
        },
        _sum: { amount: true },
      }),
      this.prisma.walletRequest.groupBy({
        by: ['userId'],
        where: {
          ...approvedInPeriod,
          type: WalletRequestType.WITHDRAWAL,
          user: { role: UserRole.USER },
        },
        _sum: { amount: true },
      }),
      this.prisma.compSettlement.findMany({
        where: { platformId, periodFrom, periodTo },
        select: { userId: true },
      }),
    ]);

    const depMap = new Map(
      depByUser.map((row) => [row.userId, row._sum.amount ?? new Prisma.Decimal(0)]),
    );
    const wdrMap = new Map(
      wdrByUser.map((row) => [row.userId, row._sum.amount ?? new Prisma.Decimal(0)]),
    );
    const involvedUserIds = [...new Set<string>([...depMap.keys(), ...wdrMap.keys()])];
    if (involvedUserIds.length === 0) {
      return {
        dryRun,
        period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
        policy: {
          ...compPolicy,
          ratePct: ratePct.toFixed(4),
        },
        totals: {
          eligibleUsers: 0,
          readyUsers: 0,
          skippedExistingUsers: 0,
          totalBaseAmount: '0.00',
          totalAmount: '0.00',
          createdUsers: 0,
          createdAmount: '0.00',
        },
        rows: [],
      };
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: involvedUserIds },
        platformId,
        role: UserRole.USER,
      },
      select: {
        id: true,
        loginId: true,
        displayName: true,
        wallet: {
          select: {
            id: true,
            balance: true,
          },
        },
      },
    });

    const existingUserIds = new Set(existingSettlements.map((row) => row.userId));
    const eligibleRows = users
      .map((user) => {
        const depositTotal = depMap.get(user.id) ?? new Prisma.Decimal(0);
        const withdrawTotal = wdrMap.get(user.id) ?? new Prisma.Decimal(0);
        const baseAmount = depositTotal.minus(withdrawTotal).toDecimalPlaces(
          2,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        if (baseAmount.lte(0)) return null;
        const amount = baseAmount
          .times(ratePct)
          .div(100)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        if (amount.lte(0)) return null;
        return {
          userId: user.id,
          loginId: user.loginId ?? '',
          displayName: user.displayName ?? '',
          walletId: user.wallet?.id ?? null,
          walletBalance: user.wallet?.balance ?? new Prisma.Decimal(0),
          baseAmount,
          amount,
          existing: existingUserIds.has(user.id),
        };
      })
      .filter(
        (
          row,
        ): row is {
          userId: string;
          loginId: string;
          displayName: string;
          walletId: string | null;
          walletBalance: Prisma.Decimal;
          baseAmount: Prisma.Decimal;
          amount: Prisma.Decimal;
          existing: boolean;
        } => Boolean(row),
      )
      .sort((a, b) => b.amount.comparedTo(a.amount));

    const readyRows = eligibleRows.filter((row) => !row.existing && row.walletId);
    const totalBaseAmount = eligibleRows.reduce(
      (sum, row) => sum.plus(row.baseAmount),
      new Prisma.Decimal(0),
    );
    const totalAmount = eligibleRows.reduce(
      (sum, row) => sum.plus(row.amount),
      new Prisma.Decimal(0),
    );

    let createdUsers = 0;
    let createdAmount = new Prisma.Decimal(0);

    if (!dryRun && readyRows.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const row of readyRows) {
          if (!row.walletId) continue;
          const settlement = await tx.compSettlement.create({
            data: {
              platformId,
              userId: row.userId,
              periodFrom,
              periodTo,
              baseAmount: row.baseAmount,
              ratePct,
              amount: row.amount,
              settlementCycle: compPolicy.settlementCycle,
              settlementOffsetDays: compPolicy.settlementOffsetDays,
              note: note?.trim() || null,
              settledByUserId: settledByUserId ?? null,
              settledByLoginId: settledByLoginId ?? null,
            },
          });
          const nextBalance = row.walletBalance.plus(row.amount);
          const ledgerReference = `comp:${settlement.id}`;
          await tx.wallet.update({
            where: { id: row.walletId },
            data: { balance: nextBalance },
          });
          await tx.ledgerEntry.create({
            data: {
              userId: row.userId,
              platformId,
              type: LedgerEntryType.ADJUSTMENT,
              amount: row.amount,
              balanceAfter: nextBalance,
              reference: ledgerReference,
              metaJson: {
                compSettlement: true,
                compSettlementId: settlement.id,
                baseAmount: row.baseAmount.toFixed(2),
                ratePct: ratePct.toFixed(4),
                periodFrom: periodFrom.toISOString(),
                periodTo: periodTo.toISOString(),
              },
            },
          });
          await tx.compSettlement.update({
            where: { id: settlement.id },
            data: { ledgerReference },
          });
          createdUsers += 1;
          createdAmount = createdAmount.plus(row.amount);
        }
      });
    }

    return {
      dryRun,
      period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
      policy: {
        ...compPolicy,
        ratePct: ratePct.toFixed(4),
      },
      totals: {
        eligibleUsers: eligibleRows.length,
        readyUsers: readyRows.length,
        skippedExistingUsers: eligibleRows.filter((row) => row.existing).length,
        totalBaseAmount: totalBaseAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        createdUsers,
        createdAmount: createdAmount.toFixed(2),
      },
      rows: eligibleRows.slice(0, 100).map((row) => ({
        userId: row.userId,
        loginId: row.loginId,
        displayName: row.displayName,
        baseAmount: row.baseAmount.toFixed(2),
        amount: row.amount.toFixed(2),
        status: row.existing
          ? 'already_settled'
          : row.walletId
            ? 'ready'
            : 'wallet_missing',
      })),
    };
  }

  async runCompSettlement(
    platformId: string,
    actor: JwtPayload,
    dto: ExecuteCompSettlementDto,
  ) {
    this.assertPlatformScope(actor, platformId);
    const periodFrom = this.toValidDate(dto.from, 'from');
    const periodTo = this.toValidDate(dto.to, 'to');
    const settledBy = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { loginId: true },
    });
    return this.executeCompSettlement(platformId, {
      periodFrom,
      periodTo,
      dryRun: dto.dryRun === true,
      note: dto.note?.trim() || null,
      settledByUserId: actor.sub,
      settledByLoginId: settledBy?.loginId ?? null,
    });
  }

  private async executeSolutionBillingSettlement(
    platformId: string,
    params: {
      periodFrom: Date;
      periodTo: Date;
      dryRun: boolean;
      note?: string | null;
      settledByUserId?: string | null;
      settledByLoginId?: string | null;
    },
  ) {
    const { periodFrom, periodTo, dryRun, note, settledByUserId, settledByLoginId } =
      params;

    if (periodFrom > periodTo) {
      throw new BadRequestException(
        '솔루션 청구 시작일은 종료일보다 늦을 수 없습니다.',
      );
    }

    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { flagsJson: true },
    });
    if (!platform) throw new NotFoundException('Platform not found');

    const existing = await this.prisma.solutionBillingSettlement.findFirst({
      where: { platformId, periodFrom, periodTo },
    });

    const ledgerInPeriod: Prisma.LedgerEntryWhereInput = {
      platformId,
      createdAt: {
        gte: periodFrom,
        lte: periodTo,
      },
    };

    const [casinoBet, casinoWin, sportsBet, sportsWin] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.BET,
          metaJson: { path: ['vertical'], equals: 'casino' },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.WIN,
          metaJson: { path: ['vertical'], equals: 'casino' },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.BET,
          metaJson: { path: ['vertical'], equals: 'sports' },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.WIN,
          metaJson: { path: ['vertical'], equals: 'sports' },
        },
        _sum: { amount: true },
      }),
    ]);

    const casinoGgr =
      Math.abs(casinoBet._sum.amount?.toNumber() ?? 0) -
      (casinoWin._sum.amount?.toNumber() ?? 0);
    const sportsGgr =
      Math.abs(sportsBet._sum.amount?.toNumber() ?? 0) -
      (sportsWin._sum.amount?.toNumber() ?? 0);
    const metrics = this.computeSolutionRateMetrics(
      platform.flagsJson,
      casinoGgr,
      sportsGgr,
    );

    const settlementPayload = {
      casinoBaseGgr: metrics.casinoBaseGgr.toFixed(2),
      sportsBaseGgr: metrics.sportsBaseGgr.toFixed(2),
      upstreamCasinoPct: metrics.solutionRatePolicy.upstreamCasinoPct ?? '0.0000',
      upstreamSportsPct: metrics.solutionRatePolicy.upstreamSportsPct ?? '0.0000',
      platformCasinoPct: metrics.solutionRatePolicy.platformCasinoPct ?? '0.0000',
      platformSportsPct: metrics.solutionRatePolicy.platformSportsPct ?? '0.0000',
      upstreamCost: metrics.upstreamVendorCost.toFixed(2),
      platformCharge: metrics.platformBilledRate.toFixed(2),
      solutionMargin: metrics.solutionRateMargin.toFixed(2),
      note: note?.trim() || null,
      settledByUserId: settledByUserId ?? null,
      settledByLoginId: settledByLoginId ?? null,
    };

    if (existing) {
      return {
        dryRun,
        status: 'already_settled',
        period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
        settlement: {
          id: existing.id,
          periodFrom: existing.periodFrom.toISOString(),
          periodTo: existing.periodTo.toISOString(),
          casinoBaseGgr: existing.casinoBaseGgr.toFixed(2),
          sportsBaseGgr: existing.sportsBaseGgr.toFixed(2),
          upstreamCasinoPct: existing.upstreamCasinoPct.toFixed(4),
          upstreamSportsPct: existing.upstreamSportsPct.toFixed(4),
          platformCasinoPct: existing.platformCasinoPct.toFixed(4),
          platformSportsPct: existing.platformSportsPct.toFixed(4),
          upstreamCost: existing.upstreamCost.toFixed(2),
          platformCharge: existing.platformCharge.toFixed(2),
          solutionMargin: existing.solutionMargin.toFixed(2),
          note: existing.note,
          settledByUserId: existing.settledByUserId,
          settledByLoginId: existing.settledByLoginId,
          createdAt: existing.createdAt.toISOString(),
        },
      };
    }

    if (dryRun) {
      return {
        dryRun: true,
        status: 'ready',
        period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
        settlement: {
          id: null,
          periodFrom: periodFrom.toISOString(),
          periodTo: periodTo.toISOString(),
          ...settlementPayload,
          createdAt: null,
        },
      };
    }

    const created = await this.prisma.solutionBillingSettlement.create({
      data: {
        platformId,
        periodFrom,
        periodTo,
        casinoBaseGgr: new Prisma.Decimal(settlementPayload.casinoBaseGgr),
        sportsBaseGgr: new Prisma.Decimal(settlementPayload.sportsBaseGgr),
        upstreamCasinoPct: new Prisma.Decimal(
          settlementPayload.upstreamCasinoPct,
        ),
        upstreamSportsPct: new Prisma.Decimal(
          settlementPayload.upstreamSportsPct,
        ),
        platformCasinoPct: new Prisma.Decimal(
          settlementPayload.platformCasinoPct,
        ),
        platformSportsPct: new Prisma.Decimal(
          settlementPayload.platformSportsPct,
        ),
        upstreamCost: new Prisma.Decimal(settlementPayload.upstreamCost),
        platformCharge: new Prisma.Decimal(settlementPayload.platformCharge),
        solutionMargin: new Prisma.Decimal(settlementPayload.solutionMargin),
        note: settlementPayload.note,
        settledByUserId: settlementPayload.settledByUserId,
        settledByLoginId: settlementPayload.settledByLoginId,
      },
    });

    return {
      dryRun: false,
      status: 'created',
      period: { from: periodFrom.toISOString(), to: periodTo.toISOString() },
      settlement: {
        id: created.id,
        periodFrom: created.periodFrom.toISOString(),
        periodTo: created.periodTo.toISOString(),
        casinoBaseGgr: created.casinoBaseGgr.toFixed(2),
        sportsBaseGgr: created.sportsBaseGgr.toFixed(2),
        upstreamCasinoPct: created.upstreamCasinoPct.toFixed(4),
        upstreamSportsPct: created.upstreamSportsPct.toFixed(4),
        platformCasinoPct: created.platformCasinoPct.toFixed(4),
        platformSportsPct: created.platformSportsPct.toFixed(4),
        upstreamCost: created.upstreamCost.toFixed(2),
        platformCharge: created.platformCharge.toFixed(2),
        solutionMargin: created.solutionMargin.toFixed(2),
        note: created.note,
        settledByUserId: created.settledByUserId,
        settledByLoginId: created.settledByLoginId,
        createdAt: created.createdAt.toISOString(),
      },
    };
  }

  async runSolutionBillingSettlement(
    platformId: string,
    actor: JwtPayload,
    dto: {
      from: string;
      to: string;
      note?: string;
      dryRun?: boolean;
    },
  ) {
    this.assertPlatformScope(actor, platformId);
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    const periodFrom = this.toValidDate(dto.from, 'from');
    const periodTo = this.toValidDate(dto.to, 'to');
    const settledBy = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { loginId: true },
    });
    return this.executeSolutionBillingSettlement(platformId, {
      periodFrom,
      periodTo,
      dryRun: dto.dryRun === true,
      note: dto.note?.trim() || null,
      settledByUserId: actor.sub,
      settledByLoginId: settledBy?.loginId ?? null,
    });
  }

  async runAutoCompSettlementSweep(platformId: string, now = new Date()) {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { flagsJson: true },
    });
    if (!platform) {
      return { platformId, status: 'platform_missing', processedPeriods: 0 };
    }

    const compPolicy = this.readCompPolicy(platform.flagsJson);
    const compAutomation = this.readCompAutomation(platform.flagsJson);
    if (!compPolicy.enabled) {
      return { platformId, status: 'disabled', processedPeriods: 0 };
    }
    if (compPolicy.settlementCycle === 'INSTANT') {
      return { platformId, status: 'instant_manual', processedPeriods: 0 };
    }
    if (!compAutomation.autoEnabled) {
      return { platformId, status: 'automation_disabled', processedPeriods: 0 };
    }
    if (!compAutomation.cron) {
      return {
        platformId,
        status: 'automation_missing_cron',
        processedPeriods: 0,
      };
    }

    const backfillDays = compAutomation.backfillDays;
    const baseOffset =
      compPolicy.settlementCycle === 'DAILY_MIDNIGHT'
        ? 1
        : Math.max(1, compPolicy.settlementOffsetDays ?? 0);
    const todayKst = this.kstYmd(now);
    const results: Array<{
      targetYmd: string;
      createdUsers: number;
      createdAmount: string;
    }> = [];

    for (let extra = backfillDays - 1; extra >= 0; extra -= 1) {
      const targetYmd = this.shiftKstYmd(todayKst, -(baseOffset + extra));
      const range = this.kstDayRange(targetYmd);
      const result = await this.executeCompSettlement(platformId, {
        periodFrom: range.from,
        periodTo: range.to,
        dryRun: false,
        note: `[AUTO] ${targetYmd} ${compPolicy.settlementCycle}`,
        settledByUserId: null,
        settledByLoginId: 'SYSTEM_AUTO',
      });
      results.push({
        targetYmd,
        createdUsers: result.totals.createdUsers,
        createdAmount: result.totals.createdAmount,
      });
    }

    return {
      platformId,
      status: 'processed',
      settlementCycle: compPolicy.settlementCycle,
      backfillDays,
      processedPeriods: results.length,
      createdUsers: results.reduce((sum, row) => sum + row.createdUsers, 0),
      createdAmount: results
        .reduce((sum, row) => sum.plus(new Prisma.Decimal(row.createdAmount)), new Prisma.Decimal(0))
        .toFixed(2),
      results,
    };
  }

  // ─── 매출 현황 ────────────────────────────────────────────

  private assertPlatformAdmin(actor: JwtPayload, platformId: string) {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.PLATFORM_ADMIN)
      throw new ForbiddenException();
    if (actor.role === UserRole.PLATFORM_ADMIN && actor.platformId !== platformId)
      throw new ForbiddenException();
  }

  private approvedWalletWhere(
    platformId: string,
    userIds?: string[],
    dateFilter?: Prisma.DateTimeFilter,
  ): Prisma.WalletRequestWhereInput {
    const base: Prisma.WalletRequestWhereInput = {
      platformId,
      status: WalletRequestStatus.APPROVED,
      ...(userIds ? { userId: { in: userIds } } : {}),
    };
    if (!dateFilter || Object.keys(dateFilter).length === 0) {
      return base;
    }
    return {
      ...base,
      OR: [
        { resolvedAt: dateFilter },
        {
          AND: [{ resolvedAt: null }, { createdAt: dateFilter }],
        },
      ],
    };
  }

  async getSalesSummary(platformId: string, actor: JwtPayload, from?: string, to?: string) {
    this.assertPlatformAdmin(actor, platformId);
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const hasDate = Object.keys(dateFilter).length > 0;
    const positiveAmount: Prisma.DecimalFilter = { gt: new Prisma.Decimal(0) };
    const approvedInPeriod = this.approvedWalletWhere(
      platformId,
      undefined,
      hasDate ? dateFilter : undefined,
    );
    const ledgerInPeriod: Prisma.LedgerEntryWhereInput = {
      platformId,
      ...(hasDate ? { createdAt: dateFilter } : {}),
    };
    const pointLedgerInPeriod: Prisma.PointLedgerEntryWhereInput = {
      platformId,
      ...(hasDate ? { createdAt: dateFilter } : {}),
    };

    const [
      platform,
      betAgg,
      winAgg,
      depositAgg,
      withdrawAgg,
      depByUser,
      wdrByUser,
      userCnt,
      agentCnt,
      positiveAdjustAgg,
      principalPositiveAdjustAgg,
      depositBonusAgg,
      pointRedeemAgg,
      refundAdjustAgg,
      cancelAdjustAgg,
      sportsCancelAdjustAgg,
      sportsChangeAdjustAgg,
      compSettlementAdjustAgg,
      actualCompAgg,
      pointPositiveByType,
      pointAdjustmentEntries,
    ] = await Promise.all([
      this.prisma.platform.findUnique({
        where: { id: platformId },
        select: { flagsJson: true, pointRulesJson: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { ...ledgerInPeriod, type: LedgerEntryType.BET },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { ...ledgerInPeriod, type: LedgerEntryType.WIN },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletRequest.aggregate({
        where: { ...approvedInPeriod, type: WalletRequestType.DEPOSIT },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletRequest.aggregate({
        where: { ...approvedInPeriod, type: WalletRequestType.WITHDRAWAL },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletRequest.groupBy({
        by: ['userId'],
        where: { ...approvedInPeriod, type: WalletRequestType.DEPOSIT },
        _sum: { amount: true },
      }),
      this.prisma.walletRequest.groupBy({
        by: ['userId'],
        where: { ...approvedInPeriod, type: WalletRequestType.WITHDRAWAL },
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { platformId, role: UserRole.USER } }),
      this.prisma.user.count({ where: { platformId, role: UserRole.MASTER_AGENT } }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['demoWalletRequest'], equals: true },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['depositEventBonus'], equals: true },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['pointRedeem'], equals: true },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['command'], equals: 'refund' },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['command'], equals: 'cancel' },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['command'], equals: 'sports-cancel' },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['command'], equals: 'sports-bet-change' },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerInPeriod,
          type: LedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
          metaJson: { path: ['compSettlement'], equals: true },
        },
        _sum: { amount: true },
      }),
      this.prisma.compSettlement.aggregate({
        where: {
          platformId,
          ...(hasDate ? { createdAt: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.pointLedgerEntry.groupBy({
        by: ['type'],
        where: {
          ...pointLedgerInPeriod,
          amount: positiveAmount,
        },
        _sum: { amount: true },
      }),
      this.prisma.pointLedgerEntry.findMany({
        where: {
          ...pointLedgerInPeriod,
          type: PointLedgerEntryType.ADJUSTMENT,
          amount: positiveAmount,
        },
        select: { amount: true, metaJson: true },
      }),
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

    // 총판 정산 기준은 회원별 낙첨금(입금-출금)을 합산한 현금 기준 값이다.
    const depMap = new Map(
      depByUser.map((row) => [row.userId, row._sum.amount?.toNumber() ?? 0]),
    );
    const wdrMap = new Map(
      wdrByUser.map((row) => [row.userId, row._sum.amount?.toNumber() ?? 0]),
    );
    const involvedUserIds = new Set<string>([
      ...depMap.keys(),
      ...wdrMap.keys(),
    ]);
    let houseEdge = 0;
    for (const userId of involvedUserIds) {
      houseEdge += (depMap.get(userId) ?? 0) - (wdrMap.get(userId) ?? 0);
    }

    const pointRules = this.asRecord(platform?.pointRulesJson);
    const compPolicy = this.readCompPolicy(platform?.flagsJson);
    const redeemKrwRaw = pointRules.redeemKrwPerPoint;
    const redeemKrwRate =
      typeof redeemKrwRaw === 'string' || typeof redeemKrwRaw === 'number'
        ? Number(redeemKrwRaw)
        : NaN;
    const redeemKrwPerPoint =
      Number.isFinite(redeemKrwRate) && redeemKrwRate > 0
        ? redeemKrwRate
        : null;

    const totalPositiveAdjust = positiveAdjustAgg._sum.amount?.toNumber() ?? 0;
    const principalPositiveAdjust =
      principalPositiveAdjustAgg._sum.amount?.toNumber() ?? 0;
    const depositBonus = depositBonusAgg._sum.amount?.toNumber() ?? 0;
    const pointRedeem = pointRedeemAgg._sum.amount?.toNumber() ?? 0;
    const refundPositiveAdjust = refundAdjustAgg._sum.amount?.toNumber() ?? 0;
    const cancelPositiveAdjust = cancelAdjustAgg._sum.amount?.toNumber() ?? 0;
    const sportsCancelPositiveAdjust =
      sportsCancelAdjustAgg._sum.amount?.toNumber() ?? 0;
    const sportsChangePositiveAdjust =
      sportsChangeAdjustAgg._sum.amount?.toNumber() ?? 0;
    const compSettlementPositiveAdjust =
      compSettlementAdjustAgg._sum.amount?.toNumber() ?? 0;
    const actualCompSettled =
      actualCompAgg._sum.amount?.toNumber() ?? 0;
    const otherMoneyCreditsRaw =
      totalPositiveAdjust -
      principalPositiveAdjust -
      depositBonus -
      pointRedeem -
      refundPositiveAdjust -
      cancelPositiveAdjust -
      sportsCancelPositiveAdjust -
      sportsChangePositiveAdjust -
      compSettlementPositiveAdjust;
    const otherMoneyCredits =
      otherMoneyCreditsRaw > 0 ? otherMoneyCreditsRaw : 0;

    const pointSumByType = new Map(
      pointPositiveByType.map((row) => [row.type, row._sum.amount?.toNumber() ?? 0]),
    );
    let depositPoints = 0;
    let bulkGrantPoints = 0;
    let otherAdjustmentPoints = 0;
    for (const row of pointAdjustmentEntries) {
      const meta = this.asRecord(row.metaJson);
      const amount = row.amount.toNumber();
      if (meta.depositPoint === true) {
        depositPoints += amount;
      } else if (meta.bulkGrant === true) {
        bulkGrantPoints += amount;
      } else {
        otherAdjustmentPoints += amount;
      }
    }
    const attendancePoints =
      pointSumByType.get('ATTENDANCE') ?? 0;
    const attendanceStreakPoints =
      pointSumByType.get('ATTENDANCE_STREAK') ?? 0;
    const loseBetPoints =
      pointSumByType.get('LOSE_BET') ?? 0;
    const referralPoints =
      pointSumByType.get('REFERRAL_FIRST_BET') ?? 0;
    const totalIssuedPoints =
      attendancePoints +
      attendanceStreakPoints +
      loseBetPoints +
      referralPoints +
      depositPoints +
      bulkGrantPoints +
      otherAdjustmentPoints;
    const estimatedPointLiability =
      redeemKrwPerPoint != null ? totalIssuedPoints * redeemKrwPerPoint : null;

    const compEnabled = compPolicy.enabled;
    const compCycle = compPolicy.settlementCycle;
    const compOffsetDays = compPolicy.settlementOffsetDays;
    const compRatePct = compPolicy.ratePct;
    const compRateNum = compRatePct ? Number(compRatePct) : NaN;
    // 콤프 실집행 원장은 아직 없어서, 현재는 총 낙첨금 기준 정책상 추정치만 제공한다.
    const estimatedCompCost =
      compEnabled && Number.isFinite(compRateNum) && compRateNum > 0 && houseEdge > 0
        ? (houseEdge * compRateNum) / 100
        : 0;
    const realizedMoneyCost =
      depositBonus + pointRedeem + otherMoneyCredits + actualCompSettled;
    const solutionRateMetrics = this.computeSolutionRateMetrics(
      platform?.flagsJson,
      Number(vertBreakdown.casino?.ggr ?? 0),
      Number(vertBreakdown.sports?.ggr ?? 0),
    );
    const solutionRates =
      actor.role === UserRole.SUPER_ADMIN
        ? {
            upstreamCasinoPct:
              solutionRateMetrics.solutionRatePolicy.upstreamCasinoPct,
            upstreamSportsPct:
              solutionRateMetrics.solutionRatePolicy.upstreamSportsPct,
            platformCasinoPct:
              solutionRateMetrics.solutionRatePolicy.platformCasinoPct,
            platformSportsPct:
              solutionRateMetrics.solutionRatePolicy.platformSportsPct,
            autoMarginPct:
              solutionRateMetrics.solutionRatePolicy.autoMarginPct,
            casinoBaseGgr: solutionRateMetrics.casinoBaseGgr.toFixed(2),
            sportsBaseGgr: solutionRateMetrics.sportsBaseGgr.toFixed(2),
            upstreamCostKrw:
              solutionRateMetrics.upstreamVendorCost.toFixed(2),
            platformChargeKrw:
              solutionRateMetrics.platformBilledRate.toFixed(2),
            solutionMarginKrw:
              solutionRateMetrics.solutionRateMargin.toFixed(2),
            modeledBase: 'POSITIVE_GGR',
          }
        : this.hiddenSolutionRateSummary();

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
        netInflow: houseEdge.toFixed(2),
        houseEdge: houseEdge.toFixed(2),
      },
      costs: {
        money: {
          depositBonus: depositBonus.toFixed(2),
          pointRedeem: pointRedeem.toFixed(2),
          otherWalletCredits: otherMoneyCredits.toFixed(2),
          total: realizedMoneyCost.toFixed(2),
        },
        pointAccrual: {
          redeemKrwPerPoint:
            redeemKrwPerPoint != null ? String(redeemKrwPerPoint) : null,
          attendancePoints: attendancePoints.toFixed(2),
          attendanceStreakPoints: attendanceStreakPoints.toFixed(2),
          loseBetPoints: loseBetPoints.toFixed(2),
          referralPoints: referralPoints.toFixed(2),
          depositPoints: depositPoints.toFixed(2),
          bulkGrantPoints: bulkGrantPoints.toFixed(2),
          otherAdjustmentPoints: otherAdjustmentPoints.toFixed(2),
          totalPoints: totalIssuedPoints.toFixed(2),
          estimatedKrw:
            estimatedPointLiability != null
              ? estimatedPointLiability.toFixed(2)
              : null,
        },
        comp: {
          enabled: compEnabled,
          settlementCycle: compCycle,
          settlementOffsetDays: compOffsetDays,
          ratePct: compRatePct,
          estimatedKrw: estimatedCompCost.toFixed(2),
          actualSettledKrw: actualCompSettled.toFixed(2),
          modeledBase: 'HOUSE_EDGE',
        },
        solutionRates,
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
    const approvedInPeriod = (userIds?: string[]) =>
      this.approvedWalletWhere(platformId, userIds, hasDate ? dateFilter : undefined);

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
    const roleById = new Map<string, UserRole>();
    for (const agent of agents) {
      roleById.set(agent.id, UserRole.MASTER_AGENT);
    }
    const effectiveMap = computeEffectiveAgentShares(
      agents.map((agent) => ({
        id: agent.id,
        parentUserId: agent.parentUserId ?? null,
        agentPlatformSharePct:
          agent.agentPlatformSharePct != null
            ? Number(agent.agentPlatformSharePct)
            : null,
        agentSplitFromParentPct:
          agent.agentSplitFromParentPct != null
            ? Number(agent.agentSplitFromParentPct)
            : null,
      })),
      roleById,
    );

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
          where: { ...approvedInPeriod(duIds), type: WalletRequestType.DEPOSIT },
          _sum: { amount: true },
        }),
        this.prisma.walletRequest.groupBy({
          by: ['userId'],
          where: { ...approvedInPeriod(duIds), type: WalletRequestType.WITHDRAWAL },
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
        const effPct = effectiveMap.get(a.id) ?? 0;
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
          effectivePct: Math.round(effPct * 1e4) / 1e4,
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
            where: { ...approvedInPeriod(userIds), type: WalletRequestType.DEPOSIT },
            _sum: { amount: true },
          }),
          this.prisma.walletRequest.aggregate({
            where: { ...approvedInPeriod(userIds), type: WalletRequestType.WITHDRAWAL },
            _sum: { amount: true },
          }),
        ]);

        const stake = Math.abs(betAgg._sum.amount?.toNumber() ?? 0);
        const win = winAgg._sum.amount?.toNumber() ?? 0;
        const ggr = stake - win;
        const dep = depAgg._sum.amount?.toNumber() ?? 0;
        const wdr = wdrAgg._sum.amount?.toNumber() ?? 0;
        // 총판 정산은 회원별 낙첨금(입금-출금) 통합 합계 기준이다.
        const houseEdge = dep - wdr;
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
