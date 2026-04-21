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

function toPositiveInt(value: string, fallback: number) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
    showBookmakerCount: template.showBookmakerCount !== false,
    showSourceBookmaker: template.showSourceBookmaker !== false,
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "아직 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export default function OddsApiWsPage() {
  const { selectedPlatformId, platforms, loading: platformLoading } =
    usePlatform();
  const selectedPlatform =
    platforms.find((platform) => platform.id === selectedPlatformId) ?? null;
  const [integrationRes, setIntegrationRes] =
    useState<IntegrationsResponse | null>(null);
  const [form, setForm] = useState<OddsApiForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(
    null,
  );

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
    const marketPriority = parseCsvList(form.marketPriorityCsv).filter(
      (value) => ["moneyline", "handicap", "totals"].includes(value),
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
      const patched = await apiFetch<{
        id: string;
        integrationsJson: Record<string, unknown>;
      }>(`/platforms/${selectedPlatformId}/integrations`, {
        method: "PATCH",
        body: JSON.stringify({ integrationsJson: nextIntegrations }),
      });
      const nextRes = {
        ...integrationRes,
        integrationsJson: patched.integrationsJson,
      };
      setIntegrationRes(nextRes);
      setForm(loadForm(patched.integrationsJson));
      setSaveMsg("마스터 콘솔에서도 같은 설정으로 저장했습니다.");
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
      setSaveMsg("선택한 플랫폼의 odds-api 스냅샷을 다시 저장했습니다.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "스냅샷 저장 실패");
    } finally {
      setRefreshing(false);
    }
  }

  if (platformLoading) {
    return <p className="text-sm text-zinc-500">불러오는 중…</p>;
  }

  if (!selectedPlatformId) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-4">
        <p className="text-sm text-zinc-400">
          상단에서 플랫폼을 먼저 선택해 주세요. 이 화면은 선택한 플랫폼별
          `odds-api.io → 서버 스냅샷 → 클라이언트 API` 구성을 편집합니다.
        </p>
      </div>
    );
  }

  if (loading && !integrationRes) {
    return (
      <p className="text-sm text-zinc-500">연동 설정을 불러오는 중…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Odds API
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">
            Live Odds / Betting Slip
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            현재 선택된 플랫폼
            <span className="mx-1 font-semibold text-zinc-200">
              {selectedPlatform?.name ?? integrationRes?.name ?? "미선택"}
            </span>
            기준으로 노출 종목, 북메이커 subset, 베팅 슬립 템플릿을 관리합니다.
            HQ의 실제 WebSocket 구독 설정은 그대로 두고, 여기서는 플랫폼별
            저장/노출 정책만 조정합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            다시 불러오기
          </button>
          <button
            type="button"
            onClick={() => void refreshSnapshots()}
            disabled={refreshing}
            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
          >
            {refreshing ? "저장 중…" : "스냅샷 저장"}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "설정 저장"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        마스터 콘솔의 이 화면은
        <span className="mx-1 font-semibold">플랫폼별 표시 정책</span>을 다룹니다.
        upstream 구독 종목과 시장은 여전히 API 서버의 `ODDS_API_KEY`,
        `ODDSHOST_BASE_URL`, HQ WS 설정을 따릅니다.
      </div>

      {loadErr ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadErr}
        </div>
      ) : null}

      {saveMsg ? (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          {saveMsg}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                플랫폼 필터
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                스냅샷으로 저장할 종목, 상태, 북메이커 범위를 정합니다.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300">
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
            <label className="block text-sm text-zinc-400">
              종목 슬러그 (쉼표)
              <input
                value={form.sportsCsv}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sportsCsv: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="football,basketball"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              상태 필터
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as OddsApiForm["status"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="all">live + prematch</option>
                <option value="live">live only</option>
                <option value="prematch">prematch only</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-400 md:col-span-2">
              북메이커 (쉼표)
              <input
                value={form.bookmakersCsv}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bookmakersCsv: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Bet365,Betfair Exchange,1xBet,SBOBET,BetMGM"
              />
            </label>
            <label className="block text-sm text-zinc-400">
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
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
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
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <h2 className="text-base font-semibold text-zinc-100">
              배팅 슬립 템플릿
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              회원 페이지의 배팅카트 제목, 빠른 금액, 시장 우선순위를 미리
              지정합니다.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-zinc-400">
                슬립 제목
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm text-zinc-400">
                슬립 부제
                <input
                  value={form.subtitle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm text-zinc-400">
                빠른 금액 (쉼표)
                <input
                  value={form.quickAmountsCsv}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      quickAmountsCsv: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  placeholder="10000,50000,100000"
                />
              </label>
              <label className="block text-sm text-zinc-400">
                시장 우선순위 (쉼표)
                <input
                  value={form.marketPriorityCsv}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      marketPriorityCsv: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  placeholder="moneyline,handicap,totals"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
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
                비교한 북메이커 수 표시
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
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
                원본 북메이커 표시
              </label>
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              현재 미리보기
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              저장 전에도 현재 입력값 기준으로 회원 화면 구성을 빠르게 볼 수
              있습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-sm font-semibold text-zinc-100">
              {form.title || DEFAULT_FORM.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {form.subtitle || DEFAULT_FORM.subtitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(normalizedPreview.quickAmounts.length > 0
                ? normalizedPreview.quickAmounts
                : parseCsvList(DEFAULT_FORM.quickAmountsCsv).map(Number)
              ).map((amount) => (
                <span
                  key={amount}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
                >
                  {amount.toLocaleString("ko-KR")}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-xs text-zinc-400">
              <p>
                종목:{" "}
                <span className="text-zinc-200">
                  {normalizedPreview.sports.join(", ") || "미설정"}
                </span>
              </p>
              <p>
                북메이커:{" "}
                <span className="text-zinc-200">
                  {normalizedPreview.bookmakers.join(", ") || "미설정"}
                </span>
              </p>
              <p>
                시장 우선순위:{" "}
                <span className="text-zinc-200">
                  {normalizedPreview.marketPriority.join(" → ") || "기본값"}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm">
            <h3 className="font-semibold text-zinc-100">최근 스냅샷 결과</h3>
            {refreshResult ? (
              <div className="mt-3 space-y-2 text-zinc-400">
                <p>
                  저장 시각:{" "}
                  <span className="text-zinc-200">
                    {formatDateTime(refreshResult.fetchedAt)}
                  </span>
                </p>
                <p>
                  라이브 경기 수:{" "}
                  <span className="text-zinc-200">
                    {refreshResult.liveCount}
                  </span>
                </p>
                <p>
                  프리매치 수:{" "}
                  <span className="text-zinc-200">
                    {refreshResult.prematchCount}
                  </span>
                </p>
                <p>
                  적용 북메이커:{" "}
                  <span className="text-zinc-200">
                    {refreshResult.filters?.bookmakers.join(", ") || "없음"}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-zinc-500">
                아직 이 세션에서 수동 저장을 실행하지 않았습니다.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
