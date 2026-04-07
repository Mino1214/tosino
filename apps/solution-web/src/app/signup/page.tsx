"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchReferral, publicRegister } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("DEMO7K");
  const [refOk, setRefOk] = useState<{
    platformName: string;
    agentDisplayName: string;
  } | null>(null);
  const [loginId, setLoginId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const host =
        typeof window !== "undefined" ? window.location.host : "localhost";
      const data = await fetchReferral(code, host);
      setRefOk({
        platformName: data.platformName,
        agentDisplayName: data.agentDisplayName,
      });
      setStep(2);
    } catch (err) {
      setRefOk(null);
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const host =
        typeof window !== "undefined" ? window.location.host : "localhost";
      const res = await publicRegister(
        {
          loginId,
          password,
          referralCode: code,
          displayName: displayName || undefined,
          contactEmail: contactEmail.trim() || undefined,
        },
        host,
      );
      setSuccess(res.message);
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">회원가입</h1>
        <Link href="/login" className="text-sm text-zinc-400 hover:text-white">
          로그인
        </Link>
      </div>

      <div className="mb-6 flex gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 ${step === 1 ? "bg-[var(--theme-primary,#c9a227)] text-black" : "bg-zinc-800 text-zinc-400"}`}
        >
          ① 추천 코드
        </span>
        <span className="text-zinc-600">→</span>
        <span
          className={`rounded-full px-3 py-1 ${step === 2 ? "bg-[var(--theme-primary,#c9a227)] text-black" : "bg-zinc-800 text-zinc-400"}`}
        >
          ② 계정 정보
        </span>
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        중앙 운영 → 플랫폼 → 총판(추천코드) → 본인 가입 구조입니다. 가입 후
        플랫폼 관리자 승인이 필요합니다.
      </p>

      {success && (
        <p className="mb-4 rounded-lg bg-emerald-950/80 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {step === 1 && (
        <form onSubmit={verifyCode} className="space-y-4">
          <label className="block text-sm text-zinc-400">
            총판 추천 코드
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-lg tracking-widest text-zinc-100"
              placeholder="예: DEMO7K"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full rounded-xl py-3 text-base font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
          >
            {loading ? "확인 중…" : "코드 확인"}
          </button>
        </form>
      )}

      {step === 2 && refOk && (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <p>
              <span className="text-zinc-500">플랫폼</span>{" "}
              {refOk.platformName}
            </p>
            <p className="mt-1">
              <span className="text-zinc-500">추천인(총판)</span>{" "}
              {refOk.agentDisplayName}
            </p>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setRefOk(null);
              }}
              className="mt-2 text-xs text-amber-400 hover:underline"
            >
              코드 다시 입력
            </button>
          </div>
          <label className="block text-sm text-zinc-400">
            아이디 (로그인용, 3~64자 · 소문자·숫자·._@-)
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              minLength={3}
              autoComplete="username"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            연락 이메일 (선택)
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            비밀번호 (6자 이상)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            닉네임 (선택)
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-base font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
          >
            {loading ? "제출 중…" : "가입 신청"}
          </button>
        </form>
      )}
    </div>
  );
}
