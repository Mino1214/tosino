"use client";

import { useState } from "react";
import { fetchOddsHostDiagnostic } from "@/lib/api";

type Props = {
  requestHost: string;
  sport: string;
  oddshostSecret: string;
};

/**
 * OddsHost 는 API 서버 출발 IP 화이트리스트 기준입니다.
 * 이 패널은 브라우저 → 우리 API → (진단 시) OddsHost 순으로 확인합니다.
 */
export function OddsHostDiagnosticPanel({
  requestHost,
  sport,
  oddshostSecret,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const run = async (probe: boolean) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetchOddsHostDiagnostic(
        requestHost,
        sport.trim() || "1",
        oddshostSecret.trim() || undefined,
        probe,
      );
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "진단 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 rounded border border-white/10 bg-black/25 p-2">
      <p className="leading-relaxed text-zinc-500">
        <strong className="text-zinc-400">API 서버</strong> 기준으로{" "}
        <code className="text-zinc-400">ODDSHOST_*</code> URL 조합이 되는지,
        그리고 <strong className="text-zinc-400">업스트림 호출</strong>이 되는지
        확인합니다. IP 허용 목록은 이 Nest 프로세스가 나가는 공인 IP입니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void run(false)}
          className="rounded border border-white/15 px-2 py-1 text-zinc-200 disabled:opacity-40"
        >
          설정만 진단
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void run(true)}
          className="rounded bg-[rgba(218,174,87,0.15)] px-2 py-1 text-main-gold disabled:opacity-40"
        >
          진단 + 인플레이 목록 GET (probe)
        </button>
      </div>
      {loading && <p className="text-zinc-500">요청 중…</p>}
      {err && <p className="text-red-400">{err}</p>}
      {result != null && (
        <pre className="max-h-[280px] overflow-auto rounded border border-white/10 bg-black/50 p-2 text-[10px] leading-snug text-zinc-300">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
