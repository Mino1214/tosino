"use client";

import { useEffect, useRef, useState } from "react";
import { useAppModals } from "@/contexts/AppModalsContext";
import { getAccessToken, subscribeAuthChange } from "@/lib/api";

export function AuthRequiredGate({
  children,
  title = "회원 전용 메뉴입니다.",
  description = "로그인 또는 회원가입 후 이용할 수 있습니다.",
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const { openLogin, openSignup } = useAppModals();
  const [logged, setLogged] = useState(() => !!getAccessToken());
  const promptedRef = useRef(false);

  useEffect(() => {
    const refresh = () => setLogged(!!getAccessToken());
    refresh();
    return subscribeAuthChange(refresh);
  }, []);

  useEffect(() => {
    if (logged) {
      promptedRef.current = false;
      return;
    }
    if (promptedRef.current) return;
    promptedRef.current = true;
    openLogin();
  }, [logged, openLogin]);

  if (logged) return <>{children}</>;

  return (
    <div className="content-pad-phi mx-auto flex w-full max-w-[90rem] items-center justify-center py-10 sm:py-14">
      <div className="w-full max-w-xl rounded-[2rem] border border-[rgba(218,174,87,0.22)] bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,14,0.98))] p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-main-gold-solid/60">
          Members Only
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => openLogin()}
            className="flex-1 rounded-xl bg-gold-gradient px-5 py-3 text-sm font-bold text-black"
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => openSignup()}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-100 hover:bg-white/[0.06]"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
