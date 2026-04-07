import { Module } from '@nestjs/common';
import { PlatformsService } from './platforms.service';
import { PlatformsController } from './platforms.controller';
import { PlatformIntegrationsController } from './platform-integrations.controller';

@Module({
  controllers: [PlatformsController, PlatformIntegrationsController],
  providers: [PlatformsService],
  exports: [PlatformsService],
})
export class PlatformsModule {}
