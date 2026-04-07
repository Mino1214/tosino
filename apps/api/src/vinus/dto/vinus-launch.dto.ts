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

  @IsOptional()
  @IsIn(['seamless', 'transfer'])
  method?: 'seamless' | 'transfer';

  @IsOptional()
  @IsString()
  @MaxLength(16)
  lang?: string;
}
