import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PlatformsService } from './platforms.service';
import { PlatformsController } from './platforms.controller';
import { PlatformIntegrationsController } from './platform-integrations.controller';
import { PointsModule } from '../points/points.module';
import { CompSettlementSchedulerService } from './comp-settlement-scheduler.service';
import { CompSettlementProcessor } from './comp-settlement.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'comp-settlement' }), PointsModule],
  controllers: [PlatformsController, PlatformIntegrationsController],
  providers: [PlatformsService, CompSettlementSchedulerService, CompSettlementProcessor],
  exports: [PlatformsService],
})
export class PlatformsModule {}
