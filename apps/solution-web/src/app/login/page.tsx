"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  buildLoginPlatformBody,
  clearSession,
} from "@/lib/api";
export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("user@tosino.local");
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
      const data = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          loginId: string;
          email: string | null;
          role: string;
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          loginId: loginId.trim().toLowerCase(),
          password,
          ...buildLoginPlatformBody(host),
        }),
      });
      if (data.user.role !== "USER") {
        clearSession();
        setError(
          "일반 회원(USER) 계정만 이 사이트에서 로그인할 수 있습니다. 관리자·총판은 각각 전용 주소를 이용하세요.",
        );
        return;
      }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/");
      router.refresh();
    } catch (err) {
      clearSession();
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-black/50 p-8 backdrop-blur"
      >
        <h1 className="text-center text-xl font-semibold text-white">
          로그인
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
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 font-medium text-black hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
        >
          {loading ? "처리 중…" : "로그인"}
        </button>
        <p className="text-center text-sm text-zinc-500">
          아직 계정이 없나요?{" "}
          <Link
            href="/signup"
            className="text-[var(--theme-primary,#c9a227)] hover:underline"
          >
            총판 코드로 가입
          </Link>
        </p>
      </form>
    </div>
  );
}
