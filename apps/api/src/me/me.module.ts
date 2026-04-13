import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { WalletRequestsModule } from '../wallet-requests/wallet-requests.module';
import { VinusModule } from '../vinus/vinus.module';
import { RollingModule } from '../rolling/rolling.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [WalletRequestsModule, VinusModule, RollingModule, PointsModule],
  controllers: [MeController],
})
export class MeModule {}
