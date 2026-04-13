import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RollingModule } from '../rolling/rolling.module';
import { DepositEventsService } from './deposit-events.service';

@Module({
  imports: [PrismaModule, RollingModule],
  providers: [DepositEventsService],
  exports: [DepositEventsService],
})
export class DepositEventsCoreModule {}
