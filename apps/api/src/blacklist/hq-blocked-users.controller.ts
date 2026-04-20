import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { BlacklistService } from './blacklist.service';

@Controller('hq/blocked-users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HqBlockedUsersController {
  constructor(private readonly svc: BlacklistService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  list(@CurrentUser() user: JwtPayload) {
    return this.svc.listAllBlockedForHq(user);
  }
}
