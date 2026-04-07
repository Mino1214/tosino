import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  RegistrationStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicRegisterDto } from './dto/public-register.dto';
import { PublicPlatformResolveService } from './public-platform-resolve.service';
import { normalizeLoginId } from '../common/login-id.util';

@Injectable()
export class PublicRegistrationService {
  constructor(
    private prisma: PrismaService,
    private resolver: PublicPlatformResolveService,
  ) {}

  private async resolvePlatformIdFromDto(dto: {
    host?: string;
    port?: number;
    previewSecret?: string;
  }): Promise<string | undefined> {
    const host = dto.host?.trim();
    const hasPort =
      dto.port !== undefined && dto.port !== null && Number(dto.port) > 0;
    if (!host && !hasPort) return undefined;
    try {
      const p = await this.resolver.resolveForQuery(
        host || undefined,
        hasPort ? String(dto.port) : undefined,
        dto.previewSecret,
      );
      return p.id;
    } catch {
      return undefined;
    }
  }

  async lookupReferral(
    code: string | undefined,
    host?: string,
    port?: string,
    previewSecret?: string,
  ) {
    if (!code?.trim()) {
      throw new NotFoundException('code required');
    }
    const normalized = code.trim().toUpperCase();
    const baseWhere = {
      referralCode: normalized,
      role: UserRole.MASTER_AGENT,
      registrationStatus: RegistrationStatus.APPROVED,
    };

    const portNum = port?.trim() ? Number(port) : NaN;
    const platformId = await this.resolvePlatformIdFromDto({
      host,
      port: Number.isFinite(portNum) && portNum > 0 ? portNum : undefined,
      previewSecret,
    });

    if (platformId) {
      const agent = await this.prisma.user.findFirst({
        where: { ...baseWhere, platformId },
        include: { platform: true },
      });
      if (!agent?.platform) {
        throw new NotFoundException('유효하지 않은 추천 코드입니다');
      }
      return {
        valid: true,
        platformName: agent.platform.name,
        platformSlug: agent.platform.slug,
        agentDisplayName: agent.displayName ?? '총판',
      };
    }

    const agents = await this.prisma.user.findMany({
      where: baseWhere,
      include: { platform: true },
    });
    if (agents.length === 0) {
      throw new NotFoundException('유효하지 않은 추천 코드입니다');
    }
    if (agents.length > 1) {
      throw new BadRequestException(
        '동일 추천 코드가 여러 플랫폼에 있습니다. 가입·코드 확인은 해당 플랫폼 사이트(또는 미리보기 포트)에서 진행하세요.',
      );
    }
    const agent = agents[0];
    if (!agent.platform) {
      throw new NotFoundException('유효하지 않은 추천 코드입니다');
    }
    return {
      valid: true,
      platformName: agent.platform.name,
      platformSlug: agent.platform.slug,
      agentDisplayName: agent.displayName ?? '총판',
    };
  }

  async register(dto: PublicRegisterDto) {
    const normalized = dto.referralCode.trim().toUpperCase();
    const baseWhere = {
      referralCode: normalized,
      role: UserRole.MASTER_AGENT,
      registrationStatus: RegistrationStatus.APPROVED,
    };

    const platformId = await this.resolvePlatformIdFromDto(dto);

    let agent = null as Awaited<
      ReturnType<typeof this.prisma.user.findFirst>
    > | null;

    if (platformId) {
      agent = await this.prisma.user.findFirst({
        where: { ...baseWhere, platformId },
      });
    } else {
      const agents = await this.prisma.user.findMany({ where: baseWhere });
      if (agents.length === 1) agent = agents[0];
      else if (agents.length > 1) {
        throw new BadRequestException(
          '동일 추천 코드가 여러 플랫폼에 있습니다. 가입은 해당 플랫폼 사이트에서 진행하세요.',
        );
      }
    }

    if (!agent?.platformId) {
      throw new BadRequestException('유효하지 않은 추천 코드입니다');
    }

    const loginId = normalizeLoginId(dto.loginId);
    const existing = await this.prisma.user.findFirst({
      where: { loginId, platformId: agent.platformId },
    });
    if (existing) {
      throw new ConflictException('이 플랫폼에서 이미 사용 중인 아이디입니다');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const email =
      dto.contactEmail?.trim() != null && dto.contactEmail.trim().length > 0
        ? dto.contactEmail.trim().toLowerCase()
        : null;
    await this.prisma.user.create({
      data: {
        loginId,
        email,
        passwordHash,
        role: UserRole.USER,
        platformId: agent.platformId,
        parentUserId: agent.id,
        displayName: dto.displayName?.trim() || null,
        registrationStatus: RegistrationStatus.PENDING,
      },
    });
    return {
      ok: true,
      message:
        '가입 신청이 접수되었습니다. 플랫폼 관리자 승인 후 로그인할 수 있습니다.',
    };
  }
}
