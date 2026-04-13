import { IsString, MinLength } from 'class-validator';

export class UpdateUsdtWalletDto {
  @IsString()
  @MinLength(20)
  usdtWalletAddress!: string;
}
