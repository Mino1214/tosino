import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { CreditsService } from './credits.service';

@Controller('hq/credits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class CreditsController {
  constructor(private readonly svc: CreditsService) {}

  /* ── Summary ── */
  @Get('summary')
  getSummary() {
    return this.svc.getSummary();
  }

  @Get('platform-summary')
  getPlatformCreditSummary() {
    return this.svc.getPlatformCreditSummary();
  }

  /* ── HQ Vendor Deposits ── */
  @Get('vendor-deposits')
  listVendorDeposits(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listVendorDeposits(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post('vendor-deposits')
  addVendorDeposit(
    @Body() body: { amountKrw: number; note?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.addVendorDeposit(body.amountKrw, body.note ?? null, user.sub);
  }

  @Delete('vendor-deposits/:id')
  deleteVendorDeposit(@Param('id') id: string) {
    return this.svc.deleteVendorDeposit(id);
  }

  /* ── Credit Requests (all platforms) ── */
  @Get('requests')
  listCreditRequests(
    @Query('status') status?: string,
    @Query('platformId') platformId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listCreditRequests(
      status,
      platformId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post('requests')
  createCreditRequest(
    @Body() body: { platformId: string; requestedAmountKrw: number; requesterNote?: string },
  ) {
    return this.svc.createCreditRequest(
      body.platformId,
      body.requestedAmountKrw,
      body.requesterNote ?? null,
    );
  }

  @Patch('requests/:id')
  resolveCreditRequest(
    @Param('id') id: string,
    @Body()
    body: {
      status: 'APPROVED' | 'REJECTED';
      approvedAmountKrw?: number;
      adminNote?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.resolveCreditRequest(
      id,
      body.status,
      body.approvedAmountKrw ?? null,
      body.adminNote ?? null,
      user.sub,
    );
  }
}
