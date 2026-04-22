"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type WhitelistRow = {
  id: string;
  sport: string;
  externalEventId: string;
  source: string;
  addedAt: string;
  expiresAt: string | null;
};

type WhitelistStats = {
  total: number;
  expired: number;
  bySport: { sport: string; count: number }[];
  latestAddedAt: string | null;
};

type PlatformIntegrations = {
  oddsApi?: {
    enabled?: boolean;
    useDisplayWhitelist?: boolean;
    sports?: string[];
    bookmakers?: string[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

type PlatformIntegrationsResponse = {
  id: string;
  integrationsJson: PlatformIntegrations;
};

export default function OddsApiWhitelistPage() {
  const { platforms, selectedPlatformId } = usePlatform();
  const [stats, setStats] = useState<WhitelistStats | null>(null);
  const [rows, setRows] = useState<WhitelistRow[]>([]);
  const [sportFilter, setSportFilter] = useState<string>("");
  const [take, setTake] = useState<number>(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [integrations, setIntegrations] = useState<PlatformIntegrations | null>(
    null,
  );

  const selectedPlatform = useMemo(
    () => platforms.find((p) => p.id === selectedPlatformId) ?? null,
    [platforms, selectedPlatformId],
  );

  const refreshStats = useCallback(async () => {
    try {
      const r = await apiFetch<WhitelistStats>(
        "/hq/odds-api-ws/whitelist/stats",
      );
      setStats(r);
    } catch (e) {
      console.warn("whitelist stats load fail", e);
    }
  }, []);

  const refreshRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = sportFilter.trim();
      const qs = sp
        ? `?sport=${encodeURIComponent(sp)}&take=${take}`
        : `?take=${take}`;
      const r = await apiFetch<{ total: number; rows: WhitelistRow[] }>(
        `/hq/odds-api-ws/whitelist${qs}`,
      );
      setRows(r.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [sportFilter, take]);

  const refreshIntegrations = useCallback(async () => {
    if (!selectedPlatformId) {
      setIntegrations(null);
      return;
    }
    try {
      const r = await apiFetch<PlatformIntegrationsResponse>(
        `/platforms/${selectedPlatformId}/integrations`,
      );
      setIntegrations(r.integrationsJson ?? {});
    } catch (e) {
      console.warn("integrations load fail", e);
      setIntegrations(null);
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    void refreshStats();
    void refreshRows();
  }, [refreshStats, refreshRows]);

  useEffect(() => {
    void refreshIntegrations();
  }, [refreshIntegrations]);

  const setUseDisplayWhitelist = async (next: boolean) => {
    if (!selectedPlatformId || !integrations) return;
    setToggleBusy(true);
    try {
      const nextJson: PlatformIntegrations = {
        ...integrations,
        oddsApi: {
          ...(integrations.oddsApi || {}),
          useDisplayWhitelist: next,
        },
      };
      await apiFetch(`/platforms/${selectedPlatformId}/integrations`, {
        method: "PATCH",
        body: JSON.stringify({ integrationsJson: nextJson }),
      });
      setIntegrations(nextJson);
    } catch (e) {
      alert(e instanceof Error ? e.message : "토글 저장 실패");
    } finally {
      setToggleBusy(false);
    }
  };

  const clearAll = async () => {
    if (!confirm("정말 모든 whitelist 엔트리를 삭제할까요?")) return;
    try {
      await apiFetch("/hq/odds-api-ws/whitelist/clear", {
        method: "POST",
        body: "{}",
      });
      await Promise.all([refreshStats(), refreshRows()]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const clearSport = async () => {
    const sp = sportFilter.trim();
    if (!sp) {
      alert("먼저 종목을 선택하세요.");
      return;
    }
    if (!confirm(`${sp} 종목의 whitelist 를 모두 삭제할까요?`)) return;
    try {
      await apiFetch("/hq/odds-api-ws/whitelist/clear", {
        method: "POST",
        body: JSON.stringify({ sport: sp }),
      });
      await Promise.all([refreshStats(), refreshRows()]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const purgeExpired = async () => {
    try {
      const r = await apiFetch<{ removed: number }>(
        "/hq/odds-api-ws/whitelist/purge-expired",
        { method: "POST", body: "{}" },
      );
      alert(`만료 엔트리 ${r.removed}개 정리 완료`);
      await Promise.all([refreshStats(), refreshRows()]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "정리 실패");
    }
  };

  const sportOptions = useMemo(
    () => (stats?.bySport || []).map((r) => r.sport).sort(),
    [stats],
  );

  const useWl = integrations?.oddsApi?.useDisplayWhitelist === true;

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Odds-API Display Whitelist</h1>
        <p className="text-sm text-zinc-400 mt-1">
          스코어 크롤러가 &quot;솔루션에 실제 표시 가능한 경기&quot; 목록을 주입합니다. 플랫폼별로 토글을 켜면, 해당 플랫폼의 솔루션에는 whitelist 에 등록된 (종목, externalId) 조합만 노출됩니다. 토글이 꺼져있거나 해당 종목 whitelist 가 비어있으면 필터 미적용(전량 노출).
        </p>
      </header>

      {/* platform toggle */}
      <section className="p-4 rounded border border-zinc-800 bg-zinc-950 space-y-2">
        <h2 className="text-sm font-medium text-zinc-200">플랫폼 설정</h2>
        {selectedPlatform ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm">
              <span className="text-zinc-500">플랫폼:</span>{" "}
              <span className="text-white font-mono">{selectedPlatform.name}</span>{" "}
              <span className="text-zinc-600 text-xs">({selectedPlatform.id})</span>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={toggleBusy || !integrations}
                checked={useWl}
                onChange={(e) => setUseDisplayWhitelist(e.target.checked)}
              />
              <span>Display Whitelist 필터 사용</span>
              {toggleBusy && (
                <span className="text-xs text-zinc-500">저장중…</span>
              )}
            </label>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">플랫폼을 선택하세요.</div>
        )}
      </section>

      {/* stats */}
      {stats && (
        <section className="grid grid-cols-3 gap-3">
          <StatCard label="Whitelist 총 엔트리" value={stats.total.toLocaleString()} />
          <StatCard label="만료됨" value={stats.expired.toLocaleString()} hint="purge 로 정리 가능" />
          <StatCard
            label="최근 업데이트"
            value={
              stats.latestAddedAt
                ? new Date(stats.latestAddedAt).toLocaleString("ko-KR")
                : "—"
            }
          />
        </section>
      )}

      {stats && stats.bySport.length > 0 && (
        <section className="p-4 rounded border border-zinc-800 bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-200 mb-2">종목별 분포</h2>
          <div className="flex flex-wrap gap-2">
            {stats.bySport.map((r) => (
              <span
                key={r.sport}
                className="px-2 py-1 text-xs rounded bg-zinc-900 border border-zinc-800"
              >
                <span className="text-zinc-400">{r.sport}</span>{" "}
                <span className="text-white font-mono">{r.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* controls */}
      <section className="flex flex-wrap items-end gap-3 p-4 rounded border border-zinc-800 bg-zinc-950">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">종목 필터</span>
          <select
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm min-w-40"
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
          >
            <option value="">전체</option>
            {sportOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">표시 수</span>
          <select
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
            value={take}
            onChange={(e) => setTake(parseInt(e.target.value, 10))}
          >
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            className="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700"
            onClick={() => {
              void refreshStats();
              void refreshRows();
            }}
          >
            새로고침
          </button>
          <button
            className="px-3 py-2 text-sm rounded bg-amber-700 hover:bg-amber-600"
            onClick={purgeExpired}
          >
            만료 정리
          </button>
          <button
            className="px-3 py-2 text-sm rounded bg-red-800 hover:bg-red-700 disabled:opacity-40"
            disabled={!sportFilter.trim()}
            onClick={clearSport}
          >
            종목 전체 삭제
          </button>
          <button
            className="px-3 py-2 text-sm rounded bg-red-900 hover:bg-red-800"
            onClick={clearAll}
          >
            전체 초기화
          </button>
        </div>
      </section>

      {error && (
        <div className="p-3 rounded border border-red-800 bg-red-950 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">종목</th>
              <th className="px-3 py-2 text-left font-medium">externalEventId</th>
              <th className="px-3 py-2 text-left font-medium">소스</th>
              <th className="px-3 py-2 text-left font-medium">추가</th>
              <th className="px-3 py-2 text-left font-medium">만료</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-zinc-500">
                  로딩 중…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-zinc-500">
                  whitelist 엔트리가 없습니다. 스코어 크롤러가 주입해야 합니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-400">{r.sport}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.externalEventId}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{r.source}</td>
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                    {new Date(r.addedAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                    {r.expiresAt
                      ? new Date(r.expiresAt).toLocaleString("ko-KR")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="p-4 rounded border border-zinc-800 bg-zinc-950 text-xs text-zinc-400 space-y-2">
        <h3 className="text-sm text-zinc-200 font-medium">크롤러 연결 방법</h3>
        <p>
          스코어 크롤러는 아래 엔드포인트로 whitelist 를 주입합니다. 인증 헤더로{" "}
          <code className="font-mono bg-zinc-900 px-1 rounded">x-integration-key</code>{" "}
          또는 <code className="font-mono bg-zinc-900 px-1 rounded">Authorization: Integration &lt;key&gt;</code>{" "}
          를 보내야 하며, 서버 env{" "}
          <code className="font-mono bg-zinc-900 px-1 rounded">ODDS_API_INTEGRATION_KEYS</code>{" "}
          (콤마 구분) 에 등록된 키만 통과됩니다.
        </p>
        <pre className="font-mono text-[11px] bg-black/40 p-2 rounded whitespace-pre-wrap">
{`POST /api/integrations/odds-api-whitelist/replace
{ "sport": "football", "externalEventIds": ["70311954", ...], "ttlSeconds": 3600 }`}
        </pre>
        <pre className="font-mono text-[11px] bg-black/40 p-2 rounded whitespace-pre-wrap">
{`POST /api/integrations/odds-api-whitelist/bulk-replace
{ "bySport": { "football": [...], "basketball": [...] }, "ttlSeconds": 3600 }`}
        </pre>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="p-4 rounded border border-zinc-800 bg-zinc-950">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
