import { Module } from '@nestjs/common';
import { WalletRequestsService } from './wallet-requests.service';
import { WalletRequestsAdminController } from './wallet-requests-admin.controller';
import { RollingModule } from '../rolling/rolling.module';
import { DepositEventsCoreModule } from '../deposit-events/deposit-events-core.module';

@Module({
  imports: [RollingModule, DepositEventsCoreModule],
  controllers: [WalletRequestsAdminController],
  providers: [WalletRequestsService],
  exports: [WalletRequestsService],
})
export class WalletRequestsModule {}
