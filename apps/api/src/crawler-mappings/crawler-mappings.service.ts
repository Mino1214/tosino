import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function parseIsoDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface CrawlerLeagueIngestItem {
  sourceLeagueSlug: string;
  sourceSportSlug: string;
  sourceLeagueLabel?: string | null;
  /** 리그 자체 로고 URL (있을 때만; aiscore 는 주로 국기만 제공) */
  sourceLeagueLogo?: string | null;
  sourceCountryLabel?: string | null;
  /** 국가 국기 이미지 URL (로컬 캐시된 /assets/... 형태로 들어옴) */
  sourceCountryFlag?: string | null;
  internalSportSlug?: string | null;
  providerName?: string | null;
  providerSportSlug?: string | null;
  matchCount?: number;
}

export interface CrawlerLeagueIngestResult {
  received: number;
  upserted: number;
  newlyAdded: number;
  updated: number;
  invalid: number;
}

export interface CrawlerRawMatchIngestItem {
  sourceMatchId: string;
  sourceSportSlug: string;
  sourceUrl?: string | null;
  sourceMatchHref?: string | null;
  internalSportSlug?: string | null;
  providerName?: string | null;
  providerSportSlug?: string | null;
  rawHomeName?: string | null;
  rawHomeSlug?: string | null;
  rawAwayName?: string | null;
  rawAwaySlug?: string | null;
  rawLeagueLabel?: string | null;
  rawLeagueSlug?: string | null;
  rawCountryLabel?: string | null;
  rawKickoffText?: string | null;
  /** ISO UTC string — 크롤러가 KST→UTC 변환해서 보냄 */
  rawKickoffUtc?: string | null;
  rawScoreText?: string | null;
  rawStatusText?: string | null;
}

export interface CrawlerTeamIngestItem {
  sourceTeamName: string;
  sourceSportSlug: string;
  sourceTeamSlug?: string | null;
  sourceTeamHref?: string | null;
  sourceTeamLogo?: string | null;
  sourceLeagueSlug?: string | null;
  sourceLeagueLabel?: string | null;
  sourceCountryLabel?: string | null;
  internalSportSlug?: string | null;
  providerName?: string | null;
  providerSportSlug?: string | null;
  matchCount?: number;
}

export type CrawlerTeamIngestResult = CrawlerLeagueIngestResult;

@Injectable()
export class CrawlerMappingsService {
  private readonly logger = new Logger(CrawlerMappingsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 크롤러가 사이클 끝에 발견한 리그들을 일괄 upsert 한다.
   *
   * - sourceSite + sourceLeagueSlug 를 uniqueKey 로 사용
   * - 처음 보는 것이면 status='pending' 으로 insert
   * - 이미 있는 것이면 lastSeenAt, 라벨 등 갱신 (status 는 건드리지 않음 — 운영자가 확정했으면 유지)
   */
  async ingestLeaguesFromCrawler(
    sourceSite: string,
    items: CrawlerLeagueIngestItem[],
  ): Promise<CrawlerLeagueIngestResult> {
    const site = (sourceSite || '').trim();
    if (!site) {
      return { received: 0, upserted: 0, newlyAdded: 0, updated: 0, invalid: 0 };
    }
    const list = Array.isArray(items) ? items : [];
    let invalid = 0;
    let newlyAdded = 0;
    let updated = 0;
    for (const raw of list) {
      const sourceLeagueSlug = (raw?.sourceLeagueSlug || '').trim();
      const sourceSportSlug = (raw?.sourceSportSlug || '').trim();
      if (!sourceLeagueSlug || !sourceSportSlug) {
        invalid++;
        continue;
      }
      const existing = await this.prisma.crawlerLeagueMapping.findUnique({
        where: {
          sourceSite_sourceLeagueSlug: {
            sourceSite: site,
            sourceLeagueSlug,
          },
        },
      });
      const payload = {
        sourceSite: site,
        sourceSportSlug,
        sourceLeagueSlug,
        sourceLeagueLabel: raw.sourceLeagueLabel ?? null,
        sourceLeagueLogo: raw.sourceLeagueLogo ?? null,
        sourceCountryLabel: raw.sourceCountryLabel ?? null,
        sourceCountryFlag: raw.sourceCountryFlag ?? null,
        internalSportSlug: raw.internalSportSlug ?? null,
        providerName: raw.providerName ?? null,
        providerSportSlug: raw.providerSportSlug ?? null,
      };
      if (!existing) {
        await this.prisma.crawlerLeagueMapping.create({
          data: {
            ...payload,
            status: 'pending',
            matchCount: Math.max(0, raw.matchCount ?? 0),
          },
        });
        newlyAdded++;
      } else {
        await this.prisma.crawlerLeagueMapping.update({
          where: { id: existing.id },
          data: {
            sourceSportSlug,
            sourceLeagueLabel: raw.sourceLeagueLabel ?? existing.sourceLeagueLabel,
            sourceLeagueLogo: raw.sourceLeagueLogo ?? existing.sourceLeagueLogo,
            sourceCountryLabel: raw.sourceCountryLabel ?? existing.sourceCountryLabel,
            sourceCountryFlag: raw.sourceCountryFlag ?? existing.sourceCountryFlag,
            internalSportSlug: raw.internalSportSlug ?? existing.internalSportSlug,
            providerName: raw.providerName ?? existing.providerName,
            providerSportSlug: raw.providerSportSlug ?? existing.providerSportSlug,
            matchCount: Math.max(existing.matchCount, raw.matchCount ?? 0),
            lastSeenAt: new Date(),
          },
        });
        updated++;
      }
    }
    const upserted = newlyAdded + updated;
    if (upserted > 0) {
      this.logger.log(
        `[crawler-mappings] ingest site=${site} received=${list.length} upserted=${upserted} (new=${newlyAdded} updated=${updated} invalid=${invalid})`,
      );
    }
    return {
      received: list.length,
      upserted,
      newlyAdded,
      updated,
      invalid,
    };
  }

  async list(params: {
    sourceSite?: string;
    status?: 'pending' | 'confirmed' | 'ignored' | 'all';
    sportSlug?: string;
    q?: string;
    take?: number;
    skip?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params.sourceSite) where.sourceSite = params.sourceSite;
    if (params.status && params.status !== 'all') where.status = params.status;
    if (params.sportSlug) where.sourceSportSlug = params.sportSlug;
    const q = (params.q || '').trim();
    if (q) {
      where.OR = [
        { sourceLeagueSlug: { contains: q, mode: 'insensitive' } },
        { sourceLeagueLabel: { contains: q, mode: 'insensitive' } },
        { providerLeagueSlug: { contains: q, mode: 'insensitive' } },
      ];
    }
    const take = Math.max(1, Math.min(500, params.take ?? 100));
    const skip = Math.max(0, params.skip ?? 0);
    const [items, total] = await Promise.all([
      this.prisma.crawlerLeagueMapping.findMany({
        where,
        orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
        take,
        skip,
      }),
      this.prisma.crawlerLeagueMapping.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async stats(sourceSite?: string) {
    const base = sourceSite ? { sourceSite } : {};
    const [pending, confirmed, ignored, total] = await Promise.all([
      this.prisma.crawlerLeagueMapping.count({ where: { ...base, status: 'pending' } }),
      this.prisma.crawlerLeagueMapping.count({ where: { ...base, status: 'confirmed' } }),
      this.prisma.crawlerLeagueMapping.count({ where: { ...base, status: 'ignored' } }),
      this.prisma.crawlerLeagueMapping.count({ where: base }),
    ]);
    return { total, pending, confirmed, ignored };
  }

  async confirm(
    id: string,
    payload: {
      providerName?: string | null;
      providerSportSlug?: string | null;
      providerLeagueSlug: string;
      providerLeagueLabel?: string | null;
      note?: string | null;
      confirmedBy?: string | null;
      /**
       * true 이면 OddsApiLeagueAlias.logoUrl 이 비었을 때
       * 크롤러가 수집한 sourceLeagueLogo 또는 sourceCountryFlag 를 채워 넣는다.
       */
      learnLogo?: boolean;
    },
  ) {
    const existing = await this.prisma.crawlerLeagueMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('mapping not found');
    const providerLeagueSlug = (payload.providerLeagueSlug || '').trim();
    if (!providerLeagueSlug) {
      throw new NotFoundException('providerLeagueSlug is required');
    }
    const providerSportSlug =
      payload.providerSportSlug ?? existing.providerSportSlug ?? null;

    const updated = await this.prisma.crawlerLeagueMapping.update({
      where: { id },
      data: {
        status: 'confirmed',
        providerName: payload.providerName ?? existing.providerName ?? 'odds-api.io',
        providerSportSlug,
        providerLeagueSlug,
        providerLeagueLabel: payload.providerLeagueLabel ?? existing.providerLeagueLabel,
        note: payload.note ?? existing.note,
        confirmedAt: new Date(),
        confirmedBy: payload.confirmedBy ?? null,
      },
    });

    // OddsApiLeagueAlias 역학습: 로고가 비어 있으면 크롤러가 수집한 이미지로 채움.
    // 리그 전용 로고가 없으면 국기를 fallback 으로 사용 (소스가 aiscore 이고 국가 단위 리그 헤더뿐인 경우).
    const wantsLearnLogo = payload.learnLogo !== false;
    const logoCandidate = existing.sourceLeagueLogo || existing.sourceCountryFlag || null;
    if (wantsLearnLogo && providerSportSlug && logoCandidate) {
      const alias = await this.prisma.oddsApiLeagueAlias.findUnique({
        where: {
          sport_slug: {
            sport: providerSportSlug,
            slug: providerLeagueSlug,
          },
        },
      });
      if (alias && !alias.logoUrl) {
        await this.prisma.oddsApiLeagueAlias.update({
          where: { id: alias.id },
          data: { logoUrl: logoCandidate },
        });
        this.logger.log(
          `[crawler-mappings] learn league=${providerLeagueSlug} sport=${providerSportSlug} logo=${logoCandidate}`,
        );
      }
    }

    return updated;
  }

  async ignore(id: string, note?: string | null) {
    const existing = await this.prisma.crawlerLeagueMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('mapping not found');
    return this.prisma.crawlerLeagueMapping.update({
      where: { id },
      data: { status: 'ignored', note: note ?? existing.note },
    });
  }

  async reopen(id: string) {
    const existing = await this.prisma.crawlerLeagueMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('mapping not found');
    return this.prisma.crawlerLeagueMapping.update({
      where: { id },
      data: { status: 'pending', confirmedAt: null, confirmedBy: null },
    });
  }

  /**
   * 특정 리그 매핑에 대해 odds-api.io 쪽 후보 리그를 찾아준다 (확정 UX 용).
   * - OddsApiLeagueAlias 에서 sport 가 일치하는 것 중
   *   이름/슬러그 키워드가 비슷한 걸 가져온다 (간단한 contains 매칭, 나중에 fuzzy 로 업그레이드).
   */
  async suggestProviderLeagues(id: string, limit = 10) {
    const row = await this.prisma.crawlerLeagueMapping.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('mapping not found');
    const sport = row.internalSportSlug || row.providerSportSlug || '';
    if (!sport) {
      return { candidates: [], mapping: row };
    }
    // 키워드 후보: sourceLeagueSlug 의 영문 토큰 + sourceCountryLabel 영문 버전이 있을 때만 의미 있음
    // 여기서는 단순히 sport 에 한정된 전체 리스트를 상위 N 개로 반환.
    const candidates = await this.prisma.oddsApiLeagueAlias.findMany({
      where: { sport },
      orderBy: [{ lastSeenAt: 'desc' }],
      take: Math.max(1, Math.min(200, limit)),
      select: {
        slug: true,
        originalName: true,
        koreanName: true,
        country: true,
      },
    });
    return { candidates, mapping: row };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  raw match ingest (CrawlerRawMatch)
  // ────────────────────────────────────────────────────────────────────────

  async ingestRawMatchesFromCrawler(
    sourceSite: string,
    items: CrawlerRawMatchIngestItem[],
  ): Promise<CrawlerLeagueIngestResult> {
    const site = (sourceSite || '').trim();
    if (!site) {
      return { received: 0, upserted: 0, newlyAdded: 0, updated: 0, invalid: 0 };
    }
    const list = Array.isArray(items) ? items : [];
    let invalid = 0;
    let newlyAdded = 0;
    let updated = 0;
    for (const raw of list) {
      const sourceMatchId = (raw?.sourceMatchId || '').trim();
      const sourceSportSlug = (raw?.sourceSportSlug || '').trim();
      if (!sourceMatchId || !sourceSportSlug) {
        invalid++;
        continue;
      }
      const existing = await this.prisma.crawlerRawMatch.findUnique({
        where: {
          sourceSite_sourceSportSlug_sourceMatchId: {
            sourceSite: site,
            sourceSportSlug,
            sourceMatchId,
          },
        },
      });
      const kickoffUtc = parseIsoDate(raw.rawKickoffUtc);
      const payload = {
        sourceSite: site,
        sourceSportSlug,
        sourceMatchId,
        sourceUrl: raw.sourceUrl ?? null,
        sourceMatchHref: raw.sourceMatchHref ?? null,
        internalSportSlug: raw.internalSportSlug ?? null,
        providerName: raw.providerName ?? null,
        providerSportSlug: raw.providerSportSlug ?? null,
        rawHomeName: raw.rawHomeName ?? null,
        rawHomeSlug: raw.rawHomeSlug ?? null,
        rawAwayName: raw.rawAwayName ?? null,
        rawAwaySlug: raw.rawAwaySlug ?? null,
        rawLeagueLabel: raw.rawLeagueLabel ?? null,
        rawLeagueSlug: raw.rawLeagueSlug ?? null,
        rawCountryLabel: raw.rawCountryLabel ?? null,
        rawKickoffText: raw.rawKickoffText ?? null,
        rawKickoffUtc: kickoffUtc,
        rawScoreText: raw.rawScoreText ?? null,
        rawStatusText: raw.rawStatusText ?? null,
      };
      if (!existing) {
        await this.prisma.crawlerRawMatch.create({ data: payload });
        newlyAdded++;
      } else {
        await this.prisma.crawlerRawMatch.update({
          where: { id: existing.id },
          data: {
            ...payload,
            lastSeenAt: new Date(),
          },
        });
        updated++;
      }
    }
    const upserted = newlyAdded + updated;
    if (upserted > 0) {
      this.logger.log(
        `[crawler-mappings] raw matches ingest site=${site} received=${list.length} upserted=${upserted} (new=${newlyAdded} updated=${updated} invalid=${invalid})`,
      );
    }
    return {
      received: list.length,
      upserted,
      newlyAdded,
      updated,
      invalid,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  팀 매핑 (CrawlerTeamMapping) — 리그와 동일한 workflow
  // ────────────────────────────────────────────────────────────────────────

  /**
   * 크롤러가 사이클 끝에 발견한 팀들을 일괄 upsert 한다.
   *
   * - uniqueKey: (sourceSite, sourceSportSlug, sourceTeamName)
   * - 처음 보는 것이면 status='pending' 으로 insert
   * - 기존이면 라벨/slug/league 컨텍스트 및 lastSeenAt 갱신 (status 는 건드리지 않음)
   */
  async ingestTeamsFromCrawler(
    sourceSite: string,
    items: CrawlerTeamIngestItem[],
  ): Promise<CrawlerTeamIngestResult> {
    const site = (sourceSite || '').trim();
    if (!site) {
      return { received: 0, upserted: 0, newlyAdded: 0, updated: 0, invalid: 0 };
    }
    const list = Array.isArray(items) ? items : [];
    let invalid = 0;
    let newlyAdded = 0;
    let updated = 0;
    for (const raw of list) {
      const sourceTeamName = (raw?.sourceTeamName || '').trim();
      const sourceSportSlug = (raw?.sourceSportSlug || '').trim();
      if (!sourceTeamName || !sourceSportSlug) {
        invalid++;
        continue;
      }
      const existing = await this.prisma.crawlerTeamMapping.findUnique({
        where: {
          sourceSite_sourceSportSlug_sourceTeamName: {
            sourceSite: site,
            sourceSportSlug,
            sourceTeamName,
          },
        },
      });
      const payload = {
        sourceSite: site,
        sourceSportSlug,
        sourceTeamName,
        sourceTeamSlug: raw.sourceTeamSlug ?? null,
        sourceTeamHref: raw.sourceTeamHref ?? null,
        sourceTeamLogo: raw.sourceTeamLogo ?? null,
        sourceLeagueSlug: raw.sourceLeagueSlug ?? null,
        sourceLeagueLabel: raw.sourceLeagueLabel ?? null,
        sourceCountryLabel: raw.sourceCountryLabel ?? null,
        internalSportSlug: raw.internalSportSlug ?? null,
        providerName: raw.providerName ?? null,
        providerSportSlug: raw.providerSportSlug ?? null,
      };
      if (!existing) {
        await this.prisma.crawlerTeamMapping.create({
          data: {
            ...payload,
            status: 'pending',
            matchCount: Math.max(0, raw.matchCount ?? 0),
          },
        });
        newlyAdded++;
      } else {
        await this.prisma.crawlerTeamMapping.update({
          where: { id: existing.id },
          data: {
            sourceTeamSlug: raw.sourceTeamSlug ?? existing.sourceTeamSlug,
            sourceTeamHref: raw.sourceTeamHref ?? existing.sourceTeamHref,
            sourceTeamLogo: raw.sourceTeamLogo ?? existing.sourceTeamLogo,
            sourceLeagueSlug: raw.sourceLeagueSlug ?? existing.sourceLeagueSlug,
            sourceLeagueLabel:
              raw.sourceLeagueLabel ?? existing.sourceLeagueLabel,
            sourceCountryLabel:
              raw.sourceCountryLabel ?? existing.sourceCountryLabel,
            internalSportSlug:
              raw.internalSportSlug ?? existing.internalSportSlug,
            providerName: raw.providerName ?? existing.providerName,
            providerSportSlug:
              raw.providerSportSlug ?? existing.providerSportSlug,
            matchCount: Math.max(existing.matchCount, raw.matchCount ?? 0),
            lastSeenAt: new Date(),
          },
        });
        updated++;
      }
    }
    const upserted = newlyAdded + updated;
    if (upserted > 0) {
      this.logger.log(
        `[crawler-mappings] team ingest site=${site} received=${list.length} upserted=${upserted} (new=${newlyAdded} updated=${updated} invalid=${invalid})`,
      );
    }
    return {
      received: list.length,
      upserted,
      newlyAdded,
      updated,
      invalid,
    };
  }

  async listTeams(params: {
    sourceSite?: string;
    status?: 'pending' | 'confirmed' | 'ignored' | 'all';
    sportSlug?: string;
    leagueSlug?: string;
    q?: string;
    take?: number;
    skip?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params.sourceSite) where.sourceSite = params.sourceSite;
    if (params.status && params.status !== 'all') where.status = params.status;
    if (params.sportSlug) where.sourceSportSlug = params.sportSlug;
    if (params.leagueSlug) where.sourceLeagueSlug = params.leagueSlug;
    const q = (params.q || '').trim();
    if (q) {
      where.OR = [
        { sourceTeamName: { contains: q, mode: 'insensitive' } },
        { sourceTeamSlug: { contains: q, mode: 'insensitive' } },
        { providerTeamName: { contains: q, mode: 'insensitive' } },
        { providerTeamExternalId: { contains: q, mode: 'insensitive' } },
      ];
    }
    const take = Math.max(1, Math.min(500, params.take ?? 100));
    const skip = Math.max(0, params.skip ?? 0);
    const [items, total] = await Promise.all([
      this.prisma.crawlerTeamMapping.findMany({
        where,
        orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
        take,
        skip,
      }),
      this.prisma.crawlerTeamMapping.count({ where }),
    ]);
    return { items, total, take, skip };
  }

  async teamStats(sourceSite?: string) {
    const base = sourceSite ? { sourceSite } : {};
    const [pending, confirmed, ignored, total] = await Promise.all([
      this.prisma.crawlerTeamMapping.count({ where: { ...base, status: 'pending' } }),
      this.prisma.crawlerTeamMapping.count({ where: { ...base, status: 'confirmed' } }),
      this.prisma.crawlerTeamMapping.count({ where: { ...base, status: 'ignored' } }),
      this.prisma.crawlerTeamMapping.count({ where: base }),
    ]);
    return { total, pending, confirmed, ignored };
  }

  async confirmTeam(
    id: string,
    payload: {
      providerName?: string | null;
      providerSportSlug?: string | null;
      providerTeamExternalId: string;
      providerTeamName?: string | null;
      note?: string | null;
      confirmedBy?: string | null;
      /** true 이면 OddsApiTeamAlias.koreanName 을 sourceTeamName 으로 역학습 */
      learnKoreanName?: boolean;
      /** true 이면 OddsApiTeamAlias.logoUrl 을 sourceTeamLogo 로 역학습 */
      learnLogo?: boolean;
    },
  ) {
    const existing = await this.prisma.crawlerTeamMapping.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('mapping not found');
    const providerTeamExternalId = (payload.providerTeamExternalId || '').trim();
    if (!providerTeamExternalId) {
      throw new NotFoundException('providerTeamExternalId is required');
    }
    const providerSportSlug =
      payload.providerSportSlug ??
      existing.providerSportSlug ??
      existing.internalSportSlug ??
      null;

    const updated = await this.prisma.crawlerTeamMapping.update({
      where: { id },
      data: {
        status: 'confirmed',
        providerName:
          payload.providerName ?? existing.providerName ?? 'odds-api.io',
        providerSportSlug,
        providerTeamExternalId,
        providerTeamName:
          payload.providerTeamName ?? existing.providerTeamName,
        note: payload.note ?? existing.note,
        confirmedAt: new Date(),
        confirmedBy: payload.confirmedBy ?? null,
      },
    });

    // 역학습: Livesport 쪽에 한글 팀명 / 로고 URL 이 있으면 OddsApiTeamAlias 를 보강
    const wantsLearnName = payload.learnKoreanName !== false;
    const wantsLearnLogo = payload.learnLogo !== false;
    if ((wantsLearnName || wantsLearnLogo) && providerSportSlug) {
      const alias = await this.prisma.oddsApiTeamAlias.findUnique({
        where: {
          sport_externalId: {
            sport: providerSportSlug,
            externalId: providerTeamExternalId,
          },
        },
      });
      if (alias) {
        const patch: { koreanName?: string; logoUrl?: string } = {};
        if (
          wantsLearnName &&
          !alias.koreanName &&
          /[\uAC00-\uD7AF]/.test(existing.sourceTeamName)
        ) {
          patch.koreanName = existing.sourceTeamName;
        }
        if (
          wantsLearnLogo &&
          !alias.logoUrl &&
          existing.sourceTeamLogo &&
          /^https?:\/\//i.test(existing.sourceTeamLogo)
        ) {
          patch.logoUrl = existing.sourceTeamLogo;
        }
        if (Object.keys(patch).length > 0) {
          await this.prisma.oddsApiTeamAlias.update({
            where: { id: alias.id },
            data: patch,
          });
          this.logger.log(
            `[crawler-mappings] learn team=${providerTeamExternalId} sport=${providerSportSlug} ` +
              `kr=${patch.koreanName ? `"${patch.koreanName}"` : '-'} logo=${patch.logoUrl ? 'yes' : '-'}`,
          );
        }
      }
    }
    return updated;
  }

  async ignoreTeam(id: string, note?: string | null) {
    const existing = await this.prisma.crawlerTeamMapping.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('mapping not found');
    return this.prisma.crawlerTeamMapping.update({
      where: { id },
      data: { status: 'ignored', note: note ?? existing.note },
    });
  }

  async reopenTeam(id: string) {
    const existing = await this.prisma.crawlerTeamMapping.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('mapping not found');
    return this.prisma.crawlerTeamMapping.update({
      where: { id },
      data: { status: 'pending', confirmedAt: null, confirmedBy: null },
    });
  }

  /**
   * 특정 팀 매핑에 대해 odds-api.io 쪽 team alias 후보를 찾아준다.
   * - 같은 sport 범위에서 이름 contains 매칭 + 한글/영문 토큰 우선
   * - q 로 키워드 override 가능
   */
  async suggestProviderTeams(id: string, limit = 30, q?: string) {
    const row = await this.prisma.crawlerTeamMapping.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('mapping not found');
    const sport = row.internalSportSlug || row.providerSportSlug || '';
    if (!sport) {
      return { candidates: [], mapping: row };
    }
    const keyword = (q || '').trim();
    const take = Math.max(1, Math.min(200, limit));
    // 1) 키워드가 있거나 sourceTeamName 의 일부 토큰으로 우선 필터
    const needle = keyword || row.sourceTeamName;
    // ASCII 토큰 (contains, case-insensitive)
    const asciiTokens = (needle.match(/[A-Za-z0-9]{3,}/g) || [])
      .map((t) => t.toLowerCase())
      .slice(0, 3);
    // 한글 토큰 — aiscore 는 한국어 팀명이 많아서 koreanName contains 매칭을 별도 시도.
    const hangulTokens = (needle.match(/[\uAC00-\uD7AF]{2,}/g) || []).slice(0, 3);
    const where: Record<string, unknown> = { sport };
    const orClauses: Record<string, unknown>[] = [];
    for (const t of asciiTokens) {
      orClauses.push({ originalName: { contains: t, mode: 'insensitive' } });
      orClauses.push({ koreanName: { contains: t, mode: 'insensitive' } });
    }
    for (const t of hangulTokens) {
      orClauses.push({ koreanName: { contains: t } });
      orClauses.push({ originalName: { contains: t } });
    }
    if (
      orClauses.length === 0 &&
      keyword &&
      asciiTokens.length === 0 &&
      hangulTokens.length === 0
    ) {
      orClauses.push({ originalName: { contains: keyword, mode: 'insensitive' } });
      orClauses.push({ koreanName: { contains: keyword, mode: 'insensitive' } });
    }
    if (orClauses.length > 0) where.OR = orClauses;
    const candidates = await this.prisma.oddsApiTeamAlias.findMany({
      where,
      orderBy: [{ lastSeenAt: 'desc' }],
      take,
      select: {
        externalId: true,
        originalName: true,
        koreanName: true,
        country: true,
        logoUrl: true,
      },
    });
    return { candidates, mapping: row };
  }
}
