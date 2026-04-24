import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { usdtDepositQueueAttachHere } from '../common/scheduler-env.util';
import { UpbitRateService } from './upbit-rate.service';
import { TrongridService } from './trongrid.service';
import { UsdtDepositService } from './usdt-deposit.service';
import { UsdtDepositSchedulerService } from './usdt-deposit-scheduler.service';
import { UsdtDepositProcessor } from './usdt-deposit.processor';
import { UsdtDepositController } from './usdt-deposit.controller';
import { RollingModule } from '../rolling/rolling.module';
import { DepositEventsModule } from '../deposit-events/deposit-events.module';
import { PointsModule } from '../points/points.module';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

const attachUsdtQueue = usdtDepositQueueAttachHere();

@Module({
  imports: [
    BullModule.registerQueue({ name: 'usdt-deposit' }),
    RollingModule,
    DepositEventsModule,
    PointsModule,
    WalletBucketsModule,
  ],
  controllers: [UsdtDepositController],
  providers: [
    UpbitRateService,
    TrongridService,
    UsdtDepositService,
    ...(attachUsdtQueue ? [UsdtDepositSchedulerService, UsdtDepositProcessor] : []),
  ],
  exports: [UpbitRateService],
})
export class UsdtDepositModule {}
