import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PublicPlatformResolveService } from '../public/public-platform-resolve.service';
import { OddsApiWsService } from './odds-api-ws.service';
import {
  OddsApiAggregatorService,
  type MatchStatus,
} from './odds-api-aggregator.service';
import { OddsApiRestService } from './odds-api-rest.service';
import { OddsApiSnapshotService } from './odds-api-snapshot.service';

function parseMatchStatus(v: string | undefined): MatchStatus | 'all' {
  const s = (v ?? '').trim().toLowerCase();
  if (s === 'live' || s === 'prematch' || s === 'finished' || s === 'unknown')
    return s;
  return 'all';
}

/**
 * 공개(솔루션 페이지용) 엔드포인트.
 * 슈퍼어드민 전용 제어 엔드포인트는 OddsApiWsAdminController 참고.
 */
@Controller('public/odds-api-ws')
export class OddsApiWsPublicController {
  constructor(
    private readonly svc: OddsApiWsService,
    private readonly aggregator: OddsApiAggregatorService,
    private readonly snapshots: OddsApiSnapshotService,
    private readonly resolver: PublicPlatformResolveService,
  ) {}

  @Get('status')
  async status(
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    const s = this.svc.getStatus();
    const platform = await this.resolvePlatformFromQuery(
      host,
      port,
      previewSecret,
    );
    if (platform) {
      const meta = await this.snapshots.getSnapshotMeta(platform.id);
      const config = meta.config;
      return {
        connectionState: s.connectionState,
        connectedAt: s.connectedAt,
        lastMessageAt: s.lastMessageAt,
        lastSeq: s.lastSeq,
        stateCount: s.stateCount,
        filters: {
          sports:
            config?.sports && config.sports.length > 0
              ? config.sports
              : s.filters.sports,
          markets: s.filters.markets,
          status:
            config?.status === 'live' || config?.status === 'prematch'
              ? config.status
              : s.filters.status,
        },
        configured: s.configured && config?.enabled === true,
        snapshot: {
          liveFetchedAt: meta.liveFetchedAt,
          prematchFetchedAt: meta.prematchFetchedAt,
          catalogFetchedAt: meta.catalogFetchedAt,
          bookmakers: config?.bookmakers ?? [],
          matchLimit: config?.matchLimit ?? null,
          cacheTtlSeconds: config?.cacheTtlSeconds ?? null,
        },
      };
    }
    // 공개 응답에는 키나 환경 디테일을 노출하지 않음
    return {
      connectionState: s.connectionState,
      connectedAt: s.connectedAt,
      lastMessageAt: s.lastMessageAt,
      lastSeq: s.lastSeq,
      stateCount: s.stateCount,
      filters: s.filters,
      configured: s.configured,
    };
  }

  @Get('events')
  events(
    @Query('sport') sport?: string,
    @Query('bookie') bookie?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listEvents({
      sport: sport?.trim() || undefined,
      bookie: bookie?.trim() || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * 솔루션 페이지가 직접 소비할 매치 단위 집계 응답.
   * 클라이언트는 더 이상 그룹핑/best-odds 를 직접 하지 않는다.
   */
  @Get('matches')
  async matches(
    @Query('status') status?: string,
    @Query('sport') sport?: string,
    @Query('limit') limit?: string,
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    const parsedStatus = parseMatchStatus(status);
    const platform = await this.resolvePlatformFromQuery(
      host,
      port,
      previewSecret,
    );
    if (platform) {
      const snap = await this.snapshots.getMatches(platform.id, parsedStatus);
      const wantSport = sport?.trim() || undefined;
      const max =
        limit && Number.isFinite(parseInt(limit, 10))
          ? Math.min(parseInt(limit, 10), 500)
          : 200;
      const filtered = wantSport
        ? snap.matches.filter((m) => m.sport === wantSport)
        : snap.matches;
      return {
        status: parsedStatus,
        sport: wantSport ?? snap.sport,
        total: filtered.length,
        matches: filtered.slice(0, max),
        fetchedAt: snap.fetchedAt,
        filters: snap.filters,
      };
    }
    return this.aggregator.listMatches({
      status: parsedStatus,
      sport: sport?.trim() || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  private async resolvePlatformFromQuery(
    host?: string,
    port?: string,
    previewSecret?: string,
  ) {
    if (!(host || '').trim() && !(port || '').trim()) {
      return null;
    }
    return this.resolver.resolveForQuery(
      host?.trim() || undefined,
      port?.trim() || undefined,
      previewSecret?.trim() || undefined,
    );
  }
}

type ApplyConfigBody = {
  apiKey?: string;
  sports?: string[];
  markets?: string[];
  bookmakers?: string[];
  status?: 'live' | 'prematch' | null;
  autoConnect?: boolean;
};

@Controller('hq/odds-api-ws')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class OddsApiWsAdminController {
  constructor(
    private readonly svc: OddsApiWsService,
    private readonly aggregator: OddsApiAggregatorService,
    private readonly rest: OddsApiRestService,
  ) {}

  @Get('status')
  status() {
    return this.svc.getStatus();
  }

  @Get('events')
  events(
    @Query('sport') sport?: string,
    @Query('bookie') bookie?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listEvents({
      sport: sport?.trim() || undefined,
      bookie: bookie?.trim() || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** 어드민 콘솔 디버그용 — public/matches 와 동일 로직 */
  @Get('matches')
  matches(
    @Query('status') status?: string,
    @Query('sport') sport?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aggregator.listMatches({
      status: parseMatchStatus(status),
      sport: sport?.trim() || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('discovery')
  async discovery() {
    const [sports, bookmakers, selectedBookmakers] = await Promise.all([
      this.rest.listSports().catch(() => []),
      this.rest.listBookmakers().catch(() => []),
      this.rest.listSelectedBookmakers().catch(() => []),
    ]);
    return {
      sports,
      bookmakers,
      selectedBookmakers,
    };
  }

  @Post('config')
  applyConfig(@Body() body: ApplyConfigBody) {
    return this.svc.applyConfig(body);
  }

  @Post('reconnect')
  reconnect() {
    return this.svc.reconnectNow();
  }

  @Get('category-odds')
  async categoryOdds(
    @Query('sport') sport?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('bookmakers') bookmakers?: string,
  ) {
    const sp = (sport || '').trim();
    if (!sp) {
      return { sport: null, page: 1, pageSize: 10, totalEvents: 0, items: [] };
    }
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const ps = Math.min(50, Math.max(1, parseInt(pageSize || '10', 10) || 10));
    const allEvents = await this.rest.listEventsBySport(sp, { limit: 1000 });
    const start = (p - 1) * ps;
    const pageEvents = allEvents.slice(start, start + ps);
    const bookies = (bookmakers || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const oddsChunks: Awaited<ReturnType<typeof this.rest.getMultiOdds>> = [];
    for (let i = 0; i < pageEvents.length; i += 10) {
      const chunk = pageEvents.slice(i, i + 10).map((e) => e.id);
      const rows = await this.rest.getMultiOdds(chunk, bookies);
      oddsChunks.push(...rows);
    }
    const byId = new Map(oddsChunks.map((o) => [o.id, o]));
    const items = pageEvents.map((ev) => {
      const od = byId.get(ev.id);
      const best = pickBestOdds(od?.bookmakers ?? {});
      return {
        ...ev,
        odds: {
          home: best.home,
          draw: best.draw,
          away: best.away,
          sourceBookmaker: best.source,
        },
      };
    });
    return {
      sport: sp,
      page: p,
      pageSize: ps,
      totalEvents: allEvents.length,
      items,
    };
  }
}

function pickBestOdds(bookmakers: Record<string, unknown>): {
  home: number | null;
  draw: number | null;
  away: number | null;
  source: string | null;
} {
  let bestHome: number | null = null;
  let bestDraw: number | null = null;
  let bestAway: number | null = null;
  let source: string | null = null;
  for (const [bookie, raw] of Object.entries(bookmakers)) {
    if (!raw || typeof raw !== 'object') continue;
    const rows = (raw as { markets?: unknown }).markets;
    if (!Array.isArray(rows)) continue;
    for (const market of rows) {
      if (!market || typeof market !== 'object') continue;
      const odds = (market as { odds?: unknown }).odds;
      if (!Array.isArray(odds)) continue;
      for (const row of odds) {
        if (!row || typeof row !== 'object') continue;
        const h = (row as { home?: unknown }).home;
        const d = (row as { draw?: unknown }).draw;
        const a = (row as { away?: unknown }).away;
        if (typeof h === 'number' && (bestHome === null || h > bestHome)) {
          bestHome = h;
          source = bookie;
        }
        if (typeof d === 'number' && (bestDraw === null || d > bestDraw)) {
          bestDraw = d;
          source = bookie;
        }
        if (typeof a === 'number' && (bestAway === null || a > bestAway)) {
          bestAway = a;
          source = bookie;
        }
      }
    }
  }
  return { home: bestHome, draw: bestDraw, away: bestAway, source };
}
