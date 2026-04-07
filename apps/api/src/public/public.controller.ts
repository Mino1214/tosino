import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicRegistrationService } from './public-registration.service';
import { PublicRegisterDto } from './dto/public-register.dto';
import { buildBootstrapPayload } from './bootstrap-payload.util';
import { PublicPlatformResolveService } from './public-platform-resolve.service';

@Controller('public')
export class PublicController {
  constructor(
    private prisma: PrismaService,
    private registration: PublicRegistrationService,
    private resolver: PublicPlatformResolveService,
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
