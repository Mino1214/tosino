import {
  Injectable,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VinusInfoService {
  constructor(private config: ConfigService) {}

  private get baseUrl(): string {
    return (
      this.config.get<string>('VINUS_INFO_BASE_URL')?.trim() ||
      'https://info.vinus-gaming.com'
    );
  }

  private agentKey(): string {
    const k = this.config.get<string>('VINUS_AGENT_KEY')?.trim();
    if (!k) {
      throw new ServiceUnavailableException(
        'VINUS_AGENT_KEY 가 설정되지 않았습니다.',
      );
    }
    return k;
  }

  /** 에이전트 보유금액 (심리스 / 트랜스퍼 / 게임사별) */
  async branchBalance(): Promise<Record<string, unknown>> {
    const url = new URL('/branch/balance', this.baseUrl);
    url.searchParams.set('key', this.agentKey());
    return this.fetchJson(url.toString());
  }

  /** 상세 베팅 내역 (JSON) */
  async transactionDetail(
    transId: string,
    vendor: string,
  ): Promise<Record<string, unknown>> {
    const url = new URL('/transaction/detail', this.baseUrl);
    url.searchParams.set('trans_id', transId);
    url.searchParams.set('vendor', vendor);
    url.searchParams.set('key', this.agentKey());
    return this.fetchJson(url.toString());
  }

  /** 상세 베팅 내역 (HTML) */
  async transactionDetailHtml(transId: string, vendor: string): Promise<string> {
    const url = new URL('/transaction/detail', this.baseUrl);
    url.searchParams.set('trans_id', transId);
    url.searchParams.set('vendor', vendor);
    url.searchParams.set('key', this.agentKey());
    url.searchParams.set('html', 'Y');
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new BadGatewayException(
        `Vinus info HTTP ${res.status}: ${res.statusText}`,
      );
    }
    return res.text();
  }

  /** 베팅 기록 (페이지당 최대 1,000건) */
  async transactionHistory(
    sDatetime: string,
    eDatetime: string,
    page: number,
  ): Promise<Record<string, unknown>> {
    const url = new URL('/transaction/history', this.baseUrl);
    url.searchParams.set('key', this.agentKey());
    url.searchParams.set('s_datetime', sDatetime);
    url.searchParams.set('e_datetime', eDatetime);
    url.searchParams.set('page', String(page));
    return this.fetchJson(url.toString());
  }

  private async fetchJson(url: string): Promise<Record<string, unknown>> {
    const res = await fetch(url);
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new BadGatewayException('Vinus info 응답이 JSON이 아닙니다');
    }
    if (!res.ok) {
      throw new BadGatewayException({
        status: res.status,
        body: parsed,
      });
    }
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new BadGatewayException('Vinus info JSON 형식이 예상과 다릅니다');
  }
}
