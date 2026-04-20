import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { IpAccessListKind } from '@prisma/client';

export class CreateIpAccessRuleDto {
  @IsBoolean()
  isGlobal!: boolean;

  @IsOptional()
  @IsString()
  platformId?: string | null;

  @IsEnum(IpAccessListKind)
  kind!: IpAccessListKind;

  @IsString()
  @MinLength(3)
  cidr!: string;

  @IsOptional()
  @IsString()
  note?: string | null;
}
