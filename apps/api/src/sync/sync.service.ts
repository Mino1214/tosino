import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncJobType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { SyncJobData } from './sync.processor';

@Injectable()
export class SyncService {
  constructor(
    @InjectQueue('sync') private syncQueue: Queue<SyncJobData>,
    private prisma: PrismaService,
  ) {}

  assertPlatform(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (actor.platformId !== platformId) throw new ForbiddenException();
    if (actor.role !== UserRole.PLATFORM_ADMIN) throw new ForbiddenException();
  }

  async status(platformId: string, actor: JwtPayload) {
    this.assertPlatform(actor, platformId);
    return this.prisma.syncState.findMany({
      where: { platformId },
      orderBy: { jobType: 'asc' },
    });
  }

  async triggerStub(platformId: string, jobType: SyncJobType, actor: JwtPayload) {
    this.assertPlatform(actor, platformId);
    await this.syncQueue.add(
      'run',
      { platformId, jobType },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
    return { queued: true, platformId, jobType };
  }

  /** 스포츠 실시간 경기 데이터를 SportsOddsSnapshot 에 upsert */
  async upsertSportsLive(
    platformId: string,
    body: Record<string, unknown>,
    actor: JwtPayload,
  ) {
    this.assertPlatform(actor, platformId);
    const games = Array.isArray(body.game) ? body.game : [];
    const now = new Date();
    await this.prisma.sportsOddsSnapshot.upsert({
      where: {
        platformId_sourceFeedId: { platformId, sourceFeedId: 'sports-live' },
      },
      create: {
        platformId,
        sourceFeedId: 'sports-live',
        sportLabel: 'sports',
        market: null,
        payloadJson: { games } as object,
        fetchedAt: now,
      },
      update: {
        payloadJson: { games } as object,
        fetchedAt: now,
      },
    });
    return { ok: true, total: games.length, fetchedAt: now.toISOString() };
  }
}
