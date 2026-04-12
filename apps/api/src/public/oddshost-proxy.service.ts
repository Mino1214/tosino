import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OddsHost HTTP 프록시. URL은 가이드에 맞춰 .env 템플릿으로 주입합니다.
 * 플레이스홀더: {key} {sport} {game_id}
 */
@Injectable()
export class OddsHostProxyService {
  constructor(private readonly config: ConfigService) {}

  assertAccess(oddshostSecret?: string): void {
    const required = (
      this.config.get<string>('ODDSHOST_PROXY_SECRET') || ''
    ).trim();
    if (required) {
      if (oddshostSecret !== required) {
        throw new ForbiddenException('invalid oddshostSecret');
      }
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('OddsHost proxy disabled in production');
    }
  }

  private expandTemplate(
    template: string,
    vars: { key: string; sport: string; game_id: string },
  ): string {
    return template
      .replaceAll('{key}', encodeURIComponent(vars.key))
      .replaceAll('{sport}', encodeURIComponent(vars.sport))
      .replaceAll('{game_id}', encodeURIComponent(vars.game_id));
  }

  private key(): string {
    const k = (this.config.get<string>('ODDSHOST_KEY') || '').trim();
    if (!k) {
      throw new ServiceUnavailableException('ODDSHOST_KEY is not set');
    }
    return k;
  }

  async fetchJson(url: string): Promise<unknown> {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new ServiceUnavailableException(
        `OddsHost HTTP ${res.status}: ${text.slice(0, 400)}`,
      );
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  async inplayList(sport: string, oddshostSecret?: string): Promise<unknown> {
    this.assertAccess(oddshostSecret);
    const template = (
      this.config.get<string>('ODDSHOST_TEMPLATE_INPLAY_LIST') || ''
    ).trim();
    if (!template) {
      throw new ServiceUnavailableException(
        'ODDSHOST_TEMPLATE_INPLAY_LIST is not set',
      );
    }
    const url = this.expandTemplate(template, {
      key: this.key(),
      sport: sport || '1',
      game_id: '',
    });
    return this.fetchJson(url);
  }

  async inplayGame(
    sport: string,
    gameId: string,
    oddshostSecret?: string,
  ): Promise<unknown> {
    this.assertAccess(oddshostSecret);
    const template = (
      this.config.get<string>('ODDSHOST_TEMPLATE_INPLAY_GAME') || ''
    ).trim();
    if (!template) {
      throw new ServiceUnavailableException(
        'ODDSHOST_TEMPLATE_INPLAY_GAME is not set',
      );
    }
    if (!gameId?.trim()) {
      throw new ForbiddenException('game_id is required');
    }
    const url = this.expandTemplate(template, {
      key: this.key(),
      sport: sport || '1',
      game_id: gameId.trim(),
    });
    return this.fetchJson(url);
  }

  async prematch(
    sport: string,
    oddshostSecret?: string,
    extra: Record<string, string> = {},
  ): Promise<unknown> {
    this.assertAccess(oddshostSecret);
    const template = (
      this.config.get<string>('ODDSHOST_TEMPLATE_PREMATCH') || ''
    ).trim();
    if (!template) {
      throw new ServiceUnavailableException(
        'ODDSHOST_TEMPLATE_PREMATCH is not set',
      );
    }
    let url = this.expandTemplate(template, {
      key: this.key(),
      sport: sport || '1',
      game_id: '',
    });
    if (Object.keys(extra).length > 0) {
      const u = new URL(url);
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined && v !== '') u.searchParams.set(k, v);
      }
      url = u.toString();
    }
    return this.fetchJson(url);
  }
}
