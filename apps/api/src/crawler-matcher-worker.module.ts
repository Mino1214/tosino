import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { OddsApiWsModule } from './odds-api-ws/odds-api-ws.module';
import { CrawlerMatcherProcessor } from './crawler-mappings/crawler-matcher.processor';
import { CRAWLER_MATCHER_QUEUE } from './crawler-mappings/crawler-matcher.queue';
import { CrawlerMatcherSchedulerService } from './crawler-mappings/crawler-matcher-scheduler.service';
import { CrawlerMappingsService } from './crawler-mappings/crawler-mappings.service';
import { CrawlerMatcherService } from './crawler-mappings/crawler-matcher.service';

/**
 * HTTP 없이 크롤러 strict 매처 BullMQ 소비만 담당.
 * API 프로세스와 분리해 PM2 에서 별도 프로세스로 기동한다.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const urlStr =
          config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
        const u = new URL(urlStr);
        return {
          connection: {
            host: u.hostname,
            port: Number(u.port || 6379),
            password: u.password || undefined,
            username: u.username || undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    /**
     * CrawlerMatcherService 가 OddsApiSnapshotService 를 주입 받는다.
     * 해당 서비스 및 의존 체인(Aggregator/Rest/Alias/Whitelist/WsService) 을 한 번에 가져온다.
     * 단 WsService 자동 WebSocket 연결은 main.ts 에서 ODDS_API_WS_AUTOCONNECT=false 로 막는다.
     */
    OddsApiWsModule,
    BullModule.registerQueue({ name: CRAWLER_MATCHER_QUEUE }),
  ],
  providers: [
    CrawlerMappingsService,
    CrawlerMatcherService,
    CrawlerMatcherProcessor,
    CrawlerMatcherSchedulerService,
  ],
})
export class CrawlerMatcherWorkerModule {}
