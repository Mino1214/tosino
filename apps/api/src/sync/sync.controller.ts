import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { SyncService } from './sync.service';
import { TriggerStubDto } from './dto/trigger-stub.dto';

@Controller('platforms/:platformId/sync')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class SyncController {
  constructor(private sync: SyncService) {}

  @Get('status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  status(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sync.status(platformId, user);
  }

  @Post('trigger-stub')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  triggerStub(
    @Param('platformId') platformId: string,
    @Body() dto: TriggerStubDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sync.triggerStub(platformId, dto.jobType, user);
  }

  @Post('odds-api-snapshots')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  refreshOddsApiSnapshots(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sync.refreshOddsApiSnapshots(platformId, user);
  }

  /**
   * 스포츠 실시간 경기 데이터 업로드.
   * body: { success, total, game: SportsLiveGame[] }
   * → SportsOddsSnapshot (sourceFeedId="sports-live") upsert
   */
  @Post('sports-live')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  uploadSportsLive(
    @Param('platformId') platformId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sync.upsertSportsLive(platformId, body, user);
  }

  /**
   * 프리매치 테스트용 JSON 업로드 → SportsOddsSnapshot (sourceFeedId=sports-prematch)
   */
  @Post('sports-prematch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  uploadSportsPrematch(
    @Param('platformId') platformId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sync.upsertSportsPrematch(platformId, body, user);
  }
}
