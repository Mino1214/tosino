import {
  Body,
  Controller,
  ForbiddenException,
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
import { AgentService } from './agent.service';
import { UpdateRollingDto } from './dto/update-rolling.dto';
import { UsersService } from '../users/users.service';
import { UpdateAgentMemoDto } from '../users/dto/update-agent-memo.dto';
import { UpdateUplinePrivateMemoDto } from '../users/dto/update-upline-private-memo.dto';
import { UpdateSubAgentSplitDto } from './dto/update-sub-agent-split.dto';
import { CreateSubAgentDto } from '../users/dto/create-sub-agent.dto';
import { AgentInquiriesService } from '../agent-inquiries/agent-inquiries.service';
import { CreateAgentInquiryDto } from '../agent-inquiries/dto/create-agent-inquiry.dto';

@Controller('me/agent')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.MASTER_AGENT)
export class AgentController {
  constructor(
    private agent: AgentService,
    private users: UsersService,
    private inquiries: AgentInquiriesService,
  ) {}

  @Get('stats')
  stats(@CurrentUser() user: JwtPayload) {
    return this.agent.stats(user);
  }

  @Get('sales')
  sales(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agent.salesSummary(user, from, to);
  }

  @Get('wallet-requests')
  walletRequests(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agent.walletRequestsList(user, status, from, to, limit);
  }

  @Get('betting')
  betting(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agent.bettingLedger(user, from, to, limit);
  }

  @Get('sub-agents')
  subAgents(@CurrentUser() user: JwtPayload) {
    return this.agent.subAgents(user);
  }

  @Post('sub-agents')
  createSubAgent(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubAgentDto,
  ) {
    return this.users.createSubAgent(user, dto);
  }

  @Patch('downline-agent/:userId/split')
  patchSubAgentSplit(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateSubAgentSplitDto,
  ) {
    return this.agent.updateSubAgentSplit(user, userId, dto.splitFromParentPct);
  }

  @Get('downline')
  downline(@CurrentUser() user: JwtPayload) {
    return this.agent.downline(user);
  }

  @Get('downline/:userId/wallet-requests')
  downlineWalletRequests(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.agent.downlineWalletRequestsForUser(user, userId);
  }

  @Get('downline/:userId/ledger')
  downlineLedger(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.agent.downlineLedgerForUser(user, userId, limit);
  }

  @Get('downline/:userId/sales-activity')
  downlineSalesActivity(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.agent.downlineSalesActivity(
      user,
      userId,
      from,
      to,
      page,
      pageSize,
    );
  }

  @Get('downline/:userId/rolling-revisions')
  downlineRollingRevisions(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.agent.listDownlineRollingRevisions(user, userId);
  }

  @Get('downline/:userId')
  downlineOne(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.agent.downlineOne(user, userId);
  }

  @Patch('downline/:userId/rolling')
  patchRolling(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateRollingDto,
  ) {
    return this.agent.updateRolling(user, userId, dto);
  }

  @Patch('downline/:userId/agent-memo')
  patchAgentMemo(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateAgentMemoDto,
  ) {
    if (!user.platformId) throw new ForbiddenException();
    return this.users.updateAgentMemo(
      user.platformId,
      userId,
      dto.agentMemo,
      user,
    );
  }

  /** 직속 하위(총판·유저) 식별 메모 — 본인만 조회·수정 */
  @Patch('downline/:userId/upline-private-memo')
  patchDownlineUplinePrivateMemo(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateUplinePrivateMemoDto,
  ) {
    if (!user.platformId) throw new ForbiddenException();
    return this.users.updateUplinePrivateMemo(
      user.platformId,
      userId,
      dto.uplinePrivateMemo,
      user,
    );
  }

  @Post('inquiries')
  createInquiry(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAgentInquiryDto,
  ) {
    return this.inquiries.createByAgent(user, dto);
  }

  @Get('inquiries')
  listMyInquiries(@CurrentUser() user: JwtPayload) {
    return this.inquiries.listByAgent(user);
  }
}
