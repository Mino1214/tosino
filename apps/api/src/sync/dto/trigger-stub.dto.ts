import { IsEnum } from 'class-validator';
import { SyncJobType } from '@prisma/client';

export class TriggerStubDto {
  @IsEnum(SyncJobType)
  jobType!: SyncJobType;
}
