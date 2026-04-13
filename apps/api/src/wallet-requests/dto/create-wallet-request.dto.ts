import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WalletRequestType } from '@prisma/client';

export class CreateWalletRequestDto {
  @IsEnum(WalletRequestType)
  type!: WalletRequestType;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  /** KRW(기본) | USDT — 플랫폼 최소 입·출금 한도 구분용 */
  @IsOptional()
  @IsString()
  currency?: 'KRW' | 'USDT';

  @IsOptional()
  @IsString()
  note?: string;

  /** 충전(반가상) 시 은행 문자 입금자명과 동일하게 입력 */
  @IsOptional()
  @IsString()
  depositorName?: string;
}
