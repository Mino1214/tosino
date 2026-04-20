"use client";

/**
 * 슈퍼어드민 전용: 모든 플랫폼의 반가상 계좌 번들 집계.
 * - 플랫폼별로 CURRENT 번들과 RETIRED(이전) 번들을 한눈에 나열
 * - "현재만 보기" 토글로 이전 번들은 숨길 수 있음
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Account = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  memo: string | null;
  sortOrder: number;
  createdAt: string;
};

type Bundle = {
  id: string;
  platformId: string;
  platform: { id: string; name: string; slug: string } | null;
  label: string | null;
  status: "CURRENT" | "RETIRED" | string;
  createdAt: string;
  retiredAt: string | null;
  retiredReason: string | null;
  accounts: Account[];
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function SuperSemiVirtualAggregatePage() {
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [onlyCurrent, setOnlyCurrent] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const rows = await apiFetch<Bundle[]>(
        `/platforms/semi-virtual-bundles/all?onlyCurrent=${
          onlyCurrent ? "1" : "0"
        }`,
      );
      setBundles(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "조회 실패");
    }
  }, [onlyCurrent]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!bundles) return [];
    const map = new Map<
      string,
      { platformId: string; platformName: string; bundles: Bundle[] }
    >();
    for (const b of bundles) {
      const key = b.platformId;
      const name = b.platform?.name ?? b.platformId;
      if (!map.has(key)) {
        map.set(key, { platformId: key, platformName: name, bundles: [] });
      }
      map.get(key)!.bundles.push(b);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.platformName.localeCompare(b.platformName),
    );
  }, [bundles]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-2 md:p-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-black">
            반가상 입금 계좌 집계
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            모든 플랫폼이 운영 중인 반가상 입금 계좌 번들을 한 화면에 모아 봅니다.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={onlyCurrent}
            onChange={(e) => setOnlyCurrent(e.target.checked)}
            className="h-4 w-4"
          />
          현재 번들만 보기
        </label>
      </header>

      {err ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      {bundles === null ? (
        <p className="text-xs text-gray-500">불러오는 중...</p>
      ) : bundles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
          등록된 반가상 계좌가 없습니다.
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <div
              key={g.platformId}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {g.platformName}
                </span>
                <span className="text-[11px] text-gray-400">
                  번들 {g.bundles.length}개
                </span>
              </div>
              <div className="space-y-3">
                {g.bundles.map((b) => (
                  <div
                    key={b.id}
                    className={[
                      "rounded-xl border p-3",
                      b.status === "CURRENT"
                        ? "border-[#3182f6]/40 bg-[#3182f6]/5"
                        : "border-gray-200 bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 font-semibold",
                          b.status === "CURRENT"
                            ? "bg-[#3182f6] text-white"
                            : "bg-gray-200 text-gray-600",
                        ].join(" ")}
                      >
                        {b.status === "CURRENT" ? "● 현재" : "◌ 이전"}
                      </span>
                      <span className="font-semibold text-black">
                        {b.label ?? "(별칭 없음)"}
                      </span>
                      <span className="text-gray-400">
                        {fmtDate(b.createdAt)} 등록
                        {b.retiredAt ? ` · ${fmtDate(b.retiredAt)} 보존` : ""}
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {b.accounts.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg border border-gray-200 bg-white p-2"
                        >
                          <div className="text-[10px] font-semibold text-gray-400">
                            {a.bankName}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-black">
                            {a.accountNumber}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {a.accountHolder}
                          </div>
                          {a.memo ? (
                            <div className="mt-0.5 text-[10px] text-gray-400">
                              {a.memo}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
