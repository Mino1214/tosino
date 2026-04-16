import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformThemeDto } from './dto/update-platform-theme.dto';
import { UpdateSemiVirtualDto } from './dto/update-semi-virtual.dto';
import { UpdatePlatformOperationalDto } from './dto/update-platform-operational.dto';
import { GrantPlatformPointsDto } from './dto/grant-platform-points.dto';
import { ExecuteCompSettlementDto, ListCompSettlementsDto } from './dto/execute-comp-settlement.dto';
import {
  ExecuteSolutionBillingDto,
  ListSolutionBillingSettlementsDto,
} from './dto/execute-solution-billing.dto';
import { UpdateHqPortfolioNoteDto } from './dto/update-hq-portfolio-note.dto';
import { PointsService } from '../points/points.service';
import { CompSettlementSchedulerService } from './comp-settlement-scheduler.service';

@Controller('platforms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlatformsController {
  constructor(
    private platforms: PlatformsService,
    private points: PointsService,
    private readonly compSettlementScheduler: CompSettlementSchedulerService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.MASTER_AGENT)
  list(@CurrentUser() user: JwtPayload) {
    return this.platforms.list(user);
  }

  @Get('templates')
  @Roles(UserRole.SUPER_ADMIN)
  listTemplates() {
    return this.platforms.listTemplates();
  }

  /** 본사: 전체 솔루션 기간 손익·알값·자산 배정 상태를 한 번에 집계 */
  @Get('hq/portfolio-summary')
  @Roles(UserRole.SUPER_ADMIN)
  getHqPortfolioSummary(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.platforms.getHqPortfolioSummary(user, from, to);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreatePlatformDto) {
    const platform = await this.platforms.create(dto);
    await this.compSettlementScheduler.syncPlatformSchedule(platform.id);
    return platform;
  }

  /** 슈퍼관리자만. 쿼리 confirmSlug=플랫폼slug 로 오삭제 방지 */
  @Delete(':platformId')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(
    @Param('platformId') platformId: string,
    @Query('confirmSlug') confirmSlug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.platforms.remove(platformId, confirmSlug, user);
    await this.compSettlementScheduler.clearPlatformSchedule(platformId);
    return result;
  }

  @Get(':platformId/semi-virtual')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getSemiVirtual(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.getSemiVirtual(platformId, user);
  }

  @Patch(':platformId/semi-virtual')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateSemiVirtual(
    @Param('platformId') platformId: string,
    @Body() dto: UpdateSemiVirtualDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.updateSemiVirtual(platformId, user, dto);
  }

  @Patch(':platformId/hq-portfolio-note')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateHqPortfolioNote(
    @Param('platformId') platformId: string,
    @Body() dto: UpdateHqPortfolioNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.updateHqPortfolioNote(platformId, user, dto.hedgeNote);
  }

  @Get(':platformId/bank-sms-ingests')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN)
  listBankSms(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('deviceMatch') deviceMatch?: string,
  ) {
    const dm = deviceMatch === '1' || deviceMatch === 'true';
    return this.platforms.listBankSmsIngests(platformId, user, {
      status,
      deviceMatchOnly: dm,
    });
  }

  @Get(':platformId')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.MASTER_AGENT)
  getDetail(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.getDetail(platformId, user);
  }

  @Patch(':platformId/theme')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  updateTheme(
    @Param('platformId') platformId: string,
    @Body() dto: UpdatePlatformThemeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.updateTheme(platformId, user, dto);
  }

  @Patch(':platformId/operational')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.MASTER_AGENT)
  async updateOperational(
    @Param('platformId') platformId: string,
    @Body() dto: UpdatePlatformOperationalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const detail = await this.platforms.updateOperational(platformId, user, dto);
    await this.compSettlementScheduler.syncPlatformSchedule(platformId);
    return detail;
  }

  @Post(':platformId/points/grant-all')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.MASTER_AGENT)
  grantAllPoints(
    @Param('platformId') platformId: string,
    @Body() dto: GrantPlatformPointsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.platforms.assertPlatformScope(user, platformId);
    return this.points.grantAllForPlatform(platformId, dto.amount, dto.note);
  }

  @Get(':platformId/comp-settlements')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.MASTER_AGENT)
  listCompSettlements(
    @Param('platformId') platformId: string,
    @Query() query: ListCompSettlementsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.listCompSettlements(platformId, user, query.take);
  }

  @Post(':platformId/comp-settlements/run')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.MASTER_AGENT)
  runCompSettlement(
    @Param('platformId') platformId: string,
    @Body() dto: ExecuteCompSettlementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.runCompSettlement(platformId, user, dto);
  }

  @Get(':platformId/solution-billing-settlements')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN)
  listSolutionBillingSettlements(
    @Param('platformId') platformId: string,
    @Query() query: ListSolutionBillingSettlementsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.listSolutionBillingSettlements(
      platformId,
      user,
      query.take,
    );
  }

  @Post(':platformId/solution-billing-settlements/run')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN)
  runSolutionBillingSettlement(
    @Param('platformId') platformId: string,
    @Body() dto: ExecuteSolutionBillingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.platforms.runSolutionBillingSettlement(platformId, user, dto);
  }

  // ─── 매출 현황 API ───────────────────────────────────────

  @Get(':platformId/sales/summary')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getSalesSummary(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.platforms.getSalesSummary(platformId, user, from, to);
  }

  @Get(':platformId/sales/agents')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getSalesAgents(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.platforms.getSalesAgents(platformId, user, from, to);
  }

  @Get(':platformId/sales/ledger')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getSalesLedger(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.platforms.getSalesLedger(platformId, user, from, to, limit);
  }
}
