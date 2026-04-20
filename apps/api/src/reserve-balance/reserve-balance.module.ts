import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReserveBalanceService } from './reserve-balance.service';
import {
  ReserveBalanceController,
  PlatformReserveReadController,
} from './reserve-balance.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReserveBalanceController, PlatformReserveReadController],
  providers: [ReserveBalanceService],
  exports: [ReserveBalanceService],
})
export class ReserveBalanceModule {}
