import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { CrawlerMatcherProcessor } from './crawler-mappings/crawler-matcher.processor';
import { CRAWLER_MATCHER_QUEUE } from './crawler-mappings/crawler-matcher.queue';
import { CrawlerMatcherSchedulerService } from './crawler-mappings/crawler-matcher-scheduler.service';
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
    BullModule.registerQueue({ name: CRAWLER_MATCHER_QUEUE }),
  ],
  providers: [
    CrawlerMatcherService,
    CrawlerMatcherProcessor,
    CrawlerMatcherSchedulerService,
  ],
})
export class CrawlerMatcherWorkerModule {}
