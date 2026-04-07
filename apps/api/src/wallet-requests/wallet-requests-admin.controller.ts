import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole, WalletRequestStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { WalletRequestsService } from './wallet-requests.service';
import { ResolveWalletRequestDto } from './dto/resolve-wallet-request.dto';

@Controller('platforms/:platformId/wallet-requests')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class WalletRequestsAdminController {
  constructor(private walletRequests: WalletRequestsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  list(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: WalletRequestStatus,
  ) {
    return this.walletRequests.listForPlatform(platformId, user, status);
  }

  @Post(':requestId/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  approve(
    @Param('platformId') platformId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveWalletRequestDto,
  ) {
    return this.walletRequests.approve(
      platformId,
      requestId,
      user,
      dto.resolverNote,
    );
  }

  @Post(':requestId/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  reject(
    @Param('platformId') platformId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveWalletRequestDto,
  ) {
    return this.walletRequests.reject(
      platformId,
      requestId,
      user,
      dto.resolverNote,
    );
  }
}
