import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService, PaymentWebhookPayload } from './payment.service';

type RequestWithRaw = Request & { rawBody?: Buffer };

@Controller('webhooks')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('payment')
  async handlePaymentWebhook(
    @Req() req: RequestWithRaw,
    @Headers('x-payment-signature') signature: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw?.length) throw new BadRequestException('Raw body required');
    this.paymentService.verifySignature(raw, signature);
    let body: PaymentWebhookPayload;
    try {
      body = JSON.parse(raw.toString('utf8')) as PaymentWebhookPayload;
    } catch {
      throw new BadRequestException('Invalid JSON');
    }
    if (
      !body.eventId ||
      !body.userId ||
      !body.platformId ||
      !body.amount ||
      !body.status ||
      !body.kind
    ) {
      throw new BadRequestException('Invalid payload');
    }
    return this.paymentService.handleWebhook(body);
  }
}
