import {
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

export class LoginDto {
  /** 로그인 아이디 (이메일 아님) */
  @IsString()
  @MinLength(3)
  @Matches(LOGIN_ID_PATTERN, {
    message: '아이디는 3~64자, 영문 소문자·숫자·._@- 만 사용할 수 있습니다.',
  })
  loginId!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  platformId?: string;

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

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

/** 부트스트랩 슈퍼관리자: loginId + password */
export class BootstrapSuperAdminDto {
  @IsString()
  @MinLength(3)
  @Matches(LOGIN_ID_PATTERN, {
    message: '아이디는 3~64자, 영문 소문자·숫자·._@- 만 사용할 수 있습니다.',
  })
  loginId!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
