import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsdtDepositTxStatus, UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { UsdtDepositService } from './usdt-deposit.service';

@Controller('platforms/:platformId/usdt-deposits')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class UsdtDepositController {
  constructor(private readonly usdtDeposit: UsdtDepositService) {}

  /** 플랫폼의 USDT 입금 트랜잭션 목록 (관리자용)
   * ?status=PENDING  → 최소 미달 대기 목록
   * ?status=UNMATCHED → 매칭 유저 없는 입금 */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  list(
    @Param('platformId') platformId: string,
    @Query('status') status?: UsdtDepositTxStatus,
  ) {
    return this.usdtDeposit.listTxs(platformId, status);
  }
}
