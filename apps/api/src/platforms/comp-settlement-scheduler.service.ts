import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

export const LEGACY_COMP_SETTLEMENT_SWEEP_JOB =
  'comp-settlement-all-platforms';
export const COMP_SETTLEMENT_SWEEP_JOB_PREFIX = 'comp-settlement-platform';

export function compSettlementSweepJobName(platformId: string) {
  return `${COMP_SETTLEMENT_SWEEP_JOB_PREFIX}:${platformId}`;
}

@Injectable()
export class CompSettlementSchedulerService implements OnModuleInit {
  private readonly log = new Logger(CompSettlementSchedulerService.name);

  constructor(
    @InjectQueue('comp-settlement') private readonly queue: Queue,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
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
    };
  }

  private readCompAutomation(flagsJson: unknown) {
    const flags = this.asRecord(flagsJson);
    const automation = this.asRecord(flags.compAutomation);
    const compPolicy = this.readCompPolicy(flagsJson);
    const envCronRaw =
      this.config.get<string>('COMP_SETTLEMENT_CRON')?.trim() || '5 0 * * *';
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
      this.config.get<string>('COMP_SETTLEMENT_BACKFILL_DAYS') ?? '7',
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

  private async clearPlatformScheduleUnsafe(platformId: string) {
    const jobName = compSettlementSweepJobName(platformId);
    const repeatables = await this.queue.getRepeatableJobs();
    for (const row of repeatables) {
      if (row.name === jobName) {
        await this.queue.removeRepeatableByKey(row.key);
      }
    }
  }

  async onModuleInit() {
    await this.syncAllPlatformSchedules();
  }

  async clearPlatformSchedule(platformId: string) {
    try {
      await this.clearPlatformScheduleUnsafe(platformId);
    } catch (e) {
      this.log.warn(
        `자동 콤프 정산 제거 실패 platform=${platformId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  async syncPlatformSchedule(platformId: string) {
    try {
      const platform = await this.prisma.platform.findUnique({
        where: { id: platformId },
        select: { id: true, flagsJson: true },
      });

      if (!platform) {
        await this.clearPlatformScheduleUnsafe(platformId);
        return;
      }

      await this.clearPlatformScheduleUnsafe(platformId);

      const compPolicy = this.readCompPolicy(platform.flagsJson);
      const compAutomation = this.readCompAutomation(platform.flagsJson);

      if (
        !compPolicy.enabled ||
        compPolicy.settlementCycle === 'INSTANT' ||
        !compAutomation.autoEnabled ||
        !compAutomation.cron
      ) {
        this.log.log(
          `자동 콤프 정산 미등록 platform=${platformId} enabled=${compPolicy.enabled} cycle=${compPolicy.settlementCycle} auto=${compAutomation.autoEnabled} cron=${compAutomation.cron ?? 'none'}`,
        );
        return;
      }

      await this.queue.add(
        compSettlementSweepJobName(platformId),
        { platformId },
        {
          repeat: { pattern: compAutomation.cron, tz: 'Asia/Seoul' },
          removeOnComplete: 40,
          removeOnFail: 20,
        },
      );

      this.log.log(
        `자동 콤프 정산 등록 platform=${platformId} cron=${compAutomation.cron} backfill=${compAutomation.backfillDays}d`,
      );
    } catch (e) {
      this.log.warn(
        `자동 콤프 정산 등록 실패 platform=${platformId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  async syncAllPlatformSchedules() {
    try {
      const platforms = await this.prisma.platform.findMany({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      const activeIds = new Set(platforms.map((platform) => platform.id));
      const repeatables = await this.queue.getRepeatableJobs();

      for (const row of repeatables) {
        if (row.name === LEGACY_COMP_SETTLEMENT_SWEEP_JOB) {
          await this.queue.removeRepeatableByKey(row.key);
          continue;
        }
        if (row.name.startsWith(`${COMP_SETTLEMENT_SWEEP_JOB_PREFIX}:`)) {
          const platformId = row.name.slice(
            `${COMP_SETTLEMENT_SWEEP_JOB_PREFIX}:`.length,
          );
          if (!activeIds.has(platformId)) {
            await this.queue.removeRepeatableByKey(row.key);
          }
        }
      }

      for (const platform of platforms) {
        await this.syncPlatformSchedule(platform.id);
      }
    } catch (e) {
      this.log.warn(
        `자동 콤프 정산 초기화 실패(Redis 확인): ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
