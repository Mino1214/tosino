import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AggregatedMatch,
  OddsApiCatalogItem,
} from './odds-api-aggregator.service';

/**
 * odds-api.io 원본명 → 한글명/로고 매핑을 담당.
 *
 *  1) 수집 시점에 catalog items 에서 발견한 모든 (sport, externalId, 원본명) 와
 *     (sport, leagueSlug, 리그 원본명) 조합을 OddsApiTeamAlias / OddsApiLeagueAlias 에
 *     `createMany({ skipDuplicates: true })` 로 적재. 이미 존재하면 건드리지 않음.
 *
 *  2) 가공 결과(AggregatedMatch[]) 를 클라이언트로 내보내기 직전에 enrichMatches()
 *     로 한 번 훑어 nameKr / logoUrl 을 채운다.
 *
 *  3) 사용자는 hq 콘솔에서 koreanName/logoUrl 만 채우면 다음 집계부터 즉시 반영.
 */
@Injectable()
export class OddsApiAliasService {
  private readonly log = new Logger(OddsApiAliasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async absorbCatalogItems(items: OddsApiCatalogItem[]): Promise<{
    teamsDiscovered: number;
    leaguesDiscovered: number;
  }> {
    if (items.length === 0) {
      return { teamsDiscovered: 0, leaguesDiscovered: 0 };
    }

    const teamKey = (sport: string, externalId: string) =>
      `${sport}|${externalId}`;
    const leagueKey = (sport: string, slug: string) => `${sport}|${slug}`;

    const teamRows = new Map<
      string,
      { sport: string; externalId: string; originalName: string }
    >();
    const leagueRows = new Map<
      string,
      { sport: string; slug: string; originalName: string }
    >();

    for (const item of items) {
      const sport = item.sport;
      if (!sport || sport === 'unknown') continue;

      if (item.homeId != null && item.home) {
        const id = String(item.homeId);
        const k = teamKey(sport, id);
        if (!teamRows.has(k)) {
          teamRows.set(k, { sport, externalId: id, originalName: item.home });
        }
      }
      if (item.awayId != null && item.away) {
        const id = String(item.awayId);
        const k = teamKey(sport, id);
        if (!teamRows.has(k)) {
          teamRows.set(k, { sport, externalId: id, originalName: item.away });
        }
      }
      if (item.leagueSlug && item.league) {
        const k = leagueKey(sport, item.leagueSlug);
        if (!leagueRows.has(k)) {
          leagueRows.set(k, {
            sport,
            slug: item.leagueSlug,
            originalName: item.league,
          });
        }
      }
    }

    try {
      if (teamRows.size > 0) {
        await this.prisma.oddsApiTeamAlias.createMany({
          data: [...teamRows.values()],
          skipDuplicates: true,
        });
      }
    } catch (e) {
      this.log.warn(
        `team alias createMany 실패: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    try {
      if (leagueRows.size > 0) {
        await this.prisma.oddsApiLeagueAlias.createMany({
          data: [...leagueRows.values()],
          skipDuplicates: true,
        });
      }
    } catch (e) {
      this.log.warn(
        `league alias createMany 실패: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    return {
      teamsDiscovered: teamRows.size,
      leaguesDiscovered: leagueRows.size,
    };
  }

  /**
   * 가공된 매치 목록에 (sport, externalId) 기반 팀 alias, (sport, leagueSlug) 기반 리그 alias
   * 를 주입. 한 번의 쿼리로 필요한 alias 만 가져와 메모리 join.
   * isHidden=true 리그에 속한 매치는 `null` 을 리턴해 호출측이 drop 할 수 있게 함.
   */
  async enrichMatches(matches: AggregatedMatch[]): Promise<AggregatedMatch[]> {
    if (matches.length === 0) return matches;

    const teamKeys: Array<{ sport: string; externalId: string }> = [];
    const leagueKeys: Array<{ sport: string; slug: string }> = [];

    const pushTeam = (sport: string, id: number | null | undefined) => {
      if (id == null) return;
      teamKeys.push({ sport, externalId: String(id) });
    };

    for (const m of matches) {
      pushTeam(m.sport, m.home.externalId);
      pushTeam(m.sport, m.away.externalId);
      if (m.league.slug) leagueKeys.push({ sport: m.sport, slug: m.league.slug });
    }

    // dedupe
    const teamSet = new Set(teamKeys.map((k) => `${k.sport}|${k.externalId}`));
    const leagueSet = new Set(leagueKeys.map((k) => `${k.sport}|${k.slug}`));
    const teamPairs = [...teamSet].map((s) => {
      const [sport, externalId] = s.split('|');
      return { sport, externalId };
    });
    const leaguePairs = [...leagueSet].map((s) => {
      const [sport, slug] = s.split('|');
      return { sport, slug };
    });

    const [teamRows, leagueRows] = await Promise.all([
      teamPairs.length === 0
        ? Promise.resolve([])
        : this.prisma.oddsApiTeamAlias.findMany({
            where: { OR: teamPairs },
            select: {
              sport: true,
              externalId: true,
              koreanName: true,
              logoUrl: true,
            },
          }),
      leaguePairs.length === 0
        ? Promise.resolve([])
        : this.prisma.oddsApiLeagueAlias.findMany({
            where: { OR: leaguePairs },
            select: {
              sport: true,
              slug: true,
              koreanName: true,
              logoUrl: true,
              isHidden: true,
              displayPriority: true,
            },
          }),
    ]);

    const teamMap = new Map<
      string,
      { koreanName: string | null; logoUrl: string | null }
    >();
    for (const r of teamRows) {
      teamMap.set(`${r.sport}|${r.externalId}`, {
        koreanName: r.koreanName,
        logoUrl: r.logoUrl,
      });
    }
    const leagueMap = new Map<
      string,
      {
        koreanName: string | null;
        logoUrl: string | null;
        isHidden: boolean;
        displayPriority: number;
      }
    >();
    for (const r of leagueRows) {
      leagueMap.set(`${r.sport}|${r.slug}`, {
        koreanName: r.koreanName,
        logoUrl: r.logoUrl,
        isHidden: r.isHidden,
        displayPriority: r.displayPriority,
      });
    }

    const out: AggregatedMatch[] = [];
    for (const m of matches) {
      const leagueHit = m.league.slug
        ? leagueMap.get(`${m.sport}|${m.league.slug}`)
        : null;
      if (leagueHit?.isHidden) continue;

      const homeHit =
        m.home.externalId != null
          ? teamMap.get(`${m.sport}|${String(m.home.externalId)}`)
          : null;
      const awayHit =
        m.away.externalId != null
          ? teamMap.get(`${m.sport}|${String(m.away.externalId)}`)
          : null;

      out.push({
        ...m,
        league: {
          ...m.league,
          nameKr: leagueHit?.koreanName ?? m.league.nameKr,
          logoUrl: leagueHit?.logoUrl ?? m.league.logoUrl,
        },
        home: {
          ...m.home,
          nameKr: homeHit?.koreanName ?? m.home.nameKr,
          logoUrl: homeHit?.logoUrl ?? m.home.logoUrl,
        },
        away: {
          ...m.away,
          nameKr: awayHit?.koreanName ?? m.away.nameKr,
          logoUrl: awayHit?.logoUrl ?? m.away.logoUrl,
        },
      });
    }
    return out;
  }
}
