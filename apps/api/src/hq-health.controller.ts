import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { Roles } from './common/decorators/roles.decorator';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaService } from './prisma/prisma.service';

export type HqServiceHealthItem = {
  id: string;
  label: string;
  ok: boolean;
  ms?: number;
  status?: number;
  detail?: string;
};

type HqServiceHealthPayload = {
  checkedAt: string;
  checks: HqServiceHealthItem[];
};

@Controller('hq')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class HqHealthController {
  private static readonly SERVICE_HEALTH_CACHE_TTL_MS = 60_000;
  private serviceHealthCache:
    | { expiresAt: number; payload: HqServiceHealthPayload }
    | null = null;
  private serviceHealthInflight: Promise<HqServiceHealthPayload> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('service-health')
  async serviceHealth(): Promise<HqServiceHealthPayload> {
    const now = Date.now();
    if (this.serviceHealthCache && this.serviceHealthCache.expiresAt > now) {
      return this.serviceHealthCache.payload;
    }
    if (this.serviceHealthInflight) {
      return this.serviceHealthInflight;
    }
    this.serviceHealthInflight = this.buildServiceHealth().finally(() => {
      this.serviceHealthInflight = null;
    });
    return this.serviceHealthInflight;
  }

  private async buildServiceHealth(): Promise<HqServiceHealthPayload> {
    const checks: HqServiceHealthItem[] = [];
    // HQ 대시보드 보조 위젯이라 과도한 대기보다 빠른 실패가 낫다.
    const timeoutMs = 2500;

    const tDb = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({
        id: 'database',
        label: 'PostgreSQL',
        ok: true,
        ms: Date.now() - tDb,
      });
    } catch (e) {
      checks.push({
        id: 'database',
        label: 'PostgreSQL',
        ok: false,
        detail: e instanceof Error ? e.message : 'query failed',
      });
    }

    const vinusP: Promise<HqServiceHealthItem> = (async () => {
      const vinusKey = (this.config.get<string>('VINUS_AGENT_KEY') || '').trim();
      const vinusGameUrl = (this.config.get<string>('VINUS_GAME_BASE_URL') || '').trim();
      if (!vinusKey) {
        return {
          id: 'vinus',
          label: '카지노 (Vinus)',
          ok: false,
          detail: 'VINUS_AGENT_KEY 미설정',
        };
      }
      if (/^https?:\/\//i.test(vinusGameUrl)) {
        const t0 = Date.now();
        try {
          const res = await fetch(vinusGameUrl, {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(timeoutMs),
          });
          const reachable = res.status > 0 && res.status < 600;
          return {
            id: 'vinus',
            label: '카지노 (Vinus)',
            ok: reachable,
            ms: Date.now() - t0,
            status: res.status,
            detail: reachable ? undefined : `HTTP ${res.status}`,
          };
        } catch (e) {
          return {
            id: 'vinus',
            label: '카지노 (Vinus)',
            ok: false,
            detail: e instanceof Error ? e.message : 'fetch failed',
            ms: Date.now() - t0,
          };
        }
      }
      return {
        id: 'vinus',
        label: '카지노 (Vinus)',
        ok: true,
        detail: '연동 키 설정됨 (게임 URL 미설정·응답 미검증)',
      };
    })();

    const oddsP: Promise<HqServiceHealthItem> = (async () => {
      const oddsBase = (this.config.get<string>('ODDSHOST_BASE_URL') || '').trim();
      if (!oddsBase) {
        const oddsKey = !!(this.config.get<string>('ODDS_API_KEY') || '').trim();
        return {
          id: 'oddshost',
          label: '스포츠 배당 (OddsHost)',
          ok: oddsKey,
          detail: oddsKey
            ? 'ODDS_API_KEY만 설정 (REST 배당 URL 없음)'
            : 'ODDSHOST_BASE_URL / ODDS_API_KEY 미설정',
        };
      }
      const t0 = Date.now();
      const url = oddsBase.replace(/\/$/, '');
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
        });
        return {
          id: 'oddshost',
          label: '스포츠 배당 (OddsHost)',
          ok: res.status < 500,
          ms: Date.now() - t0,
          status: res.status,
          detail:
            res.status >= 400 && res.status < 500
              ? `HTTP ${res.status} (엔드포인트·키 확인)`
              : undefined,
        };
      } catch (e) {
        return {
          id: 'oddshost',
          label: '스포츠 배당 (OddsHost)',
          ok: false,
          detail: e instanceof Error ? e.message : 'fetch failed',
          ms: Date.now() - t0,
        };
      }
    })();

    const publicP: Promise<HqServiceHealthItem | null> = (async () => {
      const apiSelf = (this.config.get<string>('PUBLIC_API_URL') || '').trim();
      if (!apiSelf || !/^https?:\/\//i.test(apiSelf)) return null;
      const healthUrl = `${apiSelf.replace(/\/$/, '')}/health`;
      const t0 = Date.now();
      try {
        const res = await fetch(healthUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(timeoutMs),
        });
        const body = (await res.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        const okJson = body && body.ok === true;
        return {
          id: 'public_api',
          label: '공개 API (PUBLIC_API_URL/health)',
          ok: Boolean(res.ok && okJson),
          ms: Date.now() - t0,
          status: res.status,
          detail: !okJson ? '본문 ok 아님' : undefined,
        };
      } catch (e) {
        return {
          id: 'public_api',
          label: '공개 API (PUBLIC_API_URL/health)',
          ok: false,
          detail: e instanceof Error ? e.message : 'fetch failed',
          ms: Date.now() - t0,
        };
      }
    })();

    const [vinusR, oddsR, publicR] = await Promise.all([vinusP, oddsP, publicP]);
    checks.push(vinusR, oddsR);
    if (publicR) checks.push(publicR);

    const payload = { checkedAt: new Date().toISOString(), checks };
    this.serviceHealthCache = {
      expiresAt:
        Date.now() + HqHealthController.SERVICE_HEALTH_CACHE_TTL_MS,
      payload,
    };
    return payload;
  }
}
