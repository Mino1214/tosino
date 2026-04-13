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
  @IsString()
  publicSignupCode?: string;

  @IsOptional()
  @IsString()
  defaultSignupReferrerUserId?: string | null;
}
