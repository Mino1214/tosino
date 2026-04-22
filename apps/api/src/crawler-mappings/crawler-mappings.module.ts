import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import {
  CrawlerMappingsAdminController,
  CrawlerMappingsIntegrationController,
  CrawlerMatchesAdminController,
  CrawlerMatchesIntegrationController,
  CrawlerTeamsAdminController,
  CrawlerTeamsIntegrationController,
} from './crawler-mappings.controller';
import { CrawlerMappingsService } from './crawler-mappings.service';
import { CRAWLER_MATCHER_QUEUE } from './crawler-matcher.queue';
import { CrawlerMatcherService } from './crawler-matcher.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: CRAWLER_MATCHER_QUEUE }),
  ],
  controllers: [
    CrawlerMappingsIntegrationController,
    CrawlerTeamsIntegrationController,
    CrawlerMatchesIntegrationController,
    CrawlerMappingsAdminController,
    CrawlerTeamsAdminController,
    CrawlerMatchesAdminController,
  ],
  providers: [CrawlerMappingsService, CrawlerMatcherService],
  exports: [CrawlerMappingsService, CrawlerMatcherService],
})
export class CrawlerMappingsModule {}
