"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getApiBase } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type SyncRow = {
  id: string;
  jobType: string;
  lastRunAt: string | null;
  lastOkAt: string | null;
  lastError: string | null;
};

const JOB_LABEL: Record<string, string> = {
  ODDS: "스포츠 배당",
  CASINO: "카지노 연동",
  AFFILIATE: "총판·정산 연동",
};

function jobTitle(jobType: string): string {
  return JOB_LABEL[jobType] ?? jobType;
}

function statusTone(row: SyncRow): {
  label: string;
  desc: string;
  color: string;
} {
  if (row.lastError) {
    return {
      label: "점검 필요",
      desc: row.lastError,
      color: "text-amber-300",
    };
  }
  if (row.lastOkAt) {
    return {
      label: "정상",
      desc: `마지막으로 잘 동작한 시각: ${new Date(row.lastOkAt).toLocaleString()}`,
      color: "text-emerald-400",
    };
  }
  if (row.lastRunAt) {
    return {
      label: "확인 중",
      desc: "실행 기록은 있으나 성공 시각이 아직 없습니다.",
      color: "text-zinc-400",
    };
  }
  return {
    label: "대기",
    desc: "아직 이 항목으로 자동 작업이 돌지 않았습니다.",
    color: "text-zinc-500",
  };
}

export default function ConsoleSyncPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<SyncRow[] | null>(null);
  const [apiPing, setApiPing] = useState<"ok" | "fail" | "idle">("idle");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return apiFetch<SyncRow[]>(
      `/platforms/${selectedPlatformId}/sync/status`,
    )
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) {
      setRows(null);
      return;
    }
    setErr(null);
    setApiPing("idle");
    load();
  }, [load, router, selectedPlatformId, platformLoading]);

  const checkApiReachable = useCallback(async () => {
    setApiPing("idle");
    const base = getApiBase().replace(/\/$/, "");
    if (!base) {
      setApiPing("fail");
      return;
    }
    try {
      const res = await fetch(`${base}/health`, { method: "GET" });
      setApiPing(res.ok ? "ok" : "fail");
    } catch {
      setApiPing("fail");
    }
  }, []);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) return;
    void checkApiReachable();
  }, [selectedPlatformId, platformLoading, checkApiReachable]);

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }
  if (err && !rows) {
    return <p className="text-red-400">{err}</p>;
  }
  if (!rows) {
    return <p className="text-zinc-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">서버 상태</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          관리 화면과 연결된 서버가 응답하는지, 스포츠·카지노 등 백그라운드
          작업이 최근에 문제 없이 돌았는지 확인하는 페이지입니다. 용어는
          쉽게만 표시했습니다.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-base font-medium text-zinc-200">API 연결</h2>
        <p className="mt-1 text-sm text-zinc-500">
          브라우저에서 게임·관리 API 주소로 직접 손을 대 보는 간단한 확인입니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              apiPing === "ok"
                ? "bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-800/50"
                : apiPing === "fail"
                  ? "bg-red-950/50 text-red-300 ring-1 ring-red-900/50"
                  : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {apiPing === "ok"
              ? "연결됨"
              : apiPing === "fail"
                ? "연결 실패"
                : "확인 중…"}
          </span>
          <button
            type="button"
            onClick={() => checkApiReachable()}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            다시 확인
          </button>
        </div>
        {apiPing === "fail" && (
          <p className="mt-3 text-sm text-amber-200/90">
            API 서버가 꺼져 있거나 주소(NEXT_PUBLIC_API_URL)가 잘못됐을 수
            있습니다. 개발 중이면 터미널에서 API를 먼저 실행해 주세요.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-zinc-200">
              백그라운드 작업
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              서버가 정해진 간격으로 돌리는 데이터 갱신입니다. 여기서는
              &quot;마지막으로 잘 됐는지&quot;만 보면 됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            새로고침
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
          {rows.map((r) => {
            const tone = statusTone(r);
            return (
              <div
                key={r.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                <p className="text-sm font-medium text-zinc-100">
                  {jobTitle(r.jobType)}
                </p>
                <p className={`mt-2 text-lg font-semibold ${tone.color}`}>
                  {tone.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {tone.desc}
                </p>
                {r.lastRunAt && (
                  <p className="mt-3 text-[11px] text-zinc-600">
                    마지막 시도:{" "}
                    {new Date(r.lastRunAt).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
