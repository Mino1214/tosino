import { IsObject } from 'class-validator';

export class UpdatePlatformThemeDto {
  @IsObject()
  themeJson!: Record<string, unknown>;
}
