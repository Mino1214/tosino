import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAgentInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;
}
