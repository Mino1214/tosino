import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CreditsModule } from '../credits/credits.module';
import { PointsModule } from '../points/points.module';
import { ReserveBalanceModule } from '../reserve-balance/reserve-balance.module';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';
import { CompSettlementProcessor } from './comp-settlement.processor';
import { PlatformsService } from './platforms.service';

/**
 * HTTP 컨트롤러 없이 `comp-settlement` 큐 소비만 (전용 워커·통합 bull-heavy-worker 용).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'comp-settlement' }),
    PointsModule,
    CreditsModule,
    ReserveBalanceModule,
    WalletBucketsModule,
  ],
  providers: [PlatformsService, CompSettlementProcessor],
})
export class CompSettlementBullModule {}
