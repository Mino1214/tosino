"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("super@tosino.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loginPlatformId =
        process.env.NEXT_PUBLIC_LOGIN_PLATFORM_ID?.trim() || undefined;
      const data = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          loginId: string;
          email: string | null;
          role: string;
          platformId: string | null;
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          loginId: loginId.trim().toLowerCase(),
          password,
          ...(loginPlatformId ? { platformId: loginPlatformId } : {}),
        }),
      });
      if (data.user.role !== "SUPER_ADMIN") {
        clearSession();
        setError(
          "이 주소는 슈퍼 어드민만 사용할 수 있습니다. 솔루션 운영자는 각 솔루션의 mod 도메인에서 로그인하세요.",
        );
        return;
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("adminSelectedPlatformId");
      }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/console");
    } catch (err) {
      clearSession();
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120c0a] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(225,29,72,0.16),transparent_26%),linear-gradient(180deg,#120c0a_0%,#09090b_100%)]" />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md space-y-5 rounded-[2rem] border border-amber-900/40 bg-[#140f0d]/88 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur"
      >
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/75">
            mod.tozinosolution.com
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-zinc-100">
            Super Admin HQ
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            전체 솔루션의 매출, 알값, 청구, 자산 배정을 관리하는 본사 콘솔입니다.
          </p>
        </div>
        {error && (
          <p className="rounded bg-red-950/80 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <label className="block text-sm text-zinc-400">
          아이디
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-100"
            autoComplete="username"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-amber-600 py-3 font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {loading ? "처리 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
