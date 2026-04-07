"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type Row = {
  id: string;
  status: string;
  failureReason: string | null;
  sender: string | null;
  recipientPhoneSnapshot: string | null;
  parsedJson: unknown;
  rawBody: string;
  matchedWalletRequestId: string | null;
  createdAt: string;
};

export default function SemiSmsLogPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return apiFetch<Row[]>(
      `/platforms/${selectedPlatformId}/bank-sms-ingests`,
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
    load();
  }, [load, router, selectedPlatformId, platformLoading]);

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  if (err && !rows) {
    return <p className="text-red-400">{err}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">SMS 입금 로그</h1>
          <p className="mt-1 text-sm text-zinc-500">
            수신 서버가 기록한 문자 처리 결과입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          새로고침
        </button>
      </div>

      <Link
        href="/console/semi/settings"
        className="text-sm text-violet-400 hover:text-violet-300"
      >
        ← 반가상 설정
      </Link>

      {err && <p className="text-sm text-red-400">{err}</p>}

      {!rows ? (
        <p className="text-zinc-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-zinc-500">기록이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2">시각</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">수신번호</th>
                <th className="px-3 py-2">메모</th>
                <th className="px-3 py-2">본문</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/80 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={
                        r.status === "AUTO_CREDITED"
                          ? "text-emerald-400"
                          : r.status === "NO_MATCH" ||
                              r.status === "PARSE_ERROR" ||
                              r.status === "NO_PLATFORM"
                            ? "text-amber-400"
                            : "text-zinc-400"
                      }
                    >
                      {r.status}
                    </span>
                    {r.matchedWalletRequestId && (
                      <div className="mt-0.5 font-mono text-[10px] text-zinc-600">
                        wr: {r.matchedWalletRequestId.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                    {r.recipientPhoneSnapshot ?? "—"}
                  </td>
                  <td className="max-w-[200px] px-3 py-2 text-xs text-zinc-500">
                    {r.failureReason ?? "—"}
                  </td>
                  <td className="max-w-md px-3 py-2">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-zinc-500">
                      {r.rawBody.length > 400
                        ? `${r.rawBody.slice(0, 400)}…`
                        : r.rawBody}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
