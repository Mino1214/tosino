import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OddsHost HTTP 프록시.
 * URL 지정 방식 (우선순위):
 * 1) ODDSHOST_TEMPLATE_* — 가이드의 호출 URL 전체 한 줄, 플레이스홀더 {key} {sport} {game_id}
 * 2) ODDSHOST_BASE_URL + ODDSHOST_PATH_* — 호스트만 베이스로 두고 path+query 에 동일 플레이스홀더
 *
 * ODDSHOST_PROXY_SECRET 은 벤더가 주는 값이 아니라, 우리 공개 API(/public/oddshost/*) 남용 방지용 비밀번호입니다.
 * 미리보기: 쿼리 `previewSecret` 이 PREVIEW_BOOTSTRAP_SECRET 과 같으면 oddshostSecret 생략 가능(bootstrap 과 동일 흐름).
 */
@Injectable()
export class OddsHostProxyService {
  constructor(private readonly config: ConfigService) {}

  assertAccess(oddshostSecret?: string, previewSecret?: string): void {
    const required = (
      this.config.get<string>('ODDSHOST_PROXY_SECRET') || ''
    ).trim();
    if (required) {
      if (oddshostSecret === required) return;
      const previewOk = (
        this.config.get<string>('PREVIEW_BOOTSTRAP_SECRET') || ''
      ).trim();
      if (previewOk && previewSecret === previewOk) return;
      throw new ForbiddenException(
        'invalid oddshostSecret — 쿼리 oddshostSecret 을 서버 ODDSHOST_PROXY_SECRET 과 동일하게 넣거나, 미리보기 모드에서는 previewSecret(PREVIEW_BOOTSTRAP_SECRET) 을 사용하세요.',
      );
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

  /** 전체 URL 템플릿이 없으면 BASE_URL + PATH 로 조합 */
  private resolveUrl(
    fullTemplateEnv: string,
    pathEnv: string,
    vars: { key: string; sport: string; game_id: string },
  ): string {
    const full = (this.config.get<string>(fullTemplateEnv) || '').trim();
    if (full) return this.expandTemplate(full, vars);

    const base = (
      this.config.get<string>('ODDSHOST_BASE_URL') || ''
    ).trim().replace(/\/+$/, '');
    const pathTpl = (this.config.get<string>(pathEnv) || '').trim();
    if (!base || !pathTpl) {
      throw new ServiceUnavailableException(
        `Set ${fullTemplateEnv} (full URL) or both ODDSHOST_BASE_URL and ${pathEnv}`,
      );
    }
    const path = pathTpl.startsWith('/') ? pathTpl : `/${pathTpl}`;
    return this.expandTemplate(`${base}${path}`, vars);
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

  async inplayList(
    sport: string,
    oddshostSecret?: string,
    previewSecret?: string,
  ): Promise<unknown> {
    this.assertAccess(oddshostSecret, previewSecret);
    const url = this.resolveUrl(
      'ODDSHOST_TEMPLATE_INPLAY_LIST',
      'ODDSHOST_PATH_INPLAY_LIST',
      {
        key: this.key(),
        sport: sport || '1',
        game_id: '',
      },
    );
    return this.fetchJson(url);
  }

  /**
   * ODDS 동기화 등 서버 내부 전용. 공개 API와 달리 `oddshostSecret` 대신
   * .env 의 ODDSHOST_PROXY_SECRET 으로 assertAccess 를 통과합니다.
   */
  fetchInplayListForIngest(sport: string): Promise<unknown> {
    const secret = (this.config.get<string>('ODDSHOST_PROXY_SECRET') || '').trim();
    return this.inplayList(sport.trim() || '1', secret || undefined, undefined);
  }

  async inplayGame(
    sport: string,
    gameId: string,
    oddshostSecret?: string,
    previewSecret?: string,
  ): Promise<unknown> {
    this.assertAccess(oddshostSecret, previewSecret);
    if (!gameId?.trim()) {
      throw new ForbiddenException('game_id is required');
    }
    const url = this.resolveUrl(
      'ODDSHOST_TEMPLATE_INPLAY_GAME',
      'ODDSHOST_PATH_INPLAY_GAME',
      {
        key: this.key(),
        sport: sport || '1',
        game_id: gameId.trim(),
      },
    );
    return this.fetchJson(url);
  }

  async prematch(
    sport: string,
    oddshostSecret?: string,
    extra: Record<string, string> = {},
    previewSecret?: string,
  ): Promise<unknown> {
    this.assertAccess(oddshostSecret, previewSecret);
    let url = this.resolveUrl('ODDSHOST_TEMPLATE_PREMATCH', 'ODDSHOST_PATH_PREMATCH', {
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
