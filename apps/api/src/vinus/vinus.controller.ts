import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { VinusService } from './vinus.service';

@Controller('webhooks')
export class VinusWebhookController {
  constructor(private vinus: VinusService) {}

  /**
   * Vinus Gaming 콜백 (게임사 → 에이전트).
   * POST JSON. (벤더가 헤더 형식을 통일하지 않아 authKey 검증은 하지 않음.)
   */
  @Post('vinus')
  @HttpCode(200)
  async vinusCallback(@Body() body: Record<string, unknown>) {
    return this.vinus.handleCallback(body ?? {});
  }
}
