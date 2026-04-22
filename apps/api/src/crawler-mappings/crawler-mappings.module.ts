import { Module } from '@nestjs/common';
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
import { CrawlerMatcherService } from './crawler-matcher.service';

@Module({
  imports: [PrismaModule],
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
