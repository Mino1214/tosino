"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, buildLoginPlatformBody, clearSession } from "@/lib/api";

export default function AgentLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("master@tosino.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const host =
        typeof window !== "undefined" ? window.location.host : "localhost";
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
          ...(loginPlatformId
            ? { platformId: loginPlatformId }
            : buildLoginPlatformBody(host)),
        }),
      });
      if (data.user.role !== "MASTER_AGENT") {
        clearSession();
        setError("총판(MASTER_AGENT) 계정만 이 주소에서 로그인할 수 있습니다.");
        return;
      }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/agent/members");
    } catch (err) {
      clearSession();
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl"
      >
        <h1 className="text-center text-xl font-semibold text-zinc-100">
          총판 관리 로그인
        </h1>
        <p className="text-center text-xs text-zinc-500">
          운영에서 부여한 총판 계정으로 로그인하세요. 배포 시{" "}
          <code className="text-zinc-400">admin.도메인</code> 으로 접속합니다.
        </p>
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
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            autoComplete="username"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {loading ? "확인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
