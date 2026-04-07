import { IsObject } from 'class-validator';

export class UpdateIntegrationsDto {
  @IsObject()
  integrationsJson!: Record<string, unknown>;
}
