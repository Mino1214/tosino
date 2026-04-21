"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type IntegrationsResponse = {
  platformId: string;
  slug: string;
  name: string;
  integrationsJson: Record<string, unknown>;
};

type OddsApiForm = {
  enabled: boolean;
  sportsCsv: string;
  bookmakersCsv: string;
  status: "all" | "live" | "prematch";
  cacheTtlSeconds: string;
  matchLimit: string;
  title: string;
  subtitle: string;
  quickAmountsCsv: string;
  marketPriorityCsv: string;
  showBookmakerCount: boolean;
  showSourceBookmaker: boolean;
};

type RefreshResult = {
  enabled: boolean;
  liveCount: number;
  prematchCount: number;
  catalogCount: number;
  fetchedAt: string;
  filters: {
    sports: string[];
    bookmakers: string[];
    matchLimit: number;
    cacheTtlSeconds: number;
  } | null;
};

const DEFAULT_FORM: OddsApiForm = {
  enabled: false,
  sportsCsv: "football,basketball",
  bookmakersCsv: "Bet365,Betfair Exchange,1xBet,SBOBET,BetMGM",
  status: "all",
  cacheTtlSeconds: "30",
  matchLimit: "120",
  title: "배팅카트",
  subtitle: "실시간 배당 기준",
  quickAmountsCsv: "10000,50000,100000,300000,500000,1000000",
  marketPriorityCsv: "moneyline,handicap,totals",
  showBookmakerCount: true,
  showSourceBookmaker: true,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArrayToCsv(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join(",");
}

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadForm(integrationsJson: Record<string, unknown>): OddsApiForm {
  const oddsApi = asRecord(integrationsJson.oddsApi);
  const template = asRecord(oddsApi.betSlipTemplate);
  return {
    enabled: oddsApi.enabled === true,
    sportsCsv: stringArrayToCsv(oddsApi.sports) || DEFAULT_FORM.sportsCsv,
    bookmakersCsv:
      stringArrayToCsv(oddsApi.bookmakers) || DEFAULT_FORM.bookmakersCsv,
    status:
      oddsApi.status === "live" || oddsApi.status === "prematch"
        ? oddsApi.status
        : "all",
    cacheTtlSeconds:
      typeof oddsApi.cacheTtlSeconds === "number"
        ? String(oddsApi.cacheTtlSeconds)
        : DEFAULT_FORM.cacheTtlSeconds,
    matchLimit:
      typeof oddsApi.matchLimit === "number"
        ? String(oddsApi.matchLimit)
        : DEFAULT_FORM.matchLimit,
    title:
      typeof template.title === "string" ? template.title : DEFAULT_FORM.title,
    subtitle:
      typeof template.subtitle === "string"
        ? template.subtitle
        : DEFAULT_FORM.subtitle,
    quickAmountsCsv:
      Array.isArray(template.quickAmounts) && template.quickAmounts.length > 0
        ? template.quickAmounts.join(",")
        : DEFAULT_FORM.quickAmountsCsv,
    marketPriorityCsv:
      stringArrayToCsv(template.marketPriority) ||
      DEFAULT_FORM.marketPriorityCsv,
    showBookmakerCount:
      template.showBookmakerCount !== false,
    showSourceBookmaker:
      template.showSourceBookmaker !== false,
  };
}

function toPositiveInt(value: string, fallback: number) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function ConsoleLiveOddsPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [integrationRes, setIntegrationRes] =
    useState<IntegrationsResponse | null>(null);
  const [form, setForm] = useState<OddsApiForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null);

  const load = useCallback(async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await apiFetch<IntegrationsResponse>(
        `/platforms/${selectedPlatformId}/integrations`,
      );
      setIntegrationRes(res);
      setForm(loadForm(res.integrationsJson ?? {}));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "불러오기 실패");
      setIntegrationRes(null);
    } finally {
      setLoading(false);
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) {
      setIntegrationRes(null);
      setRefreshResult(null);
      return;
    }
    void load();
  }, [selectedPlatformId, platformLoading, load]);

  const normalizedPreview = useMemo(() => {
    const sports = parseCsvList(form.sportsCsv);
    const bookmakers = parseCsvList(form.bookmakersCsv);
    const quickAmounts = parseCsvList(form.quickAmountsCsv)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    const marketPriority = parseCsvList(form.marketPriorityCsv)
      .filter((value) =>
        ["moneyline", "handicap", "totals"].includes(value),
      );
    return {
      sports,
      bookmakers,
      quickAmounts,
      marketPriority,
      cacheTtlSeconds: toPositiveInt(form.cacheTtlSeconds, 30),
      matchLimit: toPositiveInt(form.matchLimit, 120),
    };
  }, [form]);

  async function save() {
    if (!selectedPlatformId || !integrationRes) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const nextIntegrations = {
        ...(integrationRes.integrationsJson ?? {}),
        oddsApi: {
          enabled: form.enabled,
          sports: normalizedPreview.sports,
          bookmakers: normalizedPreview.bookmakers,
          status: form.status,
          cacheTtlSeconds: normalizedPreview.cacheTtlSeconds,
          matchLimit: normalizedPreview.matchLimit,
          betSlipTemplate: {
            title: form.title.trim() || DEFAULT_FORM.title,
            subtitle: form.subtitle.trim() || DEFAULT_FORM.subtitle,
            quickAmounts:
              normalizedPreview.quickAmounts.length > 0
                ? normalizedPreview.quickAmounts
                : parseCsvList(DEFAULT_FORM.quickAmountsCsv).map(Number),
            marketPriority:
              normalizedPreview.marketPriority.length > 0
                ? normalizedPreview.marketPriority
                : ["moneyline", "handicap", "totals"],
            showBookmakerCount: form.showBookmakerCount,
            showSourceBookmaker: form.showSourceBookmaker,
          },
        },
      };
      const patched = await apiFetch<{ id: string; integrationsJson: Record<string, unknown> }>(
        `/platforms/${selectedPlatformId}/integrations`,
        {
          method: "PATCH",
          body: JSON.stringify({ integrationsJson: nextIntegrations }),
        },
      );
      const nextRes = {
        ...integrationRes,
        integrationsJson: patched.integrationsJson,
      };
      setIntegrationRes(nextRes);
      setForm(loadForm(patched.integrationsJson));
      setSaveMsg("저장했습니다.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function refreshSnapshots() {
    if (!selectedPlatformId) return;
    setRefreshing(true);
    setSaveMsg(null);
    try {
      const res = await apiFetch<RefreshResult>(
        `/platforms/${selectedPlatformId}/sync/odds-api-snapshots`,
        {
          method: "POST",
        },
      );
      setRefreshResult(res);
      setSaveMsg("스냅샷을 새로 저장했습니다.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "스냅샷 저장 실패");
    } finally {
      setRefreshing(false);
    }
  }

  if (platformLoading) {
    return <p className="text-gray-500">불러오는 중…</p>;
  }

  if (!selectedPlatformId) {
    return (
      <p className="text-sm text-gray-500">
        왼쪽에서 플랫폼을 선택한 뒤 다시 오세요.
      </p>
    );
  }

  if (loading && !integrationRes) {
    return <p className="text-sm text-gray-500">연동 설정을 불러오는 중…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black">
            Live Odds / Betting Slip
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            `odds-api.io → 서버 스냅샷 저장 → 클라이언트 공개 API` 흐름에서
            플랫폼별 필터와 베팅 슬립 모양을 미리 정합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            다시 불러오기
          </button>
          <button
            type="button"
            onClick={() => void refreshSnapshots()}
            disabled={refreshing}
            className="rounded-lg border border-[#3182f6]/30 bg-[#3182f6]/5 px-4 py-2 text-sm font-medium text-[#3182f6] hover:bg-[#3182f6]/10 disabled:opacity-50"
          >
            {refreshing ? "저장 중…" : "스냅샷 저장"}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="rounded-lg bg-[#3182f6] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "설정 저장"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        실제 upstream WebSocket 구독 종목과 시장은 HQ 콘솔의{" "}
        <strong>Live Odds (odds-api.io)</strong> 설정을 따릅니다. 이 화면은 그
        전역 피드에서 우리 플랫폼에 보여줄 종목/북메이커 subset 과 슬립 템플릿을
        정하는 용도입니다.
      </div>

      {loadErr ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadErr}
        </div>
      ) : null}
      {saveMsg ? (
        <div className="rounded-xl border border-[#3182f6]/20 bg-[#3182f6]/5 px-4 py-3 text-sm text-gray-700">
          {saveMsg}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-black">플랫폼 필터</h2>
              <p className="mt-1 text-sm text-gray-500">
                어떤 종목과 북메이커를 스냅샷으로 저장하고 회원에게 보여줄지 정합니다.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enabled: e.target.checked }))
                }
              />
              odds-api 사용
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-600">
              종목 슬러그 (쉼표)
              <input
                value={form.sportsCsv}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sportsCsv: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                placeholder="football,basketball"
              />
            </label>
            <label className="block text-sm text-gray-600">
              상태 필터
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as OddsApiForm["status"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="all">live + prematch</option>
                <option value="live">live only</option>
                <option value="prematch">prematch only</option>
              </select>
            </label>
            <label className="block text-sm text-gray-600 md:col-span-2">
              북메이커 (쉼표)
              <input
                value={form.bookmakersCsv}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bookmakersCsv: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                placeholder="Bet365,Betfair Exchange,1xBet,SBOBET,BetMGM"
              />
            </label>
            <label className="block text-sm text-gray-600">
              스냅샷 TTL (초)
              <input
                type="number"
                min={1}
                value={form.cacheTtlSeconds}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cacheTtlSeconds: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block text-sm text-gray-600">
              최대 경기 수
              <input
                type="number"
                min={1}
                value={form.matchLimit}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    matchLimit: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-semibold text-black">베팅 슬립 템플릿</h2>
            <p className="mt-1 text-sm text-gray-500">
              카트 헤더, 빠른 금액, 시장 우선순위를 미리 정해서 클라이언트로 내려줍니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-600">
              슬립 제목
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block text-sm text-gray-600">
              보조 문구
              <input
                value={form.subtitle}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block text-sm text-gray-600">
              빠른 금액 (쉼표)
              <input
                value={form.quickAmountsCsv}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    quickAmountsCsv: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                placeholder="10000,50000,100000"
              />
            </label>
            <label className="block text-sm text-gray-600">
              시장 우선순위 (쉼표)
              <input
                value={form.marketPriorityCsv}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    marketPriorityCsv: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                placeholder="moneyline,handicap,totals"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.showBookmakerCount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    showBookmakerCount: e.target.checked,
                  }))
                }
              />
              북메이커 수 표시
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.showSourceBookmaker}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    showSourceBookmaker: e.target.checked,
                  }))
                }
              />
              소스 북메이커 표시
            </label>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-black">미리보기</h2>
            <div className="mt-4 space-y-3 rounded-2xl border border-[#3182f6]/15 bg-[#0a0a0e] p-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-sm font-semibold">
                    {form.title || DEFAULT_FORM.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {form.subtitle || DEFAULT_FORM.subtitle}
                  </p>
                </div>
                <span className="rounded-full bg-[rgba(218,174,87,0.18)] px-2 py-1 text-[10px] font-bold text-[#d7b25a]">
                  {normalizedPreview.bookmakers.length} BOOKIES
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(normalizedPreview.quickAmounts.length > 0
                  ? normalizedPreview.quickAmounts
                  : [10000, 50000, 100000]
                )
                  .slice(0, 6)
                  .map((value) => (
                    <div
                      key={value}
                      className="rounded border border-white/10 px-2 py-1.5 text-center text-[11px] text-zinc-300"
                    >
                      {value.toLocaleString("ko-KR")}
                    </div>
                  ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[12px] text-zinc-300">
                <p>시장 우선순위</p>
                <p className="mt-1 font-mono text-[#d7b25a]">
                  {normalizedPreview.marketPriority.join(" → ") || "moneyline → handicap → totals"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-black">스냅샷 상태</h2>
            {refreshResult ? (
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>저장 시각: {new Date(refreshResult.fetchedAt).toLocaleString("ko-KR")}</p>
                <p>raw catalog: {refreshResult.catalogCount}건</p>
                <p>live: {refreshResult.liveCount}경기</p>
                <p>prematch: {refreshResult.prematchCount}경기</p>
                <p>
                  sports:{" "}
                  {refreshResult.filters?.sports.length
                    ? refreshResult.filters.sports.join(", ")
                    : "전체"}
                </p>
                <p>
                  bookmakers:{" "}
                  {refreshResult.filters?.bookmakers.length
                    ? refreshResult.filters.bookmakers.join(", ")
                    : "전체"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                저장 버튼을 누르면 현재 메모리 피드가 플랫폼 전용 스냅샷으로 DB에 저장됩니다.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
