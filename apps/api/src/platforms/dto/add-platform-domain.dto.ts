import { IsString, MinLength } from 'class-validator';

export class AddPlatformDomainDto {
  @IsString()
  @MinLength(3)
  host!: string;
}
