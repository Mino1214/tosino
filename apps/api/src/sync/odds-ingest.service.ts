import { Injectable, Logger } from '@nestjs/common';
import { platformIntegrationsSchema } from '@tosino/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * integrationsJson = 피드 설정(거의 고정).
 * 이 서비스 = 주기/수동 동기화 시 upstream 호출 → SportsOddsSnapshot 갱신.
 * 실제 HTTP 어댑터는 credentialEnvKey·URL 준수하며 별도 구현.
 */
@Injectable()
export class OddsIngestService {
  private readonly log = new Logger(OddsIngestService.name);

  constructor(private prisma: PrismaService) {}

  async ingestPlatformOdds(platformId: string): Promise<{
    snapshotsWritten: number;
    feedIds: string[];
  }> {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { integrationsJson: true },
    });
    if (!platform) {
      return { snapshotsWritten: 0, feedIds: [] };
    }
    const parsed = platformIntegrationsSchema.safeParse(
      platform.integrationsJson,
    );
    if (!parsed.success) {
      this.log.warn(`integrationsJson invalid for platform ${platformId}`);
      return { snapshotsWritten: 0, feedIds: [] };
    }
    const feeds = parsed.data.sportsFeeds ?? [];
    const now = new Date();
    const feedIds: string[] = [];

    for (const f of feeds) {
      feedIds.push(f.id);
      // TODO: fetch(f.baseUrl, …) + env[f.credentialEnvKey], normalize → payload
      const payloadJson = {
        source: 'demo_stub',
        message:
          '데모 모드입니다. 외부 배당 API 어댑터가 연결되면 이 자리에 실제 배당이 채워집니다. ODDS 동기화·스냅샷 저장은 이미 동작 중입니다.',
        generatedAt: now.toISOString(),
      };
      await this.prisma.sportsOddsSnapshot.upsert({
        where: {
          platformId_sourceFeedId: {
            platformId,
            sourceFeedId: f.id,
          },
        },
        create: {
          platformId,
          sourceFeedId: f.id,
          sportLabel: f.sportLabel,
          market: f.market ?? null,
          payloadJson,
          fetchedAt: now,
        },
        update: {
          sportLabel: f.sportLabel,
          market: f.market ?? null,
          payloadJson,
          fetchedAt: now,
        },
      });
    }

    return { snapshotsWritten: feeds.length, feedIds };
  }
}
