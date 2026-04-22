import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicModule } from '../public/public.module';
import {
  OddsApiIntegrationController,
  OddsApiWsAdminController,
  OddsApiWsPublicController,
} from './odds-api-ws.controller';
import { OddsApiAggregatorService } from './odds-api-aggregator.service';
import { OddsApiAliasService } from './odds-api-alias.service';
import { OddsApiRestService } from './odds-api-rest.service';
import { OddsApiSnapshotService } from './odds-api-snapshot.service';
import { OddsApiWhitelistService } from './odds-api-whitelist.service';
import { OddsApiWsService } from './odds-api-ws.service';

@Module({
  imports: [PrismaModule, PublicModule],
  controllers: [
    OddsApiWsPublicController,
    OddsApiWsAdminController,
    OddsApiIntegrationController,
  ],
  providers: [
    OddsApiWsService,
    OddsApiRestService,
    OddsApiAggregatorService,
    OddsApiAliasService,
    OddsApiWhitelistService,
    OddsApiSnapshotService,
  ],
  exports: [
    OddsApiWsService,
    OddsApiRestService,
    OddsApiAggregatorService,
    OddsApiAliasService,
    OddsApiWhitelistService,
    OddsApiSnapshotService,
  ],
})
export class OddsApiWsModule {}
