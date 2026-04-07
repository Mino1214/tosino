import { IsString } from 'class-validator';

export class UpdateUplinePrivateMemoDto {
  @IsString()
  uplinePrivateMemo!: string;
}
