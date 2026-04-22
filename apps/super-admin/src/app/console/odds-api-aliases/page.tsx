"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type LeagueAlias = {
  id: string;
  sport: string;
  slug: string;
  originalName: string;
  koreanName: string | null;
  logoUrl: string | null;
  country: string | null;
  displayPriority: number;
  isHidden: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
};

type TeamAlias = {
  id: string;
  sport: string;
  externalId: string;
  originalName: string;
  koreanName: string | null;
  logoUrl: string | null;
  country: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
};

type AliasStats = {
  league: {
    total: number;
    mapped: number;
    unmapped: number;
    bySport: { sport: string; count: number }[];
  };
  team: {
    total: number;
    mapped: number;
    unmapped: number;
    bySport: { sport: string; count: number }[];
  };
};

type Tab = "leagues" | "teams";

function buildQuery(params: Record<string, string | boolean | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default function OddsApiAliasesPage() {
  const [tab, setTab] = useState<Tab>("leagues");
  const [stats, setStats] = useState<AliasStats | null>(null);

  const [sport, setSport] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [onlyUnmapped, setOnlyUnmapped] = useState<boolean>(false);
  const [take, setTake] = useState<number>(200);

  const [leagues, setLeagues] = useState<LeagueAlias[]>([]);
  const [teams, setTeams] = useState<TeamAlias[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, Partial<LeagueAlias & TeamAlias>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const r = await apiFetch<AliasStats>("/hq/odds-api-ws/aliases/stats");
      setStats(r);
    } catch (e) {
      console.warn("stats load fail", e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery({ sport, q, onlyUnmapped: onlyUnmapped ? "true" : "", take });
      if (tab === "leagues") {
        const r = await apiFetch<{ total: number; rows: LeagueAlias[] }>(
          `/hq/odds-api-ws/aliases/leagues${qs}`,
        );
        setLeagues(r.rows);
      } else {
        const r = await apiFetch<{ total: number; rows: TeamAlias[] }>(
          `/hq/odds-api-ws/aliases/teams${qs}`,
        );
        setTeams(r.rows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [tab, sport, q, onlyUnmapped, take]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    void load();
  }, [load]);

  const sportsInTab = useMemo(() => {
    if (!stats) return [] as string[];
    const arr = tab === "leagues" ? stats.league.bySport : stats.team.bySport;
    return arr.map((r) => r.sport).sort();
  }, [stats, tab]);

  const applyEdit = (id: string, patch: Partial<LeagueAlias & TeamAlias>) => {
    setEditing((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const saveLeague = async (row: LeagueAlias) => {
    const patch = editing[row.id] || {};
    setSavingId(row.id);
    try {
      const body: Record<string, unknown> = {};
      if ("koreanName" in patch) body.koreanName = patch.koreanName ?? null;
      if ("logoUrl" in patch) body.logoUrl = patch.logoUrl ?? null;
      if ("country" in patch) body.country = patch.country ?? null;
      if ("displayPriority" in patch) body.displayPriority = patch.displayPriority;
      if ("isHidden" in patch) body.isHidden = patch.isHidden;
      const updated = await apiFetch<LeagueAlias>(
        `/hq/odds-api-ws/aliases/leagues/${row.id}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setLeagues((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setEditing((prev) => {
        const { [row.id]: _drop, ...rest } = prev;
        return rest;
      });
      void refreshStats();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingId(null);
    }
  };

  const saveTeam = async (row: TeamAlias) => {
    const patch = editing[row.id] || {};
    setSavingId(row.id);
    try {
      const body: Record<string, unknown> = {};
      if ("koreanName" in patch) body.koreanName = patch.koreanName ?? null;
      if ("logoUrl" in patch) body.logoUrl = patch.logoUrl ?? null;
      if ("country" in patch) body.country = patch.country ?? null;
      const updated = await apiFetch<TeamAlias>(
        `/hq/odds-api-ws/aliases/teams/${row.id}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setTeams((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setEditing((prev) => {
        const { [row.id]: _drop, ...rest } = prev;
        return rest;
      });
      void refreshStats();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Odds-API 매핑 관리</h1>
          <p className="text-sm text-zinc-400 mt-1">
            odds-api.io 원본 리그/팀 이름을 한글명·로고·표시 우선순위로 매핑합니다. 수집 때 자동으로 등록되므로 여기서는 보강만 하면 됩니다.
          </p>
        </div>
        <button
          className="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700"
          onClick={() => {
            void refreshStats();
            void load();
          }}
        >
          새로고침
        </button>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="리그"
            total={stats.league.total}
            mapped={stats.league.mapped}
            unmapped={stats.league.unmapped}
          />
          <StatCard
            label="팀"
            total={stats.team.total}
            mapped={stats.team.mapped}
            unmapped={stats.team.unmapped}
          />
        </div>
      )}

      <div className="flex gap-2 border-b border-zinc-800">
        <TabBtn active={tab === "leagues"} onClick={() => setTab("leagues")}>
          리그 ({stats?.league.total ?? 0})
        </TabBtn>
        <TabBtn active={tab === "teams"} onClick={() => setTab("teams")}>
          팀 ({stats?.team.total ?? 0})
        </TabBtn>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="종목">
          <select
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm min-w-40"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            <option value="">전체</option>
            {sportsInTab.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="검색">
          <input
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-60"
            placeholder={tab === "leagues" ? "slug / 원본명 / 한글명" : "externalId / 원본명 / 한글명"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
        <Field label="미매핑만">
          <label className="inline-flex items-center gap-2 h-[30px]">
            <input
              type="checkbox"
              checked={onlyUnmapped}
              onChange={(e) => setOnlyUnmapped(e.target.checked)}
            />
            <span className="text-sm text-zinc-400">koreanName 비어있음</span>
          </label>
        </Field>
        <Field label="표시 수">
          <select
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
            value={take}
            onChange={(e) => setTake(parseInt(e.target.value, 10))}
          >
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </Field>
      </div>

      {error && (
        <div className="p-3 rounded border border-red-800 bg-red-950 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400">로딩 중…</div>
      ) : tab === "leagues" ? (
        <LeagueTable
          rows={leagues}
          editing={editing as Record<string, Partial<LeagueAlias>>}
          onChange={applyEdit}
          onSave={saveLeague}
          savingId={savingId}
        />
      ) : (
        <TeamTable
          rows={teams}
          editing={editing as Record<string, Partial<TeamAlias>>}
          onChange={applyEdit}
          onSave={saveTeam}
          savingId={savingId}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  total,
  mapped,
  unmapped,
}: {
  label: string;
  total: number;
  mapped: number;
  unmapped: number;
}) {
  const pct = total > 0 ? Math.round((mapped / total) * 100) : 0;
  return (
    <div className="p-4 rounded border border-zinc-800 bg-zinc-950">
      <div className="text-sm text-zinc-400">{label} 매핑 진행률</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-white">{pct}%</span>
        <span className="text-sm text-zinc-500">
          {mapped.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-2 w-full bg-zinc-800 rounded">
        <div
          className="h-2 rounded bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        미매핑 {unmapped.toLocaleString()}개
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 ${
        active
          ? "border-emerald-500 text-white"
          : "border-transparent text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function LeagueTable({
  rows,
  editing,
  onChange,
  onSave,
  savingId,
}: {
  rows: LeagueAlias[];
  editing: Record<string, Partial<LeagueAlias>>;
  onChange: (id: string, patch: Partial<LeagueAlias>) => void;
  onSave: (row: LeagueAlias) => void;
  savingId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            <Th>종목</Th>
            <Th>slug</Th>
            <Th>원본명</Th>
            <Th>한글명</Th>
            <Th>로고 URL</Th>
            <Th>국가</Th>
            <Th>우선순위</Th>
            <Th>숨김</Th>
            <Th>&nbsp;</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const draft = editing[row.id] || {};
            const current = { ...row, ...draft };
            const dirty = Object.keys(draft).length > 0;
            return (
              <tr key={row.id} className="border-t border-zinc-800">
                <Td className="text-zinc-400">{row.sport}</Td>
                <Td className="font-mono text-xs text-zinc-400">{row.slug}</Td>
                <Td>{row.originalName}</Td>
                <Td>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-full"
                    value={current.koreanName ?? ""}
                    onChange={(e) =>
                      onChange(row.id, { koreanName: e.target.value || null })
                    }
                    placeholder="예: K리그1"
                  />
                </Td>
                <Td>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-full font-mono text-xs"
                    value={current.logoUrl ?? ""}
                    onChange={(e) =>
                      onChange(row.id, { logoUrl: e.target.value || null })
                    }
                    placeholder="https://…"
                  />
                </Td>
                <Td>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-24"
                    value={current.country ?? ""}
                    onChange={(e) =>
                      onChange(row.id, { country: e.target.value || null })
                    }
                    placeholder="KR"
                  />
                </Td>
                <Td>
                  <input
                    type="number"
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-20"
                    value={current.displayPriority}
                    onChange={(e) =>
                      onChange(row.id, {
                        displayPriority: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </Td>
                <Td>
                  <input
                    type="checkbox"
                    checked={current.isHidden}
                    onChange={(e) => onChange(row.id, { isHidden: e.target.checked })}
                  />
                </Td>
                <Td>
                  <button
                    disabled={!dirty || savingId === row.id}
                    onClick={() => onSave(row)}
                    className="px-2 py-1 text-xs rounded bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 hover:bg-emerald-500"
                  >
                    {savingId === row.id ? "저장중…" : dirty ? "저장" : "변경없음"}
                  </button>
                </Td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-zinc-500">
                표시할 항목이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TeamTable({
  rows,
  editing,
  onChange,
  onSave,
  savingId,
}: {
  rows: TeamAlias[];
  editing: Record<string, Partial<TeamAlias>>;
  onChange: (id: string, patch: Partial<TeamAlias>) => void;
  onSave: (row: TeamAlias) => void;
  savingId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            <Th>종목</Th>
            <Th>externalId</Th>
            <Th>원본명</Th>
            <Th>한글명</Th>
            <Th>로고 URL</Th>
            <Th>국가</Th>
            <Th>&nbsp;</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const draft = editing[row.id] || {};
            const current = { ...row, ...draft };
            const dirty = Object.keys(draft).length > 0;
            return (
              <tr key={row.id} className="border-t border-zinc-800">
                <Td className="text-zinc-400">{row.sport}</Td>
                <Td className="font-mono text-xs text-zinc-400">{row.externalId}</Td>
                <Td>{row.originalName}</Td>
                <Td>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-full"
                    value={current.koreanName ?? ""}
                    onChange={(e) =>
                      onChange(row.id, { koreanName: e.target.value || null })
                    }
                    placeholder="예: 토트넘"
                  />
                </Td>
                <Td>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-full font-mono text-xs"
                    value={current.logoUrl ?? ""}
                    onChange={(e) =>
                      onChange(row.id, { logoUrl: e.target.value || null })
                    }
                    placeholder="https://…"
                  />
                </Td>
                <Td>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-24"
                    value={current.country ?? ""}
                    onChange={(e) =>
                      onChange(row.id, { country: e.target.value || null })
                    }
                    placeholder="KR"
                  />
                </Td>
                <Td>
                  <button
                    disabled={!dirty || savingId === row.id}
                    onClick={() => onSave(row)}
                    className="px-2 py-1 text-xs rounded bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 hover:bg-emerald-500"
                  >
                    {savingId === row.id ? "저장중…" : dirty ? "저장" : "변경없음"}
                  </button>
                </Td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-zinc-500">
                표시할 항목이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
