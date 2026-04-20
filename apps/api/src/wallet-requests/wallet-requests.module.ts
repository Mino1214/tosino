import { Module } from '@nestjs/common';
import { WalletRequestsService } from './wallet-requests.service';
import { WalletRequestsAdminController } from './wallet-requests-admin.controller';
import { RollingModule } from '../rolling/rolling.module';
import { DepositEventsCoreModule } from '../deposit-events/deposit-events-core.module';
import { PointsModule } from '../points/points.module';
import { UpbitRateService } from '../usdt-deposit/upbit-rate.service';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

@Module({
  imports: [RollingModule, DepositEventsCoreModule, PointsModule, WalletBucketsModule],
  controllers: [WalletRequestsAdminController],
  providers: [WalletRequestsService, UpbitRateService],
  exports: [WalletRequestsService],
})
export class WalletRequestsModule {}
