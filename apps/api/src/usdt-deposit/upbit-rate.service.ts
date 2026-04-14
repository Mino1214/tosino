import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const UPBIT_URL =
  'https://api.upbit.com/v1/ticker?markets=KRW-USDT';

/** 업비트 KRW/USDT 환율을 실시간 조회. 실패 시 ENV 폴백 */
@Injectable()
export class UpbitRateService {
  private readonly log = new Logger(UpbitRateService.name);

  private envFallback(): Prisma.Decimal {
    const raw =
      process.env.USDT_KRW_RATE?.trim() ||
      process.env.NEXT_PUBLIC_USDT_KRW_RATE?.trim() ||
      '1488';
    try {
      const v = new Prisma.Decimal(raw);
      return v.gt(0) ? v : new Prisma.Decimal(1488);
    } catch {
      return new Prisma.Decimal(1488);
    }
  }

  async getKrwPerUsdt(): Promise<Prisma.Decimal> {
    try {
      const res = await fetch(UPBIT_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Upbit HTTP ${res.status}`);
      const data = (await res.json()) as Array<{ trade_price: number }>;
      const price = data?.[0]?.trade_price;
      if (!price || price <= 0) throw new Error('Upbit invalid price');
      const rate = new Prisma.Decimal(price);
      return rate;
    } catch (e) {
      this.log.warn(
        `업비트 환율 조회 실패 — ENV 폴백 사용: ${e instanceof Error ? e.message : e}`,
      );
      return this.envFallback();
    }
  }
}
