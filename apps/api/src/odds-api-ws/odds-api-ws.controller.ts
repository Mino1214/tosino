import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlatformResolveService } from '../public/public-platform-resolve.service';
import { OddsApiWsService } from './odds-api-ws.service';
import {
  OddsApiAggregatorService,
  type MatchStatus,
} from './odds-api-aggregator.service';
import { OddsApiIntegrationKeyGuard } from './odds-api-integration-key.guard';
import { OddsApiRestService } from './odds-api-rest.service';
import { OddsApiSnapshotService } from './odds-api-snapshot.service';
import { OddsApiWhitelistService } from './odds-api-whitelist.service';

function parseMatchStatus(v: string | undefined): MatchStatus | 'all' {
  const s = (v ?? '').trim().toLowerCase();
  if (s === 'live' || s === 'prematch' || s === 'finished' || s === 'unknown')
    return s;
  return 'all';
}

function parseSnapshotType(v: string | undefined): 'live' | 'prematch' | undefined {
  const s = (v ?? '').trim().toLowerCase();
  if (s === 'live' || s === 'prematch') return s;
  return undefined;
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

type RefreshPlatformBody = {
  platformId?: string;
};

@Controller('hq/odds-api-ws')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class OddsApiWsAdminController {
  constructor(
    private readonly svc: OddsApiWsService,
    private readonly aggregator: OddsApiAggregatorService,
    private readonly rest: OddsApiRestService,
    private readonly snapshots: OddsApiSnapshotService,
    private readonly prisma: PrismaService,
    private readonly whitelist: OddsApiWhitelistService,
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
  async matches(
    @Query('status') status?: string,
    @Query('sport') sport?: string,
    @Query('limit') limit?: string,
    @Query('platformId') platformId?: string,
  ) {
    const parsedStatus = parseMatchStatus(status);
    const max =
      limit && Number.isFinite(parseInt(limit, 10))
        ? Math.min(parseInt(limit, 10), 500)
        : 200;
    if ((platformId || '').trim()) {
      const snap = await this.snapshots.getMatches(platformId!.trim(), parsedStatus);
      const wantSport = sport?.trim() || undefined;
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
      limit: max,
    });
  }

  @Get('platform-overview')
  async platformOverview(@Query('platformId') platformId?: string) {
    const id = (platformId || '').trim();
    if (!id) {
      throw new BadRequestException('platformId is required');
    }
    const cronRaw = (process.env.ODDS_SYNC_CRON || '').trim();
    const schedulerEnabled =
      !!cronRaw &&
      !['false', 'off', '0', 'disabled'].includes(cronRaw.toLowerCase());
    return {
      ...(await this.snapshots.getAdminOverview(id)),
      scheduler: {
        enabled: schedulerEnabled,
        cron: schedulerEnabled ? cronRaw : null,
      },
    };
  }

  @Get('catalog-history')
  async catalogHistory(
    @Query('platformId') platformId?: string,
    @Query('take') take?: string,
  ) {
    const id = (platformId || '').trim();
    if (!id) {
      throw new BadRequestException('platformId is required');
    }
    const size = Math.min(Math.max(parseInt(take || '10', 10) || 10, 1), 50);
    return {
      platformId: id,
      rows: await this.snapshots.getCatalogHistory(id, size),
    };
  }

  @Get('catalog-items')
  async catalogItems(
    @Query('platformId') platformId?: string,
    @Query('limit') limit?: string,
  ) {
    const id = (platformId || '').trim();
    if (!id) {
      throw new BadRequestException('platformId is required');
    }
    const size = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 200);
    const payload = await this.snapshots.getLatestCatalog(id);
    return {
      platformId: id,
      fetchedAt: payload?.fetchedAt ?? null,
      totalItems: payload?.totalItems ?? 0,
      filters: payload?.filters ?? null,
      items: payload?.items.slice(0, size) ?? [],
    };
  }

  @Get('processed-history')
  async processedHistory(
    @Query('platformId') platformId?: string,
    @Query('snapshotType') snapshotType?: string,
    @Query('take') take?: string,
  ) {
    const id = (platformId || '').trim();
    if (!id) {
      throw new BadRequestException('platformId is required');
    }
    const size = Math.min(Math.max(parseInt(take || '20', 10) || 20, 1), 100);
    return {
      platformId: id,
      rows: await this.snapshots.getProcessedHistory(
        id,
        parseSnapshotType(snapshotType),
        size,
      ),
    };
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

  @Post('platform-refresh')
  refreshPlatform(@Body() body: RefreshPlatformBody) {
    const id = (body.platformId || '').trim();
    if (!id) {
      throw new BadRequestException('platformId is required');
    }
    return this.snapshots.refreshPlatform(id);
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

  @Get('aliases/leagues')
  async listLeagueAliases(
    @Query('sport') sport?: string,
    @Query('q') q?: string,
    @Query('onlyUnmapped') onlyUnmapped?: string,
    @Query('take') take?: string,
  ) {
    const size = Math.min(Math.max(parseInt(take || '100', 10) || 100, 1), 500);
    const sp = (sport || '').trim();
    const query = (q || '').trim();
    const unmapped = (onlyUnmapped || '').toLowerCase() === 'true';
    const rows = await this.prisma.oddsApiLeagueAlias.findMany({
      where: {
        ...(sp ? { sport: sp } : {}),
        ...(unmapped ? { koreanName: null } : {}),
        ...(query
          ? {
              OR: [
                { slug: { contains: query, mode: 'insensitive' as const } },
                { originalName: { contains: query, mode: 'insensitive' as const } },
                { koreanName: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ sport: 'asc' }, { originalName: 'asc' }],
      take: size,
    });
    return { total: rows.length, rows };
  }

  @Patch('aliases/leagues/:id')
  async updateLeagueAlias(
    @Param('id') paramId: string,
    @Body()
    body: {
      koreanName?: string | null;
      logoUrl?: string | null;
      country?: string | null;
      displayPriority?: number;
      isHidden?: boolean;
    },
  ) {
    const id = (paramId || '').trim();
    if (!id) throw new BadRequestException('id is required');
    return this.prisma.oddsApiLeagueAlias.update({
      where: { id },
      data: {
        koreanName:
          body.koreanName === undefined
            ? undefined
            : body.koreanName === ''
              ? null
              : body.koreanName,
        logoUrl:
          body.logoUrl === undefined
            ? undefined
            : body.logoUrl === ''
              ? null
              : body.logoUrl,
        country:
          body.country === undefined
            ? undefined
            : body.country === ''
              ? null
              : body.country,
        displayPriority: body.displayPriority,
        isHidden: body.isHidden,
      },
    });
  }

  @Get('aliases/teams')
  async listTeamAliases(
    @Query('sport') sport?: string,
    @Query('q') q?: string,
    @Query('onlyUnmapped') onlyUnmapped?: string,
    @Query('take') take?: string,
  ) {
    const size = Math.min(Math.max(parseInt(take || '100', 10) || 100, 1), 500);
    const sp = (sport || '').trim();
    const query = (q || '').trim();
    const unmapped = (onlyUnmapped || '').toLowerCase() === 'true';
    const rows = await this.prisma.oddsApiTeamAlias.findMany({
      where: {
        ...(sp ? { sport: sp } : {}),
        ...(unmapped ? { koreanName: null } : {}),
        ...(query
          ? {
              OR: [
                { externalId: { contains: query } },
                { originalName: { contains: query, mode: 'insensitive' as const } },
                { koreanName: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ sport: 'asc' }, { originalName: 'asc' }],
      take: size,
    });
    return { total: rows.length, rows };
  }

  @Patch('aliases/teams/:id')
  async updateTeamAlias(
    @Param('id') paramId: string,
    @Body()
    body: {
      koreanName?: string | null;
      logoUrl?: string | null;
      country?: string | null;
    },
  ) {
    const id = (paramId || '').trim();
    if (!id) throw new BadRequestException('id is required');
    return this.prisma.oddsApiTeamAlias.update({
      where: { id },
      data: {
        koreanName:
          body.koreanName === undefined
            ? undefined
            : body.koreanName === ''
              ? null
              : body.koreanName,
        logoUrl:
          body.logoUrl === undefined
            ? undefined
            : body.logoUrl === ''
              ? null
              : body.logoUrl,
        country:
          body.country === undefined
            ? undefined
            : body.country === ''
              ? null
              : body.country,
      },
    });
  }

  // ───────── display whitelist (Phase 3) ─────────

  @Get('whitelist')
  async listWhitelist(
    @Query('sport') sport?: string,
    @Query('take') take?: string,
  ) {
    return this.whitelist.list({
      sport: (sport || '').trim() || undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('whitelist/stats')
  async whitelistStats() {
    return this.whitelist.stats();
  }

  @Post('whitelist/replace')
  async replaceWhitelist(
    @Body()
    body: {
      sport?: string;
      externalEventIds?: string[];
      source?: string;
      ttlSeconds?: number | null;
    },
  ) {
    const sport = (body.sport || '').trim();
    if (!sport) throw new BadRequestException('sport is required');
    const ids = Array.isArray(body.externalEventIds)
      ? body.externalEventIds
      : [];
    return this.whitelist.replaceForSport(sport, ids, {
      source: body.source,
      ttlSeconds: body.ttlSeconds ?? null,
    });
  }

  @Post('whitelist/add')
  async addWhitelist(
    @Body()
    body: {
      items?: Array<{
        sport: string;
        externalEventId: string;
        expiresAt?: string | null;
      }>;
      source?: string;
    },
  ) {
    const items = Array.isArray(body.items) ? body.items : [];
    return this.whitelist.addMany(items, { source: body.source });
  }

  @Post('whitelist/clear')
  async clearWhitelist(@Body() body: { sport?: string }) {
    const sp = (body?.sport || '').trim();
    return this.whitelist.clear(sp || undefined);
  }

  @Post('whitelist/purge-expired')
  async purgeExpiredWhitelist() {
    return this.whitelist.purgeExpired();
  }

  // ───────── alias stats (phase 2) ─────────
  @Get('aliases/stats')
  async aliasStats() {
    const [
      leagueTotal,
      leagueMapped,
      teamTotal,
      teamMapped,
      leagueBySport,
      teamBySport,
    ] = await Promise.all([
      this.prisma.oddsApiLeagueAlias.count(),
      this.prisma.oddsApiLeagueAlias.count({
        where: { koreanName: { not: null } },
      }),
      this.prisma.oddsApiTeamAlias.count(),
      this.prisma.oddsApiTeamAlias.count({
        where: { koreanName: { not: null } },
      }),
      this.prisma.oddsApiLeagueAlias.groupBy({
        by: ['sport'],
        _count: { _all: true },
      }),
      this.prisma.oddsApiTeamAlias.groupBy({
        by: ['sport'],
        _count: { _all: true },
      }),
    ]);
    return {
      league: {
        total: leagueTotal,
        mapped: leagueMapped,
        unmapped: leagueTotal - leagueMapped,
        bySport: leagueBySport.map((r) => ({
          sport: r.sport,
          count: r._count._all,
        })),
      },
      team: {
        total: teamTotal,
        mapped: teamMapped,
        unmapped: teamTotal - teamMapped,
        bySport: teamBySport.map((r) => ({
          sport: r.sport,
          count: r._count._all,
        })),
      },
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

/**
 * 스코어 크롤러 등 M2M 주체가 display whitelist 를 갱신할 때 사용.
 *  - Auth: x-integration-key 또는 Authorization: Integration <key>
 *  - env ODDS_API_INTEGRATION_KEYS (콤마 구분) 에 등록된 키만 허용.
 *  - HQ UI 는 JWT 기반 /hq/odds-api-ws/whitelist 를 그대로 사용.
 */
@Controller('integrations/odds-api-whitelist')
@UseGuards(OddsApiIntegrationKeyGuard)
export class OddsApiIntegrationController {
  constructor(private readonly whitelist: OddsApiWhitelistService) {}

  @Post('replace')
  async replace(
    @Body()
    body: {
      sport?: string;
      externalEventIds?: string[];
      source?: string;
      ttlSeconds?: number | null;
    },
  ) {
    const sport = (body.sport || '').trim();
    if (!sport) throw new BadRequestException('sport is required');
    const ids = Array.isArray(body.externalEventIds)
      ? body.externalEventIds
      : [];
    return this.whitelist.replaceForSport(sport, ids, {
      source: body.source,
      ttlSeconds: body.ttlSeconds ?? null,
    });
  }

  @Post('add')
  async add(
    @Body()
    body: {
      items?: Array<{
        sport: string;
        externalEventId: string;
        expiresAt?: string | null;
      }>;
      source?: string;
    },
  ) {
    const items = Array.isArray(body.items) ? body.items : [];
    return this.whitelist.addMany(items, { source: body.source });
  }

  @Post('bulk-replace')
  async bulkReplace(
    @Body()
    body: {
      source?: string;
      ttlSeconds?: number | null;
      bySport?: Record<string, string[]>;
    },
  ) {
    const bySport = body.bySport || {};
    const entries = Object.entries(bySport);
    const results = [] as Array<{
      sport: string;
      removed: number;
      inserted: number;
    }>;
    for (const [sport, ids] of entries) {
      const r = await this.whitelist.replaceForSport(
        sport,
        Array.isArray(ids) ? ids : [],
        {
          source: body.source,
          ttlSeconds: body.ttlSeconds ?? null,
        },
      );
      results.push(r);
    }
    return { results };
  }

  @Post('purge-expired')
  async purge() {
    return this.whitelist.purgeExpired();
  }

  @Get('stats')
  async stats() {
    return this.whitelist.stats();
  }
}
