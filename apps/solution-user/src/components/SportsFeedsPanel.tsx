"use client";

import { useEffect, useMemo, useState } from "react";
import { SPORTS_FEED_MARKET_LABELS } from "@tosino/shared";
import { fetchSportsOdds, type PublicSportsOddsFeed } from "@/lib/api";
import { useBootstrap, useBootstrapHost } from "./BootstrapProvider";

type TabId = "DOMESTIC" | "EUROPEAN" | "UNSET";

const TAB_META: Record<
  TabId,
  { label: string; description: string; icon: string }
> = {
  DOMESTIC: {
    label: SPORTS_FEED_MARKET_LABELS.DOMESTIC,
    description: "관리자에 등록한 국내 피드",
    icon: "🇰🇷",
  },
  EUROPEAN: {
    label: SPORTS_FEED_MARKET_LABELS.EUROPEAN,
    description: "관리자에 등록한 유럽 피드",
    icon: "🇪🇺",
  },
  UNSET: {
    label: "기타",
    description: "market 미지정 피드",
    icon: "📋",
  },
};

function payloadHint(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (o.source === "demo_stub" || o.source === "stub")
    return "데모 스냅샷입니다. 실제 배당은 업스트림 연동 후 표시됩니다.";
  return null;
}

export function SportsFeedsPanel() {
  const b = useBootstrap();
  const requestHost = useBootstrapHost();
  const [tab, setTab] = useState<TabId>("DOMESTIC");
  const [snapshots, setSnapshots] = useState<PublicSportsOddsFeed[] | null>(
    null,
  );
  const [oddsErr, setOddsErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOddsErr(null);
    fetchSportsOdds(requestHost)
      .then((r) => {
        if (!cancelled) setSnapshots(r.feeds);
      })
      .catch((e) => {
        if (!cancelled) {
          setSnapshots(null);
          setOddsErr(e instanceof Error ? e.message : "odds load error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [requestHost, b?.platformId]);

  const snapshotById = useMemo(() => {
    const m = new Map<string, PublicSportsOddsFeed>();
    for (const s of snapshots ?? []) m.set(s.sourceFeedId, s);
    return m;
  }, [snapshots]);

  const sections = b?.sportsSections;

  const rows = useMemo(() => {
    if (!sections) return [];
    if (tab === "DOMESTIC") return sections.domestic;
    if (tab === "EUROPEAN") return sections.european;
    return sections.unset;
  }, [sections, tab]);

  const counts = useMemo(() => {
    if (!sections) {
      return { DOMESTIC: 0, EUROPEAN: 0, UNSET: 0 };
    }
    return {
      DOMESTIC: sections.domestic.length,
      EUROPEAN: sections.european.length,
      UNSET: sections.unset.length,
    };
  }, [sections]);

  if (!b) return null;

  const isLight = (b.theme.ui?.background ?? "dark") === "light";
  const total =
    counts.DOMESTIC + counts.EUROPEAN + counts.UNSET;

  return (
    <section className="mt-10" id="sports-feeds">
      <h2
        className={`mb-1 text-lg font-semibold md:text-xl ${isLight ? "text-zinc-900" : "text-white"}`}
      >
        스포츠 배당 피드
      </h2>
      <p
        className={`mb-4 text-sm ${isLight ? "text-zinc-600" : "text-zinc-500"}`}
      >
        설정(
        <code className={isLight ? "text-zinc-500" : "text-zinc-400"}>
          integrationsJson
        </code>
        )은 관리자가 바꾸고, 배당 데이터는 메인 API 워커가 주기·수동(
        <code className={isLight ? "text-zinc-500" : "text-zinc-400"}>ODDS</code>
        동기화)으로 스냅샷 테이블에 넣은 뒤 여기서 읽습니다.
      </p>
      {oddsErr && (
        <p className="mb-3 rounded border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
          스냅샷 조회 실패: {oddsErr}
        </p>
      )}

      {total === 0 ? (
        <div
          className={`rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${isLight ? "border-zinc-300 bg-zinc-200/40 text-zinc-600" : "border-white/15 bg-zinc-950/60 text-zinc-500"}`}
        >
          등록된 스포츠 피드가 없습니다. 관리자 콘솔 → 동기화 → 연동 JSON에{" "}
          <code className={isLight ? "text-zinc-500" : "text-zinc-400"}>
            sportsFeeds
          </code>
          를 추가하세요.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["DOMESTIC", "EUROPEAN", "UNSET"] as TabId[]).map((id) => {
              const n = counts[id];
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition md:px-4 ${
                    active
                      ? `border-[rgba(218,174,87,0.55)] bg-[rgba(218,174,87,0.15)] ${isLight ? "text-zinc-900" : "text-main-gold"}`
                      : isLight
                        ? "border-zinc-200 bg-white/80 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                        : "border-white/10 bg-zinc-900/50 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  <span>{TAB_META[id].icon}</span>
                  <span>
                    <span className="font-medium">{TAB_META[id].label}</span>
                    <span className="ml-1.5 text-xs opacity-80">({n})</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p
            className={`mb-3 text-xs ${isLight ? "text-zinc-500" : "text-zinc-600"}`}
          >
            {TAB_META[tab].description}
          </p>
          {rows.length === 0 ? (
            <p
              className={`rounded-xl border px-4 py-6 text-center text-sm ${isLight ? "border-zinc-200 bg-white/60 text-zinc-600" : "border-white/10 bg-zinc-900/40 text-zinc-500"}`}
            >
              이 구역에 해당하는 피드가 없습니다.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {rows.map((row) => {
                const snap = snapshotById.get(row.id);
                const hint = snap ? payloadHint(snap.payload) : null;
                return (
                  <li
                    key={row.id}
                    className={`rounded-xl border px-4 py-3 ${isLight ? "border-zinc-200 bg-white/70" : "border-white/10 bg-zinc-900/50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`font-medium ${isLight ? "text-zinc-900" : "text-zinc-100"}`}
                      >
                        {row.sportLabel}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-zinc-500">
                        {row.id}
                      </span>
                    </div>
                    {snap ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        스냅샷:{" "}
                        {new Date(snap.fetchedAt).toLocaleString("ko-KR")}
                        {hint ? (
                          <>
                            <br />
                            <span className="text-zinc-400">{hint}</span>
                          </>
                        ) : null}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-600">
                        아직 스냅샷 없음 — 관리자에서 ODDS 동기화 실행
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
