import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { LOGIN_ID_PATTERN } from '../../common/login-id.util';

export class CreateSubAgentDto {
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

  @IsOptional()
  @IsString()
  displayName?: string;

  /** 비우면 자동 발급 */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{4,16}$/)
  referralCode?: string;

  /** 상위(본인) 실효 요율 대비 분배 % */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  splitFromParentPct!: number;
}
