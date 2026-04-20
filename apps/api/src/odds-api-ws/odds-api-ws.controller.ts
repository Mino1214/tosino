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
import { OddsApiWsService } from './odds-api-ws.service';
import {
  OddsApiAggregatorService,
  type MatchStatus,
} from './odds-api-aggregator.service';

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
  ) {}

  @Get('status')
  status() {
    const s = this.svc.getStatus();
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
