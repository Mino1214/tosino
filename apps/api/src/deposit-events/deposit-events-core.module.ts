import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RollingModule } from '../rolling/rolling.module';
import { DepositEventsService } from './deposit-events.service';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

@Module({
  imports: [PrismaModule, RollingModule, WalletBucketsModule],
  providers: [DepositEventsService],
  exports: [DepositEventsService],
})
export class DepositEventsCoreModule {}
