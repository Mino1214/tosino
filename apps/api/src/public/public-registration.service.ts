import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegistrationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicRegisterDto } from './dto/public-register.dto';
import { PublicPlatformResolveService } from './public-platform-resolve.service';
import { normalizeLoginId } from '../common/login-id.util';

type SignupFlags = {
  publicSignupCode: string | null;
  defaultSignupReferrerUserId: string | null;
};

type ResolvedSignupTarget = {
  platformId: string;
  platformName: string;
  signupKey: string;
  resolvedBy: 'signup_code' | 'login_id';
  parentUserId: string | null;
  referredByUserId: string | null;
  referredByLoginId: string | null;
};

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

  private getSignupKey(input: {
    signupKey?: string;
    referralCode?: string;
  }): string {
    const raw = input.signupKey?.trim() || input.referralCode?.trim() || '';
    if (!raw) {
      throw new BadRequestException(
        '가입코드 또는 추천인 아이디를 입력해주세요',
      );
    }
    return raw;
  }

  private readSignupFlags(flagsJson: unknown): SignupFlags {
    const raw =
      flagsJson && typeof flagsJson === 'object' && !Array.isArray(flagsJson)
        ? (flagsJson as Record<string, unknown>)
        : {};
    const code =
      typeof raw.publicSignupCode === 'string'
        ? raw.publicSignupCode.trim().toUpperCase()
        : '';
    const defaultSignupReferrerUserId =
      typeof raw.defaultSignupReferrerUserId === 'string'
        ? raw.defaultSignupReferrerUserId.trim()
        : '';
    return {
      publicSignupCode: code || null,
      defaultSignupReferrerUserId: defaultSignupReferrerUserId || null,
    };
  }

  private async resolveMasterFromFlags(
    platformId: string,
    userId: string | null,
  ): Promise<{ id: string; loginId: string } | null> {
    if (!userId) return null;
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        platformId,
        role: UserRole.MASTER_AGENT,
        registrationStatus: RegistrationStatus.APPROVED,
      },
      select: { id: true, loginId: true },
    });
  }

  private async resolveSignupTarget(
    signupKeyRaw: string,
    platformId: string,
  ): Promise<ResolvedSignupTarget> {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        id: true,
        name: true,
        flagsJson: true,
      },
    });
    if (!platform) {
      throw new BadRequestException('가입 플랫폼을 찾을 수 없습니다');
    }

    const signupKey = signupKeyRaw.trim();
    const normalizedCode = signupKey.toUpperCase();
    const normalizedLoginId = normalizeLoginId(signupKey);
    const signupFlags = this.readSignupFlags(platform.flagsJson);
    const defaultMaster = await this.resolveMasterFromFlags(
      platform.id,
      signupFlags.defaultSignupReferrerUserId,
    );

    if (
      signupFlags.publicSignupCode &&
      normalizedCode === signupFlags.publicSignupCode
    ) {
      if (!defaultMaster) {
        throw new BadRequestException(
          '공통 가입코드에 연결된 마스터가 아직 설정되지 않았습니다',
        );
      }
      return {
        platformId: platform.id,
        platformName: platform.name,
        signupKey,
        resolvedBy: 'signup_code',
        parentUserId: defaultMaster.id,
        referredByUserId: defaultMaster.id,
        referredByLoginId: defaultMaster.loginId,
      };
    }

    const referrer = await this.prisma.user.findFirst({
      where: {
        platformId: platform.id,
        loginId: normalizedLoginId,
        role: { in: [UserRole.MASTER_AGENT, UserRole.USER] },
        registrationStatus: RegistrationStatus.APPROVED,
      },
      select: {
        id: true,
        loginId: true,
        role: true,
        parentUserId: true,
        parent: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!referrer) {
      throw new NotFoundException(
        '유효하지 않은 가입코드 또는 추천인 아이디입니다',
      );
    }

    const parentUserId =
      referrer.role === UserRole.MASTER_AGENT
        ? referrer.id
        : referrer.parent?.role === UserRole.MASTER_AGENT
          ? referrer.parent.id
          : (defaultMaster?.id ?? null);

    return {
      platformId: platform.id,
      platformName: platform.name,
      signupKey,
      resolvedBy: 'login_id',
      parentUserId,
      referredByUserId: referrer.id,
      referredByLoginId: referrer.loginId,
    };
  }

  async lookupReferral(
    code: string | undefined,
    host?: string,
    port?: string,
    previewSecret?: string,
  ) {
    const signupKey = this.getSignupKey({ signupKey: code });
    const portNum = port?.trim() ? Number(port) : NaN;
    const platformId = await this.resolvePlatformIdFromDto({
      host,
      port: Number.isFinite(portNum) && portNum > 0 ? portNum : undefined,
      previewSecret,
    });

    if (!platformId) {
      throw new BadRequestException('가입 플랫폼을 확인할 수 없습니다');
    }

    const resolved = await this.resolveSignupTarget(signupKey, platformId);
    return {
      valid: true,
      platformName: resolved.platformName,
      resolvedBy: resolved.resolvedBy,
      referrerLoginId: resolved.referredByLoginId,
    };
  }

  async register(dto: PublicRegisterDto) {
    const signupKey = this.getSignupKey(dto);
    const platformId = await this.resolvePlatformIdFromDto(dto);
    if (!platformId) {
      throw new BadRequestException('가입 플랫폼을 확인할 수 없습니다');
    }

    const resolved = await this.resolveSignupTarget(signupKey, platformId);
    const loginId = normalizeLoginId(dto.loginId);
    const existing = await this.prisma.user.findFirst({
      where: { loginId, platformId: resolved.platformId },
    });
    if (existing) {
      throw new ConflictException('이 플랫폼에서 이미 사용 중인 아이디입니다');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const email =
      dto.contactEmail?.trim() != null && dto.contactEmail.trim().length > 0
        ? dto.contactEmail.trim().toLowerCase()
        : null;

    const exchangePinHash =
      dto.exchangePin && dto.exchangePin.length >= 4
        ? await bcrypt.hash(dto.exchangePin, 10)
        : null;

    const isAnonymous = dto.signupMode === 'anonymous';
    if (isAnonymous && !dto.usdtWalletAddress?.trim()) {
      throw new BadRequestException(
        '무기명 회원가입은 테더 지갑 주소를 입력해야 합니다',
      );
    }

    const now = new Date();

    const created = await this.prisma.user.create({
      data: {
        loginId,
        email,
        passwordHash,
        role: UserRole.USER,
        platformId: resolved.platformId,
        parentUserId: resolved.parentUserId,
        referredByUserId: resolved.referredByUserId,
        displayName: dto.displayName?.trim() || null,
        registrationStatus: isAnonymous
          ? RegistrationStatus.APPROVED
          : RegistrationStatus.PENDING,
        registrationResolvedAt: isAnonymous ? now : null,
        signupMode: dto.signupMode ?? null,
        signupReferralInput: signupKey,
        telegramUsername: dto.telegramUsername?.trim() || null,
        phone: dto.phone?.trim() || null,
        telecomCompany: dto.telecomCompany?.trim() || null,
        birthDate: dto.birthDate?.trim() || null,
        gender: dto.gender ?? null,
        bankCode: dto.bankCode?.trim() || null,
        bankAccountNumber: dto.bankAccountNumber?.trim() || null,
        bankAccountHolder: dto.bankAccountHolder?.trim() || null,
        usdtWalletAddress: dto.usdtWalletAddress?.trim() || null,
        exchangePinHash,
      },
      select: {
        id: true,
      },
    });

    if (isAnonymous) {
      await this.prisma.wallet.create({
        data: {
          userId: created.id,
          platformId: resolved.platformId,
          balance: 0,
        },
      });
    }

    return {
      ok: true,
      message: isAnonymous
        ? '가입이 완료되었습니다. 바로 로그인할 수 있습니다.'
        : '가입 신청이 접수되었습니다. 플랫폼 관리자 승인 후 로그인할 수 있습니다.',
    };
  }
}
