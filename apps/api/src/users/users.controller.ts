import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAgentMemoDto } from './dto/update-agent-memo.dto';
import { UpdateUserMemoDto } from './dto/update-user-memo.dto';
import { UpdateAgentCommissionDto } from './dto/update-agent-commission.dto';
import { UpdateMasterPrivateMemoDto } from './dto/update-master-private-memo.dto';
import { UpdateUplinePrivateMemoDto } from './dto/update-upline-private-memo.dto';

@Controller('platforms/:platformId/users')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.MASTER_AGENT,
  )
  list(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.list(platformId, user);
  }

  @Patch(':userId/agent-memo')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.MASTER_AGENT,
  )
  patchAgentMemo(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateAgentMemoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateAgentMemo(
      platformId,
      userId,
      dto.agentMemo,
      user,
    );
  }

  @Patch(':userId/master-private-memo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  patchMasterPrivateMemo(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMasterPrivateMemoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateMasterPrivateMemo(
      platformId,
      userId,
      dto.masterPrivateMemo,
      user,
    );
  }

  @Patch(':userId/upline-private-memo')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.MASTER_AGENT,
  )
  patchUplinePrivateMemo(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUplinePrivateMemoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateUplinePrivateMemo(
      platformId,
      userId,
      dto.uplinePrivateMemo,
      user,
    );
  }

  @Patch(':userId/user-memo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  patchUserMemoAdmin(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserMemoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateUserMemoAdmin(
      platformId,
      userId,
      dto.userMemo,
      user,
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  create(
    @Param('platformId') platformId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.create(platformId, dto, user);
  }

  @Patch(':userId/agent-commission')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  patchAgentCommission(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateAgentCommissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateAgentCommission(platformId, userId, dto, user);
  }

  @Get(':userId/rolling-revisions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getRollingRevisions(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.listRollingRevisionsAdmin(platformId, userId, user);
  }

  @Get(':userId/agent-commission-revisions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getAgentCommissionRevisions(
    @Param('platformId') platformId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.listAgentCommissionRevisionsAdmin(
      platformId,
      userId,
      user,
    );
  }
}
