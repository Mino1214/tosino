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
      if (
        data.user.role !== "SUPER_ADMIN" &&
        data.user.role !== "PLATFORM_ADMIN" &&
        data.user.role !== "MASTER_AGENT"
      ) {
        clearSession();
        setError(
          "이 주소는 슈퍼관리자·플랫폼관리자·총판만 사용할 수 있습니다. 회원은 솔루션(회원) 사이트에서 로그인하세요.",
        );
        return;
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("adminSelectedPlatformId");
      }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push(
        data.user.role === "MASTER_AGENT" ? "/console/operational" : "/console/users",
      );
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
          운영 콘솔 로그인
        </h1>
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
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
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
          {loading ? "처리 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
