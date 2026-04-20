import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole, IpAccessListKind } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { IpAccessService } from './ip-access.service';
import { CreateIpAccessRuleDto } from './dto/create-ip-access-rule.dto';

@Controller('hq/ip-access')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HqIpAccessController {
  constructor(private readonly svc: IpAccessService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  list(
    @CurrentUser() user: JwtPayload,
    @Query('platformId') platformId?: string,
    @Query('kind') kind?: IpAccessListKind,
  ) {
    const k =
      kind === IpAccessListKind.BLACKLIST || kind === IpAccessListKind.WHITELIST
        ? kind
        : undefined;
    return this.svc.list(user, {
      platformId: platformId?.trim() || undefined,
      kind: k,
    });
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateIpAccessRuleDto) {
    return this.svc.create(user, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
