import {
  Body,
  Controller,
  Get,
  Put,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole, DepositEventKind } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { DepositEventsService } from './deposit-events.service';
import { ReplaceDepositEventsDto } from './dto/replace-deposit-events.dto';

@Controller('platforms/:platformId/deposit-events')
@UseGuards(AuthGuard('jwt'), RolesGuard, PlatformScopeGuard)
export class DepositEventsController {
  constructor(private depositEvents: DepositEventsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  list(
    @Param('platformId') platformId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.depositEvents.listForPlatform(platformId);
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  replace(
    @Param('platformId') platformId: string,
    @Body() dto: ReplaceDepositEventsDto,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.depositEvents.replaceAll(
      platformId,
      dto.items.map((it, i) => ({
        kind: it.kind as DepositEventKind,
        title: it.title,
        active: it.active !== false,
        startsAt: it.startsAt ?? null,
        endsAt: it.endsAt ?? null,
        tiersJson: it.tiersJson,
        sortOrder: it.sortOrder ?? i,
      })),
    );
  }
}
