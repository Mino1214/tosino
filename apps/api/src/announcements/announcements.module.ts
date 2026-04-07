import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementAssetsService } from './announcement-assets.service';

@Module({
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementAssetsService],
})
export class AnnouncementsModule {}
