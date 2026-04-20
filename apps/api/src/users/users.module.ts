import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { HqUsersController } from './hq-users.controller';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';

@Module({
  imports: [WalletBucketsModule],
  controllers: [UsersController, HqUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
