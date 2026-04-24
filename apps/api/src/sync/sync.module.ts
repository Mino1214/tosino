import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { syncQueueAttachHere } from '../common/scheduler-env.util';
import { CRAWLER_MATCHER_QUEUE } from '../crawler-mappings/crawler-matcher.queue';
import { SyncProcessor } from './sync.processor';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { OddsIngestService } from './odds-ingest.service';
import { SyncSchedulerService } from './sync-scheduler.service';
import { OddsApiWsModule } from '../odds-api-ws/odds-api-ws.module';
import { PublicModule } from '../public/public.module';

const attachSyncQueue = syncQueueAttachHere();

@Module({
  imports: [
    BullModule.registerQueue({ name: 'sync' }),
    BullModule.registerQueue({ name: CRAWLER_MATCHER_QUEUE }),
    PublicModule,
    OddsApiWsModule,
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    OddsIngestService,
    ...(attachSyncQueue ? [SyncProcessor, SyncSchedulerService] : []),
  ],
  exports: [SyncService],
})
export class SyncModule {}
