"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hexagon, Loader2 } from "lucide-react";
import { resetRememberedWalletState } from "@/lib/wallet-session-reset";

interface AuthFormProps {
  mode: "login" | "signup";
  redirectTo?: string;
  defaultUsername?: string;
  hideModeSwitch?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
}

const AUTH_CHANGE_EVENT = "staking:auth-change";

export function AuthForm({
  mode,
  redirectTo = "/a/me/my-assets",
  defaultUsername = "",
  hideModeSwitch = false,
  title,
  description,
  submitLabel,
}: AuthFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "요청 처리 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }
      await resetRememberedWalletState({ markFreshLogin: true });
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
      router.refresh();
      router.push(redirectTo);
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_30px_80px_-30px_rgba(255,107,72,0.25)] sm:p-10 slide-up">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-foreground"
        >
          <Hexagon className="h-7 w-7 text-accent-strong" strokeWidth={2.2} />
          <span className="text-xl font-extrabold tracking-tight">
            StakingDemo
          </span>
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
          {title ?? (isSignup ? "회원가입" : "로그인")}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {description ??
            (isSignup
              ? "아이디와 비밀번호로 StakingDemo 계정을 만드세요. 이메일 형식 아이디는 사용할 수 없습니다."
              : "아이디와 비밀번호를 입력해 로그인하세요.")}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted"
            >
              아이디
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3~20자 영문/숫자/_-."
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6~64자"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel ?? (isSignup ? "회원가입" : "로그인")}
          </button>
        </form>

        {!hideModeSwitch && (
          <div className="mt-6 text-center text-sm text-muted">
            {isSignup ? (
              <>
                이미 계정이 있나요?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-foreground hover:text-accent-strong"
                >
                  로그인
                </Link>
              </>
            ) : (
              <>
                계정이 없나요?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-foreground hover:text-accent-strong"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
