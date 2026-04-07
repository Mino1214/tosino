import { Body, Controller, HttpCode, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { VinusService } from './vinus.service';

@Controller('webhooks')
export class VinusWebhookController {
  private readonly logger = new Logger(VinusWebhookController.name);

  constructor(private vinus: VinusService) {}

  /**
   * Vinus Gaming 콜백 (게임사 → 에이전트).
   * POST JSON. (벤더가 헤더 형식을 통일하지 않아 authKey 검증은 하지 않음.)
   */
  @Post('vinus')
  @HttpCode(200)
  async vinusCallback(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const payload = body ?? {};
    const xf = req.headers['x-forwarded-for'];
    const ip =
      (typeof xf === 'string' ? xf.split(',')[0]?.trim() : undefined) ||
      req.socket.remoteAddress ||
      'unknown';
    this.logger.log(
      `[vinus recv] ip=${ip} command=${String(payload['command'] ?? '')} check=${String(payload['check'] ?? '')} body=${JSON.stringify(payload)}`,
    );
    return this.vinus.handleCallback(payload);
  }
}
