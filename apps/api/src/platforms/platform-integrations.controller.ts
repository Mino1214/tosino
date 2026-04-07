import { Body, Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { PlatformsService } from './platforms.service';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';

@Controller('platforms/:platformId/integrations')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class PlatformIntegrationsController {
  constructor(private platforms: PlatformsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  get(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.getIntegrations(platformId, user);
  }

  @Patch()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  patch(
    @Param('platformId') platformId: string,
    @Body() dto: UpdateIntegrationsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.updateIntegrations(platformId, user, dto);
  }
}
