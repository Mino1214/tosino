import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncProcessor } from './sync.processor';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { OddsIngestService } from './odds-ingest.service';
import { SyncSchedulerService } from './sync-scheduler.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'sync' })],
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncProcessor,
    OddsIngestService,
    SyncSchedulerService,
  ],
  exports: [SyncService],
})
export class SyncModule {}
