import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class VinusLaunchDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  game?: string;

  @IsOptional()
  @IsIn(['WEB', 'MOBILE'])
  platform?: 'WEB' | 'MOBILE';

  /** 무시됨 — 서버에서 항상 `seamless`로 Vinus 호출 */
  @IsOptional()
  @IsIn(['seamless'])
  method?: 'seamless';

  @IsOptional()
  @IsString()
  @MaxLength(16)
  lang?: string;
}
