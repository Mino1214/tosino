import { IsString, MaxLength } from 'class-validator';

export class UpdateAgentMemoDto {
  @IsString()
  @MaxLength(4000)
  agentMemo!: string;
}
