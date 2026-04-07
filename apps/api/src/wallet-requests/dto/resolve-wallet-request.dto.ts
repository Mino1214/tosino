import { IsOptional, IsString } from 'class-validator';

export class ResolveWalletRequestDto {
  @IsOptional()
  @IsString()
  resolverNote?: string;
}
