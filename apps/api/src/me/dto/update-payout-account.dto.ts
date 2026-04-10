import { IsString, MaxLength } from 'class-validator';

export class UpdatePayoutAccountDto {
  @IsString()
  @MaxLength(64)
  bankCode!: string;

  @IsString()
  @MaxLength(64)
  bankAccountNumber!: string;

  @IsString()
  @MaxLength(64)
  bankAccountHolder!: string;
}
