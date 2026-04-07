import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  BootstrapSuperAdminDto,
  LoginDto,
  RefreshDto,
} from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
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
