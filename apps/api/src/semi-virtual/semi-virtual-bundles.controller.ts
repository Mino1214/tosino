import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformScopeGuard } from '../common/guards/platform-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import {
  AccountInput,
  SemiVirtualBundlesService,
} from './semi-virtual-bundles.service';

class SaveBundleDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsArray()
  accounts!: AccountInput[];
}

class RetireBundleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SemiVirtualBundlesController {
  constructor(private readonly svc: SemiVirtualBundlesService) {}

  @Get('platforms/semi-virtual-bundles/all')
  @Roles(UserRole.SUPER_ADMIN)
  listAll(
    @CurrentUser() user: JwtPayload,
    @Query('onlyCurrent') onlyCurrent?: string,
  ) {
    return this.svc.listAllForSuperAdmin(
      user,
      onlyCurrent === '1' || onlyCurrent === 'true',
    );
  }

  @Get('platforms/:platformId/semi-virtual-bundles')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  list(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listForPlatform(platformId, user);
  }

  @Get('platforms/:platformId/semi-virtual-bundles/current')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  getCurrent(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.getCurrent(platformId, user);
  }

  @Post('platforms/:platformId/semi-virtual-bundles')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  create(
    @Param('platformId') platformId: string,
    @Body() dto: SaveBundleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.createBundle(platformId, user, {
      label: dto.label ?? null,
      accounts: dto.accounts,
    });
  }

  @Patch('platforms/:platformId/semi-virtual-bundles/:bundleId/retire')
  @UseGuards(PlatformScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  retire(
    @Param('platformId') platformId: string,
    @Param('bundleId') bundleId: string,
    @Body() dto: RetireBundleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.retireBundle(platformId, bundleId, user, dto.reason);
  }
}
