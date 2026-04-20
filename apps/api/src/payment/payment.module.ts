import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { RollingModule } from '../rolling/rolling.module';
import { DepositEventsCoreModule } from '../deposit-events/deposit-events-core.module';
import { PointsModule } from '../points/points.module';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

@Module({
  imports: [
    RollingModule,
    DepositEventsCoreModule,
    PointsModule,
    WalletBucketsModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
