import { DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { crawlerMatcherRunsInApiProcess } from '../common/scheduler-env.util';
import { OddsApiWsModule } from '../odds-api-ws/odds-api-ws.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicModule } from '../public/public.module';
import {
  CrawlerAssetHintsIntegrationController,
  CrawlerMappingsAdminController,
  CrawlerMappingsIntegrationController,
  CrawlerMatchesAdminController,
  CrawlerMatchesIntegrationController,
  CrawlerTeamsAdminController,
  CrawlerTeamsIntegrationController,
} from './crawler-mappings.controller';
import { CrawlerPublicController } from './crawler-public.controller';
import { CrawlerMappingsService } from './crawler-mappings.service';
import { CRAWLER_MATCHER_QUEUE } from './crawler-matcher.queue';
import { CrawlerMatcherProcessor } from './crawler-matcher.processor';
import { CrawlerMatcherSchedulerService } from './crawler-matcher-scheduler.service';
import { CrawlerMatcherService } from './crawler-matcher.service';

/**
 * 크롤 ingest·HQ·Bull `crawler-matcher` 큐.
 * 스케줄러+프로세서는 `CrawlerMappingsModule.forRoot()` 에서만 등록(환경에 따라 생략 가능).
 */
@Module({})
export class CrawlerMappingsModule {
  static forRoot(): DynamicModule {
    const runMatcherInApi = crawlerMatcherRunsInApiProcess();
    const matcherStackProviders = runMatcherInApi
      ? [CrawlerMatcherProcessor, CrawlerMatcherSchedulerService]
      : [];

    return {
      module: CrawlerMappingsModule,
      imports: [
        PrismaModule,
        OddsApiWsModule,
        PublicModule,
        BullModule.registerQueue({ name: CRAWLER_MATCHER_QUEUE }),
      ],
      controllers: [
        CrawlerMappingsIntegrationController,
        CrawlerTeamsIntegrationController,
        CrawlerMatchesIntegrationController,
        CrawlerAssetHintsIntegrationController,
        CrawlerPublicController,
        CrawlerMappingsAdminController,
        CrawlerTeamsAdminController,
        CrawlerMatchesAdminController,
      ],
      providers: [
        CrawlerMappingsService,
        CrawlerMatcherService,
        ...matcherStackProviders,
      ],
      exports: [CrawlerMappingsService, CrawlerMatcherService],
    };
  }
}
