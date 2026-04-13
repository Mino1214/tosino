import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RollingObligationService } from './rolling-obligation.service';

@Module({
  imports: [PrismaModule],
  providers: [RollingObligationService],
  exports: [RollingObligationService],
})
export class RollingModule {}
