import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { WalletRequestsModule } from '../wallet-requests/wallet-requests.module';
import { VinusModule } from '../vinus/vinus.module';
import { RollingModule } from '../rolling/rolling.module';
import { PointsModule } from '../points/points.module';
import { UsdtDepositModule } from '../usdt-deposit/usdt-deposit.module';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

@Module({
  imports: [
    WalletRequestsModule,
    VinusModule,
    RollingModule,
    PointsModule,
    UsdtDepositModule,
    WalletBucketsModule,
  ],
  controllers: [MeController],
})
export class MeModule {}
