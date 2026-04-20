import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  BootstrapSuperAdminDto,
  LoginDto,
  RefreshDto,
} from './dto/login.dto';
import { getClientIp } from '../common/client-ip.util';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, getClientIp(req));
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** One-time: create first SUPER_ADMIN when DB has none */
  @Post('bootstrap-super-admin')
  bootstrapSuperAdmin(@Body() dto: BootstrapSuperAdminDto) {
    return this.auth.registerBootstrapSuperAdmin(dto.loginId, dto.password);
  }
}
