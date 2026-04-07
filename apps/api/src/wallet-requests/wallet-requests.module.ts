import { Module } from '@nestjs/common';
import { WalletRequestsService } from './wallet-requests.service';
import { WalletRequestsAdminController } from './wallet-requests-admin.controller';

@Module({
  controllers: [WalletRequestsAdminController],
  providers: [WalletRequestsService],
  exports: [WalletRequestsService],
})
export class WalletRequestsModule {}
