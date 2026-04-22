"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCrawlerMatchOverlayDetail,
  type AggregatedExtraLine,
  type AggregatedExtraMarket,
  type AggregatedMatch,
  type CrawlerMatchOverlayDetail,
} from "@/lib/api";
import { overlayDisplayTeamName } from "@/lib/crawlerOverlayDisplay";
import { useBettingCart } from "@/components/BettingCartContext";

const BROKEN_DETAIL_IMG = new Set<string>();

function SafeImg({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const url = (src || "").trim();
  if (!url || broken || BROKEN_DETAIL_IMG.has(url)) return null;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        BROKEN_DETAIL_IMG.add(url);
        setBroken(true);
      }}
    />
  );
}

function fmtOdd(n: number) {
  return n.toFixed(2);
}

/** 목록 API 와 동일: 한글·짝 로케일 리그명을 odds-api 영문 리그명보다 우선 */
function detailLeagueDisplay(
  row: CrawlerMatchOverlayDetail,
  odds: AggregatedMatch,
): string {
  const dn = (row.displayLeagueName || "").trim();
  if (dn) return dn;
  const kr = (odds.league.nameKr || "").trim();
  if (kr) return kr;
  const paired = (row.pairedLocaleRaw?.rawLeagueLabel || "").trim();
  if (paired) return paired;
  return (odds.league.name || "").trim() || "—";
}

function matchKeyOf(row: CrawlerMatchOverlayDetail): string {
  const eid = (row.providerExternalEventId || "").trim();
  if (eid) return `ev:${eid}`;
  const pv = row.providerOddsPreview;
  const mid = (pv?.matchId || "").trim();
  if (mid) return `mid:${mid}`;
  return `row:${row.id}`;
}

function detailCountryLabel(row: CrawlerMatchOverlayDetail): string | null {
  const ko = (row.providerCountryKo || "").trim();
  if (ko) return ko;
  const paired = (row.pairedLocaleRaw?.rawCountryLabel || "").trim();
  if (paired) return paired;
  const raw = (row.oddsLeagueAliasCountry || "").trim();
  if (raw) return raw;
  return null;
}

/**
 * 모든 마켓에서 공통으로 쓰는 콤팩트 배당 버튼.
 * FixtureRow 의 홈/무/원 버튼과 동일한 룩·앤·필·높이.
 */
function PickBtn({
  label,
  price,
  active,
  onClick,
}: {
  label: string;
  price: number | null | undefined;
  active: boolean;
  onClick: () => void;
}) {
  const hasPrice = typeof price === "number" && price > 1;
  return (
    <button
      type="button"
      disabled={!hasPrice}
      onClick={onClick}
      className={`flex min-w-[3.25rem] flex-1 flex-col items-center justify-center rounded border py-1.5 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-35 md:min-w-[3.75rem] md:py-1.5 ${
        active
          ? "border-main-gold bg-[rgba(218,174,87,0.22)] text-main-gold shadow-[0_0_0_1px_rgba(218,174,87,0.55)]"
          : "border-white/12 bg-zinc-900/80 hover:border-[rgba(218,174,87,0.45)]"
      }`}
    >
      <span className={`text-[9px] ${active ? "text-main-gold" : "text-zinc-500"}`}>
        {label}
      </span>
      <span className="font-mono text-[12px] font-semibold text-main-gold">
        {hasPrice ? fmtOdd(price as number) : "—"}
      </span>
    </button>
  );
}

/** 마켓 한 줄 — 좌측 라벨(시간/기준/라인) + 우측 버튼 그룹, 행 전체 `flex-nowrap` 로 높이 고정 */
function MarketRow({
  tag,
  title,
  children,
}: {
  tag?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-white/6 bg-black/15 px-2 py-1.5 last:border-b-0 md:px-3">
      <div className="flex w-[6rem] shrink-0 flex-col md:w-[7rem]">
        {tag ? (
          <span className="text-[9px] uppercase tracking-wider text-zinc-500">{tag}</span>
        ) : null}
        {title ? (
          <span className="truncate text-[11px] font-semibold text-zinc-200">{title}</span>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-end gap-1 md:gap-1.5">
        {children}
      </div>
    </div>
  );
}

export function CrawlerMatchOverlayDetail({
  host,
  mappingId,
  onBack,
}: {
  host: string;
  mappingId: string;
  onBack: () => void;
}) {
  const { addLine, lines } = useBettingCart();
  const [data, setData] = useState<CrawlerMatchOverlayDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pickedSet = useMemo(() => {
    const s = new Set<string>();
    for (const l of lines) if (l.selectionKey) s.add(l.selectionKey);
    return s;
  }, [lines]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchCrawlerMatchOverlayDetail({
        host,
        mappingId,
      });
      setData(d);
      setErr(null);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [host, mappingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const o = data?.providerOdds as AggregatedMatch | null | undefined;
  const matchKey = data ? matchKeyOf(data) : "";

  const leagueName = data && o ? detailLeagueDisplay(data, o) : null;
  const homeName = data
    ? overlayDisplayTeamName(data, "home", o ?? undefined)
    : "홈";
  const awayName = data
    ? overlayDisplayTeamName(data, "away", o ?? undefined)
    : "원정";
  const homeLogo =
    o?.home?.logoUrl || data?.providerHomeLogo || data?.sourceHomeLogo || null;
  const awayLogo =
    o?.away?.logoUrl || data?.providerAwayLogo || data?.sourceAwayLogo || null;

  const addMl = useCallback(
    (side: "home" | "draw" | "away", label: string, odd: number) => {
      if (!data || !o) return;
      addLine({
        matchLabel: `${homeName} vs ${awayName}`,
        pickLabel: label,
        odd: fmtOdd(odd),
        selectionKey: `${matchKey}:moneyline:${side}`,
        source: "odds-api",
        marketType: "moneyline",
        outcome: side,
        leagueName,
        homeName,
        awayName,
        startTime: o.kickoffKst || o.kickoffUtc || o.startTime,
        bookmakerCount: o.bookieCount,
      });
    },
    [addLine, data, o, matchKey, homeName, awayName, leagueName],
  );

  const addHcp = useCallback(
    (side: "home" | "away", line: number, price: number) => {
      if (!o || !data) return;
      addLine({
        matchLabel: `${homeName} vs ${awayName}`,
        pickLabel: `핸디 ${line} ${side === "home" ? homeName : awayName} ${fmtOdd(price)}`,
        odd: fmtOdd(price),
        selectionKey: `${matchKey}:handicap:${side}:${line}`,
        source: "odds-api",
        marketType: "handicap",
        outcome: side,
        line,
        leagueName,
        homeName,
        awayName,
        startTime: o.kickoffKst || o.kickoffUtc,
        bookmakerCount: o.bookieCount,
      });
    },
    [addLine, o, data, matchKey, homeName, awayName, leagueName],
  );

  const addTot = useCallback(
    (side: "over" | "under", line: number, price: number) => {
      if (!o || !data) return;
      addLine({
        matchLabel: `${homeName} vs ${awayName}`,
        pickLabel: `${side === "over" ? "오버" : "언더"} ${line} ${fmtOdd(price)}`,
        odd: fmtOdd(price),
        selectionKey: `${matchKey}:totals:${side}:${line}`,
        source: "odds-api",
        marketType: "totals",
        outcome: side,
        line,
        leagueName,
        homeName,
        awayName,
        startTime: o.kickoffKst || o.kickoffUtc,
        bookmakerCount: o.bookieCount,
      });
    },
    [addLine, o, data, matchKey, homeName, awayName, leagueName],
  );

  const addExtra = useCallback(
    (
      marketName: string,
      line: AggregatedExtraLine,
      outcomeIdx: number,
      outcomeKey: string,
      outcomeLabel: string,
      price: number,
    ) => {
      if (!o || !data) return;
      const hdp = line.hdp ?? null;
      const lineLbl = (line.label || "").trim();
      const parts = [marketName];
      if (lineLbl) parts.push(lineLbl);
      else if (hdp != null) parts.push(String(hdp));
      parts.push(outcomeLabel);
      const pickLabel = `${parts.join(" · ")} ${fmtOdd(price)}`;
      const hdpToken = hdp != null ? `:${hdp}` : "";
      addLine({
        matchLabel: `${homeName} vs ${awayName}`,
        pickLabel,
        odd: fmtOdd(price),
        selectionKey: `${matchKey}:extra:${marketName}:${outcomeKey}${hdpToken}:${outcomeIdx}`,
        source: "odds-api",
        marketType: "moneyline",
        leagueName,
        homeName,
        awayName,
        startTime: o.kickoffKst || o.kickoffUtc,
        bookmakerCount: o.bookieCount,
      });
    },
    [addLine, o, data, matchKey, homeName, awayName, leagueName],
  );

  if (err) {
    return (
      <div className="space-y-3 px-2 py-4 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] text-main-gold underline"
        >
          ← 배당 목록으로
        </button>
        <p className="text-sm text-amber-400/95">{err}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 px-2 py-4 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] text-main-gold underline"
        >
          ← 배당 목록으로
        </button>
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      </div>
    );
  }

  if (!data) return null;

  if (!o) {
    return (
      <div className="space-y-3 px-2 py-4 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-main-gold"
        >
          ← 배당 목록
        </button>
        <p className="text-sm text-zinc-500">
          플랫폼 odds 스냅샷에 이 경기 배당이 없습니다. 스냅샷 갱신·매칭 eventId 를 확인하세요.
        </p>
      </div>
    );
  }

  const ml = o.markets?.moneyline;
  const extras = o.markets?.extras ?? {};
  const extraKeys = Object.keys(extras);
  const hLines = o.markets?.handicapLines ?? [];
  const tLines = o.markets?.totalsLines ?? [];

  const hasHandicap = hLines.length > 0 || !!o.markets?.handicap;
  const hasTotals = tLines.length > 0 || !!o.markets?.totals;
  const hasExtras = extraKeys.length > 0;

  const pickedHome = pickedSet.has(`${matchKey}:moneyline:home`);
  const pickedDraw = pickedSet.has(`${matchKey}:moneyline:draw`);
  const pickedAway = pickedSet.has(`${matchKey}:moneyline:away`);

  const country = detailCountryLabel(data);

  return (
    <div className="min-h-[50vh] space-y-4 px-2 py-4 md:px-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-medium text-main-gold"
        >
          ← 배당 목록
        </button>
        <span className="text-[11px] text-zinc-500">상세 배당</span>
      </div>

      {/* 헤더 — 국기·리그로고·리그명 + 팀 로고 포함된 매치 카드 */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 p-3 md:p-4">
        <SafeImg
          src={data.sourceCountryFlag}
          alt=""
          className="h-6 w-9 shrink-0 rounded border border-white/10 object-cover"
        />
        <SafeImg
          src={o.league.logoUrl || data.sourceLeagueLogo}
          alt=""
          className="h-8 w-8 shrink-0 rounded-md border border-white/10 bg-zinc-900 object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-zinc-500">
            {country ? <span className="mr-1 text-zinc-400">[{country}]</span> : null}
            {leagueName}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[14px] font-semibold text-zinc-100">
            <SafeImg
              src={homeLogo}
              alt=""
              className="h-6 w-6 shrink-0 rounded border border-white/10 bg-zinc-900 object-contain"
            />
            <span className="min-w-0 truncate">{homeName}</span>
            <span className="shrink-0 text-zinc-500">vs</span>
            <SafeImg
              src={awayLogo}
              alt=""
              className="h-6 w-6 shrink-0 rounded border border-white/10 bg-zinc-900 object-contain"
            />
            <span className="min-w-0 truncate">{awayName}</span>
          </div>
        </div>
      </div>

      {/* 승무패·승패 */}
      <section className="space-y-1.5">
        <h3 className="text-[11px] font-bold tracking-wider text-zinc-300">
          승무패·승패
        </h3>
        {ml ? (
          <div className="rounded-lg border border-white/10 bg-zinc-950/30">
            <MarketRow tag="1X2" title={ml.draw != null ? "승/무/패" : "승/패"}>
              <PickBtn
                label="홈"
                price={ml.home}
                active={pickedHome}
                onClick={() => addMl("home", `홈 ${fmtOdd(ml.home)}`, ml.home)}
              />
              {ml.draw != null ? (
                <PickBtn
                  label="무"
                  price={ml.draw}
                  active={pickedDraw}
                  onClick={() => addMl("draw", `무 ${fmtOdd(ml.draw as number)}`, ml.draw as number)}
                />
              ) : (
                <div className="flex min-w-[3.25rem] flex-1 items-center justify-center rounded border border-dashed border-white/10 py-1.5 text-[10px] text-zinc-600 md:min-w-[3.75rem]">
                  —
                </div>
              )}
              <PickBtn
                label="원"
                price={ml.away}
                active={pickedAway}
                onClick={() => addMl("away", `원 ${fmtOdd(ml.away)}`, ml.away)}
              />
            </MarketRow>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">머니라인 데이터가 없습니다.</p>
        )}
      </section>

      {/* 핸디 */}
      {hasHandicap ? (
        <section className="space-y-1.5">
          <h3 className="text-[11px] font-bold tracking-wider text-zinc-300">
            핸디 ({hLines.length || (o.markets?.handicap ? 1 : 0)})
          </h3>
          <div className="rounded-lg border border-white/10 bg-zinc-950/30">
            {(hLines.length ? hLines : o.markets?.handicap ? [o.markets.handicap] : []).map(
              (line, i) => {
                const homeKey = `${matchKey}:handicap:home:${line.line}`;
                const awayKey = `${matchKey}:handicap:away:${line.line}`;
                return (
                  <MarketRow key={`h-${i}`} tag="HCP" title={`라인 ${line.line}`}>
                    <PickBtn
                      label="홈"
                      price={line.home}
                      active={pickedSet.has(homeKey)}
                      onClick={() => addHcp("home", line.line, line.home)}
                    />
                    <PickBtn
                      label="원"
                      price={line.away}
                      active={pickedSet.has(awayKey)}
                      onClick={() => addHcp("away", line.line, line.away)}
                    />
                  </MarketRow>
                );
              },
            )}
          </div>
        </section>
      ) : null}

      {/* 총점 */}
      {hasTotals ? (
        <section className="space-y-1.5">
          <h3 className="text-[11px] font-bold tracking-wider text-zinc-300">
            총점 ({tLines.length || (o.markets?.totals ? 1 : 0)})
          </h3>
          <div className="rounded-lg border border-white/10 bg-zinc-950/30">
            {(tLines.length ? tLines : o.markets?.totals ? [o.markets.totals] : []).map(
              (line, i) => {
                const overKey = `${matchKey}:totals:over:${line.line}`;
                const underKey = `${matchKey}:totals:under:${line.line}`;
                return (
                  <MarketRow key={`t-${i}`} tag="O/U" title={`기준 ${line.line}`}>
                    <PickBtn
                      label="Ov"
                      price={line.over}
                      active={pickedSet.has(overKey)}
                      onClick={() => addTot("over", line.line, line.over)}
                    />
                    <PickBtn
                      label="Un"
                      price={line.under}
                      active={pickedSet.has(underKey)}
                      onClick={() => addTot("under", line.line, line.under)}
                    />
                  </MarketRow>
                );
              },
            )}
          </div>
        </section>
      ) : null}

      {/* 스페셜 — 각 마켓별로 개별 박스, 라인당 MarketRow 한 줄 */}
      {hasExtras ? (
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold tracking-wider text-zinc-300">
            스페셜 ({extraKeys.length})
          </h3>
          {extraKeys.map((k) => (
            <ExtraMarketBlock
              key={k}
              marketKey={k}
              market={extras[k] as AggregatedExtraMarket}
              pickedSet={pickedSet}
              matchKey={matchKey}
              onPick={addExtra}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function ExtraMarketBlock({
  marketKey,
  market,
  pickedSet,
  matchKey,
  onPick,
}: {
  marketKey: string;
  market: AggregatedExtraMarket;
  pickedSet: Set<string>;
  matchKey: string;
  onPick: (
    marketName: string,
    line: AggregatedExtraLine,
    outcomeIdx: number,
    outcomeKey: string,
    outcomeLabel: string,
    price: number,
  ) => void;
}) {
  const name = market?.name || marketKey;
  const lines = market?.lines ?? [];
  if (!lines.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-zinc-300">{name}</p>
      <div className="rounded-lg border border-white/10 bg-zinc-950/30">
        {lines.map((ln, li) => {
          const hdp = ln.hdp ?? null;
          const hdpToken = hdp != null ? `:${hdp}` : "";
          const lineLabel =
            (ln.label || "").trim() || (hdp != null ? String(hdp) : `#${li + 1}`);
          return (
            <MarketRow key={li} tag="SPL" title={lineLabel}>
              {ln.outcomes.map((oc, oi) => {
                const label = (oc.label || oc.key || "").trim() || `옵션${oi + 1}`;
                const key = `${matchKey}:extra:${name}:${oc.key}${hdpToken}:${oi}`;
                return (
                  <PickBtn
                    key={oi}
                    label={label.length > 3 ? label.slice(0, 3) : label}
                    price={oc.price}
                    active={pickedSet.has(key)}
                    onClick={() =>
                      onPick(name, ln, oi, oc.key, label, oc.price)
                    }
                  />
                );
              })}
            </MarketRow>
          );
        })}
      </div>
    </div>
  );
}
