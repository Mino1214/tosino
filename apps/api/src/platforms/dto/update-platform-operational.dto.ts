import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdatePlatformOperationalDto {
  @IsOptional()
  @IsBoolean()
  rollingLockWithdrawals?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  rollingTurnoverMultiplier?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  rollingTurnoverSports?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  rollingTurnoverCasino?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  rollingTurnoverSlot?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  rollingTurnoverMinigame?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  rollingTurnoverArcade?: number | null;

  @IsOptional()
  @IsBoolean()
  agentCanEditMemberRolling?: boolean;

  @IsOptional()
  @IsString()
  minDepositKrw?: string;

  @IsOptional()
  @IsString()
  minDepositUsdt?: string;

  @IsOptional()
  @IsString()
  minWithdrawKrw?: string;

  @IsOptional()
  @IsString()
  minWithdrawUsdt?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  minPointRedeemPoints?: number;

  @IsOptional()
  @IsString()
  minPointRedeemKrw?: string;

  @IsOptional()
  @IsString()
  minPointRedeemUsdt?: string;

  @IsOptional()
  @IsObject()
  pointRulesJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  compPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  compAutomation?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  solutionRatePolicy?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  publicSignupCode?: string;

  @IsOptional()
  @IsString()
  defaultSignupReferrerUserId?: string | null;
}
