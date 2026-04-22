"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCrawlerMatchOverlayDetail,
  type AggregatedMatch,
  type CrawlerMatchOverlayDetail,
} from "@/lib/api";
import { useBettingCart } from "@/components/BettingCartContext";

type DetailTab = "summary" | "handicap" | "totals" | "special";

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

export function CrawlerMatchOverlayDetail({
  host,
  mappingId,
  onBack,
}: {
  host: string;
  mappingId: string;
  onBack: () => void;
}) {
  const { addLine } = useBettingCart();
  const [data, setData] = useState<CrawlerMatchOverlayDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("summary");

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

  const addMl = useCallback(
    (side: "home" | "draw" | "away", label: string, odd: number) => {
      if (!data || !o) return;
      const home = o.home.nameKr || o.home.name || data.rawHomeName || "홈";
      const away = o.away.nameKr || o.away.name || data.rawAwayName || "원정";
      addLine({
        matchLabel: `${home} vs ${away}`,
        pickLabel: label,
        odd: fmtOdd(odd),
        source: "odds-api",
        marketType: "moneyline",
        outcome: side,
        leagueName: detailLeagueDisplay(data, o),
        homeName: home,
        awayName: away,
        startTime: o.kickoffKst || o.kickoffUtc || o.startTime,
        bookmakerCount: o.bookieCount,
      });
    },
    [addLine, data, o],
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

  if (!data) {
    return null;
  }

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

  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: "summary", label: "승무패·승패" },
    {
      id: "handicap",
      label: "핸디",
      count: hLines.length || (o.markets?.handicap ? 1 : 0),
    },
    {
      id: "totals",
      label: "총점",
      count: tLines.length || (o.markets?.totals ? 1 : 0),
    },
    { id: "special", label: "스페셜", count: extraKeys.length },
  ];

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

      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 bg-black/35 p-4">
        {data.sourceCountryFlag ? (
          <img
            src={data.sourceCountryFlag}
            alt=""
            className="h-7 w-11 shrink-0 rounded border border-white/10 object-cover"
          />
        ) : null}
        {(data.sourceLeagueLogo || o.league.logoUrl) && (
          <img
            src={(o.league.logoUrl || data.sourceLeagueLogo) ?? ""}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md border border-white/10 bg-zinc-900 object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-zinc-500">
            {detailLeagueDisplay(data, o)}
          </p>
          <p className="mt-1 text-base font-semibold text-zinc-100">
            {(o.home.nameKr || o.home.name || data.rawHomeName) ?? "?"}{" "}
            <span className="text-zinc-500">vs</span>{" "}
            {(o.away.nameKr || o.away.name || data.rawAwayName) ?? "?"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "rounded-md px-2.5 py-1 text-[11px] font-semibold",
              tab === t.id
                ? "bg-[rgba(218,174,87,0.2)] text-main-gold ring-1 ring-[rgba(218,174,87,0.4)]"
                : "text-zinc-500 hover:text-zinc-300",
            ].join(" ")}
          >
            {t.label}
            {t.count != null && t.count > 0 ? (
              <span className="ml-1 text-zinc-500">({t.count})</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "summary" &&
        (ml ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => addMl("home", `승(홈) ${fmtOdd(ml.home)}`, ml.home)}
              className="rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-3 text-left text-[12px] hover:border-main-gold/50"
            >
              <span className="text-zinc-500">홈 승</span>
              <p className="font-mono text-lg text-main-gold">{fmtOdd(ml.home)}</p>
            </button>
            {ml.draw != null ? (
              <button
                type="button"
                onClick={() => {
                  const d = ml.draw as number;
                  addMl("draw", `무 ${fmtOdd(d)}`, d);
                }}
                className="rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-3 text-left text-[12px] hover:border-main-gold/50"
              >
                <span className="text-zinc-500">무</span>
                <p className="font-mono text-lg text-main-gold">{fmtOdd(ml.draw as number)}</p>
              </button>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-[11px] text-zinc-600">
                무 배당 없음 (2-way)
              </div>
            )}
            <button
              type="button"
              onClick={() => addMl("away", `승(원정) ${fmtOdd(ml.away)}`, ml.away)}
              className="rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-3 text-left text-[12px] hover:border-main-gold/50"
            >
              <span className="text-zinc-500">원정 승</span>
              <p className="font-mono text-lg text-main-gold">{fmtOdd(ml.away)}</p>
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">머니라인 데이터가 없습니다.</p>
        ))}

      {tab === "handicap" && (
        <ul className="space-y-2">
          {(hLines.length ? hLines : o.markets?.handicap ? [o.markets.handicap] : []).map(
            (line, i) => (
              <li
                key={`h-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-[12px]"
              >
                <span className="text-zinc-400">라인 {line.line}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border border-white/10 px-2 py-1 font-mono text-main-gold"
                    onClick={() =>
                      addLine({
                        matchLabel: `${o.home.name ?? ""} vs ${o.away.name ?? ""}`,
                        pickLabel: `핸디 ${line.line} 홈 ${fmtOdd(line.home)}`,
                        odd: fmtOdd(line.home),
                        source: "odds-api",
                        marketType: "handicap",
                        outcome: "home",
                        line: line.line,
                        leagueName: detailLeagueDisplay(data, o),
                        homeName: o.home.name,
                        awayName: o.away.name,
                        startTime: o.kickoffKst || o.kickoffUtc,
                        bookmakerCount: o.bookieCount,
                      })
                    }
                  >
                    홈 {fmtOdd(line.home)}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/10 px-2 py-1 font-mono text-main-gold"
                    onClick={() =>
                      addLine({
                        matchLabel: `${o.home.name ?? ""} vs ${o.away.name ?? ""}`,
                        pickLabel: `핸디 ${line.line} 원정 ${fmtOdd(line.away)}`,
                        odd: fmtOdd(line.away),
                        source: "odds-api",
                        marketType: "handicap",
                        outcome: "away",
                        line: line.line,
                        leagueName: detailLeagueDisplay(data, o),
                        homeName: o.home.name,
                        awayName: o.away.name,
                        startTime: o.kickoffKst || o.kickoffUtc,
                        bookmakerCount: o.bookieCount,
                      })
                    }
                  >
                    원정 {fmtOdd(line.away)}
                  </button>
                </div>
              </li>
            ),
          )}
          {!hLines.length && !o.markets?.handicap ? (
            <p className="text-sm text-zinc-600">핸디 데이터 없음</p>
          ) : null}
        </ul>
      )}

      {tab === "totals" && (
        <ul className="space-y-2">
          {(tLines.length ? tLines : o.markets?.totals ? [o.markets.totals] : []).map(
            (line, i) => (
              <li
                key={`t-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-[12px]"
              >
                <span className="text-zinc-400">기준 {line.line}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border border-white/10 px-2 py-1 font-mono text-main-gold"
                    onClick={() =>
                      addLine({
                        matchLabel: `${o.home.name ?? ""} vs ${o.away.name ?? ""}`,
                        pickLabel: `오버 ${line.line} ${fmtOdd(line.over)}`,
                        odd: fmtOdd(line.over),
                        source: "odds-api",
                        marketType: "totals",
                        outcome: "over",
                        line: line.line,
                        leagueName: detailLeagueDisplay(data, o),
                        homeName: o.home.name,
                        awayName: o.away.name,
                        startTime: o.kickoffKst || o.kickoffUtc,
                        bookmakerCount: o.bookieCount,
                      })
                    }
                  >
                    오버 {fmtOdd(line.over)}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/10 px-2 py-1 font-mono text-main-gold"
                    onClick={() =>
                      addLine({
                        matchLabel: `${o.home.name ?? ""} vs ${o.away.name ?? ""}`,
                        pickLabel: `언더 ${line.line} ${fmtOdd(line.under)}`,
                        odd: fmtOdd(line.under),
                        source: "odds-api",
                        marketType: "totals",
                        outcome: "under",
                        line: line.line,
                        leagueName: detailLeagueDisplay(data, o),
                        homeName: o.home.name,
                        awayName: o.away.name,
                        startTime: o.kickoffKst || o.kickoffUtc,
                        bookmakerCount: o.bookieCount,
                      })
                    }
                  >
                    언더 {fmtOdd(line.under)}
                  </button>
                </div>
              </li>
            ),
          )}
          {!tLines.length && !o.markets?.totals ? (
            <p className="text-sm text-zinc-600">총점 데이터 없음</p>
          ) : null}
        </ul>
      )}

      {tab === "special" && (
        <div className="space-y-4">
          {extraKeys.length === 0 ? (
            <p className="text-sm text-zinc-600">스페셜 마켓 없음</p>
          ) : (
            extraKeys.map((k) => (
              <div key={k} className="rounded-lg border border-white/10 p-3">
                <p className="text-[11px] font-semibold text-zinc-300">{extras[k]?.name ?? k}</p>
                <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
                  {(extras[k]?.lines ?? []).map((ln, li) => (
                    <li key={li}>
                      {ln.outcomes.map((oc, oi) => (
                        <span key={oi} className="mr-2 inline-block">
                          {oc.label ?? oc.key}:{" "}
                          <span className="font-mono text-main-gold">
                            {fmtOdd(oc.price)}
                          </span>
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
