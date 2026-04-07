import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyAgentInquiryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  reply!: string;
}

export class CloseAgentInquiryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  note?: string;
}
