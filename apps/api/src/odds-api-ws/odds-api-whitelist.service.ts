import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type WhitelistItemInput = {
  sport: string;
  externalEventId: string;
  expiresAt?: Date | string | null;
};

export type WhitelistFilterKey = { sport: string; externalEventId: string };

/**
 * 스코어 크롤러가 "솔루션에서 표시 가능한" 경기 목록을 주입하고,
 * odds 파이프라인이 그것만 추려 클라이언트로 내보내기 위한 게이트.
 *
 * 기본 동작(플랫폼 config.useDisplayWhitelist=false) 에서는 아무 영향 없음.
 * 활성 플랫폼은 whitelist 의 현재 유효 엔트리만 통과시킨다.
 */
@Injectable()
export class OddsApiWhitelistService {
  private readonly log = new Logger(OddsApiWhitelistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 크롤러가 한 번에 교체(replace) 모드로 밀어넣을 때 사용.
   * sport 내에서만 기존 엔트리 전체 삭제 후 새로 삽입.
   */
  async replaceForSport(
    sport: string,
    externalEventIds: string[],
    opts: { source?: string; ttlSeconds?: number | null } = {},
  ): Promise<{ sport: string; removed: number; inserted: number }> {
    const sp = sport.trim();
    if (!sp) {
      return { sport: sp, removed: 0, inserted: 0 };
    }
    const unique = Array.from(
      new Set(externalEventIds.map((x) => String(x).trim()).filter(Boolean)),
    );
    const expiresAt =
      opts.ttlSeconds && opts.ttlSeconds > 0
        ? new Date(Date.now() + opts.ttlSeconds * 1000)
        : null;
    const source = (opts.source || 'score-crawler').trim() || 'score-crawler';

    const removed = await this.prisma.oddsApiDisplayWhitelist.deleteMany({
      where: { sport: sp },
    });
    if (unique.length === 0) {
      return { sport: sp, removed: removed.count, inserted: 0 };
    }
    const inserted = await this.prisma.oddsApiDisplayWhitelist.createMany({
      data: unique.map((externalEventId) => ({
        sport: sp,
        externalEventId,
        source,
        expiresAt,
      })),
      skipDuplicates: true,
    });
    return { sport: sp, removed: removed.count, inserted: inserted.count };
  }

  async addMany(
    items: WhitelistItemInput[],
    opts: { source?: string } = {},
  ): Promise<{ inserted: number }> {
    const src = (opts.source || 'score-crawler').trim() || 'score-crawler';
    const rows = items
      .map((it) => {
        const sport = it.sport.trim();
        const externalEventId = String(it.externalEventId).trim();
        if (!sport || !externalEventId) return null;
        const expiresAt = it.expiresAt
          ? typeof it.expiresAt === 'string'
            ? new Date(it.expiresAt)
            : it.expiresAt
          : null;
        return { sport, externalEventId, source: src, expiresAt };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (rows.length === 0) return { inserted: 0 };
    const r = await this.prisma.oddsApiDisplayWhitelist.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return { inserted: r.count };
  }

  async removeOne(id: string): Promise<boolean> {
    try {
      await this.prisma.oddsApiDisplayWhitelist.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async clear(sport?: string): Promise<{ removed: number }> {
    const r = await this.prisma.oddsApiDisplayWhitelist.deleteMany({
      where: sport ? { sport } : {},
    });
    return { removed: r.count };
  }

  async purgeExpired(now = new Date()): Promise<{ removed: number }> {
    const r = await this.prisma.oddsApiDisplayWhitelist.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    if (r.count > 0) {
      this.log.log(`expired whitelist purge: removed=${r.count}`);
    }
    return { removed: r.count };
  }

  async list(opts: {
    sport?: string;
    take?: number;
  }): Promise<{
    total: number;
    rows: Array<{
      id: string;
      sport: string;
      externalEventId: string;
      source: string;
      addedAt: Date;
      expiresAt: Date | null;
    }>;
  }> {
    const size = Math.min(Math.max(opts.take ?? 200, 1), 2000);
    const where = opts.sport ? { sport: opts.sport } : {};
    const [total, rows] = await Promise.all([
      this.prisma.oddsApiDisplayWhitelist.count({ where }),
      this.prisma.oddsApiDisplayWhitelist.findMany({
        where,
        orderBy: [{ sport: 'asc' }, { addedAt: 'desc' }],
        take: size,
      }),
    ]);
    return { total, rows };
  }

  async stats(): Promise<{
    total: number;
    expired: number;
    bySport: Array<{ sport: string; count: number }>;
    latestAddedAt: Date | null;
  }> {
    const now = new Date();
    const [total, expired, groups, latest] = await Promise.all([
      this.prisma.oddsApiDisplayWhitelist.count(),
      this.prisma.oddsApiDisplayWhitelist.count({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.oddsApiDisplayWhitelist.groupBy({
        by: ['sport'],
        _count: { _all: true },
      }),
      this.prisma.oddsApiDisplayWhitelist.findFirst({
        orderBy: { addedAt: 'desc' },
        select: { addedAt: true },
      }),
    ]);
    return {
      total,
      expired,
      bySport: groups
        .map((g) => ({ sport: g.sport, count: g._count._all }))
        .sort((a, b) => b.count - a.count),
      latestAddedAt: latest?.addedAt ?? null,
    };
  }

  /**
   * 특정 sport 들의 현재 유효 whitelist 를 메모리 Set 으로 로드.
   * 반환값의 size===0 인 sport 는 "필터 미설정" 으로 해석해 snapshot 쪽에서 전량 통과시킨다
   * (크롤러가 아직 해당 종목 목록을 올리지 않은 경우 차단하지 않기 위함).
   */
  async loadFilterSet(sports: string[]): Promise<Map<string, Set<string>>> {
    const uniqSports = Array.from(
      new Set(sports.map((s) => (s || '').trim()).filter(Boolean)),
    );
    const out = new Map<string, Set<string>>();
    if (uniqSports.length === 0) return out;
    const now = new Date();
    const rows = await this.prisma.oddsApiDisplayWhitelist.findMany({
      where: {
        sport: { in: uniqSports },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { sport: true, externalEventId: true },
    });
    for (const r of rows) {
      let s = out.get(r.sport);
      if (!s) {
        s = new Set<string>();
        out.set(r.sport, s);
      }
      s.add(r.externalEventId);
    }
    return out;
  }
}
