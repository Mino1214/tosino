import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHqPortfolioNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  hedgeNote?: string;
}
