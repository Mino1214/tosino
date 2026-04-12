import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicRegistrationService } from './public-registration.service';
import { PublicPlatformResolveService } from './public-platform-resolve.service';
import { OddsHostProxyService } from './oddshost-proxy.service';

@Module({
  controllers: [PublicController],
  providers: [
    PublicRegistrationService,
    PublicPlatformResolveService,
    OddsHostProxyService,
  ],
  exports: [PublicPlatformResolveService],
})
export class PublicModule {}
