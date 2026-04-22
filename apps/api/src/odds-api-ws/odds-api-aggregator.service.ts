import { Injectable, Logger } from '@nestjs/common';
import { OddsApiWsService } from './odds-api-ws.service';
import { koreanLeague } from './i18n/league-names-ko';
import { koreanTeamName } from './i18n/team-names-ko';

/**
 * 솔루션 페이지에 그대로 내려주기 위한 집계 레이어.
 *
 * 책임:
 *  1) WS raw event(=북메이커 행 단위) 를 eventId 기준으로 한 매치로 묶는다.
 *  2) 인게임(라이브) / 프리매치 / 종료 / unknown 으로 분류한다.
 *  3) 시장(머니라인 / 핸디캡 / 오버언더) 별로 "북메이커 중 가장 좋은(=높은) 배당" 을 뽑은 뒤,
 *     실제 스포츠북에서 통상 사용하는 마진(9.95~10.1%) 으로 재조정한다.
 *  4) Phase 2 에서 enrichment(한글 리그/팀명, 로고) 를 끼워 넣을 수 있도록 hook 을 비워둔다.
 *
 * 본 서비스는 in-memory aggregation 만 수행하며 DB 와 무관.
 */
@Injectable()
export class OddsApiAggregatorService {
  private readonly log = new Logger(OddsApiAggregatorService.name);

  /**
   * 마진 재조정 목표 밴드.
   * 사용자가 명시: "9.95% ~ 10.1%"  →  overround 기준 1.0995 ~ 1.101
   * 매치+시장 단위로 살짝씩 흔들어 자연스럽게 보이게 한다.
   */
  private readonly MARGIN_MIN = 0.0995;
  private readonly MARGIN_MAX = 0.101;

  constructor(private readonly ws: OddsApiWsService) {}

  /**
   * 가공된 매치 목록 반환.
   * @param status 'live' | 'prematch' | 'all' (기본 'all')
   * @param sport  종목 슬러그 (없으면 전부)
   * @param limit  매치 수 상한 (1~500, 기본 200)
   */
  listMatches(
    opts: {
      status?: MatchStatus | 'all';
      sport?: string;
      sports?: string[];
      bookmakers?: string[];
      limit?: number;
    } = {},
  ): MatchesResponse {
    const normalized = normalizeListOptions(opts);

    // 종목 필터는 raw 단계에서 거름. limit 은 절대 raw 에 그대로 주면 안 됨
    // (raw 는 북메이커 행 단위라 매치 1개당 N개 항목이 들어옴 → 매치 단위 limit 과 다름).
    const raw = this.ws.listEvents({ limit: 500 });

    const map = new Map<string, MatchAccumulator>();
    for (const ev of raw.events) {
      if (
        normalized.wantSports.length > 0 &&
        !normalized.wantSports.includes(ev.sport)
      )
        continue;
      if (
        normalized.bookmakerSet &&
        !normalized.bookmakerSet.has(ev.bookie)
      )
        continue;
      const id = ev.eventId;
      let m = map.get(id);
      if (!m) {
        m = this.createAccumulator({
          eventId: id,
          sport: ev.sport,
          home: ev.home,
          away: ev.away,
          league: ev.league,
          startTime: ev.date,
          eventStatus: ev.eventStatus,
          scores: ev.scores,
          url: ev.url,
        });
        map.set(id, m);
      } else {
        this.mergeAccumulatorMeta(m, {
          sport: ev.sport,
          home: ev.home,
          away: ev.away,
          league: ev.league,
          startTime: ev.date,
          eventStatus: ev.eventStatus,
          scores: ev.scores,
          url: ev.url,
        });
      }
      // WS path 에는 아직 homeId/awayId/leagueSlug 전달 경로 없음 (Phase 2) — null 유지
      m.bookies.add(ev.bookie);
      const t = Date.parse(ev.updatedAt);
      if (Number.isFinite(t) && t > m.lastUpdatedMs) m.lastUpdatedMs = t;
      this.absorbMarkets(m, ev.markets);
    }

    return this.finalizeMatches(map, normalized);
  }

  /**
   * REST `events + odds/multi` 결과처럼 "이벤트 1행 + bookmakers 묶음" 형태의 카탈로그를
   * 기존 매치 응답 포맷으로 변환한다.
   *
   * @param opts.allowEmptyBookies true 면 multi-odds 가 안 도는 finished 매치도
   *   (북메이커 0개) 결과 카드로 노출. 기본 false (라이브/프리매치는 배당 없는 카드 차단).
   */
  listMatchesFromCatalog(
    catalog: OddsApiCatalogItem[],
    opts: {
      status?: MatchStatus | 'all';
      sport?: string;
      sports?: string[];
      bookmakers?: string[];
      limit?: number;
      allowEmptyBookies?: boolean;
    } = {},
  ): MatchesResponse {
    const normalized = normalizeListOptions(opts);
    const allowEmptyBookies = !!opts.allowEmptyBookies;
    const map = new Map<string, MatchAccumulator>();

    for (const item of catalog) {
      if (!item?.id) continue;
      if (
        normalized.wantSports.length > 0 &&
        !normalized.wantSports.includes(item.sport)
      )
        continue;

      let acc = map.get(item.id);
      if (!acc) {
        acc = this.createAccumulator({
          eventId: item.id,
          sport: item.sport,
          home: item.home,
          away: item.away,
          homeId: item.homeId ?? null,
          awayId: item.awayId ?? null,
          league: item.league,
          leagueSlug: item.leagueSlug ?? null,
          startTime: item.date,
          eventStatus: item.status,
          scores: item.scores,
          url: item.url ?? undefined,
        });
        map.set(item.id, acc);
      } else {
        this.mergeAccumulatorMeta(acc, {
          sport: item.sport,
          home: item.home,
          away: item.away,
          homeId: item.homeId ?? null,
          awayId: item.awayId ?? null,
          league: item.league,
          leagueSlug: item.leagueSlug ?? null,
          startTime: item.date,
          eventStatus: item.status,
          scores: item.scores,
          url: item.url ?? undefined,
        });
      }

      const fetchedAtMs = item.fetchedAt ? Date.parse(item.fetchedAt) : NaN;
      if (Number.isFinite(fetchedAtMs) && fetchedAtMs > acc.lastUpdatedMs) {
        acc.lastUpdatedMs = fetchedAtMs;
      }

      for (const [bookie, raw] of Object.entries(item.bookmakers ?? {})) {
        if (
          normalized.bookmakerSet &&
          !normalized.bookmakerSet.has(bookie)
        ) {
          continue;
        }
        acc.bookies.add(bookie);
        // odds-api.io /v3/odds[/multi] 응답에서 bookmakers["Bet365"] 는 markets 배열 자체.
        // 다른 경로(WS enrichment 등)는 { markets: [...] } 형태로 들어올 수 있어 둘 다 허용.
        const markets = Array.isArray(raw)
          ? raw
          : raw && typeof raw === 'object'
            ? (raw as { markets?: unknown }).markets
            : undefined;
        this.absorbMarkets(acc, markets);
      }
    }

    return this.finalizeMatches(map, normalized, { allowEmptyBookies });
  }

  /* ─────────────────────────── 내부 ─────────────────────────── */

  private createAccumulator(input: {
    eventId: string;
    sport: string;
    home: string | null;
    away: string | null;
    homeId?: number | null;
    awayId?: number | null;
    league: string | null;
    leagueSlug?: string | null;
    startTime: string | null;
    eventStatus: string | null;
    scores: AggregatedMatch['scores'];
    url?: string;
  }): MatchAccumulator {
    return {
      eventId: input.eventId,
      sport: input.sport,
      home: input.home,
      away: input.away,
      homeId: input.homeId ?? null,
      awayId: input.awayId ?? null,
      league: input.league,
      leagueSlug: input.leagueSlug ?? null,
      startTime: input.startTime,
      eventStatus: input.eventStatus,
      scores: input.scores,
      url: input.url,
      bookies: new Set<string>(),
      lastUpdatedMs: 0,
      mlPrices: { home: [], draw: [], away: [] },
      handicapByLine: new Map<number, { home: number[]; away: number[] }>(),
      totalsByLine: new Map<number, { over: number[]; under: number[] }>(),
      extrasByMarket: new Map<string, ExtraAccum>(),
    };
  }

  private mergeAccumulatorMeta(
    acc: MatchAccumulator,
    input: {
      sport: string;
      home: string | null;
      away: string | null;
      homeId?: number | null;
      awayId?: number | null;
      league: string | null;
      leagueSlug?: string | null;
      startTime: string | null;
      eventStatus: string | null;
      scores: AggregatedMatch['scores'];
      url?: string;
    },
  ): void {
    acc.home ??= input.home;
    acc.away ??= input.away;
    acc.homeId ??= input.homeId ?? null;
    acc.awayId ??= input.awayId ?? null;
    acc.league ??= input.league;
    acc.leagueSlug ??= input.leagueSlug ?? null;
    acc.startTime ??= input.startTime;
    acc.eventStatus ??= input.eventStatus;
    acc.scores ??= input.scores;
    if (!acc.url && input.url) acc.url = input.url;
    if (acc.sport === 'unknown' && input.sport !== 'unknown') {
      acc.sport = input.sport;
    }
    if (!acc.scores && input.scores) acc.scores = input.scores;
  }

  private finalizeMatches(
    map: Map<string, MatchAccumulator>,
    normalized: NormalizedListOptions,
    opts: { allowEmptyBookies?: boolean } = {},
  ): MatchesResponse {
    const all: AggregatedMatch[] = [];
    for (const acc of map.values()) {
      if (acc.bookies.size === 0 && !opts.allowEmptyBookies) continue;
      const status = classifyStatus(acc);
      if (normalized.wantStatus !== 'all' && status !== normalized.wantStatus) {
        continue;
      }
      all.push(this.finalize(acc, status));
    }

    // 정렬: 라이브가 먼저, 그 다음 시작시간 가까운 순, 그 다음 update 최근 순
    all.sort((a, b) => {
      const aw = a.status === 'live' ? 0 : 1;
      const bw = b.status === 'live' ? 0 : 1;
      if (aw !== bw) return aw - bw;
      const at = a.startTime ? Date.parse(a.startTime) : Number.MAX_SAFE_INTEGER;
      const bt = b.startTime ? Date.parse(b.startTime) : Number.MAX_SAFE_INTEGER;
      if (at !== bt) return at - bt;
      return b.lastUpdatedMs - a.lastUpdatedMs;
    });

    // limit 는 종목이 여러 개일 때 "종목별 상한" 으로 해석한다.
    // 예전엔 전역 slice 였는데, 그러면 kickoff 이 가까운 테니스/탁구 류가 모든 슬롯을
    // 먹어버려 저녁 농구/축구 등이 응답에서 빠지는 starvation 이 발생했다.
    // 단일 종목 요청이거나 wantSports 가 1개 이하면 기존처럼 전역 cap 과 동일하게 동작.
    const sliced =
      normalized.wantSports.length > 1
        ? takeTopPerSport(all, normalized.limit)
        : all.slice(0, normalized.limit);

    return {
      status: normalized.wantStatus,
      sport: normalized.wantSport ?? null,
      total: all.length,
      matches: sliced,
    };
  }

  /**
   * 한 북메이커가 보낸 markets 배열을 누적기에 흡수.
   * markets shape (odds-api.io):
   *   [{ name: 'ML' | 'Spread' | 'Totals', odds: [{home, draw, away, hdp, over, under, ...}, ...] }, ...]
   * 가격은 문자열일 수 있어 parseFloat 로 안전 변환.
   */
  private absorbMarkets(acc: MatchAccumulator, markets: unknown): void {
    if (!Array.isArray(markets)) return;
    for (const market of markets) {
      if (!market || typeof market !== 'object') continue;
      const rawName = String((market as { name?: unknown }).name ?? '').trim();
      if (!rawName) continue;
      const lower = rawName.toLowerCase();
      const odds = (market as { odds?: unknown }).odds;
      if (!Array.isArray(odds) || odds.length === 0) continue;

      if (lower === 'ml' || lower === 'h2h' || lower === '1x2') {
        for (const row of odds) {
          if (!row || typeof row !== 'object') continue;
          const r = row as Record<string, unknown>;
          pushNum(acc.mlPrices.home, r.home);
          pushNum(acc.mlPrices.draw, r.draw);
          pushNum(acc.mlPrices.away, r.away);
        }
        continue;
      }

      // 아시안 핸디캡: odds-api.io 는 `hdp` 와 함께 (home/away) 혹은 (over/under) 키를 사용.
      // 둘 다 호환되게 처리한다 (실제 Bet365 응답은 over=홈측, under=원정측).
      if (lower === 'spread' || lower === 'asian handicap') {
        for (const row of odds) {
          if (!row || typeof row !== 'object') continue;
          const r = row as Record<string, unknown>;
          const line = numFrom(r.hdp);
          if (line === null) continue;
          let bag = acc.handicapByLine.get(line);
          if (!bag) {
            bag = { home: [], away: [] };
            acc.handicapByLine.set(line, bag);
          }
          const homeVal = r.home ?? r.over; // 홈측 또는 over 키
          const awayVal = r.away ?? r.under; // 원정측 또는 under 키
          pushNum(bag.home, homeVal);
          pushNum(bag.away, awayVal);
        }
        continue;
      }

      if (lower === 'totals' || lower === 'total') {
        for (const row of odds) {
          if (!row || typeof row !== 'object') continue;
          const r = row as Record<string, unknown>;
          const line = numFrom(r.hdp ?? r.line ?? r.points);
          if (line === null) continue;
          let bag = acc.totalsByLine.get(line);
          if (!bag) {
            bag = { over: [], under: [] };
            acc.totalsByLine.set(line, bag);
          }
          pushNum(bag.over, r.over);
          pushNum(bag.under, r.under);
        }
        continue;
      }

      // ────────── 그 외 (Draw No Bet / Double Chance / BTTS / European Handicap
      // / Half Time Full Time / 1st Half ML / Team Totals / 기타 모든 스페셜) ──────────
      // 공통 형태: odds[] 안의 각 row 가 한 "라인" 을 의미.
      //  - 라인 식별자는 hdp 가 있으면 hdp, 없으면 label, 없으면 인덱스(null).
      //  - 가격 키(payload): row 객체에서 updatedAt/hdp/line/points/label/*Lay*/*depth*/max/min
      //    같은 메타키를 제외한 전부를 outcome 으로 간주.
      let extra = acc.extrasByMarket.get(rawName);
      if (!extra) {
        extra = { name: rawName, lineGroups: new Map() };
        acc.extrasByMarket.set(rawName, extra);
      }
      for (const row of odds) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const hdp = numFrom(r.hdp ?? r.line ?? r.points);
        // HTFT 처럼 row 1개 == outcome 1개 인 경우: `label`+`odds` 패턴
        if (
          typeof r.label === 'string' &&
          numFrom(r.odds) !== null &&
          Object.keys(r).filter(
            (k) => !isExtraMetaKey(k) && k !== 'label' && k !== 'odds',
          ).length === 0
        ) {
          const line = this.getOrCreateExtraLine(extra, null, r.label);
          pushNum(this.getOrCreateOutcome(line, r.label), r.odds);
          continue;
        }
        const line = this.getOrCreateExtraLine(extra, hdp, null);
        for (const [key, val] of Object.entries(r)) {
          if (isExtraMetaKey(key)) continue;
          const price = numFrom(val);
          if (price === null) continue;
          pushNum(this.getOrCreateOutcome(line, key), price);
        }
      }
    }
  }

  private getOrCreateExtraLine(
    extra: ExtraAccum,
    hdp: number | null,
    label: string | null,
  ): ExtraLineAccum {
    const key =
      hdp !== null
        ? `hdp:${hdp}`
        : label
          ? `label:${label}`
          : 'line:__';
    let line = extra.lineGroups.get(key);
    if (!line) {
      line = { hdp, label, outcomes: new Map() };
      extra.lineGroups.set(key, line);
    }
    return line;
  }

  private getOrCreateOutcome(
    line: ExtraLineAccum,
    outcomeKey: string,
  ): number[] {
    let arr = line.outcomes.get(outcomeKey);
    if (!arr) {
      arr = [];
      line.outcomes.set(outcomeKey, arr);
    }
    return arr;
  }

  /**
   * 누적기를 최종 매치 객체로 변환.
   * - 머니라인: 3-way(축구류) 면 home/draw/away 모두, 2-way 면 draw 생략.
   * - 핸디캡/오버언더: 가장 많이 collect 된 라인 (modal line) 1개만 채택 (스포츠북 표준 표기).
   * - 모든 시장: 각 outcome 의 best price (= 가장 높은 배당) 를 뽑은 뒤 마진 9.95~10.1% 로 재조정.
   */
  private finalize(acc: MatchAccumulator, status: MatchStatus): AggregatedMatch {
    const ml = this.buildMoneyline(acc);
    const handicapLines = this.buildHandicapLines(acc);
    const totalsLines = this.buildTotalsLines(acc);
    const handicap = handicapLines.find((l) => l.primary) ?? handicapLines[0] ?? null;
    const totals = totalsLines.find((l) => l.primary) ?? totalsLines[0] ?? null;

    const leagueI18n = koreanLeague(acc.league);
    const { kickoffUtc, kickoffKst } = splitKickoff(acc.startTime);
    return {
      matchId: acc.eventId,
      sport: acc.sport,
      status,
      // 하위호환: startTime (= kickoffUtc) 유지
      startTime: acc.startTime,
      kickoffUtc,
      kickoffKst,
      league: {
        name: acc.league,
        nameKr: leagueI18n.nameKr,
        logoUrl: leagueI18n.logoUrl,
        slug: acc.leagueSlug ?? null,
      },
      home: {
        name: acc.home,
        nameKr: koreanTeamName(acc.home),
        logoUrl: null,
        externalId: acc.homeId ?? null,
      },
      away: {
        name: acc.away,
        nameKr: koreanTeamName(acc.away),
        logoUrl: null,
        externalId: acc.awayId ?? null,
      },
      scores: acc.scores ?? null,
      markets: {
        ...(ml ? { moneyline: ml } : {}),
        // 기존 솔루션 페이지 호환: 대표 라인은 primary=true 1개를 그대로 노출
        ...(handicap ? { handicap: stripPrimary(handicap) } : {}),
        ...(totals ? { totals: stripPrimary(totals) } : {}),
        // 모든 라인 (펼쳤을 때): 라인값 오름차순
        ...(handicapLines.length > 0 ? { handicapLines } : {}),
        ...(totalsLines.length > 0 ? { totalsLines } : {}),
        // 스페셜 마켓 전체 (펼쳤을 때)
        ...(acc.extrasByMarket.size > 0
          ? { extras: this.buildExtras(acc) }
          : {}),
      },
      bookies: [...acc.bookies],
      bookieCount: acc.bookies.size,
      url: acc.url,
      lastUpdatedMs: acc.lastUpdatedMs,
    };
  }

  private buildMoneyline(acc: MatchAccumulator): MoneylineMarket | null {
    const home = bestOf(acc.mlPrices.home);
    const draw = bestOf(acc.mlPrices.draw);
    const away = bestOf(acc.mlPrices.away);
    if (home === null && away === null) return null;
    // 2-way (테니스/야구/농구 등) 인지 3-way (축구) 인지: draw 가 한 번이라도 들어왔으면 3-way 로 본다
    const is3way = draw !== null;

    const targetMargin = pickMargin(this.MARGIN_MIN, this.MARGIN_MAX, acc.eventId, 'ml');
    if (is3way) {
      const adjusted = renormalizeOverround(
        [home ?? 0, draw ?? 0, away ?? 0].filter((x) => x > 0),
        targetMargin,
      );
      // 위치 보존하며 다시 분배
      const [aH, aD, aA] = redistribute(
        [home, draw, away],
        adjusted,
      );
      if (aH === null || aA === null) return null;
      return {
        home: aH,
        draw: aD ?? undefined,
        away: aA,
        margin: round4(targetMargin),
      };
    }
    if (home === null || away === null) return null;
    const adjusted = renormalizeOverround([home, away], targetMargin);
    return {
      home: round3(adjusted[0]),
      away: round3(adjusted[1]),
      margin: round4(targetMargin),
    };
  }

  /**
   * 핸디캡은 여러 라인이 함께 들어옴 (예: -1.5 / -0.5 / +0.5).
   * 모든 라인을 수집해서 오름차순으로 리턴하고, "모달 라인 (가장 많은 북메이커가 다루는 라인)"
   * 에 primary=true 마크를 단다. UI 는 primary 만 펼쳐 보이고, 클릭 시 나머지 라인도 노출.
   */
  private buildHandicapLines(acc: MatchAccumulator): HandicapLine[] {
    if (acc.handicapByLine.size === 0) return [];
    const primary = pickModalLine(acc.handicapByLine);
    const out: HandicapLine[] = [];
    for (const [line, bag] of acc.handicapByLine) {
      const home = bestOf(bag.home);
      const away = bestOf(bag.away);
      if (home === null || away === null) continue;
      const targetMargin = pickMargin(
        this.MARGIN_MIN,
        this.MARGIN_MAX,
        acc.eventId,
        `hdp:${line}`,
      );
      const adjusted = renormalizeOverround([home, away], targetMargin);
      out.push({
        line,
        home: round3(adjusted[0]),
        away: round3(adjusted[1]),
        margin: round4(targetMargin),
        primary: line === primary,
      });
    }
    out.sort((a, b) => a.line - b.line);
    return out;
  }

  private buildTotalsLines(acc: MatchAccumulator): TotalsLine[] {
    if (acc.totalsByLine.size === 0) return [];
    const primary = pickModalLine(acc.totalsByLine);
    const out: TotalsLine[] = [];
    for (const [line, bag] of acc.totalsByLine) {
      const over = bestOf(bag.over);
      const under = bestOf(bag.under);
      if (over === null || under === null) continue;
      const targetMargin = pickMargin(
        this.MARGIN_MIN,
        this.MARGIN_MAX,
        acc.eventId,
        `tot:${line}`,
      );
      const adjusted = renormalizeOverround([over, under], targetMargin);
      out.push({
        line,
        over: round3(adjusted[0]),
        under: round3(adjusted[1]),
        margin: round4(targetMargin),
        primary: line === primary,
      });
    }
    out.sort((a, b) => a.line - b.line);
    return out;
  }

  /**
   * 스페셜 마켓을 outcome 별 best price 로 flatten 하여 반환.
   * - 마진 재가공은 하지 않는다 (다출력/비대칭 시장이라 규칙이 다양함).
   * - 라인이 여러 개인 경우 (European Handicap 등) hdp 오름차순.
   */
  private buildExtras(acc: MatchAccumulator): Record<string, ExtraMarket> {
    const out: Record<string, ExtraMarket> = {};
    for (const [name, extra] of acc.extrasByMarket.entries()) {
      const lines: ExtraLine[] = [];
      for (const group of extra.lineGroups.values()) {
        const outcomes: ExtraOutcome[] = [];
        for (const [key, prices] of group.outcomes.entries()) {
          const best = bestOf(prices);
          if (best === null) continue;
          const oc: ExtraOutcome = { key, price: round3(best) };
          if (group.label !== null) oc.label = group.label;
          outcomes.push(oc);
        }
        if (outcomes.length === 0) continue;
        lines.push({
          ...(group.hdp !== null ? { hdp: group.hdp } : {}),
          ...(group.label !== null ? { label: group.label } : {}),
          outcomes,
        });
      }
      if (lines.length === 0) continue;
      lines.sort((a, b) => {
        if (a.hdp != null && b.hdp != null) return a.hdp - b.hdp;
        if (a.hdp != null) return -1;
        if (b.hdp != null) return 1;
        return (a.label ?? '').localeCompare(b.label ?? '');
      });
      out[name] = { name, lines };
    }
    return out;
  }
}

function stripPrimary<T extends { primary?: boolean }>(v: T): Omit<T, 'primary'> {
  const { primary: _p, ...rest } = v;
  void _p;
  return rest;
}

/**
 * ISO UTC 시간을 한국시간으로 변환.
 * 기준: odds-api.io 는 date 를 UTC (Z 접미사) 로 내려준다.
 * kickoffKst 는 "2026-04-21T19:30:00+09:00" 형태.
 */
function splitKickoff(startTime: string | null): {
  kickoffUtc: string | null;
  kickoffKst: string | null;
} {
  if (!startTime) return { kickoffUtc: null, kickoffKst: null };
  const t = Date.parse(startTime);
  if (!Number.isFinite(t)) return { kickoffUtc: null, kickoffKst: null };
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  // KST 로컬 숫자를 새로 조립 (UTC+9)
  const k = new Date(t + 9 * 60 * 60 * 1000);
  const kst = `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(
    k.getUTCDate(),
  )}T${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}:${pad(
    k.getUTCSeconds(),
  )}+09:00`;
  return { kickoffUtc: d.toISOString(), kickoffKst: kst };
}

/* ─────────────────────────── 타입 ─────────────────────────── */

export type MatchStatus = 'live' | 'prematch' | 'finished' | 'unknown';

export type MoneylineMarket = {
  home: number;
  draw?: number;
  away: number;
  margin: number;
};

export type HandicapMarket = {
  line: number;
  home: number;
  away: number;
  margin: number;
};

export type TotalsMarket = {
  line: number;
  over: number;
  under: number;
  margin: number;
};

export type HandicapLine = HandicapMarket & { primary: boolean };
export type TotalsLine = TotalsMarket & { primary: boolean };

/**
 * 스페셜 마켓 (Draw No Bet / Double Chance / BTTS / European Handicap /
 * Half Time Full Time / 1st Half ML / Team Totals / 기타) 에 대한 패스스루.
 *
 *  - outcomes: 북메이커 중 best price (= 가장 높은 배당) 만 모아 둔다.
 *  - line 단위: 같은 시장 안에 여러 hdp 라인이 있을 경우 배열로 내려간다
 *    (예: European Handicap hdp = -1, 1, -2, 2 …).
 *  - 마진 재가공은 **하지 않는다** — 다출력/N-way 시장은 보정 규칙이 다양하므로
 *    원본 best price 를 그대로 노출하고, 필요 시 클라이언트에서 가공.
 */
export type ExtraOutcome = {
  /** odds-api 원본 outcome key (home / away / draw / yes / no / 1X / X2 / 12 / …) */
  key: string;
  /** label 기반 row (ex: HTFT "1/1") 일 때만 채움 */
  label?: string | null;
  price: number;
};

export type ExtraLine = {
  /** hdp/line 값 (있을 때만) */
  hdp?: number | null;
  /** HTFT 처럼 label 로 구분되는 라인 (있을 때만) */
  label?: string | null;
  outcomes: ExtraOutcome[];
};

export type ExtraMarket = {
  /** odds-api.io 원본 market name (대소문자 보존) */
  name: string;
  lines: ExtraLine[];
};

export type AggregatedMatch = {
  matchId: string;
  sport: string;
  status: MatchStatus;
  /** 하위호환 — kickoffUtc 와 동일 (ISO UTC "...Z") */
  startTime: string | null;
  /** 명시적 UTC (ISO "...Z") */
  kickoffUtc: string | null;
  /** KST (UTC+9) ISO (예: "2026-04-21T19:30:00+09:00") */
  kickoffKst: string | null;
  league: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    slug: string | null;
  };
  home: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    externalId: number | null;
  };
  away: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    externalId: number | null;
  };
  scores: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
  markets: {
    moneyline?: MoneylineMarket;
    /** 대표 라인 (modal line) — 기존 솔루션 사이트 호환 */
    handicap?: HandicapMarket;
    totals?: TotalsMarket;
    /** 전체 라인 (펼쳤을 때 노출). primary=true 가 대표 */
    handicapLines?: HandicapLine[];
    totalsLines?: TotalsLine[];
    /**
     * 스페셜 마켓 전부 (odds-api 원본 name 을 그대로 키로 사용).
     * UI 에서 경기 펼쳐보기 탭에 렌더링 대상.
     */
    extras?: Record<string, ExtraMarket>;
  };
  bookies: string[];
  bookieCount: number;
  url?: string;
  lastUpdatedMs: number;
};

export type MatchesResponse = {
  status: MatchStatus | 'all';
  sport: string | null;
  total: number;
  matches: AggregatedMatch[];
};

export type OddsApiCatalogItem = {
  id: string;
  sport: string;
  home: string | null;
  away: string | null;
  /** odds-api.io 의 안정적인 팀 PK (매핑 테이블 조인 키) */
  homeId?: number | null;
  awayId?: number | null;
  league: string | null;
  leagueSlug?: string | null;
  date: string | null;
  status: string | null;
  scores: AggregatedMatch['scores'];
  bookmakers: Record<string, unknown>;
  fetchedAt?: string | null;
  url?: string | null;
};

type MatchAccumulator = {
  eventId: string;
  sport: string;
  home: string | null;
  away: string | null;
  homeId: number | null;
  awayId: number | null;
  league: string | null;
  leagueSlug: string | null;
  startTime: string | null;
  eventStatus: string | null;
  scores: AggregatedMatch['scores'];
  url?: string;
  bookies: Set<string>;
  lastUpdatedMs: number;
  mlPrices: { home: number[]; draw: number[]; away: number[] };
  handicapByLine: Map<number, { home: number[]; away: number[] }>;
  totalsByLine: Map<number, { over: number[]; under: number[] }>;
  /** 스페셜 마켓 누적 (market name → line → outcome → price[]) */
  extrasByMarket: Map<string, ExtraAccum>;
};

type ExtraAccum = {
  name: string;
  lineGroups: Map<string, ExtraLineAccum>;
};

type ExtraLineAccum = {
  hdp: number | null;
  label: string | null;
  outcomes: Map<string, number[]>;
};

type NormalizedListOptions = {
  wantStatus: MatchStatus | 'all';
  wantSport?: string;
  wantSports: string[];
  bookmakerSet: Set<string> | null;
  limit: number;
};

/* ─────────────────────────── helpers ─────────────────────────── */

function pushNum(arr: number[], v: unknown): void {
  const n = numFrom(v);
  if (n !== null && n > 1.0) arr.push(n);
}

/**
 * odds-api.io row 안에서 "가격이 아닌" 메타 필드.
 * 이 이름의 키는 extras 에서 outcome 으로 간주하지 않는다.
 *
 *  - hdp/line/points : 라인 식별자
 *  - updatedAt/max/min : 메타
 *  - lay* / depth* : Betfair Exchange 전용 (back 쪽 가격만 사용)
 */
const EXTRA_META_KEYS = new Set([
  'hdp',
  'line',
  'points',
  'updatedAt',
  'max',
  'min',
]);
function isExtraMetaKey(k: string): boolean {
  if (EXTRA_META_KEYS.has(k)) return true;
  if (k.startsWith('lay')) return true;
  if (k.startsWith('depth')) return true;
  return false;
}

function numFrom(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const f = parseFloat(v);
    return Number.isFinite(f) ? f : null;
  }
  return null;
}

function bestOf(arr: number[]): number | null {
  if (arr.length === 0) return null;
  let max = -Infinity;
  for (const v of arr) if (v > max) max = v;
  return max === -Infinity ? null : max;
}

/**
 * 가격 배열을 받아 마진(target overround = 1+target) 으로 재조정.
 * implied prob 의 비율은 보존, 합만 (1+target) 이 되도록 스케일 → 각 가격은 다시 1/p_new.
 */
function renormalizeOverround(
  prices: number[],
  targetMargin: number,
): number[] {
  if (prices.length === 0) return [];
  const probs = prices.map((p) => 1 / p);
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum <= 0) return prices.slice();
  const target = 1 + targetMargin;
  const scale = target / sum;
  return probs.map((p) => 1 / (p * scale));
}

/**
 * 입력 위치 [home, draw?, away] → renormalizeOverround 결과를 위치 보존하며 다시 매핑.
 * draw 가 null 이면 그 자리만 건너뛴다.
 */
function redistribute(
  raw: Array<number | null>,
  adjusted: number[],
): Array<number | null> {
  const out: Array<number | null> = [];
  let j = 0;
  for (const r of raw) {
    if (r === null || r <= 0) {
      out.push(null);
      continue;
    }
    const v = adjusted[j++];
    out.push(typeof v === 'number' ? round3(v) : null);
  }
  return out;
}

/**
 * 매치+시장 단위로 결정적인 마진을 [min, max] 사이에서 뽑는다 (해시 기반).
 * 같은 매치의 같은 시장은 항상 같은 값 → UI 가 뽀글뽀글 변하지 않음.
 */
function pickMargin(
  min: number,
  max: number,
  matchId: string,
  marketKey: string,
): number {
  const seed = hashStr(`${matchId}|${marketKey}`);
  const rand = (seed % 10_000) / 10_000;
  return min + (max - min) * rand;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * 라인별 누적기 중 "가장 많이 collect 된" 라인 1개를 뽑는다 (modal).
 * 동률이면 0 에 가까운 라인 우선 → 표준 라인이 화면에 뜨도록.
 */
function pickModalLine<T extends { home?: number[]; over?: number[] }>(
  byLine: Map<number, T>,
): number | null {
  if (byLine.size === 0) return null;
  let bestLine: number | null = null;
  let bestCount = -1;
  for (const [line, bag] of byLine) {
    const a = (bag as { home?: number[] }).home ?? (bag as { over?: number[] }).over ?? [];
    const cnt = a.length;
    if (cnt > bestCount || (cnt === bestCount && bestLine !== null && Math.abs(line) < Math.abs(bestLine))) {
      bestLine = line;
      bestCount = cnt;
    }
  }
  return bestLine;
}

export function classifyOddsApiMatchStatus(input: {
  eventStatus?: string | null;
  startTime?: string | null;
  scores?: AggregatedMatch['scores'];
}): MatchStatus {
  const s = (input.eventStatus ?? '').toLowerCase().trim();
  if (s === 'live' || s === 'in_play' || s === 'inplay' || s === 'started') return 'live';
  if (
    s === 'finished' ||
    s === 'ended' ||
    s === 'settled' /* odds-api.io: 경기 종료 + 결과 확정 */ ||
    s === 'cancelled' ||
    s === 'canceled' ||
    s === 'postponed' ||
    s === 'abandoned'
  )
    return 'finished';
  if (
    s === 'prematch' ||
    s === 'pre_match' ||
    s === 'scheduled' ||
    s === 'not_started' ||
    s === 'pending'
  )
    return 'prematch';
  // 보강 status 가 없을 때: scores 가 의미있게 들어와 있으면 라이브로 간주
  if (input.scores && (input.scores.home !== null || input.scores.away !== null)) {
    return 'live';
  }
  // startTime 이 미래면 prematch, 과거면 unknown(=경기 종료 가능성, 다만 보강 전이라 확신 X)
  if (input.startTime) {
    const t = Date.parse(input.startTime);
    if (Number.isFinite(t)) {
      return t > Date.now() ? 'prematch' : 'unknown';
    }
  }
  return 'unknown';
}

function classifyStatus(acc: MatchAccumulator): MatchStatus {
  return classifyOddsApiMatchStatus({
    eventStatus: acc.eventStatus,
    startTime: acc.startTime,
    scores: acc.scores,
  });
}

function normalizeListOptions(opts: {
  status?: MatchStatus | 'all';
  sport?: string;
  sports?: string[];
  bookmakers?: string[];
  limit?: number;
}): NormalizedListOptions {
  const wantStatus = opts.status ?? 'all';
  const sportsFromList = Array.isArray(opts.sports)
    ? opts.sports.map((s) => s.trim()).filter(Boolean)
    : [];
  const wantSports = [
    ...(opts.sport?.trim() ? [opts.sport.trim()] : []),
    ...sportsFromList,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  const wantBookmakers = Array.isArray(opts.bookmakers)
    ? opts.bookmakers.map((b) => b.trim()).filter(Boolean)
    : [];
  return {
    wantStatus,
    wantSport:
      wantSports.length === 1 ? wantSports[0] : opts.sport?.trim() || undefined,
    wantSports,
    bookmakerSet:
      wantBookmakers.length > 0 ? new Set(wantBookmakers) : null,
    limit:
      typeof opts.limit === 'number' && opts.limit > 0
        ? Math.min(opts.limit, 500)
        : 200,
  };
}

/**
 * 정렬된 매치 배열에서 종목별 상한을 적용. 입력 순서를 유지하면서 각 sport 의
 * 처음 `perSportLimit` 개만 통과시켜, 특정 종목이 다른 종목을 굶기는 상황을 막는다.
 */
function takeTopPerSport(
  matches: AggregatedMatch[],
  perSportLimit: number,
): AggregatedMatch[] {
  if (perSportLimit <= 0) return [];
  const counts = new Map<string, number>();
  const out: AggregatedMatch[] = [];
  for (const m of matches) {
    const sport = m.sport || 'unknown';
    const n = counts.get(sport) ?? 0;
    if (n >= perSportLimit) continue;
    counts.set(sport, n + 1);
    out.push(m);
  }
  return out;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
