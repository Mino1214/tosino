import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { UsersService } from './users.service';

@Controller('hq/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HqUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  list(
    @CurrentUser() user: JwtPayload,
    @Query('platformId') platformId?: string,
    @Query('role') role?: UserRole,
    @Query('sort') sort?: 'role' | 'created',
  ) {
    const s = sort === 'created' ? 'created' : 'role';
    return this.users.listAllForHq(user, {
      platformId: platformId?.trim() || undefined,
      role:
        role &&
        (role === UserRole.PLATFORM_ADMIN ||
          role === UserRole.MASTER_AGENT ||
          role === UserRole.USER)
          ? role
          : undefined,
      sort: s,
    });
  }
}
