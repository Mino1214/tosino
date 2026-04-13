import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AnnouncementItemInputDto {
  @IsString()
  @MinLength(4)
  imageUrl!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  imageWidth?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  imageHeight?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** true면 솔루션에서 읽음 처리 전 내비게이션 제한 */
  @IsOptional()
  @IsBoolean()
  mandatoryRead?: boolean;
}

export class ReplaceAnnouncementsDto {
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => AnnouncementItemInputDto)
  items!: AnnouncementItemInputDto[];
}
