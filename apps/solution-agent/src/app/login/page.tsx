"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, buildLoginPlatformBody, clearSession } from "@/lib/api";

export default function AgentLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("test_sub_agent_a1");
  const [password, setPassword] = useState("Test1234!");
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
      router.push("/agent/sales");
    } catch (err) {
      clearSession();
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f4f6] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3182f6] text-white text-[24px] font-bold shadow-lg">
            T
          </div>
          <h1 className="mt-4 text-[22px] font-bold text-black">총판 관리</h1>
          <p className="mt-1 text-[14px] text-gray-500">운영에서 부여한 총판 계정으로 로그인하세요</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[14px] text-red-700">
              {error}
            </p>
          )}
          <label className="block">
            <span className="text-[13px] font-semibold text-gray-700">아이디</span>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="총판 아이디 입력"
              required
              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-[15px] text-black placeholder:text-gray-400 focus:border-[#3182f6] focus:outline-none focus:ring-2 focus:ring-[#3182f6]/20"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-gray-700">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              required
              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-[15px] text-black placeholder:text-gray-400 focus:border-[#3182f6] focus:outline-none focus:ring-2 focus:ring-[#3182f6]/20"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !loginId.trim() || !password}
            className="w-full rounded-xl bg-[#3182f6] py-3 text-[15px] font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {loading ? "확인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
