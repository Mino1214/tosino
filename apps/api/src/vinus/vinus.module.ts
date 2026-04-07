import { Module } from '@nestjs/common';
import { VinusService } from './vinus.service';
import { VinusWebhookController } from './vinus.controller';
import { VinusInfoService } from './vinus-info.service';
import { VinusInfoController } from './vinus-info.controller';

@Module({
  providers: [VinusService, VinusInfoService],
  controllers: [VinusWebhookController, VinusInfoController],
  exports: [VinusService, VinusInfoService],
})
export class VinusModule {}
