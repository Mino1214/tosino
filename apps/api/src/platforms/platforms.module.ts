import { Module } from '@nestjs/common';
import { PlatformsService } from './platforms.service';
import { PlatformsController } from './platforms.controller';
import { PlatformIntegrationsController } from './platform-integrations.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [PointsModule],
  controllers: [PlatformsController, PlatformIntegrationsController],
  providers: [PlatformsService],
  exports: [PlatformsService],
})
export class PlatformsModule {}
