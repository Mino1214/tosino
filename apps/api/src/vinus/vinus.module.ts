import { Module } from '@nestjs/common';
import { VinusService } from './vinus.service';
import { VinusWebhookController } from './vinus.controller';
import { VinusInfoService } from './vinus-info.service';
import { VinusInfoController } from './vinus-info.controller';
import { RollingModule } from '../rolling/rolling.module';
import { PointsModule } from '../points/points.module';
import { ReserveBalanceModule } from '../reserve-balance/reserve-balance.module';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

@Module({
  imports: [RollingModule, PointsModule, ReserveBalanceModule, WalletBucketsModule],
  providers: [VinusService, VinusInfoService],
  controllers: [VinusWebhookController, VinusInfoController],
  exports: [VinusService, VinusInfoService],
})
export class VinusModule {}
