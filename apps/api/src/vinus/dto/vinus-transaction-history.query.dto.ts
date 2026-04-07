import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class VinusTransactionHistoryQueryDto {
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  s_datetime!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(40)
  e_datetime!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page!: number;
}
