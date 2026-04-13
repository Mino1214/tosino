import { Module } from '@nestjs/common';
import { DepositEventsCoreModule } from './deposit-events-core.module';
import { DepositEventsController } from './deposit-events.controller';

@Module({
  imports: [DepositEventsCoreModule],
  controllers: [DepositEventsController],
  exports: [DepositEventsCoreModule],
})
export class DepositEventsModule {}
