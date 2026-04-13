"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type Semi = {
  semiVirtualEnabled: boolean;
  semiVirtualRecipientPhone: string | null;
  semiVirtualAccountHint: string | null;
};

export default function SemiVirtualSettingsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [data, setData] = useState<Semi | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [hint, setHint] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) {
      setData(null);
      return;
    }
    setErr(null);
    apiFetch<Semi>(`/platforms/${selectedPlatformId}/semi-virtual`)
      .then((d) => {
        setData(d);
        setEnabled(d.semiVirtualEnabled);
        setPhone(d.semiVirtualRecipientPhone ?? "");
        setHint(d.semiVirtualAccountHint ?? "");
      })
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "설정을 불러오지 못했습니다"),
      );
  }, [selectedPlatformId, platformLoading]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatformId) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const updated = await apiFetch<Semi>(
        `/platforms/${selectedPlatformId}/semi-virtual`,
        {
          method: "PATCH",
          body: JSON.stringify({
            enabled,
            recipientPhone: phone.trim() || undefined,
            accountHint: hint.trim() || undefined,
          }),
        },
      );
      setData(updated);
      setMsg("저장했습니다.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  if (err && !data) {
    return <p className="text-sm text-red-400">{err}</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">반가상 설정</h1>
        <p className="mt-1 text-sm text-zinc-500">
          은행 웹발신 문자를 수신 서버로 넘기면, 금액·입금자명이 맞는 대기 충전
          신청을 자동 승인합니다. 일반 결제·웹훅과 별도입니다.
        </p>
      </div>

      <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 px-4 py-3 text-sm text-violet-200/90">
        <p className="font-medium text-violet-100">SMS 수신 서버 (별도 프로세스)</p>
        <p className="mt-1 text-xs text-violet-200/70">
          로컬:{" "}
          <code className="rounded bg-black/40 px-1 text-[11px]">
            pnpm dev:sms-ingest
          </code>
          . 모바일용 HTTPS는{" "}
          <code className="text-[11px]">pnpm dev:sms-ingest:public</code>
          (ingest+cloudflared 동시) 또는{" "}
          <code className="text-[11px]">pnpm tunnel:sms-ingest</code> 로 주소를
          받은 뒤 Flutter URL을{" "}
          <code className="text-[11px]">https://…/webhook/sms</code> 로 넣으세요.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Flutter 앱 (Android 실사용 / iOS 테스트):{" "}
          <code className="text-zinc-400">apps/sms_forwarder</code>
        </p>
      </div>

      {data && (
        <form
          onSubmit={onSave}
          className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          {msg && <p className="text-sm text-emerald-400">{msg}</p>}
          {err && <p className="text-sm text-red-400">{err}</p>}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-zinc-600"
            />
            반가상(SMS 자동 입금 확인) 사용
          </label>

          <label className="block text-sm text-zinc-400">
            수신 단말 번호 (숫자만, 앱에 동일하게 입력)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 01012345678"
              disabled={!enabled}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 disabled:opacity-50"
            />
          </label>

          <label className="block text-sm text-zinc-400">
            계좌 SMS 힌트 (본문에 포함되는 고유 문자열, 선택)
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="예: 123**456 또는 계좌 마스킹 일부"
              disabled={!enabled}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 disabled:opacity-50"
            />
          </label>

          <p className="text-xs text-zinc-600">
            사용 시{" "}
            <strong className="text-zinc-500">번호 또는 힌트 중 하나 이상</strong>{" "}
            필수. 둘 다 넣으면 문자가 모두 만족할 때만 이 플랫폼으로 매칭됩니다.
          </p>
          <p className="text-xs text-amber-200/80">
            전달 앱(sms_forwarder 등)은 수신 서버에{" "}
            <code className="text-amber-100/90">recipientPhone</code>(이 단말
            번호)을 꼭 넣어 주세요. 없으면 콘솔에 &quot;등록 기기&quot;로
            묶이지 않을 수 있습니다.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </form>
      )}

      <Link
        href="/console/semi/sms-log"
        className="inline-block text-sm text-violet-400 hover:text-violet-300"
      >
        SMS 처리 로그 →
      </Link>
    </div>
  );
}
