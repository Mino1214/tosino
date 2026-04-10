import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LOGIN_ID_PATTERN } from '../../common/login-id.util';

export class PublicRegisterDto {
  // ── 기본 필드 (필수) ─────────────────────────────────────
  @IsString()
  @MinLength(3)
  @Matches(LOGIN_ID_PATTERN, {
    message: '아이디는 3~64자, 영문 소문자·숫자·._@- 만 사용할 수 있습니다.',
  })
  loginId!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  /** 총판 레퍼럴 코드 */
  @IsString()
  @Matches(/^[A-Za-z0-9]{4,16}$/)
  referralCode!: string;

  // ── 기본 선택 ──────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  // ── 가입 유형 ─────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @IsIn(['full', 'anonymous'])
  signupMode?: 'full' | 'anonymous';

  // ── 연락처 ───────────────────────────────────────────────
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  telecomCompany?: string;

  // ── 개인 정보 ────────────────────────────────────────────
  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['M', 'F'])
  gender?: string;

  // ── 은행 정보 ────────────────────────────────────────────
  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  /** 입출금 2차 비밀번호 (평문, 서비스에서 해싱) */
  @IsOptional()
  @IsString()
  @MinLength(4)
  exchangePin?: string;

  // ── 플랫폼 식별 (공개 가입 시 host/port 로 플랫폼 구분) ──
  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  previewSecret?: string;
}
