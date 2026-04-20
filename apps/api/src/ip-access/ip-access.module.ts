import { Module } from '@nestjs/common';
import { IpAccessService } from './ip-access.service';
import { HqIpAccessController } from './hq-ip-access.controller';

@Module({
  controllers: [HqIpAccessController],
  providers: [IpAccessService],
  exports: [IpAccessService],
})
export class IpAccessModule {}
