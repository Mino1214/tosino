import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateAgentCommissionDto {
  /** 최상위(또는 상위가 총판이 아닌) 총판만 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agentPlatformSharePct?: number;

  /** 직속 상위가 총판인 하위 총판만 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agentSplitFromParentPct?: number;
}
