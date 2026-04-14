import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** TRC20 USDT 컨트랙트 주소 (Tron 메인넷) */
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRONGRID_BASE = 'https://api.trongrid.io';

export interface TrongridTrc20Tx {
  transaction_id: string;
  from: string;
  to: string;
  /** 최소 단위 (6 decimals — 1 USDT = 1_000_000) */
  value: string;
  block_timestamp: number;
  token_info: { symbol: string; decimals: number };
}

@Injectable()
export class TrongridService {
  private readonly log = new Logger(TrongridService.name);

  constructor(private config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get<string>('TRONGRID_API_KEY') ?? '';
  }

  /**
   * 지갑 주소로 들어온 최근 TRC20 USDT Transfer 목록 조회.
   * @param walletAddress 수취 지갑(정산 지갑)
   * @param minTimestampMs 이 이후 블록만 (기본 24시간 전)
   */
  async fetchIncomingUsdtTxs(
    walletAddress: string,
    minTimestampMs?: number,
  ): Promise<TrongridTrc20Tx[]> {
    const since =
      minTimestampMs ?? Date.now() - 24 * 60 * 60 * 1000;

    const url = new URL(
      `${TRONGRID_BASE}/v1/accounts/${walletAddress}/transactions/trc20`,
    );
    url.searchParams.set('contract_address', USDT_CONTRACT);
    url.searchParams.set('only_confirmed', 'true');
    url.searchParams.set('limit', '200');
    url.searchParams.set('min_timestamp', String(since));

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'TRON-PRO-API-KEY': this.apiKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        this.log.warn(`TronGrid ${res.status} for ${walletAddress}`);
        return [];
      }
      const body = (await res.json()) as { data?: TrongridTrc20Tx[] };
      const txs = (body.data ?? []).filter(
        (t) =>
          t.to?.toLowerCase() === walletAddress.toLowerCase() &&
          t.token_info?.symbol === 'USDT',
      );
      return txs;
    } catch (e) {
      this.log.warn(
        `TronGrid fetch 실패 (${walletAddress}): ${e instanceof Error ? e.message : e}`,
      );
      return [];
    }
  }
}
