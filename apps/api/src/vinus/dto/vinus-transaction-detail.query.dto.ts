import { IsString, MaxLength, MinLength } from 'class-validator';

export class VinusTransactionDetailQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  trans_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  vendor!: string;
}
