import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class RedeemPointsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points!: number;

  @IsIn(['KRW', 'USDT'])
  currency!: 'KRW' | 'USDT';
}
