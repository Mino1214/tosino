import { IsString } from 'class-validator';

export class UpdateMasterPrivateMemoDto {
  @IsString()
  masterPrivateMemo!: string;
}
