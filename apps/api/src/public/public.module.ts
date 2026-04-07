import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicRegistrationService } from './public-registration.service';
import { PublicPlatformResolveService } from './public-platform-resolve.service';

@Module({
  controllers: [PublicController],
  providers: [PublicRegistrationService, PublicPlatformResolveService],
  exports: [PublicPlatformResolveService],
})
export class PublicModule {}
