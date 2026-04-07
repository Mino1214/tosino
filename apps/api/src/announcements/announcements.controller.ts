import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementAssetsService } from './announcement-assets.service';
import { ReplaceAnnouncementsDto } from './dto/replace-announcements.dto';

@Controller('platforms/:platformId/announcements')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class AnnouncementsController {
  constructor(
    private announcements: AnnouncementsService,
    private assets: AnnouncementAssetsService,
  ) {}

  @Post('assets')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadAsset(
    @Param('platformId') platformId: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp|gif)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assets.saveUpload(platformId, user, file);
  }

  @Get('assets')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  listAssets(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assets.list(platformId, user);
  }

  @Delete('assets/:assetId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  deleteAsset(
    @Param('platformId') platformId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assets.remove(assetId, platformId, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  list(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.announcements.list(platformId, user);
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  replace(
    @Param('platformId') platformId: string,
    @Body() dto: ReplaceAnnouncementsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.announcements.replace(platformId, user, dto);
  }
}
