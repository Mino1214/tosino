import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { BlacklistService } from './blacklist.service';

class BlockDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BlacklistController {
  constructor(private readonly svc: BlacklistService) {}

  @Get('platforms/:platformId/blacklist')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  list(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listBlockedForPlatform(platformId, user);
  }

  @Patch('platforms/:platformId/users/:userId/block')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  block(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @Body() dto: BlockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.block(platformId, userId, user, dto.reason);
  }

  @Patch('platforms/:platformId/users/:userId/unblock')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  unblock(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.unblock(platformId, userId, user);
  }

  /** 교차 플랫폼 유사 회원 검색 — 쿼리 매개변수로 검사 키 전달 */
  @Get('platforms/:platformId/blacklist/similar')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  similar(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('loginId') loginId?: string,
    @Query('phone') phone?: string,
    @Query('displayName') displayName?: string,
    @Query('bankAccountNumber') bankAccountNumber?: string,
    @Query('bankAccountHolder') bankAccountHolder?: string,
    @Query('blockedOnly') blockedOnly?: string,
  ) {
    return this.svc.findSimilarAcrossPlatforms(user, {
      platformId,
      loginId,
      phone,
      displayName,
      bankAccountNumber,
      bankAccountHolder,
      blockedOnly: blockedOnly === '1' || blockedOnly === 'true',
    });
  }
}
