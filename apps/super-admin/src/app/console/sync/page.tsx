"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { inferRootHost, inferAdminHost } from "@/lib/platform-hosts";

type PingStatus = "idle" | "checking" | "ok" | "fail";

type EndpointCheck = {
  id: string;
  label: string;
  url: string | null;
  description: string;
  disabled?: boolean;
  status: PingStatus;
  ms: number | null;
  code: number | null;
};

function StatusBadge({ status, ms }: { status: PingStatus; ms: number | null }) {
  if (status === "idle") return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">대기</span>;
  if (status === "checking") return <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-500 animate-pulse">확인 중…</span>;
  if (status === "ok") return (
    <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      정상 {ms != null ? `(${ms}ms)` : ""}
    </span>
  );
  return <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500">연결 실패</span>;
}

export default function ConsoleSyncPage() {
  const { platforms, loading: platformLoading } = usePlatform();
  const [scopePlatformId, setScopePlatformId] = useState<string | null>(null);
  const [checks, setChecks] = useState<EndpointCheck[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setScopePlatformId((prev) => {
      if (prev && platforms.some((p) => p.id === prev)) return prev;
      return platforms[0]?.id ?? null;
    });
  }, [platforms]);

  const selected = platforms.find((p) => p.id === scopePlatformId) ?? null;
  const apiBase = getApiBase().replace(/\/$/, "");


  const buildChecks = useCallback((): EndpointCheck[] => {
    const adminHost = selected ? inferAdminHost(selected) : null;
    const rootHost = selected ? inferRootHost(selected) : null;

    return [
      {
        id: "api",
        label: "Tosino API (본사)",
        url: apiBase ? `${apiBase}/health` : null,
        description: "본사 공통 API 서버 — 모든 데이터 처리의 중심",
        status: "idle",
        ms: null,
        code: null,
      },
      {
        id: "tozinosolution",
        label: "tozinosolution.com (본사 사이트)",
        url: "https://mod.tozinosolution.com",
        description: "슈퍼어드민 호스트 접속 여부 확인",
        status: "idle",
        ms: null,
        code: null,
      },
      {
        id: "admin",
        label: "솔루션 어드민",
        url: adminHost ? `https://${adminHost}` : null,
        description: selected ? `선택 솔루션(${selected.name})의 어드민 패널` : "솔루션을 선택하세요",
        status: "idle",
        ms: null,
        code: null,
      },
      {
        id: "user",
        label: "솔루션 유저 사이트",
        url: rootHost ? `https://${rootHost}` : null,
        description: selected ? `선택 솔루션(${selected.name})의 회원 접속 사이트` : "솔루션을 선택하세요",
        status: "idle",
        ms: null,
        code: null,
      },
      {
        id: "casino",
        label: "카지노 API",
        url: null,
        description: "카지노 연동 API (준비 중)",
        disabled: true,
        status: "idle",
        ms: null,
        code: null,
      },
      {
        id: "sports",
        label: "스포츠 API",
        url: null,
        description: "스포츠 배당 API (준비 중)",
        disabled: true,
        status: "idle",
        ms: null,
        code: null,
      },
    ];
  }, [selected, apiBase]);

  useEffect(() => {
    setChecks(buildChecks());
  }, [buildChecks]);

  async function checkOne(id: string, url: string): Promise<{ code: number; ms: number }> {
    const start = Date.now();
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
      return { code: res.status, ms: Date.now() - start };
    } catch {
      return { code: 0, ms: Date.now() - start };
    }
  }

  async function runAll() {
    setRunning(true);
    const initial = buildChecks();
    // Set all checking
    setChecks(initial.map((c) => ({ ...c, status: c.disabled || !c.url ? c.status : "checking" })));

    const results = await Promise.all(
      initial.map(async (check) => {
        if (check.disabled || !check.url) return check;
        const { code, ms } = await checkOne(check.id, check.url);
        return { ...check, status: (code >= 200 && code < 400) ? "ok" as const : "fail" as const, ms, code };
      }),
    );
    setChecks(results);
    setRunning(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-zinc-500">System</p>
          <h1 className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-zinc-100">헬스체크</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            API 서버, 솔루션 사이트, 연동 API 정상 여부를 한 화면에서 확인합니다.
          </p>
          <div className="mt-3 max-w-xs">
            <label htmlFor="sync-platform" className="mb-1 block text-xs text-gray-500 dark:text-zinc-500">
              솔루션 (어드민·유저 URL 검사용)
            </label>
            <select
              id="sync-platform"
              value={scopePlatformId ?? ""}
              onChange={(e) => setScopePlatformId(e.target.value || null)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={running || platformLoading}
          className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
        >
          {running ? "확인 중…" : "전체 확인"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <div
            key={check.id}
            className={`rounded-2xl border bg-white p-5 transition ${
              check.disabled
                ? "border-gray-100 opacity-40"
                : check.status === "ok"
                  ? "border-green-200"
                  : check.status === "fail"
                    ? "border-red-200"
                    : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{check.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{check.description}</p>
                {check.url && !check.disabled && (
                  <p className="mt-1 truncate font-mono text-[10px] text-gray-400">{check.url}</p>
                )}
              </div>
              <StatusBadge status={check.status} ms={check.ms} />
            </div>

            {check.disabled ? (
              <div className="mt-3">
                <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">준비중</span>
              </div>
            ) : check.url ? (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={running}
                  onClick={async () => {
                    setChecks((prev) => prev.map((c) => c.id === check.id ? { ...c, status: "checking" } : c));
                    const { code, ms } = await checkOne(check.id, check.url!);
                    setChecks((prev) => prev.map((c) => c.id === check.id
                      ? { ...c, status: (code >= 200 && code < 400) ? "ok" : "fail", ms, code }
                      : c));
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700 transition disabled:opacity-50"
                >
                  개별 확인
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400">솔루션 선택 후 확인 가능</p>
            )}
          </div>
        ))}
      </div>

      {!scopePlatformId && !platformLoading && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            등록된 솔루션이 없으면 어드민·유저 사이트 항목을 검사할 수 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
