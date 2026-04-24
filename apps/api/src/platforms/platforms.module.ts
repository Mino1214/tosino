import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  compSettlementProcessorAttachHere,
  compSettlementSchedulerAttachHere,
} from '../common/scheduler-env.util';
import { PlatformsService } from './platforms.service';
import { PlatformsController } from './platforms.controller';
import { PlatformIntegrationsController } from './platform-integrations.controller';
import { PointsModule } from '../points/points.module';
import { CompSettlementSchedulerService } from './comp-settlement-scheduler.service';
import { CompSettlementProcessor } from './comp-settlement.processor';
import { CreditsModule } from '../credits/credits.module';
import { ReserveBalanceModule } from '../reserve-balance/reserve-balance.module';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

const schedulerHere = compSettlementSchedulerAttachHere();
const compProcessorHere = compSettlementProcessorAttachHere();

@Module({
  imports: [
    BullModule.registerQueue({ name: 'comp-settlement' }),
    PointsModule,
    CreditsModule,
    ReserveBalanceModule,
    WalletBucketsModule,
  ],
  controllers: [PlatformsController, PlatformIntegrationsController],
  providers: [
    PlatformsService,
    ...(schedulerHere ? [CompSettlementSchedulerService] : []),
    ...(compProcessorHere ? [CompSettlementProcessor] : []),
  ],
  exports: [PlatformsService],
})
export class PlatformsModule {}
