import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformThemeDto } from './dto/update-platform-theme.dto';
import { UpdateSemiVirtualDto } from './dto/update-semi-virtual.dto';
import { UpdatePlatformOperationalDto } from './dto/update-platform-operational.dto';

@Controller('platforms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlatformsController {
  constructor(private platforms: PlatformsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  list(@CurrentUser() user: JwtPayload) {
    return this.platforms.list(user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreatePlatformDto) {
    return this.platforms.create(dto);
  }

  /** 슈퍼관리자만. 쿼리 confirmSlug=플랫폼slug 로 오삭제 방지 */
  @Delete(':platformId')
  @Roles(UserRole.SUPER_ADMIN)
  remove(
    @Param('platformId') platformId: string,
    @Query('confirmSlug') confirmSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.remove(platformId, confirmSlug, user);
  }

  @Get(':platformId/semi-virtual')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getSemiVirtual(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.getSemiVirtual(platformId, user);
  }

  @Patch(':platformId/semi-virtual')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  updateSemiVirtual(
    @Param('platformId') platformId: string,
    @Body() dto: UpdateSemiVirtualDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.updateSemiVirtual(platformId, user, dto);
  }

  @Get(':platformId/bank-sms-ingests')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  listBankSms(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('deviceMatch') deviceMatch?: string,
  ) {
    const dm = deviceMatch === '1' || deviceMatch === 'true';
    return this.platforms.listBankSmsIngests(platformId, user, {
      status,
      deviceMatchOnly: dm,
    });
  }

  @Get(':platformId')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getDetail(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.getDetail(platformId, user);
  }

  @Patch(':platformId/theme')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  updateTheme(
    @Param('platformId') platformId: string,
    @Body() dto: UpdatePlatformThemeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.updateTheme(platformId, user, dto);
  }

  @Patch(':platformId/operational')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  updateOperational(
    @Param('platformId') platformId: string,
    @Body() dto: UpdatePlatformOperationalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.updateOperational(platformId, user, dto);
  }
}
