import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RegistrationsService } from './registrations.service';

@Controller('platforms/:platformId/registrations')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class RegistrationsController {
  constructor(private registrations: RegistrationsService) {}

  @Get('pending/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  pendingSummary(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrations.pendingSummary(platformId, user);
  }

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  pending(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrations.listPending(platformId, user);
  }

  @Get('history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  registrationHistory(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrations.listRegistrationHistory(platformId, user);
  }

  @Post(':userId/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  approve(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrations.approve(platformId, userId, user);
  }

  @Post(':userId/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  reject(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrations.reject(platformId, userId, user);
  }
}
