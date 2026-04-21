import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicModule } from '../public/public.module';
import {
  OddsApiWsAdminController,
  OddsApiWsPublicController,
} from './odds-api-ws.controller';
import { OddsApiAggregatorService } from './odds-api-aggregator.service';
import { OddsApiRestService } from './odds-api-rest.service';
import { OddsApiSnapshotService } from './odds-api-snapshot.service';
import { OddsApiWsService } from './odds-api-ws.service';

@Module({
  imports: [PrismaModule, PublicModule],
  controllers: [OddsApiWsPublicController, OddsApiWsAdminController],
  providers: [
    OddsApiWsService,
    OddsApiRestService,
    OddsApiAggregatorService,
    OddsApiSnapshotService,
  ],
  exports: [
    OddsApiWsService,
    OddsApiRestService,
    OddsApiAggregatorService,
    OddsApiSnapshotService,
  ],
})
export class OddsApiWsModule {}
