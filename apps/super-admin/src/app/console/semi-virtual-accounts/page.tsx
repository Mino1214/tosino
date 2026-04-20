"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Account = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string | null;
  sortOrder: number;
};

type Bundle = {
  id: string;
  platformId: string;
  platform: { id: string; name: string; slug: string } | null;
  label: string | null;
  status: string;
  createdAt: string;
  retiredAt: string | null;
  accounts: Account[];
};

export default function SemiVirtualBundlesPage() {
  const [onlyCurrent, setOnlyCurrent] = useState(true);
  const [rows, setRows] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = onlyCurrent ? "?onlyCurrent=1" : "";
      const data = await apiFetch<Bundle[]>(`/platforms/semi-virtual-bundles/all${q}`);
      setRows(data ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오지 못했습니다");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [onlyCurrent]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">반가상 계좌 번들</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            솔루션별 노출 계좌 묶음(CURRENT / 이력)을 한 화면에서 봅니다.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={onlyCurrent}
            onChange={(e) => setOnlyCurrent(e.target.checked)}
            className="rounded border-gray-300"
          />
          현재 번들만
        </label>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">번들이 없습니다.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-zinc-100">{b.platform?.name ?? b.platformId}</p>
                  <p className="text-xs font-mono text-gray-500">{b.platform?.slug}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    b.status === "CURRENT"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {b.status}
                </span>
              </div>
              {b.label ? <p className="mt-2 text-xs text-gray-500">{b.label}</p> : null}
              <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-zinc-800">
                {b.accounts.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium text-gray-800 dark:text-zinc-200">{a.bankName}</span>{" "}
                    <span className="font-mono text-gray-600 dark:text-zinc-400">{a.accountNumber}</span>
                    {a.accountHolder ? (
                      <span className="text-gray-500 dark:text-zinc-500"> · {a.accountHolder}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-gray-400">
                생성 {new Date(b.createdAt).toLocaleString("ko-KR")}
                {b.retiredAt ? ` · 종료 ${new Date(b.retiredAt).toLocaleString("ko-KR")}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
