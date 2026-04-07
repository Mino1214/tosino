import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlatformDto {
  @IsString()
  @MinLength(2)
  slug!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsObject()
  themeJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  flagsJson?: Record<string, unknown>;

  /** Initial domain host e.g. demo.localhost */
  @IsString()
  @MinLength(1)
  primaryHost!: string;

  /** 비우면 3200–3299 중 자동 할당 */
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  previewPort?: number;

  /** 설정 시 테마·플래그·연동·동기화 상태를 해당 플랫폼에서 복사(회원·지갑 제외) */
  @IsOptional()
  @IsString()
  cloneFromPlatformId?: string;
}
