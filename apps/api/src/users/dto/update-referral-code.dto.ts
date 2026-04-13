import { IsString, MaxLength } from 'class-validator';

export class UpdateReferralCodeDto {
  @IsString()
  @MaxLength(64)
  referralCode!: string;
}
