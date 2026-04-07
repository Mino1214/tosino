import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { WalletRequestsModule } from '../wallet-requests/wallet-requests.module';
import { VinusModule } from '../vinus/vinus.module';

@Module({
  imports: [WalletRequestsModule, VinusModule],
  controllers: [MeController],
})
export class MeModule {}
