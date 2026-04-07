import { IsString, MaxLength } from 'class-validator';

export class UpdateUserMemoDto {
  @IsString()
  @MaxLength(4000)
  userMemo!: string;
}
