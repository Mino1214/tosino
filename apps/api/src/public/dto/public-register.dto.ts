import {
  IsEmail,
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

  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

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
