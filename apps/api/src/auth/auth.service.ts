import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegistrationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlatformResolveService } from '../public/public-platform-resolve.service';
import { LoginDto } from './dto/login.dto';
import { normalizeLoginId } from '../common/login-id.util';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  platformId: string | null;
  type?: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private platformResolver: PublicPlatformResolveService,
  ) {}

  private get refreshSecret() {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private async resolveLoginPlatformId(
    dto: Pick<LoginDto, 'platformId' | 'host' | 'port' | 'previewSecret'>,
  ): Promise<string | undefined> {
    const pid = dto.platformId?.trim();
    if (pid) return pid;
    const host = dto.host?.trim();
    const hasPort =
      dto.port !== undefined && dto.port !== null && Number(dto.port) > 0;
    if (host || hasPort) {
      const p = await this.platformResolver.resolveForQuery(
        host || undefined,
        hasPort ? String(dto.port) : undefined,
        dto.previewSecret,
      );
      return p.id;
    }
    return undefined;
  }

  async login(dto: LoginDto) {
    const loginId = normalizeLoginId(dto.loginId);
    const resolvedPlatformId = await this.resolveLoginPlatformId(dto);

    let user = null as Awaited<
      ReturnType<typeof this.prisma.user.findFirst>
    > | null;

    if (resolvedPlatformId) {
      user = await this.prisma.user.findFirst({
        where: { loginId, platformId: resolvedPlatformId },
      });
      // 슈퍼관리자는 DB에 platformId=null 이라, 프론트가 platformId를 넘겨도 위 조회에 안 맞음
      if (!user) {
        user = await this.prisma.user.findFirst({
          where: {
            loginId,
            platformId: null,
            role: UserRole.SUPER_ADMIN,
          },
        });
      }
    } else {
      user = await this.prisma.user.findFirst({
        where: { loginId, platformId: null },
      });
      if (!user) {
        const matches = await this.prisma.user.findMany({
          where: { loginId },
          take: 5,
        });
        if (matches.length === 1) {
          user = matches[0];
        } else if (matches.length > 1) {
          throw new BadRequestException(
            '동일 아이디가 여러 플랫폼에 등록되어 있습니다. 솔루션·총판 앱은 접속한 사이트 주소(또는 미리보기 포트)로 로그인하고, 관리자는 NEXT_PUBLIC_LOGIN_PLATFORM_ID 등으로 platformId를 넘기세요.',
          );
        }
      }
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (user.role === UserRole.USER) {
      if (user.registrationStatus === RegistrationStatus.PENDING) {
        throw new UnauthorizedException(
          '승인 대기 중입니다. 플랫폼 관리자 승인 후 로그인할 수 있습니다.',
        );
      }
      if (user.registrationStatus === RegistrationStatus.REJECTED) {
        throw new UnauthorizedException('가입이 거절되었습니다.');
      }
    }
    const tokens = this.signTokens(user.id, user.role, user.platformId);
    return {
      ...tokens,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        platformId: user.platformId,
        displayName: user.displayName,
        registrationStatus: user.registrationStatus,
      },
    };
  }

  signTokens(sub: string, role: UserRole, platformId: string | null) {
    const accessPayload: JwtPayload = {
      sub,
      role,
      platformId,
      type: 'access',
    };
    const refreshPayload: JwtPayload = {
      sub,
      role,
      platformId,
      type: 'refresh',
    };
    return {
      accessToken: this.jwt.sign(accessPayload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: '7d',
      }),
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.signTokens(user.id, user.role, user.platformId);
  }

  async registerBootstrapSuperAdmin(loginIdRaw: string, password: string) {
    const count = await this.prisma.user.count({
      where: { role: UserRole.SUPER_ADMIN },
    });
    if (count > 0) throw new ConflictException('Bootstrap already completed');
    const loginId = normalizeLoginId(loginIdRaw);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        loginId,
        email: null,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        platformId: null,
      },
    });
    const tokens = this.signTokens(user.id, user.role, user.platformId);
    return {
      ...tokens,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        platformId: user.platformId,
      },
    };
  }
}
