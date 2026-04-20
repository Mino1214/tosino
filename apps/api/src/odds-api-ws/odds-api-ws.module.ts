import { Module } from '@nestjs/common';
import {
  OddsApiWsAdminController,
  OddsApiWsPublicController,
} from './odds-api-ws.controller';
import { OddsApiAggregatorService } from './odds-api-aggregator.service';
import { OddsApiRestService } from './odds-api-rest.service';
import { OddsApiWsService } from './odds-api-ws.service';

@Module({
  controllers: [OddsApiWsPublicController, OddsApiWsAdminController],
  providers: [OddsApiWsService, OddsApiRestService, OddsApiAggregatorService],
  exports: [OddsApiWsService, OddsApiRestService, OddsApiAggregatorService],
})
export class OddsApiWsModule {}
