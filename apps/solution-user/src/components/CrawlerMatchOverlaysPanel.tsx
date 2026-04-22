"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  fetchCrawlerMatchOverlays,
  type CrawlerMatchOverlayItem,
  type CrawlerMatchOverlaysResponse,
} from "@/lib/api";
import { useBootstrapHost } from "@/components/BootstrapProvider";
import { CrawlerMatchOverlayDetail } from "@/components/CrawlerMatchOverlayDetail";
import { useBettingCart } from "@/components/BettingCartContext";

const SPORT_LABEL: Record<string, string> = {
  football: "축구",
  basketball: "농구",
  baseball: "야구",
  tennis: "테니스",
  volleyball: "배구",
  hockey: "하키",
};

function formatFixtureTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function kickoffMs(row: CrawlerMatchOverlayItem): number {
  const u = row.rawKickoffUtc;
  if (!u) return Number.MAX_SAFE_INTEGER;
  const t = Date.parse(u);
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function leagueTitle(row: CrawlerMatchOverlayItem): string {
  const pv = row.providerOddsPreview;
  const dn = (row.displayLeagueName || "").trim();
  if (dn) return dn;
  return (
    pv?.league?.nameKr ||
    row.pairedLocaleRaw?.rawLeagueLabel ||
    pv?.league?.name ||
    row.rawLeagueSlug ||
    "기타 리그"
  );
}

function leagueLogoUrl(row: CrawlerMatchOverlayItem): string | null {
  const pv = row.providerOddsPreview;
  return pv?.league?.logoUrl || row.sourceLeagueLogo || null;
}

function sectionId(title: string): string {
  return `crawl-league-${encodeURIComponent(title).replace(/%/g, "_")}`;
}

function fmt(n: number) {
  return n.toFixed(2);
}

type FixtureRowProps = {
  row: CrawlerMatchOverlayItem;
  leagueName: string;
  onOpenDetail: (id: string) => void;
};

function FixtureRow({ row, leagueName, onOpenDetail }: FixtureRowProps) {
  const { addLine } = useBettingCart();
  const pm = row.providerOddsPreview?.primaryMarkets;
  const ml = pm?.moneyline;
  const expandable = row.providerOddsPreview?.expandableMarketCount ?? 0;
  const home = row.rawHomeName ?? row.providerHomeName ?? "?";
  const away = row.rawAwayName ?? row.providerAwayName ?? "?";
  const matchLabel = `${home} vs ${away}`;

  const addMl = (outcome: "home" | "draw" | "away", odd: number, pickLabel: string) => {
    addLine({
      matchLabel,
      pickLabel,
      odd: fmt(odd),
      source: "manual",
      marketType: "moneyline",
      outcome,
      leagueName,
      homeName: home,
      awayName: away,
      startTime: row.rawKickoffUtc,
      bookmakerCount: null,
      sourceBookmaker: null,
    });
  };

  const hasDraw = ml != null && ml.draw != null;
  const canHome = ml != null;
  const canDraw = hasDraw;
  const canAway = ml != null;

  return (
    <div className="flex flex-wrap items-stretch gap-2 border-b border-white/6 bg-black/15 py-2.5 pl-2 pr-1 hover:bg-black/28 md:flex-nowrap md:gap-3 md:py-2">
      <div className="flex w-[4.5rem] shrink-0 flex-col justify-center text-center md:w-[5.25rem]">
        <span className="font-mono text-[11px] font-medium text-zinc-200">
          {formatFixtureTime(row.rawKickoffUtc)}
        </span>
        <span className="mt-0.5 text-[9px] text-zinc-500">{hasDraw ? "승무패" : "승패"}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 md:flex-row md:items-center md:gap-2">
        <div className="min-w-0 flex-1 text-[11px] leading-snug text-zinc-100 md:max-w-[40%]">
          <span className="font-medium">{home}</span>
          <span className="mx-1 text-zinc-500">vs</span>
          <span className="font-medium">{away}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
          <button
            type="button"
            disabled={!canHome}
            onClick={(e) => {
              e.stopPropagation();
              if (ml) addMl("home", ml.home, `홈 ${fmt(ml.home)}`);
            }}
            className="flex min-w-[3.25rem] flex-1 flex-col items-center justify-center rounded border border-white/12 bg-zinc-900/80 py-1.5 text-[10px] transition-colors hover:border-[rgba(218,174,87,0.45)] disabled:cursor-not-allowed disabled:opacity-35 md:min-w-[4rem] md:py-2"
          >
            <span className="text-[9px] text-zinc-500">홈</span>
            <span className="font-mono text-[12px] font-semibold text-main-gold">
              {ml ? fmt(ml.home) : "—"}
            </span>
          </button>
          <button
            type="button"
            disabled={!canDraw}
            onClick={(e) => {
              e.stopPropagation();
              if (ml && ml.draw != null) addMl("draw", ml.draw, `무 ${fmt(ml.draw)}`);
            }}
            className="flex min-w-[3.25rem] flex-1 flex-col items-center justify-center rounded border border-white/12 bg-zinc-900/80 py-1.5 text-[10px] transition-colors hover:border-[rgba(218,174,87,0.45)] disabled:cursor-not-allowed disabled:opacity-35 md:min-w-[4rem] md:py-2"
          >
            <span className="text-[9px] text-zinc-500">무</span>
            <span className="font-mono text-[12px] font-semibold text-main-gold">
              {ml?.draw != null ? fmt(ml.draw) : "—"}
            </span>
          </button>
          <button
            type="button"
            disabled={!canAway}
            onClick={(e) => {
              e.stopPropagation();
              if (ml) addMl("away", ml.away, `원 ${fmt(ml.away)}`);
            }}
            className="flex min-w-[3.25rem] flex-1 flex-col items-center justify-center rounded border border-white/12 bg-zinc-900/80 py-1.5 text-[10px] transition-colors hover:border-[rgba(218,174,87,0.45)] disabled:cursor-not-allowed disabled:opacity-35 md:min-w-[4rem] md:py-2"
          >
            <span className="text-[9px] text-zinc-500">원</span>
            <span className="font-mono text-[12px] font-semibold text-main-gold">
              {ml ? fmt(ml.away) : "—"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-1.5 md:w-auto md:flex-col md:justify-center">
        <button
          type="button"
          onClick={() => onOpenDetail(row.id)}
          className="rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-[rgba(218,174,87,0.4)] hover:text-main-gold"
        >
          {expandable > 0 ? `+${expandable}` : "상세"}
        </button>
      </div>
    </div>
  );
}

export function CrawlerMatchOverlaysPanel() {
  const host = useBootstrapHost();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const detailId = sp.get("crawlMatch");

  const [sportSlug, setSportSlug] = useState("football");
  const [status, setStatus] = useState("matched");
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);
  const [data, setData] = useState<CrawlerMatchOverlaysResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const openDetail = useCallback(
    (id: string) => {
      const q = new URLSearchParams(sp.toString());
      q.set("tab", "crawlmap");
      q.set("crawlMatch", id);
      router.push(`${pathname}?${q.toString()}`);
    },
    [pathname, router, sp],
  );

  const closeDetail = useCallback(() => {
    const q = new URLSearchParams(sp.toString());
    q.delete("crawlMatch");
    q.set("tab", "crawlmap");
    router.push(`${pathname}?${q.toString()}`);
  }, [pathname, router, sp]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCrawlerMatchOverlays({
        host,
        sourceSite: "aiscore",
        sportSlug: sportSlug.trim() || undefined,
        status: status.trim() || "matched",
        take: 50,
        includeOdds: true,
      });
      setData(res);
      setErr(null);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [host, sportSlug, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const grouped = useMemo(() => {
    if (!data?.items.length) return [];
    const map = new Map<string, CrawlerMatchOverlayItem[]>();
    for (const row of data.items) {
      const k = leagueTitle(row);
      const arr = map.get(k) ?? [];
      arr.push(row);
      map.set(k, arr);
    }
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b, "ko"));
    return keys.map((title) => ({
      title,
      rows: (map.get(title) ?? []).sort((a, b) => kickoffMs(a) - kickoffMs(b)),
    }));
  }, [data]);

  const leagueSidebar = useMemo(() => {
    const total = grouped.reduce((s, g) => s + g.rows.length, 0);
    return { total, items: grouped.map((g) => ({ title: g.title, count: g.rows.length })) };
  }, [grouped]);

  const scrollToLeague = useCallback((title: string | null) => {
    setLeagueFilter(title);
    if (!title) return;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(sectionId(title));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const filteredGroups = useMemo(() => {
    if (!leagueFilter) return grouped;
    return grouped.filter((g) => g.title === leagueFilter);
  }, [grouped, leagueFilter]);

  const sportLabel = SPORT_LABEL[sportSlug] ?? sportSlug;

  if (detailId) {
    return (
      <CrawlerMatchOverlayDetail
        host={host}
        mappingId={detailId}
        onBack={closeDetail}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* 좌측 리그 네비 (huracan prematch 좌측 league-list) */}
      <aside className="hidden w-[11.5rem] shrink-0 border-r border-white/8 bg-zinc-950/90 lg:block">
        <div className="sticky top-[var(--app-desktop-header)] max-h-[calc(100vh-var(--app-desktop-header))] overflow-y-auto">
          <div className="border-b border-white/8 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            리그
          </div>
          <button
            type="button"
            onClick={() => {
              setLeagueFilter(null);
            }}
            className={`flex w-full items-center justify-between gap-2 border-b border-white/5 px-2.5 py-2 text-left text-[11px] hover:bg-white/5 ${
              leagueFilter == null ? "bg-white/8 text-main-gold" : "text-zinc-300"
            }`}
          >
            <span>전체</span>
            <span className="font-mono text-[10px] text-zinc-500">{leagueSidebar.total}</span>
          </button>
          {leagueSidebar.items.map((it) => (
            <button
              key={it.title}
              type="button"
              onClick={() => scrollToLeague(it.title)}
              className={`flex w-full items-center justify-between gap-2 border-b border-white/5 px-2.5 py-2 text-left text-[11px] hover:bg-white/5 ${
                leagueFilter === it.title ? "bg-white/8 text-main-gold" : "text-zinc-300"
              }`}
            >
              <span className="line-clamp-2 min-w-0 flex-1 leading-snug">{it.title}</span>
              <span className="shrink-0 font-mono text-[10px] text-zinc-500">{it.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-3 px-2 py-3 md:px-4 md:py-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-3">
          <span className="rounded-full border border-white/12 bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-200">
            {sportLabel}
          </span>
          {data?.items.length ? (
            <span className="text-[10px] text-zinc-500">
              {data.items.length}경기
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-2 text-[11px] lg:hidden">
          <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-zinc-500">
            리그
            <select
              value={leagueFilter ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setLeagueFilter(v === "" ? null : v);
              }}
              className="rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-zinc-100"
            >
              <option value="">전체</option>
              {leagueSidebar.items.map((it) => (
                <option key={it.title} value={it.title}>
                  {it.title} ({it.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-2 text-[11px] md:gap-3">
          <label className="flex flex-col gap-1 text-zinc-500">
            종목
            <input
              value={sportSlug}
              onChange={(e) => setSportSlug(e.target.value)}
              className="w-28 rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-zinc-100"
              placeholder="football"
            />
          </label>
          <label className="flex flex-col gap-1 text-zinc-500">
            상태
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-zinc-100"
            >
              <option value="matched">matched</option>
              <option value="pending">pending</option>
              <option value="all">all</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md bg-[rgba(218,174,87,0.2)] px-3 py-1.5 text-[11px] font-semibold text-main-gold ring-1 ring-[rgba(218,174,87,0.45)]"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중…</p>
        ) : err ? (
          <p className="text-sm text-amber-400/95">{err}</p>
        ) : !data?.items.length ? (
          <p className="text-sm text-zinc-500">표시할 매칭이 없습니다.</p>
        ) : (
          <>
            <p className="text-[10px] text-zinc-600">
              홈·무·원을 누르면 우측 배팅카트에 담깁니다. 상세는「+N」또는「상세」만 누르세요.
            </p>
            <div className="space-y-0 rounded-lg border border-white/10 bg-zinc-950/30">
              {filteredGroups.map((g) => {
                const r0 = g.rows[0];
                const logo = leagueLogoUrl(r0);
                const flag = r0.sourceCountryFlag;
                return (
                  <section key={g.title} id={sectionId(g.title)}>
                    <div className="flex items-center gap-2 border-b border-white/10 bg-black/25 px-2 py-2 md:px-3">
                      <span className="text-[13px]" aria-hidden>
                        ⚽
                      </span>
                      {flag ? (
                        <img
                          src={flag}
                          alt=""
                          className="h-4 w-6 shrink-0 rounded border border-white/10 object-cover"
                        />
                      ) : null}
                      {logo ? (
                        <img
                          src={logo}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded border border-white/10 bg-zinc-900 object-contain"
                        />
                      ) : null}
                      <h2 className="min-w-0 flex-1 truncate text-[12px] font-semibold text-zinc-200">
                        {g.title}
                      </h2>
                    </div>
                    <div>
                      {g.rows.map((row) => (
                        <FixtureRow
                          key={row.id}
                          row={row}
                          leagueName={g.title}
                          onOpenDetail={openDetail}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
