import { Module } from '@nestjs/common';
import { BlacklistController } from './blacklist.controller';
import { HqBlockedUsersController } from './hq-blocked-users.controller';
import { BlacklistService } from './blacklist.service';

@Module({
  controllers: [BlacklistController, HqBlockedUsersController],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
