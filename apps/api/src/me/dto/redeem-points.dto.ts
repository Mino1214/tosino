import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class RedeemPointsDto {
  /**
   * 전환할 포인트 수 (우선). 레거시 `points` 와 택일.
   */
  @ValidateIf((o: RedeemPointsDto) => o.points == null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;

  @ValidateIf((o: RedeemPointsDto) => o.amount == null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points?: number;

  @IsIn(['KRW', 'USDT'])
  currency: 'KRW' | 'USDT' = 'KRW';

  /** 멱등/중복 요청 방지용 클라이언트 키 */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestId?: string;
}
