import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { VinusInfoService } from './vinus-info.service';
import { VinusTransactionDetailQueryDto } from './dto/vinus-transaction-detail.query.dto';
import { VinusTransactionHistoryQueryDto } from './dto/vinus-transaction-history.query.dto';

/**
 * Vinus 정보 API(info.vinus-gaming.com) 프록시.
 * 에이전트 키는 서버 env에만 두고, 관리자만 호출합니다.
 */
@Controller('integrations/vinus')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class VinusInfoController {
  constructor(private vinusInfo: VinusInfoService) {}

  @Get('branch-balance')
  branchBalance() {
    return this.vinusInfo.branchBalance();
  }

  @Get('transaction-detail')
  transactionDetail(@Query() q: VinusTransactionDetailQueryDto) {
    return this.vinusInfo.transactionDetail(q.trans_id, q.vendor);
  }

  @Get('transaction-detail/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async transactionDetailHtml(
    @Query() q: VinusTransactionDetailQueryDto,
    @Res() res: Response,
  ) {
    const html = await this.vinusInfo.transactionDetailHtml(
      q.trans_id,
      q.vendor,
    );
    res.send(html);
  }

  @Get('transaction-history')
  transactionHistory(@Query() q: VinusTransactionHistoryQueryDto) {
    return this.vinusInfo.transactionHistory(
      q.s_datetime,
      q.e_datetime,
      q.page,
    );
  }
}
