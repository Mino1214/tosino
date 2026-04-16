"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { inferAdminHost, inferAgentHost, inferRootHost } from "@/lib/platform-hosts";
import { usePlatform } from "@/context/PlatformContext";

type PortfolioRow = {
  platformId: string;
  slug: string;
  name: string;
  domainHosts: string[];
  hedgeNote: string;
  hedgeUpdatedAt: string | null;
  semiVirtualEnabled: boolean;
  hasUsdtWallet: boolean;
  hasKrwAccount: boolean;
  smsDeviceReady: boolean;
  upstreamCasinoPct: string | null;
  upstreamSportsPct: string | null;
  platformCasinoPct: string | null;
  platformSportsPct: string | null;
  autoMarginPct: string | null;
  ggr: string | null;
  houseEdge: string | null;
  cashNet: string | null;
  solutionCashNet: string | null;
  solutionPolicyNet: string | null;
  upstreamCost: string | null;
  platformCharge: string | null;
  solutionMargin: string | null;
  loadError: string | null;
};

type PortfolioResponse = {
  period: { from: string | null; to: string | null };
  totals: {
    solutionsWithMetrics: number;
    solutionsTotal: number;
    houseEdge: string;
    cashNet: string;
    solutionCashNet: string;
    solutionPolicyNet: string;
    upstreamCost: string;
    platformCharge: string;
    solutionMargin: string;
    ggr: string;
  };
  rows: PortfolioRow[];
};

function krw(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("ko-KR") : "0";
}

function moneyClass(value: number) {
  return value > 0
    ? "text-emerald-300"
    : value < 0
      ? "text-rose-300"
      : "text-zinc-100";
}

function hostSummary(hosts: string[]) {
  if (hosts.length === 0) return "—";
  const sorted = [...hosts].sort((a, b) => a.length - b.length);
  return sorted[0] ?? hosts[0];
}

export default function HqPortfolioPage() {
  const router = useRouter();
  const { platforms, setSelectedPlatformId } = usePlatform();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (getStoredUser()?.role !== "SUPER_ADMIN") return;
    setLoading(true);
    setErr(null);
    const q = `from=${encodeURIComponent(`${from}T00:00:00.000Z`)}&to=${encodeURIComponent(`${to}T23:59:59.999Z`)}`;
    try {
      const res = await apiFetch<PortfolioResponse>(
        `/platforms/hq/portfolio-summary?${q}`,
      );
      setData(res);
      setDraftNotes((prev) => {
        const next = { ...prev };
        for (const row of res.rows) {
          next[row.platformId] = row.hedgeNote;
        }
        return next;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "SUPER_ADMIN") {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const platformById = useMemo(
    () => new Map(platforms.map((p) => [p.id, p])),
    [platforms],
  );

  async function saveNote(platformId: string) {
    setSavingId(platformId);
    setErr(null);
    try {
      await apiFetch(`/platforms/${platformId}/hq-portfolio-note`, {
        method: "PATCH",
        body: JSON.stringify({
          hedgeNote: draftNotes[platformId] ?? "",
        }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "메모 저장 실패");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
            Head Office
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">
            포트폴리오 · 헷징 장부
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-500">
            상위 벤더 알 대비 본사가 가져가는 마진, 솔루션 A/B/C 묶음별 현금
            잔여, 테더·원화 반가상 배정 상태를 같은 기간으로 묶어 봅니다. 행을
            펼치면 헷징·리스크 메모를 저장할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "오늘", from: today, to: today },
            { label: "이번달", from: monthStart, to: today },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setFrom(preset.from);
                setTo(preset.to);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                from === preset.from && to === preset.to
                  ? "bg-amber-600/20 text-amber-300"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {preset.label}
            </button>
          ))}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
          />
          <span className="text-xs text-zinc-600">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? "집계 중…" : "새로고침"}
          </button>
        </div>
      </div>

      {err ? (
        <p className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {err}
        </p>
      ) : null}

      {data ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              본사 현금 잔여 합
            </p>
            <p
              className={`mt-2 text-2xl font-bold font-mono ${moneyClass(Number(data.totals.solutionCashNet))}`}
            >
              {Number(data.totals.solutionCashNet) >= 0 ? "+" : ""}
              {krw(data.totals.solutionCashNet)}원
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              각 솔루션 (낙첨 − 총판 − 머니비용 − 상위알) 합산
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              정책 추정 잔여 합
            </p>
            <p
              className={`mt-2 text-2xl font-bold font-mono ${moneyClass(Number(data.totals.solutionPolicyNet))}`}
            >
              {Number(data.totals.solutionPolicyNet) >= 0 ? "+" : ""}
              {krw(data.totals.solutionPolicyNet)}원
            </p>
            <p className="mt-1 text-xs text-zinc-600">포인트·콤프 추정 반영</p>
          </div>
          <div className="rounded-2xl border border-rose-900/30 bg-rose-950/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              상위 알 원가 합
            </p>
            <p className="mt-2 text-2xl font-bold font-mono text-rose-300">
              {krw(data.totals.upstreamCost)}원
            </p>
            <p className="mt-1 text-xs text-zinc-600">기간 내 GGR×상위요율</p>
          </div>
          <div className="rounded-2xl border border-cyan-900/30 bg-cyan-950/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              솔루션 요율 마진 합
            </p>
            <p className="mt-2 text-2xl font-bold font-mono text-cyan-300">
              {krw(data.totals.solutionMargin)}원
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              청구액 {krw(data.totals.platformCharge)}원 − 상위원가
            </p>
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">솔루션</th>
              <th className="px-3 py-2.5">도메인</th>
              <th className="px-3 py-2.5">자산</th>
              <th className="px-3 py-2.5 text-right">상위알 / 청구%</th>
              <th className="px-3 py-2.5 text-right">본사 마진</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(data?.rows ?? []).map((row) => {
              const p = platformById.get(row.platformId);
              const root = p ? inferRootHost(p) : hostSummary(row.domainHosts);
              const admin = p ? inferAdminHost(p) : null;
              const agent = p ? inferAgentHost(p) : null;
              const open = expandedId === row.platformId;
              const smsConfigured =
                !row.semiVirtualEnabled || row.smsDeviceReady;
              const assetOk =
                row.hasKrwAccount && row.hasUsdtWallet && smsConfigured;
              return (
                <Fragment key={row.platformId}>
                  <tr className="bg-zinc-950/40 hover:bg-zinc-900/50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-zinc-100">{row.name}</p>
                      <p className="text-xs text-zinc-600">{row.slug}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-300">
                      <p>{root ?? "—"}</p>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        mod {admin ?? "—"} · agent {agent ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 ${row.hasKrwAccount ? "bg-emerald-950/50 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}
                        >
                          원화
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 ${row.hasUsdtWallet ? "bg-emerald-950/50 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}
                        >
                          USDT
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 ${row.semiVirtualEnabled ? "bg-violet-950/50 text-violet-300" : "bg-zinc-800 text-zinc-500"}`}
                        >
                          SMS
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-[11px] ${assetOk ? "text-emerald-500/90" : "text-amber-600/80"}`}
                      >
                        {assetOk ? "배정 완료에 가깝습니다" : "배정 점검 권장"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-zinc-400">
                      {row.loadError ? (
                        <span className="text-rose-400">{row.loadError}</span>
                      ) : (
                        <>
                          <p>
                            카 {row.upstreamCasinoPct ?? "—"}% → 청구{" "}
                            {row.platformCasinoPct ?? "—"}%
                          </p>
                          <p className="mt-1">
                            스 {row.upstreamSportsPct ?? "—"}% → 청구{" "}
                            {row.platformSportsPct ?? "—"}%
                          </p>
                          <p className="mt-1 text-amber-200/80">
                            +마진 {row.autoMarginPct ?? "—"}%
                          </p>
                        </>
                      )}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${row.loadError ? "" : moneyClass(Number(row.solutionCashNet))}`}
                    >
                      {row.loadError
                        ? "—"
                        : `${Number(row.solutionCashNet) >= 0 ? "+" : ""}${krw(row.solutionCashNet)}원`}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(open ? null : row.platformId)
                        }
                        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        {open ? "닫기" : "메모"}
                      </button>
                    </td>
                  </tr>
                  {open ? (
                    <tr className="bg-black/25">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                          <div>
                            <p className="text-xs font-semibold text-zinc-300">
                              헷징 · 리스크 메모
                            </p>
                            <p className="mt-1 text-[11px] text-zinc-600">
                              본사 내부용입니다. 솔루션 운영자에게는 노출되지
                              않습니다.
                              {row.hedgeUpdatedAt
                                ? ` · 마지막 저장 ${new Date(row.hedgeUpdatedAt).toLocaleString("ko-KR")}`
                                : ""}
                            </p>
                            <textarea
                              value={draftNotes[row.platformId] ?? ""}
                              onChange={(e) =>
                                setDraftNotes((prev) => ({
                                  ...prev,
                                  [row.platformId]: e.target.value,
                                }))
                              }
                              rows={5}
                              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200"
                              placeholder="예: A·B 묶음 익스포저 상쇄, C는 테더 풀 분리, 익월 청구율 재협상 등"
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={savingId === row.platformId}
                                onClick={() => void saveNote(row.platformId)}
                                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
                              >
                                {savingId === row.platformId
                                  ? "저장 중…"
                                  : "메모 저장"}
                              </button>
                            </div>
                          </div>
                          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 space-y-2">
                            {!row.loadError ? (
                              <>
                                <p>
                                  낙첨금{" "}
                                  <span className="font-mono text-zinc-200">
                                    {krw(row.houseEdge)}원
                                  </span>
                                </p>
                                <p>
                                  플랫폼 현금 순익{" "}
                                  <span className="font-mono text-zinc-200">
                                    {krw(row.cashNet)}원
                                  </span>
                                </p>
                                <p>
                                  정책 추정 순익{" "}
                                  <span className="font-mono text-zinc-200">
                                    {krw(row.solutionPolicyNet)}원
                                  </span>
                                </p>
                                <p>
                                  베팅 GGR(참고){" "}
                                  <span className="font-mono text-zinc-200">
                                    {krw(row.ggr)}원
                                  </span>
                                </p>
                              </>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlatformId(row.platformId);
                                  router.push("/console/operational");
                                }}
                                className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
                              >
                                알값 / 정책
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlatformId(row.platformId);
                                  router.push("/console/sales");
                                }}
                                className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
                              >
                                청구 / 정산
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlatformId(row.platformId);
                                  router.push("/console/assets");
                                }}
                                className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
                              >
                                자산 배정
                              </button>
                            </div>
                            <Link
                              href="/console/platforms"
                              className="inline-block mt-2 text-amber-400 hover:text-amber-300"
                            >
                              솔루션 도메인 관리 →
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {data && data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-zinc-500"
                >
                  등록된 솔루션이 없습니다.
                </td>
              </tr>
            ) : null}
            {!data && !err ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-zinc-500"
                >
                  {loading ? "집계 중…" : "—"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
