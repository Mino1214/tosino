import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletBucketsService } from './wallet-buckets.service';

@Module({
  imports: [PrismaModule],
  providers: [WalletBucketsService],
  exports: [WalletBucketsService],
})
export class WalletBucketsModule {}
