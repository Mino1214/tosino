import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { PublicPlatformResolveService } from '../public/public-platform-resolve.service';
import { CrawlerMatcherService } from './crawler-matcher.service';

/**
 * 솔루션(호스트 기반 플랫폼 식별)용 공개 크롤 매칭 API.
 * 통합 키 없이 `?host=` 또는 미리보기 `port`+`previewSecret` 만으로 호출.
 */
@Controller('public/crawler')
export class CrawlerPublicController {
  constructor(
    private readonly resolver: PublicPlatformResolveService,
    private readonly matcher: CrawlerMatcherService,
  ) {}

  /**
   * 크롤 raw ↔ odds-api 매칭 + 짝 로케일(`pairedLocaleRaw`) + 플랫폼 스냅샷 배당(`providerOdds`).
   * `take` 공개 상한 100.
   */
  @Get('match-overlays')
  async matchOverlays(
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
    @Query('sourceSite') sourceSite?: string,
    @Query('sportSlug') sportSlug?: string,
    @Query('leagueSlug') leagueSlug?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('kickoffScope') kickoffScope?: 'upcoming' | 'past' | 'all',
    @Query('includeOdds') includeOdds?: string,
  ) {
    const platform = await this.resolver.resolveForQuery(
      host,
      port,
      previewSecret,
    );
    const site = (sourceSite || 'aiscore').trim();
    if (!site) throw new BadRequestException('sourceSite is required');

    const rawTake = take ? Number.parseInt(take, 10) : 40;
    const takeN = Number.isFinite(rawTake)
      ? Math.min(100, Math.max(1, rawTake))
      : 40;
    const rawSkip = skip ? Number.parseInt(skip, 10) : 0;
    const skipN = Number.isFinite(rawSkip) ? Math.max(0, rawSkip) : 0;
    const ks = kickoffScope?.trim();
    const scope =
      ks === 'upcoming' || ks === 'past' || ks === 'all' ? ks : undefined;
    const st = (status || '').trim();
    const allowed =
      st === '' ||
      st === 'pending' ||
      st === 'auto' ||
      st === 'confirmed' ||
      st === 'rejected' ||
      st === 'ignored' ||
      st === 'all' ||
      st === 'matched' ||
      st === 'misc';
    if (!allowed) {
      throw new BadRequestException(
        'status must be pending|auto|confirmed|rejected|ignored|all|matched|misc',
      );
    }
    const oddsOn =
      includeOdds !== '0' &&
      includeOdds !== 'false' &&
      includeOdds !== 'no';

    return this.matcher.listMappingOverlays({
      listParams: {
        sourceSite: site,
        status: (st || 'matched') as
          | 'pending'
          | 'auto'
          | 'confirmed'
          | 'rejected'
          | 'ignored'
          | 'all'
          | 'matched'
          | 'misc',
        sportSlug: sportSlug?.trim() || undefined,
        leagueSlug: leagueSlug?.trim() || undefined,
        q: q?.trim() || undefined,
        take: takeN,
        skip: skipN,
        kickoffScope: scope,
      },
      platformId: platform.id,
      includeOdds: oddsOn,
      oddsPayload: 'preview',
      omitRawMatch: true,
    });
  }

  /** 단일 경기 전체 배당 + 매핑 메타(목록에서 `mappingId` 로 진입) */
  @Get('match-overlay-detail')
  async matchOverlayDetail(
    @Query('host') host?: string,
    @Query('port') port?: string,
    @Query('previewSecret') previewSecret?: string,
    @Query('mappingId') mappingId?: string,
  ) {
    const platform = await this.resolver.resolveForQuery(
      host,
      port,
      previewSecret,
    );
    const mid = (mappingId || '').trim();
    if (!mid) throw new BadRequestException('mappingId is required');
    return this.matcher.getMappingOverlayDetail(platform.id, mid);
  }
}
