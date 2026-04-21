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

  @Post('config')
  applyConfig(@Body() body: ApplyConfigBody) {
    return this.svc.applyConfig(body);
  }

  @Post('reconnect')
  reconnect() {
    return this.svc.reconnectNow();
  }
}
