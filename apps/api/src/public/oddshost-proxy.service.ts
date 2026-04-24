import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { expandOddsHostUrlTemplate } from './oddshost-template.util';

/**
 * OddsHost HTTP 프록시.
 * 벤더 문서 예시(문서의 [key] 등 → 이 리포지토리의 {key} 치환 규칙):
 * · Inplay 목록: …/inplay/1xb/?token=[key]&sport=[id]  → token={key}&sport={sport}
 * · Inplay 한 경기: …&game_id=[id]  → game_id={game_id}
 * · Prematch 베이직: …/prematch/1xb/?token=[key]&sport=[id]&date=[yyyymmdd]  → {date}
 * · Prematch 스페셜: 동일 + special=1 (솔루션 탭에서 쿼리로 부착)
 * · Prematch 프로: …&game_id=[id] (date 없음) — 공개 API는 쿼리 game_id 를 업스트림 URL 에 합침
 *
 * URL 지정 방식 (우선순위):
 * 1) ODDSHOST_TEMPLATE_* — 가이드 전체 URL 한 줄. {key}{sport}{game_id}{date} (date 는 서울 당일 또는 ODDSHOST_QUERY_DATE)
 * 2) ODDSHOST_BASE_URL + ODDSHOST_PATH_* — 동일 플레이스홀더
 * 선택: ODDSHOST_TEMPLATE_MARKETS / ODDSHOST_PATH_MARKETS — 오즈마켓(JSON)
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
    const dateOverride = (
      this.config.get<string>('ODDSHOST_QUERY_DATE') || ''
    ).trim();
    return expandOddsHostUrlTemplate(template, vars, dateOverride || undefined);
  }

  /** 전체 URL 템플릿이 없으면 BASE_URL + PATH 로 조합 */
  private resolveUrl(
    featureLabel: string,
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
        `[${featureLabel}] OddsHost URL 미설정(503): apps/api .env 에 ` +
          `${fullTemplateEnv}(가이드 전체 URL) 또는 ` +
          `ODDSHOST_BASE_URL + ${pathEnv} 를 넣으세요.`,
      );
    }
    const path = pathTpl.startsWith('/') ? pathTpl : `/${pathTpl}`;
    return this.expandTemplate(`${base}${path}`, vars);
  }

  private key(): string {
    const k = (this.config.get<string>('ODDSHOST_KEY') || '').trim();
    if (!k) {
      throw new ServiceUnavailableException(
        '[OddsHost] ODDSHOST_KEY 미설정(503): 벤더 인증키를 apps/api .env 에 넣으세요.',
      );
    }
    return k;
  }

  async fetchJson(url: string, upstreamLabel?: string): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const c =
        err && typeof err === 'object' && 'cause' in err
          ? (err as { cause?: unknown }).cause
          : undefined;
      const cause =
        c !== undefined && c !== null ? ` [cause: ${String(c)}]` : '';
      let host = '';
      try {
        host = new URL(url).host;
      } catch {
        /* ignore */
      }
      const label = upstreamLabel ? `[${upstreamLabel}] ` : '';
      throw new ServiceUnavailableException(
        `${label}OddsHost 연결 실패${host ? ` (${host})` : ''}: ${err.message}${cause}`,
      );
    }
    const text = await res.text();
    if (!res.ok) {
      const prefix = upstreamLabel ? `[${upstreamLabel}] ` : '';
      throw new ServiceUnavailableException(
        `${prefix}벤더 응답 HTTP ${res.status}: ${text.slice(0, 400)}`,
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
      '인플레이 목록',
      'ODDSHOST_TEMPLATE_INPLAY_LIST',
      'ODDSHOST_PATH_INPLAY_LIST',
      {
        key: this.key(),
        sport: sport || '1',
        game_id: '',
      },
    );
    return this.fetchJson(url, '인플레이 목록');
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
      '인플레이 경기',
      'ODDSHOST_TEMPLATE_INPLAY_GAME',
      'ODDSHOST_PATH_INPLAY_GAME',
      {
        key: this.key(),
        sport: sport || '1',
        game_id: gameId.trim(),
      },
    );
    return this.fetchJson(url, '인플레이 경기');
  }

  /**
   * 스포츠 탭·운영 점검: .env 로 조합되는 업스트림 URL(키 마스킹)과, probe 시 API 서버에서 OddsHost 로 실제 GET.
   * 접근 규칙은 inplay-list 와 동일(oddshostSecret 또는 previewSecret).
   */
  async diagnostic(
    sport: string,
    oddshostSecret?: string,
    previewSecret?: string,
    probe = false,
  ): Promise<{
    sport: string;
    nodeEnv: string;
    keyConfigured: boolean;
    endpoints: {
      inplayList: {
        ok: boolean;
        urlRedacted: string | null;
        error: string | null;
      };
      inplayGame: {
        ok: boolean;
        urlRedacted: string | null;
        error: string | null;
      };
      prematch: {
        ok: boolean;
        urlRedacted: string | null;
        error: string | null;
      };
      markets: {
        ok: boolean;
        urlRedacted: string | null;
        error: string | null;
      };
    };
    probe: {
      ran: boolean;
      target: string | null;
      urlRedacted: string | null;
      httpStatus: number | null;
      responseOk: boolean | null;
      preview: string | null;
      error: string | null;
    };
  }> {
    this.assertAccess(oddshostSecret, previewSecret);
    const sportNorm = (sport || '1').trim() || '1';
    const keyRaw = (this.config.get<string>('ODDSHOST_KEY') || '').trim();
    const keyConfigured = !!keyRaw;

    const resolveOne = (
      label: string,
      fullTemplateEnv: string,
      pathEnv: string,
      vars: { key: string; sport: string; game_id: string },
    ): { ok: true; url: string } | { ok: false; error: string } => {
      try {
        const url = this.resolveUrl(label, fullTemplateEnv, pathEnv, vars);
        return { ok: true, url };
      } catch (e) {
        const msg =
          e instanceof ServiceUnavailableException
            ? e.message
            : e instanceof Error
              ? e.message
              : String(e);
        return { ok: false, error: msg };
      }
    };

    const redact = (url: string, key: string): string => {
      const enc = encodeURIComponent(key);
      let out = url.split(enc).join('__ODDSHOST_KEY__');
      if (key && !enc.includes(key)) {
        out = out.split(key).join('__ODDSHOST_KEY__');
      }
      return out;
    };

    const emptyEndpoints = () => ({
      inplayList: {
        ok: false,
        urlRedacted: null as string | null,
        error: 'ODDSHOST_KEY is not set' as string | null,
      },
      inplayGame: {
        ok: false,
        urlRedacted: null as string | null,
        error: 'ODDSHOST_KEY is not set' as string | null,
      },
      prematch: {
        ok: false,
        urlRedacted: null as string | null,
        error: 'ODDSHOST_KEY is not set' as string | null,
      },
      markets: {
        ok: false,
        urlRedacted: null as string | null,
        error: 'ODDSHOST_KEY is not set' as string | null,
      },
    });

    let endpoints = emptyEndpoints();
    if (keyConfigured) {
      const key = keyRaw;
      const listR = resolveOne(
        '인플레이 목록',
        'ODDSHOST_TEMPLATE_INPLAY_LIST',
        'ODDSHOST_PATH_INPLAY_LIST',
        { key, sport: sportNorm, game_id: '' },
      );
      const gameR = resolveOne(
        '인플레이 경기',
        'ODDSHOST_TEMPLATE_INPLAY_GAME',
        'ODDSHOST_PATH_INPLAY_GAME',
        { key, sport: sportNorm, game_id: '0' },
      );
      const preR = resolveOne(
        '프리매치',
        'ODDSHOST_TEMPLATE_PREMATCH',
        'ODDSHOST_PATH_PREMATCH',
        { key, sport: sportNorm, game_id: '' },
      );
      const mkR = resolveOne(
        '오즈마켓',
        'ODDSHOST_TEMPLATE_MARKETS',
        'ODDSHOST_PATH_MARKETS',
        { key, sport: sportNorm, game_id: '' },
      );
      endpoints = {
        inplayList: listR.ok
          ? {
              ok: true,
              urlRedacted: redact(listR.url, key),
              error: null,
            }
          : { ok: false, urlRedacted: null, error: listR.error },
        inplayGame: gameR.ok
          ? {
              ok: true,
              urlRedacted: redact(gameR.url, key),
              error: null,
            }
          : { ok: false, urlRedacted: null, error: gameR.error },
        prematch: preR.ok
          ? {
              ok: true,
              urlRedacted: redact(preR.url, key),
              error: null,
            }
          : { ok: false, urlRedacted: null, error: preR.error },
        markets: mkR.ok
          ? {
              ok: true,
              urlRedacted: redact(mkR.url, key),
              error: null,
            }
          : { ok: false, urlRedacted: null, error: mkR.error },
      };
    }

    const probeOut: {
      ran: boolean;
      target: string | null;
      urlRedacted: string | null;
      httpStatus: number | null;
      responseOk: boolean | null;
      preview: string | null;
      error: string | null;
    } = {
      ran: false,
      target: null,
      urlRedacted: null,
      httpStatus: null,
      responseOk: null,
      preview: null,
      error: null,
    };

    if (probe && keyConfigured) {
      const listR = resolveOne(
        '인플레이 목록',
        'ODDSHOST_TEMPLATE_INPLAY_LIST',
        'ODDSHOST_PATH_INPLAY_LIST',
        {
          key: keyRaw,
          sport: sportNorm,
          game_id: '',
        },
      );
      if (!listR.ok) {
        probeOut.ran = true;
        probeOut.target = 'inplayList';
        probeOut.error = `URL 조합 실패: ${listR.error}`;
      } else {
        probeOut.ran = true;
        probeOut.target = 'inplayList';
        probeOut.urlRedacted = redact(listR.url, keyRaw);
        try {
          const res = await fetch(listR.url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          probeOut.httpStatus = res.status;
          probeOut.responseOk = res.ok;
          const text = await res.text();
          let preview = text.slice(0, 12_000);
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            try {
              preview = JSON.stringify(JSON.parse(text) as unknown, null, 2).slice(
                0,
                12_000,
              );
            } catch {
              /* keep raw */
            }
          }
          probeOut.preview = preview;
        } catch (e) {
          probeOut.error =
            e instanceof Error ? e.message : 'OddsHost fetch threw';
        }
      }
    } else if (probe && !keyConfigured) {
      probeOut.ran = true;
      probeOut.error = 'ODDSHOST_KEY 가 없어 probe 를 건너뜁니다.';
    }

    return {
      sport: sportNorm,
      nodeEnv: process.env.NODE_ENV || '',
      keyConfigured,
      endpoints,
      probe: probeOut,
    };
  }

  async prematch(
    sport: string,
    oddshostSecret?: string,
    extra: Record<string, string> = {},
    previewSecret?: string,
  ): Promise<unknown> {
    this.assertAccess(oddshostSecret, previewSecret);
    let url = this.resolveUrl(
      '프리매치',
      'ODDSHOST_TEMPLATE_PREMATCH',
      'ODDSHOST_PATH_PREMATCH',
      {
        key: this.key(),
        sport: sport || '1',
        game_id: '',
      },
    );
    if (Object.keys(extra).length > 0) {
      const u = new URL(url);
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined && v !== '') u.searchParams.set(k, v);
      }
      url = u.toString();
    }
    return this.fetchJson(url, '프리매치');
  }

  /**
   * 오즈마켓(벤더 “마켓” 피드) — 가이드 URL을 ODDSHOST_TEMPLATE_MARKETS 또는 PATH 에 두고 호출.
   * 미설정 시 resolveUrl 이 ServiceUnavailableException.
   */
  async markets(
    sport: string,
    oddshostSecret?: string,
    extra: Record<string, string> = {},
    previewSecret?: string,
  ): Promise<unknown> {
    this.assertAccess(oddshostSecret, previewSecret);
    let url = this.resolveUrl(
      '오즈마켓',
      'ODDSHOST_TEMPLATE_MARKETS',
      'ODDSHOST_PATH_MARKETS',
      {
        key: this.key(),
        sport: sport || '1',
        game_id: '',
      },
    );
    if (Object.keys(extra).length > 0) {
      const u = new URL(url);
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined && v !== '') u.searchParams.set(k, v);
      }
      url = u.toString();
    }
    return this.fetchJson(url, '오즈마켓');
  }
}
