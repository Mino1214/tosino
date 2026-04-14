import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateSemiVirtualDto {
  @IsBoolean()
  enabled!: boolean;

  /** 숫자만 또는 하이픈 포함(서버에서 숫자만 추출) */
  @ValidateIf((o) => o.enabled)
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  /** SMS 본문 계좌 줄에 포함되는 고유 문자열 */
  @ValidateIf((o) => o.enabled)
  @IsOptional()
  @IsString()
  accountHint?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountHolder?: string;
}
