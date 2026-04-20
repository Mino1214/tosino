"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { inferAdminHost, inferAgentHost, inferRootHost } from "@/lib/platform-hosts";
import { usePlatform } from "@/context/PlatformContext";

type ChangeLog = {
  at: string;
  field: string;
  from: string;
  to: string;
};

type PlatformEditState = {
  name: string;
  slug: string;
  platformCasinoPct: string;
  platformSportsPct: string;
  autoMarginPct: string;
  upstreamCasinoPct: string;
  upstreamSportsPct: string;
};

type ActionBtn = {
  label: string;
  path: string;
  color: string;
};

const PLATFORM_ACTIONS: ActionBtn[] = [
  { label: "청구 / 정산", path: "/console/sales", color: "border-blue-200 text-blue-600 hover:bg-blue-50" },
  { label: "알값 / 정책", path: "/console/operational", color: "border-purple-200 text-purple-600 hover:bg-purple-50" },
  { label: "반가상 설정", path: "/console/assets", color: "border-cyan-200 text-cyan-600 hover:bg-cyan-50" },
  { label: "운영 계정", path: "/console/users", color: "border-gray-200 text-gray-600 hover:bg-gray-50" },
  { label: "도메인 / 헬스체크", path: "/console/sync", color: "border-gray-200 text-gray-600 hover:bg-gray-50" },
  { label: "테스트 시나리오", path: "/console/test-scenario", color: "border-green-200 text-green-600 hover:bg-green-50" },
];

export default function ConsolePlatformsPage() {
  const router = useRouter();
  const { platforms, loading, setSelectedPlatformId, refresh } = usePlatform();
  const user = getStoredUser();
  const [deleteSlugById, setDeleteSlugById] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlatformEditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  // In-session change log (client-side only - shows what was changed this session)
  const [changeLog, setChangeLog] = useState<Record<string, ChangeLog[]>>({});

  const totals = useMemo(
    () => ({
      solutions: platforms.length,
      withPreview: platforms.filter((p) => p.previewPort != null).length,
      withRootDomain: platforms.filter((p) => inferRootHost(p)).length,
    }),
    [platforms],
  );

  function openConsole(pid: string, path: string) {
    setSelectedPlatformId(pid);
    router.push(path);
  }

  function openSettings(pid: string) {
    const platform = platforms.find((p) => p.id === pid);
    if (!platform) return;
    setSettingsId(pid);
    setEditDraft({
      name: platform.name,
      slug: platform.slug,
      platformCasinoPct: platform.solutionRatePolicy?.platformCasinoPct ?? "0",
      platformSportsPct: platform.solutionRatePolicy?.platformSportsPct ?? "0",
      autoMarginPct: platform.solutionRatePolicy?.autoMarginPct ?? "1.00",
      upstreamCasinoPct: platform.solutionRatePolicy?.upstreamCasinoPct ?? "0",
      upstreamSportsPct: platform.solutionRatePolicy?.upstreamSportsPct ?? "0",
    });
    setSaveErr(null);
  }

  async function saveSettings(pid: string) {
    if (!editDraft) return;
    const platform = platforms.find((p) => p.id === pid);
    if (!platform) return;
    setSaving(true);
    setSaveErr(null);
    try {
      // Build change log entries
      const logs: ChangeLog[] = [];
      const now = new Date().toISOString();
      if (editDraft.name !== platform.name) logs.push({ at: now, field: "이름", from: platform.name, to: editDraft.name });
      const oldCasino = platform.solutionRatePolicy?.platformCasinoPct ?? "0";
      const oldSports = platform.solutionRatePolicy?.platformSportsPct ?? "0";
      const oldAutoMargin = platform.solutionRatePolicy?.autoMarginPct ?? "1.00";
      const oldUpCasino = platform.solutionRatePolicy?.upstreamCasinoPct ?? "0";
      const oldUpSports = platform.solutionRatePolicy?.upstreamSportsPct ?? "0";
      if (editDraft.platformCasinoPct !== oldCasino) logs.push({ at: now, field: "플랫폼 카지노 청구율", from: `${oldCasino}%`, to: `${editDraft.platformCasinoPct}%` });
      if (editDraft.platformSportsPct !== oldSports) logs.push({ at: now, field: "플랫폼 스포츠 청구율", from: `${oldSports}%`, to: `${editDraft.platformSportsPct}%` });
      if (editDraft.autoMarginPct !== oldAutoMargin) logs.push({ at: now, field: "자동 마진", from: `${oldAutoMargin}%`, to: `${editDraft.autoMarginPct}%` });
      if (editDraft.upstreamCasinoPct !== oldUpCasino) logs.push({ at: now, field: "상위 카지노 알값", from: `${oldUpCasino}%`, to: `${editDraft.upstreamCasinoPct}%` });
      if (editDraft.upstreamSportsPct !== oldUpSports) logs.push({ at: now, field: "상위 스포츠 알값", from: `${oldUpSports}%`, to: `${editDraft.upstreamSportsPct}%` });

      // Save rate policy via operational endpoint
      await apiFetch(`/platforms/${pid}/operational`, {
        method: "PATCH",
        body: JSON.stringify({
          solutionRatePolicy: {
            upstreamCasinoPct: editDraft.upstreamCasinoPct,
            upstreamSportsPct: editDraft.upstreamSportsPct,
            autoMarginPct: editDraft.autoMarginPct,
          },
        }),
      });

      if (logs.length > 0) {
        setChangeLog((prev) => ({
          ...prev,
          [pid]: [...(prev[pid] ?? []), ...logs].slice(-20), // keep last 20
        }));
      }
      await refresh();
      setSettingsId(null);
      setEditDraft(null);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlatform(id: string, slug: string) {
    const typed = (deleteSlugById[id] ?? "").trim();
    if (typed !== slug) { setDeleteErr("슬러그를 정확히 입력해야 삭제할 수 있습니다."); return; }
    setDeleteErr(null);
    setDeletingId(id);
    try {
      await apiFetch<{ ok: boolean }>(
        `/platforms/${encodeURIComponent(id)}?confirmSlug=${encodeURIComponent(slug)}`,
        { method: "DELETE" },
      );
      setDeleteSlugById((cur) => { const n = { ...cur }; delete n[id]; return n; });
      await refresh();
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-gray-400">불러오는 중…</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-500">Solutions</p>
          <h1 className="mt-1.5 text-2xl font-bold text-gray-900">솔루션 관리</h1>
        </div>
        {user?.role === "SUPER_ADMIN" && (
          <Link href="/console/platforms/new"
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition">
            + 새 솔루션
          </Link>
        )}
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "전체 솔루션", value: totals.solutions, unit: "개" },
          { label: "도메인 연결", value: totals.withRootDomain, unit: "개" },
          { label: "미리보기 포트", value: totals.withPreview, unit: "개" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}<span className="ml-1 text-sm font-normal text-gray-400">{s.unit}</span></p>
          </div>
        ))}
      </div>

      {deleteErr && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{deleteErr}</p>
      )}

      {/* Platform cards */}
      <div className="grid gap-4 xl:grid-cols-2">
        {platforms.map((platform) => {
          const rootHost = inferRootHost(platform);
          const adminHost = inferAdminHost(platform);
          const agentHost = inferAgentHost(platform);
          const expanded = expandedId === platform.id;
          const isEditOpen = settingsId === platform.id;
          const logs = changeLog[platform.id] ?? [];

          return (
            <div key={platform.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {/* Card header */}
              <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{platform.name}</h2>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {platform.solutionTemplateKey ?? "HYBRID"}
                    </span>
                    {platform.previewPort != null && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                        :{platform.previewPort}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-gray-400">{rootHost ?? platform.slug}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-gray-400">청구율</p>
                  <p className="text-xs font-semibold text-gray-700">
                    카 {platform.solutionRatePolicy?.platformCasinoPct ?? "0"}% · 스 {platform.solutionRatePolicy?.platformSportsPct ?? "0"}%
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-5 py-3">
                {PLATFORM_ACTIONS.map((action) => (
                  <button key={action.path} type="button"
                    onClick={() => openConsole(platform.id, action.path)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${action.color}`}>
                    {action.label}
                  </button>
                ))}
                <button type="button"
                  onClick={() => isEditOpen ? (setSettingsId(null), setEditDraft(null)) : openSettings(platform.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    isEditOpen ? "border-blue-500 bg-blue-500 text-white" : "border-blue-200 text-blue-600 hover:bg-blue-50"
                  }`}>
                  ⚙ 설정 편집
                </button>
              </div>

              {/* Settings editor */}
              {isEditOpen && editDraft && (
                <div className="border-t border-blue-100 bg-blue-50/50 px-5 pb-4 pt-4">
                  <h3 className="text-sm font-bold text-blue-700 mb-3">플랫폼 설정 편집</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">이름</label>
                      <input type="text" value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="t-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">상위 카지노 알값 %</label>
                      <input type="text" value={editDraft.upstreamCasinoPct}
                        onChange={(e) => setEditDraft({ ...editDraft, upstreamCasinoPct: e.target.value })}
                        className="t-input font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">상위 스포츠 알값 %</label>
                      <input type="text" value={editDraft.upstreamSportsPct}
                        onChange={(e) => setEditDraft({ ...editDraft, upstreamSportsPct: e.target.value })}
                        className="t-input font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">자동 마진 %</label>
                      <input type="text" value={editDraft.autoMarginPct}
                        onChange={(e) => setEditDraft({ ...editDraft, autoMarginPct: e.target.value })}
                        className="t-input font-mono" />
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-white px-4 py-3">
                      <p className="text-[10px] text-gray-400">카지노 청구율 (예상)</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-blue-600">
                        {((Number(editDraft.upstreamCasinoPct) || 0) + (Number(editDraft.autoMarginPct) || 0)).toFixed(2)}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-white px-4 py-3">
                      <p className="text-[10px] text-gray-400">스포츠 청구율 (예상)</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-blue-600">
                        {((Number(editDraft.upstreamSportsPct) || 0) + (Number(editDraft.autoMarginPct) || 0)).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  {saveErr && <p className="mt-3 text-sm text-red-600">{saveErr}</p>}
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => saveSettings(platform.id)} disabled={saving}
                      className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition">
                      {saving ? "저장 중…" : "저장"}
                    </button>
                    <button type="button" onClick={() => { setSettingsId(null); setEditDraft(null); }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
                      취소
                    </button>
                  </div>

                  {/* Change log */}
                  {logs.length > 0 && (
                    <div className="mt-4 border-t border-blue-100 pt-3">
                      <p className="mb-2 text-xs font-semibold text-gray-500">수정 이력 (세션 내)</p>
                      <div className="space-y-1">
                        {[...logs].reverse().map((log, i) => (
                          <div key={i} className="flex items-baseline gap-2 text-xs">
                            <span className="shrink-0 text-gray-400">{new Date(log.at).toLocaleTimeString()}</span>
                            <span className="font-medium text-gray-700">{log.field}</span>
                            <span className="text-gray-400">{log.from}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-semibold text-blue-600">{log.to}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Expand toggle */}
              <div className="border-t border-gray-100 px-5 py-2">
                <button type="button"
                  onClick={() => setExpandedId(expanded ? null : platform.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition">
                  {expanded ? "▲ 접기" : "▼ 도메인 상세 · 삭제"}
                </button>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { label: "유저 도메인", value: rootHost ?? "—" },
                      { label: "솔루션 어드민", value: adminHost ?? "—" },
                      { label: "에이전트", value: agentHost ?? "—" },
                    ].map((d) => (
                      <div key={d.label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-[10px] text-gray-400">{d.label}</p>
                        <p className="mt-1 break-all font-mono text-xs text-gray-700">{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {user?.role === "SUPER_ADMIN" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="mb-2 text-xs text-red-500">
                        삭제 시 소속 유저·지갑·내역도 함께 제거됩니다. 슬러그{" "}
                        <code className="font-mono text-red-700">{platform.slug}</code> 를 입력 후 삭제하세요.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <input type="text"
                          value={deleteSlugById[platform.id] ?? ""}
                          onChange={(e) => setDeleteSlugById((cur) => ({ ...cur, [platform.id]: e.target.value }))}
                          placeholder={platform.slug}
                          className="min-w-[8rem] rounded border border-red-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-300"
                          autoComplete="off" />
                        <button type="button"
                          disabled={deletingId === platform.id || (deleteSlugById[platform.id] ?? "").trim() !== platform.slug}
                          onClick={() => deletePlatform(platform.id, platform.slug)}
                          className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 transition">
                          {deletingId === platform.id ? "삭제 중…" : "솔루션 삭제"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {platforms.length === 0 && (
        <p className="py-12 text-center text-gray-400">등록된 솔루션이 없습니다.</p>
      )}
    </div>
  );
}
