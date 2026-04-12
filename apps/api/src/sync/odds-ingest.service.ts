import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { platformIntegrationsSchema } from '@tosino/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OddsHostProxyService } from '../public/oddshost-proxy.service';

/**
 * integrationsJson = 피드 설정(거의 고정).
 * 이 서비스 = 주기/수동 동기화 시 upstream 호출 → SportsOddsSnapshot 갱신.
 * OddsHost 인플레이 목록이 설정되어 있으면 `sports-live` 스냅샷도 함께 갱신합니다.
 */
@Injectable()
export class OddsIngestService {
  private readonly log = new Logger(OddsIngestService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private oddshost: OddsHostProxyService,
  ) {}

  private isOddsHostSportsLiveIngestEnabled(): boolean {
    const raw = (
      this.config.get<string>('ODDSHOST_SPORTS_LIVE_INGEST') ?? 'true'
    )
      .trim()
      .toLowerCase();
    return !(
      raw === '0' ||
      raw === 'false' ||
      raw === 'off' ||
      raw === 'no'
    );
  }

  private isOddsHostInplayListConfigured(): boolean {
    const key = (this.config.get<string>('ODDSHOST_KEY') || '').trim();
    if (!key) return false;
    const full = (this.config.get<string>('ODDSHOST_TEMPLATE_INPLAY_LIST') || '')
      .trim();
    const base = (this.config.get<string>('ODDSHOST_BASE_URL') || '').trim();
    const path = (this.config.get<string>('ODDSHOST_PATH_INPLAY_LIST') || '').trim();
    return !!full || (!!base && !!path);
  }

  private gamesFromOddsHostListPayload(data: unknown): unknown[] {
    if (!data || typeof data !== 'object') return [];
    const g = (data as { game?: unknown }).game;
    return Array.isArray(g) ? g : [];
  }

  async ingestPlatformOdds(platformId: string): Promise<{
    snapshotsWritten: number;
    feedIds: string[];
    sportsLiveGames?: number;
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

    let sportsLiveGames: number | undefined;
    if (
      this.isOddsHostSportsLiveIngestEnabled() &&
      this.isOddsHostInplayListConfigured()
    ) {
      try {
        const sport = (
          this.config.get<string>('ODDSHOST_INGEST_SPORT') || '1'
        ).trim();
        const data = await this.oddshost.fetchInplayListForIngest(sport);
        const games = this.gamesFromOddsHostListPayload(data);
        await this.prisma.sportsOddsSnapshot.upsert({
          where: {
            platformId_sourceFeedId: {
              platformId,
              sourceFeedId: 'sports-live',
            },
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
        sportsLiveGames = games.length;
        this.log.log(
          `OddsHost → sports-live snapshot platform=${platformId} games=${sportsLiveGames}`,
        );
      } catch (e) {
        this.log.warn(
          `OddsHost sports-live ingest failed platform=${platformId}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }

    return { snapshotsWritten: feeds.length, feedIds, sportsLiveGames };
  }
}
