import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DepositEventKind } from '@prisma/client';

export class DepositEventItemDto {
  @IsEnum(DepositEventKind)
  kind!: DepositEventKind;

  @IsString()
  title!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  tiersJson?: unknown;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class ReplaceDepositEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepositEventItemDto)
  items!: DepositEventItemDto[];
}
