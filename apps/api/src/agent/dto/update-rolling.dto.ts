import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class UpdateRollingDto {
  @IsBoolean()
  rollingEnabled!: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rollingSportsDomesticPct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rollingSportsOverseasPct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rollingCasinoPct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rollingSlotPct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rollingMinigamePct!: number;
}
