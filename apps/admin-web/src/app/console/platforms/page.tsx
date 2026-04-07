"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

export default function ConsolePlatformsPage() {
  const router = useRouter();
  const { platforms, loading, setSelectedPlatformId, refresh } = usePlatform();
  const user = getStoredUser();
  const [deleteSlugById, setDeleteSlugById] = useState<Record<string, string>>(
    {},
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

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
      setDeleteSlugById((m) => {
        const next = { ...m };
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">플랫폼</h1>
        {user?.role === "SUPER_ADMIN" && (
          <Link
            href="/console/platforms/new"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
          >
            새 플랫폼
          </Link>
        )}
      </div>
      <p className="text-sm text-zinc-500">
        상단 드롭다운에서 플랫폼을 고른 뒤 탭으로 이동해도 되고, 아래에서 바로
        작업 화면으로 들어가도 됩니다.
      </p>
      {deleteErr && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {deleteErr}
        </p>
      )}
      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/50">
        {platforms.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-zinc-100">{p.name}</p>
              <p className="text-sm text-zinc-500">
                {p.slug} · 도메인:{" "}
                {p.domains.map((d) => d.host).join(", ") || "—"}
                {p.previewPort != null && (
                  <>
                    {" "}
                    · 미리보기 포트{" "}
                    <span className="text-amber-200/80">{p.previewPort}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                onClick={() => openConsole(p.id, "/console/theme")}
                className="rounded border border-amber-900/40 px-3 py-1 text-amber-200/90 hover:bg-amber-950/40"
              >
                테마·UI
              </button>
              <button
                type="button"
                onClick={() => openConsole(p.id, "/console/users")}
                className="rounded border border-zinc-600 px-3 py-1 text-zinc-300 hover:bg-zinc-800"
              >
                유저
              </button>
              <button
                type="button"
                onClick={() => openConsole(p.id, "/console/registrations")}
                className="rounded border border-amber-900/50 px-3 py-1 text-amber-200/90 hover:bg-amber-950/40"
              >
                가입 승인
              </button>
              <button
                type="button"
                onClick={() => openConsole(p.id, "/console/wallet-requests")}
                className="rounded border border-emerald-900/40 px-3 py-1 text-emerald-200/90 hover:bg-emerald-950/30"
              >
                입·출금
              </button>
              <button
                type="button"
                onClick={() => openConsole(p.id, "/console/sync")}
                className="rounded border border-zinc-600 px-3 py-1 text-zinc-300 hover:bg-zinc-800"
              >
                서버 상태
              </button>
              {user?.role === "SUPER_ADMIN" && (
                <div className="mt-2 w-full border-t border-zinc-800 pt-3 sm:mt-0 sm:w-auto sm:border-0 sm:pt-0">
                  <p className="mb-1 text-xs text-red-400/90">
                    삭제: 소속 유저·지갑·내역 등이 함께 제거됩니다. 슬러그{" "}
                    <code className="text-red-200">{p.slug}</code> 입력 후 버튼.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={deleteSlugById[p.id] ?? ""}
                      onChange={(e) =>
                        setDeleteSlugById((m) => ({
                          ...m,
                          [p.id]: e.target.value,
                        }))
                      }
                      placeholder={p.slug}
                      className="min-w-[8rem] rounded border border-red-900/40 bg-zinc-950 px-2 py-1 text-sm text-zinc-200 placeholder:text-zinc-600"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      disabled={
                        deletingId === p.id ||
                        (deleteSlugById[p.id] ?? "").trim() !== p.slug
                      }
                      onClick={() => deletePlatform(p.id, p.slug)}
                      className="rounded border border-red-800 px-3 py-1 text-sm text-red-200 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingId === p.id ? "삭제 중…" : "플랫폼 삭제"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {platforms.length === 0 && (
        <p className="text-zinc-500">접근 가능한 플랫폼이 없습니다.</p>
      )}
    </div>
  );
}
