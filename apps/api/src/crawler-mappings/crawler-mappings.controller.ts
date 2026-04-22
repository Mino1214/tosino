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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OddsApiIntegrationKeyGuard } from '../odds-api-ws/odds-api-integration-key.guard';
import {
  CrawlerMappingsService,
  type CrawlerLeagueIngestItem,
  type CrawlerRawMatchIngestItem,
  type CrawlerTeamIngestItem,
} from './crawler-mappings.service';
import {
  CRAWLER_MATCHER_QUEUE,
  MATCHER_JOB_MANUAL,
} from './crawler-matcher.queue';
import { CrawlerMatcherService } from './crawler-matcher.service';

/**
 * 스코어 크롤러(M2M) 가 사이클 끝에 부르는 ingest 엔드포인트.
 *  - Auth: x-integration-key 또는 Authorization: Integration <key>
 *  - env ODDS_API_INTEGRATION_KEYS 에 등록된 키만 허용.
 *
 * payload:
 *  {
 *    sourceSite: "livesport",
 *    items: [
 *      { sourceLeagueSlug, sourceSportSlug, sourceLeagueLabel, sourceCountryLabel,
 *        internalSportSlug, providerName, providerSportSlug, matchCount }, ...
 *    ]
 *  }
 */
@Controller('integrations/crawler/leagues')
@UseGuards(OddsApiIntegrationKeyGuard)
export class CrawlerMappingsIntegrationController {
  constructor(private readonly svc: CrawlerMappingsService) {}

  @Post('ingest')
  async ingest(
    @Body()
    body: {
      sourceSite?: string;
      items?: CrawlerLeagueIngestItem[];
    },
  ) {
    const site = (body?.sourceSite || '').trim();
    if (!site) throw new BadRequestException('sourceSite is required');
    const items = Array.isArray(body?.items) ? body!.items! : [];
    return this.svc.ingestLeaguesFromCrawler(site, items);
  }

  @Get('stats')
  async stats(@Query('sourceSite') sourceSite?: string) {
    return this.svc.stats(sourceSite);
  }
}

/** 크롤러(M2M) raw match ingest 전용 컨트롤러. */
@Controller('integrations/crawler/matches')
@UseGuards(OddsApiIntegrationKeyGuard)
export class CrawlerMatchesIntegrationController {
  constructor(
    private readonly svc: CrawlerMappingsService,
    private readonly matcher: CrawlerMatcherService,
  ) {}

  /**
   * 매핑 목록 읽기(HQ `GET /hq/crawler/matches` 와 동일 payload: pairedLocaleRaw·로고 보강 포함).
   * ingest 와 동일하게 `x-integration-key` 또는 `Authorization: Integration <key>`.
   * `sourceSite` 필수 — 전역 테이블 범위를 사이트로 한정.
   * `platformId` + `includeOdds`(기본 true) 이면 해당 플랫폼 odds 스냅샷에서 `providerExternalEventId` 매칭 배당(`providerOdds`)을 붙인다.
   */
  @Get('mapping-overlays')
  async mappingOverlays(
    @Query('sourceSite') sourceSite?: string,
    @Query('platformId') platformId?: string,
    @Query('includeOdds') includeOdds?: string,
    @Query('sportSlug') sportSlug?: string,
    @Query('leagueSlug') leagueSlug?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('kickoffScope') kickoffScope?: 'upcoming' | 'past' | 'all',
    @Query('oddsPayload') oddsPayload?: string,
  ) {
    const site = (sourceSite || '').trim();
    if (!site) throw new BadRequestException('sourceSite is required');
    const rawTake = take ? Number.parseInt(take, 10) : 50;
    const takeN = Number.isFinite(rawTake)
      ? Math.min(200, Math.max(1, rawTake))
      : 50;
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
    const pid = (platformId || '').trim();
    const wantOdds =
      Boolean(pid) &&
      includeOdds !== '0' &&
      includeOdds !== 'false' &&
      includeOdds !== 'no';

    const op = (oddsPayload || 'full').trim().toLowerCase();
    const oddsPayloadNorm: 'full' | 'preview' =
      op === 'preview' ? 'preview' : 'full';

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
      platformId: wantOdds ? pid : null,
      includeOdds: wantOdds,
      oddsPayload: oddsPayloadNorm,
      omitRawMatch: false,
    });
  }

  @Post('ingest')
  async ingest(
    @Body()
    body: {
      sourceSite?: string;
      items?: CrawlerRawMatchIngestItem[];
      /** 무시됨 — strict 매처는 API 요청 밖(BullMQ 주기 잡)에서만 돈다. */
      runMatcher?: boolean;
    },
  ) {
    const site = (body?.sourceSite || '').trim();
    if (!site) throw new BadRequestException('sourceSite is required');
    const items = Array.isArray(body?.items) ? body!.items! : [];
    const result = await this.svc.ingestRawMatchesFromCrawler(site, items);
    return { ingest: result };
  }
}

/** 크롤러(M2M) 팀 ingest 전용 컨트롤러. */
@Controller('integrations/crawler/teams')
@UseGuards(OddsApiIntegrationKeyGuard)
export class CrawlerTeamsIntegrationController {
  constructor(private readonly svc: CrawlerMappingsService) {}

  @Post('ingest')
  async ingest(
    @Body()
    body: {
      sourceSite?: string;
      items?: CrawlerTeamIngestItem[];
    },
  ) {
    const site = (body?.sourceSite || '').trim();
    if (!site) throw new BadRequestException('sourceSite is required');
    const items = Array.isArray(body?.items) ? body!.items! : [];
    return this.svc.ingestTeamsFromCrawler(site, items);
  }

  @Get('stats')
  async stats(@Query('sourceSite') sourceSite?: string) {
    return this.svc.teamStats(sourceSite);
  }
}

/**
 * score-crawler 가 사이클 시작 시 호출 — 확정 매핑에 묶인 로컬 `/assets/` 만 반환.
 */
@Controller('integrations/crawler/asset-hints')
@UseGuards(OddsApiIntegrationKeyGuard)
export class CrawlerAssetHintsIntegrationController {
  constructor(private readonly svc: CrawlerMappingsService) {}

  @Get()
  async hints(@Query('sourceSite') sourceSite?: string) {
    const site = (sourceSite || '').trim();
    if (!site) throw new BadRequestException('sourceSite is required');
    return this.svc.listAssetHintsForCrawlerSite(site);
  }
}

/** Super-Admin 용 관리 엔드포인트. JWT + Super Admin 롤. */
@Controller('hq/crawler/leagues')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class CrawlerMappingsAdminController {
  constructor(private readonly svc: CrawlerMappingsService) {}

  @Get()
  async list(
    @Query('sourceSite') sourceSite?: string,
    @Query('status')
    status?: 'pending' | 'confirmed' | 'ignored' | 'all',
    @Query('sportSlug') sportSlug?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.svc.list({
      sourceSite: sourceSite?.trim() || undefined,
      status: status || 'all',
      sportSlug: sportSlug?.trim() || undefined,
      q: q?.trim() || undefined,
      take: take ? Number.parseInt(take, 10) : undefined,
      skip: skip ? Number.parseInt(skip, 10) : undefined,
    });
  }

  @Get('stats')
  async stats(@Query('sourceSite') sourceSite?: string) {
    return this.svc.stats(sourceSite);
  }

  @Get(':id/suggest')
  async suggest(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.suggestProviderLeagues(
      id,
      limit ? Number.parseInt(limit, 10) : 10,
    );
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body()
    body: {
      providerName?: string | null;
      providerSportSlug?: string | null;
      providerLeagueSlug: string;
      providerLeagueLabel?: string | null;
      note?: string | null;
      confirmedBy?: string | null;
      /** 기본 true — 비어있는 OddsApiLeagueAlias.logoUrl 에 크롤러 수집 로고/국기를 채움 */
      learnLogo?: boolean;
    },
  ) {
    if (!body?.providerLeagueSlug) {
      throw new BadRequestException('providerLeagueSlug is required');
    }
    return this.svc.confirm(id, body);
  }

  @Patch(':id/ignore')
  async ignore(
    @Param('id') id: string,
    @Body() body: { note?: string | null },
  ) {
    return this.svc.ignore(id, body?.note ?? null);
  }

  @Patch(':id/reopen')
  async reopen(@Param('id') id: string) {
    return this.svc.reopen(id);
  }
}

/** Super-Admin 용 팀 매핑 관리 엔드포인트. */
@Controller('hq/crawler/teams')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class CrawlerTeamsAdminController {
  constructor(private readonly svc: CrawlerMappingsService) {}

  @Get()
  async list(
    @Query('sourceSite') sourceSite?: string,
    @Query('status')
    status?: 'pending' | 'confirmed' | 'ignored' | 'all',
    @Query('sportSlug') sportSlug?: string,
    @Query('leagueSlug') leagueSlug?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.svc.listTeams({
      sourceSite: sourceSite?.trim() || undefined,
      status: status || 'all',
      sportSlug: sportSlug?.trim() || undefined,
      leagueSlug: leagueSlug?.trim() || undefined,
      q: q?.trim() || undefined,
      take: take ? Number.parseInt(take, 10) : undefined,
      skip: skip ? Number.parseInt(skip, 10) : undefined,
    });
  }

  @Get('stats')
  async stats(@Query('sourceSite') sourceSite?: string) {
    return this.svc.teamStats(sourceSite);
  }

  @Get(':id/suggest')
  async suggest(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.svc.suggestProviderTeams(
      id,
      limit ? Number.parseInt(limit, 10) : 30,
      q?.trim() || undefined,
    );
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body()
    body: {
      providerName?: string | null;
      providerSportSlug?: string | null;
      providerTeamExternalId: string;
      providerTeamName?: string | null;
      note?: string | null;
      confirmedBy?: string | null;
      learnKoreanName?: boolean;
      learnLogo?: boolean;
    },
  ) {
    if (!body?.providerTeamExternalId) {
      throw new BadRequestException('providerTeamExternalId is required');
    }
    return this.svc.confirmTeam(id, body);
  }

  @Patch(':id/ignore')
  async ignore(
    @Param('id') id: string,
    @Body() body: { note?: string | null },
  ) {
    return this.svc.ignoreTeam(id, body?.note ?? null);
  }

  @Patch(':id/reopen')
  async reopen(@Param('id') id: string) {
    return this.svc.reopenTeam(id);
  }
}

/** Super-Admin 용 경기 매칭 관리 엔드포인트. */
@Controller('hq/crawler/matches')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class CrawlerMatchesAdminController {
  constructor(
    private readonly svc: CrawlerMappingsService,
    private readonly matcher: CrawlerMatcherService,
    @InjectQueue(CRAWLER_MATCHER_QUEUE) private readonly matcherQueue: Queue,
  ) {}

  @Get()
  async list(
    @Query('sourceSite') sourceSite?: string,
    @Query('status')
    status?:
      | 'auto'
      | 'pending'
      | 'confirmed'
      | 'rejected'
      | 'ignored'
      | 'all'
      | 'matched'
      | 'misc',
    @Query('sportSlug') sportSlug?: string,
    @Query('leagueSlug') leagueSlug?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('kickoffScope') kickoffScope?: 'upcoming' | 'past' | 'all',
  ) {
    const ks = kickoffScope?.trim();
    const scope =
      ks === 'upcoming' || ks === 'past' || ks === 'all' ? ks : undefined;
    return this.matcher.listMappings({
      sourceSite: sourceSite?.trim() || undefined,
      status: status || 'all',
      sportSlug: sportSlug?.trim() || undefined,
      leagueSlug: leagueSlug?.trim() || undefined,
      q: q?.trim() || undefined,
      take: take ? Number.parseInt(take, 10) : undefined,
      skip: skip ? Number.parseInt(skip, 10) : undefined,
      kickoffScope: scope,
    });
  }

  /** sport 드롭다운 용 카탈로그 (수집된 sport 만). */
  @Get('facets')
  async facets() {
    return this.matcher.listFacets();
  }

  /**
   * 매핑 행이 없는 CrawlerRawMatch 에 대해 pending CrawlerMatchMapping 을 만든다.
   * (과거 ingest 버전 이후 쌓인 고아 raw 용 — 새 ingest 는 자동 생성)
   */
  @Post('sync-mapping-rows-from-raw')
  async syncMappingRowsFromRaw(
    @Body() body?: { sourceSite?: string; limit?: number },
  ) {
    return this.svc.backfillOrphanCrawlerMatchMappings({
      sourceSite: body?.sourceSite?.trim() || undefined,
      limit: body?.limit,
    });
  }

  /** aiscore 축구 ko/en raw 를 sourceMatchId 로 양방향 pairedRawMatchId 연결 */
  @Post('link-aiscore-football-locale-pairs')
  async linkAiscoreFootballLocalePairs() {
    return this.svc.linkAiscoreFootballLocalePairs();
  }

  /**
   * 선택 provider team alias 의 한글명/로고/국가를 upsert.
   * alias row 가 없으면 originalName 을 힌트로 새로 만든다.
   */
  @Patch('provider-team-alias')
  async upsertProviderTeamAlias(
    @Body()
    body: {
      sport: string;
      externalId: string;
      originalName?: string | null;
      koreanName?: string | null;
      logoUrl?: string | null;
      country?: string | null;
    },
  ) {
    return this.matcher.upsertProviderTeamAlias(body);
  }

  /**
   * 크롤러 원본(LEFT) 한글 라벨을 수정한다.
   * 우리 번역 소스이기 때문에 매핑된 provider alias 까지 자동 전파.
   */
  @Patch('raw/:rawMatchId')
  async updateRawLabel(
    @Param('rawMatchId') rawMatchId: string,
    @Body()
    body: {
      field: 'home' | 'away' | 'league';
      value: string;
    },
  ) {
    return this.matcher.updateRawLabel({
      rawMatchId,
      field: body?.field,
      value: body?.value ?? '',
    });
  }

  /** provider league alias (한글명/로고/국가) upsert. */
  @Patch('provider-league-alias')
  async upsertProviderLeagueAlias(
    @Body()
    body: {
      sport: string;
      slug: string;
      originalName?: string | null;
      koreanName?: string | null;
      logoUrl?: string | null;
      country?: string | null;
      displayPriority?: number;
      isHidden?: boolean;
    },
  ) {
    return this.matcher.upsertProviderLeagueAlias(body);
  }

  /** 아직 어떤 crawler 매핑에도 붙지 않은(또는 원하는 sport 의) provider catalog event 풀. */
  @Get('provider-pool')
  async providerPool(
    @Query('sport') sport?: string,
    @Query('q') q?: string,
    @Query('leagueSlug') leagueSlug?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('onlyUnused') onlyUnused?: string,
    @Query('kickoffScope') kickoffScope?: 'upcoming' | 'past' | 'all',
  ) {
    const ks = kickoffScope?.trim();
    const scope =
      ks === 'upcoming' || ks === 'past' || ks === 'all' ? ks : undefined;
    return this.matcher.listProviderPool({
      sport: sport?.trim() || undefined,
      q: q?.trim() || undefined,
      leagueSlug: leagueSlug?.trim() || undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      skip: skip ? Number.parseInt(skip, 10) : undefined,
      onlyUnused: onlyUnused === 'true' || onlyUnused === '1',
      kickoffScope: scope,
    });
  }

  @Get('stats')
  async stats(@Query('sourceSite') sourceSite?: string) {
    return this.matcher.stats(sourceSite);
  }

  @Post('run-matcher')
  async runMatcher(
    @Body()
    body: {
      sourceSite?: string;
      limit?: number;
      onlyStatuses?: Array<
        'pending' | 'rejected' | 'auto' | 'confirmed' | 'ignored'
      >;
      onlyWithoutStoredCandidates?: boolean;
    },
  ) {
    const job = await this.matcherQueue.add(
      MATCHER_JOB_MANUAL,
      {
        sourceSite: body?.sourceSite?.trim() || undefined,
        limit: body?.limit,
        onlyStatuses: body?.onlyStatuses,
        onlyWithoutStoredCandidates:
          body?.onlyWithoutStoredCandidates === true,
      },
      {
        removeOnComplete: 40,
        removeOnFail: 20,
        priority: 10,
      },
    );
    return {
      queued: true as const,
      jobId: job.id ?? undefined,
      message:
        '매칭 작업을 백그라운드 큐에 넣었습니다. 워커가 DB를 순차 처리합니다.',
    };
  }

  /**
   * 비교 콘솔용: API(odds-api) 경기 1건에 대해 크롤 raw 경기 후보 top-N 추천.
   * 자동 확정 없음 — 점수·이유만 반환.
   */
  @Post('suggest-crawl-candidates')
  async suggestCrawlCandidates(
    @Body()
    body: {
      apiMatch?: {
        id: string | number;
        home: string;
        away: string;
        sport: { slug: string; name?: string };
        league: { slug: string; name?: string };
      };
      sourceSite?: string;
      limit?: number;
      maxScan?: number;
    },
  ) {
    if (!body?.apiMatch || typeof body.apiMatch !== 'object') {
      throw new BadRequestException('apiMatch is required');
    }
    return this.matcher.suggestCrawlCandidatesForApiMatch({
      apiMatch: body.apiMatch,
      sourceSite: body?.sourceSite,
      limit: body?.limit,
      maxScan: body?.maxScan,
    });
  }

  @Get(':id/candidates')
  async candidates(
    @Param('id') id: string,
    @Query('q') q?: string,
    @Query('leagueSlug') leagueSlug?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matcher.suggestMatchCandidates(id, {
      q: q?.trim() || undefined,
      leagueSlug: leagueSlug?.trim() || undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body()
    body: {
      providerExternalEventId?: string | null;
      providerSportSlug?: string | null;
      providerLeagueSlug?: string | null;
      note?: string | null;
    },
  ) {
    return this.matcher.confirmMapping(id, body);
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { note?: string | null },
  ) {
    return this.matcher.rejectMapping(id, body?.note ?? null);
  }

  @Patch(':id/reopen')
  async reopen(@Param('id') id: string) {
    return this.matcher.reopenMapping(id);
  }
}
