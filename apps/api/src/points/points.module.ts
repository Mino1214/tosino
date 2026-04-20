import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletBucketsModule } from '../wallet-buckets/wallet-buckets.module';
import { PointsService } from './points.service';

@Module({
  imports: [PrismaModule, WalletBucketsModule],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
