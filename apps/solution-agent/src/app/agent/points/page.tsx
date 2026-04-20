"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";

type Stats = {
  platformName: string;
  platformSlug: string;
  effectiveAgentSharePct: number;
  nestedUnderMasterAgent: boolean;
  agentPlatformSharePct: number | null;
  agentSplitFromParentPct: number | null;
};

export default function AgentMileagePage() {
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
    void load();
  }, [load]);

  if (!getAccessToken()) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">마일리지 정산</h1>
      <p className="text-sm text-gray-500">
        회원 쪽 포인트(출석·낙첨·추천·교환)는 솔루션 API{" "}
        <span className="text-gray-500">/me/points/*</span> 및 플랫폼{" "}
        <span className="text-gray-500">pointRulesJson</span>으로 동작합니다.
        아래는 이 총판 계정의 정산 정보입니다.
      </p>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      )}

      {stats && (
        <div className="rounded-2xl border-2 border-[#3182f6]/30 bg-[#3182f6]/5 px-5 py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#3182f6]">
            정산 비율
          </p>
          <p className="mt-2 font-mono text-[40px] font-bold text-[#3182f6]">
            {stats.effectiveAgentSharePct}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
            회원 배팅 등에 따른 총판 정산 비율로 쓰이는 값입니다. 플랫폼·상위
            총판 설정이 반영된 결과입니다.
          </p>
          {stats.nestedUnderMasterAgent ? (
            <dl className="mt-4 space-y-2 border-t border-[#3182f6]/20 pt-3">
              <div className="flex justify-between gap-4 text-[13px]">
                <dt className="text-gray-600">상위(총판) 대비 분배율</dt>
                <dd className="font-mono font-semibold text-black">
                  {stats.agentSplitFromParentPct ?? "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <dl className="mt-4 space-y-2 border-t border-[#3182f6]/20 pt-3">
              <div className="flex justify-between gap-4 text-[13px]">
                <dt className="text-gray-600">플랫폼 정산 비율</dt>
                <dd className="font-mono font-semibold text-black">
                  {stats.agentPlatformSharePct != null
                    ? stats.agentPlatformSharePct
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
        <p>
          정산 배치·마일리지 지급 내역은 시스템 연동이 완료되면 이 영역에
          목록으로 제공될 예정입니다.
        </p>
      </div>
    </div>
  );
}
