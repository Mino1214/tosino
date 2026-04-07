import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { LOGIN_ID_PATTERN } from '../../common/login-id.util';

const createRoles = [
  UserRole.PLATFORM_ADMIN,
  UserRole.MASTER_AGENT,
  UserRole.USER,
] as const;

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @Matches(LOGIN_ID_PATTERN, {
    message: '아이디는 3~64자, 영문 소문자·숫자·._@- 만 사용할 수 있습니다.',
  })
  loginId!: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(createRoles as unknown as UserRole[])
  role!: UserRole;

  @IsOptional()
  @IsString()
  parentUserId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  /** 총판(MASTER_AGENT) 전용, 비우면 자동 발급 */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{4,16}$/)
  referralCode?: string;

  /** 최상위 총판: 플랫폼 부여 요율 % */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agentPlatformSharePct?: number;

  /** 하위 총판: 상위 실효 요율 대비 분배 % (예: 30 → 상위의 30%) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agentSplitFromParentPct?: number;
}
