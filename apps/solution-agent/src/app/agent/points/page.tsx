"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

type Stats = {
  platformName: string;
  platformSlug: string;
  effectiveAgentSharePct: number;
  nestedUnderMasterAgent: boolean;
  agentPlatformSharePct: number | null;
  agentSplitFromParentPct: number | null;
};

export default function AgentMileagePage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const s = await apiFetch<Stats>("/me/agent/stats");
      setStats(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setStats(null);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "MASTER_AGENT") {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  if (!getAccessToken()) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">마일리지 정산</h1>
      <p className="text-sm text-zinc-500">
        회원 쪽 포인트(출석·낙첨·추천·교환)는 솔루션 API{" "}
        <span className="text-zinc-400">/me/points/*</span> 및 플랫폼{" "}
        <span className="text-zinc-400">pointRulesJson</span>으로 동작합니다.
        아래는 이 총판 계정의{" "}
        <span className="text-zinc-400">적용 중인 요율</span>입니다.
      </p>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}

      {stats && (
        <div className="rounded-xl border border-amber-900/35 bg-amber-950/15 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/70">
            현 요율 (실효)
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-amber-100">
            {stats.effectiveAgentSharePct}
            <span className="ml-1 text-lg font-normal text-amber-200/80">%</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            회원 배팅 등에 따른 총판 정산 비율로 쓰이는 값입니다. 플랫폼·상위
            총판 설정이 반영된 결과입니다.
          </p>
          {stats.nestedUnderMasterAgent ? (
            <dl className="mt-4 space-y-1 border-t border-amber-900/25 pt-3 text-xs text-zinc-400">
              <div className="flex justify-between gap-4">
                <dt>상위(총판) 대비 분배율</dt>
                <dd className="font-mono text-zinc-200">
                  {stats.agentSplitFromParentPct ?? "—"}%
                </dd>
              </div>
            </dl>
          ) : (
            <dl className="mt-4 space-y-1 border-t border-amber-900/25 pt-3 text-xs text-zinc-400">
              <div className="flex justify-between gap-4">
                <dt>플랫폼 부여 요율</dt>
                <dd className="font-mono text-zinc-200">
                  {stats.agentPlatformSharePct != null
                    ? `${stats.agentPlatformSharePct}%`
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-sm text-zinc-400">
        <p>
          정산 배치·마일리지 지급 내역은 시스템 연동이 완료되면 이 영역에
          목록으로 제공될 예정입니다.
        </p>
      </div>
    </div>
  );
}
