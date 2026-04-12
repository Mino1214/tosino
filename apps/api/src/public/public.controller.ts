import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { PublicRegistrationService } from './public-registration.service';
import { PublicRegisterDto } from './dto/public-register.dto';
import { buildBootstrapPayload } from './bootstrap-payload.util';
import { PublicPlatformResolveService } from './public-platform-resolve.service';
import { OddsHostProxyService } from './oddshost-proxy.service';

@Controller('public')
export class PublicController {
  constructor(
    private prisma: PrismaService,
    private registration: PublicRegistrationService,
    private resolver: PublicPlatformResolveService,
    private oddshost: OddsHostProxyService,
  ) {}

  @Get('bootstrap')
  async bootstrap(
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    const p = await this.resolver.resolveForQuery(host, port, previewSecret);
    return buildBootstrapPayload(this.prisma, p);
  }

  @Get('sports-odds')
  async sportsOdds(
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    const p = await this.resolver.resolveForQuery(host, port, previewSecret);
    const rows = await this.prisma.sportsOddsSnapshot.findMany({
      where: { platformId: p.id },
      orderBy: [{ market: 'asc' }, { sportLabel: 'asc' }],
    });
    return {
      platformSlug: p.slug,
      feeds: rows.map((r) => ({
        sourceFeedId: r.sourceFeedId,
        sportLabel: r.sportLabel,
        market: r.market,
        fetchedAt: r.fetchedAt.toISOString(),
        payload: r.payloadJson,
      })),
    };
  }

  /**
   * 실시간 스포츠 경기 목록.
   * payloadJson 에 { games: SportsLiveGame[] } 형태로 저장된 스냅샷을 반환.
   * sourceFeedId = "sports-live" 고정.
   */
  @Get('sports-live')
  async sportsLive(
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    const p = await this.resolver.resolveForQuery(host, port, previewSecret);
    const snap = await this.prisma.sportsOddsSnapshot.findFirst({
      where: { platformId: p.id, sourceFeedId: 'sports-live' },
      orderBy: { fetchedAt: 'desc' },
    });
    const payload = snap?.payloadJson as Record<string, unknown> | null;
    const games = Array.isArray(payload?.games) ? payload.games : [];
    return {
      success: 1,
      total: (games as unknown[]).length,
      fetchedAt: snap?.fetchedAt?.toISOString() ?? null,
      game: games,
    };
  }

  /**
   * 프리매치 테스트용 스냅샷 (sourceFeedId = sports-prematch).
   * payloadJson 은 임의 JSON.
   */
  @Get('sports-prematch')
  async sportsPrematch(
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    const p = await this.resolver.resolveForQuery(host, port, previewSecret);
    const snap = await this.prisma.sportsOddsSnapshot.findFirst({
      where: { platformId: p.id, sourceFeedId: 'sports-prematch' },
      orderBy: { fetchedAt: 'desc' },
    });
    return {
      fetchedAt: snap?.fetchedAt?.toISOString() ?? null,
      payload: snap?.payloadJson ?? null,
    };
  }

  @Get('oddshost/inplay-list')
  oddshostInplayList(
    @Query('sport') sport?: string,
    @Query('oddshostSecret') oddshostSecret?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    return this.oddshost.inplayList(sport ?? '1', oddshostSecret, previewSecret);
  }

  @Get('oddshost/inplay-game')
  oddshostInplayGame(
    @Query('sport') sport?: string,
    @Query('game_id') gameId?: string,
    @Query('oddshostSecret') oddshostSecret?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    return this.oddshost.inplayGame(
      sport ?? '1',
      gameId ?? '',
      oddshostSecret,
      previewSecret,
    );
  }

  @Get('oddshost/prematch')
  oddshostPrematch(
    @Req() req: Request,
    @Query('sport') sport?: string,
    @Query('oddshostSecret') oddshostSecret?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    const skip = new Set([
      'sport',
      'oddshostSecret',
      'host',
      'port',
      'previewSecret',
    ]);
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (skip.has(k)) continue;
      if (typeof v === 'string' && v !== '') extra[k] = v;
    }
    return this.oddshost.prematch(sport ?? '1', oddshostSecret, extra, previewSecret);
  }

  @Get('referral')
  lookupReferral(
    @Query('code') code?: string,
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
  ) {
    return this.registration.lookupReferral(code, host, port, previewSecret);
  }

  @Post('register')
  register(@Body() dto: PublicRegisterDto) {
    return this.registration.register(dto);
  }
}
