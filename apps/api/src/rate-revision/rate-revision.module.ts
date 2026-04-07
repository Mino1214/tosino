import { Global, Module } from '@nestjs/common';
import { RateRevisionService } from './rate-revision.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [RateRevisionService],
  exports: [RateRevisionService],
})
export class RateRevisionModule {}
