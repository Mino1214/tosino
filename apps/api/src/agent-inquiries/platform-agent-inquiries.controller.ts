import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { AgentInquiriesService } from './agent-inquiries.service';
import { ReplyAgentInquiryDto, CloseAgentInquiryDto } from './dto/reply-agent-inquiry.dto';

@Controller('platforms/:platformId/agent-inquiries')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class PlatformAgentInquiriesController {
  constructor(private inquiries: AgentInquiriesService) {}

  @Get('pending/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  pendingSummary(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inquiries.pendingSummary(platformId, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  list(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.inquiries.listForAdmin(platformId, user, status);
  }

  @Patch(':inquiryId/reply')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  reply(
    @Param('platformId') platformId: string,
    @Param('inquiryId') inquiryId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReplyAgentInquiryDto,
  ) {
    return this.inquiries.reply(platformId, inquiryId, user, dto.reply);
  }

  @Patch(':inquiryId/close')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  close(
    @Param('platformId') platformId: string,
    @Param('inquiryId') inquiryId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CloseAgentInquiryDto,
  ) {
    return this.inquiries.close(platformId, inquiryId, user, dto.note);
  }
}
