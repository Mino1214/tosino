"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { inferAdminHost, inferAgentHost, inferRootHost } from "@/lib/platform-hosts";
import { usePlatform } from "@/context/PlatformContext";

export default function ConsolePlatformsPage() {
  const router = useRouter();
  const { platforms, loading, setSelectedPlatformId, refresh } = usePlatform();
  const user = getStoredUser();
  const [deleteSlugById, setDeleteSlugById] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      solutions: platforms.length,
      withPreview: platforms.filter((platform) => platform.previewPort != null).length,
      withRootDomain: platforms.filter((platform) => inferRootHost(platform)).length,
    }),
    [platforms],
  );

  function openConsole(pid: string, path: string) {
    setSelectedPlatformId(pid);
    router.push(path);
  }

  async function deletePlatform(id: string, slug: string) {
    const typed = (deleteSlugById[id] ?? "").trim();
    if (typed !== slug) {
      setDeleteErr("슬러그를 정확히 입력해야 삭제할 수 있습니다.");
      return;
    }
    setDeleteErr(null);
    setDeletingId(id);
    try {
      await apiFetch<{ ok: boolean }>(
        `/platforms/${encodeURIComponent(id)}?confirmSlug=${encodeURIComponent(slug)}`,
        { method: "DELETE" },
      );
      setDeleteSlugById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await refresh();
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
            Solutions
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">
            솔루션 관리
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-500">
            본사 관점에서 각 솔루션의 유저 도메인, admin/agent 도메인, 알값,
            미리보기 포트와 운영 진입점을 관리합니다.
          </p>
        </div>
        {user?.role === "SUPER_ADMIN" && (
          <Link
            href="/console/platforms/new"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500"
          >
            새 솔루션 추가
          </Link>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Total
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {totals.solutions}개
          </p>
          <p className="mt-1 text-xs text-zinc-600">관리 중인 전체 솔루션 수</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Root Domains
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {totals.withRootDomain}개
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            유저 도메인이 설정된 솔루션
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Preview Ports
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {totals.withPreview}개
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            로컬 미리보기 포트가 배정된 솔루션
          </p>
        </div>
      </section>

      {deleteErr ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {deleteErr}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {platforms.map((platform) => {
          const rootHost = inferRootHost(platform);
          const adminHost = inferAdminHost(platform);
          const agentHost = inferAgentHost(platform);
          return (
            <section
              key={platform.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">{platform.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{platform.slug}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    템플릿 {platform.solutionTemplateKey ?? "HYBRID"}
                    {platform.previewPort != null ? (
                      <>
                        {" "}
                        · 미리보기 포트{" "}
                        <span className="text-amber-200/90">{platform.previewPort}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-right">
                  <p className="text-xs text-zinc-500">플랫폼 청구율</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">
                    카지노 {platform.solutionRatePolicy?.platformCasinoPct ?? "0"}%
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">
                    스포츠 {platform.solutionRatePolicy?.platformSportsPct ?? "0"}%
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                  <p className="text-xs text-zinc-500">유저 도메인</p>
                  <p className="mt-1 break-all font-mono text-sm text-zinc-100">
                    {rootHost ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                  <p className="text-xs text-zinc-500">솔루션 어드민</p>
                  <p className="mt-1 break-all font-mono text-sm text-zinc-100">
                    {adminHost ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                  <p className="text-xs text-zinc-500">에이전트</p>
                  <p className="mt-1 break-all font-mono text-sm text-zinc-100">
                    {agentHost ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => openConsole(platform.id, "/console")}
                  className="rounded border border-zinc-600 px-3 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  총괄 보기
                </button>
                <button
                  type="button"
                  onClick={() => openConsole(platform.id, "/console/sales")}
                  className="rounded border border-amber-900/40 px-3 py-1 text-amber-200/90 hover:bg-amber-950/40"
                >
                  청구 / 정산
                </button>
                <button
                  type="button"
                  onClick={() => openConsole(platform.id, "/console/operational")}
                  className="rounded border border-violet-900/40 px-3 py-1 text-violet-200/90 hover:bg-violet-950/30"
                >
                  알값 관리
                </button>
                <button
                  type="button"
                  onClick={() => openConsole(platform.id, "/console/assets")}
                  className="rounded border border-cyan-900/40 px-3 py-1 text-cyan-200/90 hover:bg-cyan-950/30"
                >
                  자산 관리
                </button>
                <button
                  type="button"
                  onClick={() => openConsole(platform.id, "/console/users")}
                  className="rounded border border-zinc-600 px-3 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  운영 계정
                </button>
                <button
                  type="button"
                  onClick={() => openConsole(platform.id, "/console/sync")}
                  className="rounded border border-zinc-600 px-3 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  도메인 / 배포
                </button>
              </div>

              {user?.role === "SUPER_ADMIN" ? (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <p className="mb-2 text-xs text-red-400/90">
                    삭제는 소속 유저·지갑·내역도 함께 제거합니다. 슬러그{" "}
                    <code className="text-red-200">{platform.slug}</code> 입력 후 실행하세요.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={deleteSlugById[platform.id] ?? ""}
                      onChange={(e) =>
                        setDeleteSlugById((current) => ({
                          ...current,
                          [platform.id]: e.target.value,
                        }))
                      }
                      placeholder={platform.slug}
                      className="min-w-[8rem] rounded border border-red-900/40 bg-zinc-950 px-2 py-1 text-sm text-zinc-200 placeholder:text-zinc-600"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      disabled={
                        deletingId === platform.id ||
                        (deleteSlugById[platform.id] ?? "").trim() !== platform.slug
                      }
                      onClick={() => deletePlatform(platform.id, platform.slug)}
                      className="rounded border border-red-800 px-3 py-1 text-sm text-red-200 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingId === platform.id ? "삭제 중…" : "솔루션 삭제"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {platforms.length === 0 ? (
        <p className="text-zinc-500">등록된 솔루션이 없습니다.</p>
      ) : null}
    </div>
  );
}
