"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearSession, getAccessToken } from "@/lib/api";
import { UsdtDepositPanel } from "@/components/UsdtDepositPanel";
import type { WalletModalOptions } from "@/contexts/AppModalsContext";

type Profile = {
  role: string;
  email: string;
  registrationStatus?: string;
  userMemo?: string | null;
  agentMemo?: string | null;
};

type WReq = {
  id: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  note: string | null;
  depositorName: string | null;
};

export type WalletPanelProps = {
  initialOpts?: WalletModalOptions;
  /** 로그인 필요 시 (모달에서 로그인 열기) */
  onNeedLogin?: () => void;
  /** 전체 페이지용 상단 설명·홈 링크 */
  variant?: "page" | "modal";
};

export function WalletPanel({
  initialOpts,
  onNeedLogin,
  variant = "modal",
}: WalletPanelProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [requests, setRequests] = useState<WReq[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState("10000");
  const [note, setNote] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [mainTab, setMainTab] = useState<"fiat" | "usdt">(
    initialOpts?.mainTab ?? "fiat",
  );
  const [tab, setTab] = useState<"DEPOSIT" | "WITHDRAWAL">(
    initialOpts?.fiatTab ?? "DEPOSIT",
  );
  const [submitting, setSubmitting] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const [myMemo, setMyMemo] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);

  useEffect(() => {
    if (initialOpts?.mainTab) setMainTab(initialOpts.mainTab);
    if (initialOpts?.fiatTab) setTab(initialOpts.fiatTab);
  }, [initialOpts?.mainTab, initialOpts?.fiatTab]);

  const load = useCallback(async () => {
    if (!getAccessToken()) return;
    setErr(null);
    try {
      const p = await apiFetch<Profile>("/me/profile");
      setProfile(p);
      setMyMemo(p.userMemo ?? "");
      if (p.role !== "USER") {
        setErr("일반 회원 전용 메뉴입니다.");
        return;
      }
      const w = await apiFetch<{ balance: string }>("/me/wallet");
      setBalance(w.balance);
      const list = await apiFetch<WReq[]>("/me/wallet-requests");
      setRequests(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      await apiFetch("/me/wallet-requests", {
        method: "POST",
        body: JSON.stringify({
          type: tab,
          amount: Number(amount),
          note: note || undefined,
          depositorName:
            tab === "DEPOSIT" && depositorName.trim()
              ? depositorName.trim()
              : undefined,
        }),
      });
      setNote("");
      setDepositorName("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "신청 실패");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveMyMemo(e: React.FormEvent) {
    e.preventDefault();
    setMemoSaving(true);
    setErr(null);
    try {
      await apiFetch("/me/user-memo", {
        method: "PATCH",
        body: JSON.stringify({ userMemo: myMemo }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "메모 저장 실패");
    } finally {
      setMemoSaving(false);
    }
  }

  if (!getAccessToken()) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-zinc-400">로그인 후 이용할 수 있습니다.</p>
        <button
          type="button"
          onClick={() => onNeedLogin?.()}
          className="mt-4 rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold"
        >
          로그인
        </button>
      </div>
    );
  }

  const isPage = variant === "page";

  return (
    <div className={isPage ? "mx-auto max-w-lg px-4 py-8" : ""}>
      {isPage && (
        <>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← 홈
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">충전 · 출금</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            아래 <strong className="text-zinc-200">보유 머니</strong>는 라이브
            카지노 <strong className="text-zinc-200">심리스 지갑</strong>과{" "}
            <strong className="text-zinc-200">동일한 DB 지갑</strong>입니다.
            충전 신청 승인·반가상(은행 문자) 자동 입금이 반영되면, 카지노
            베팅/당첨과 같은 잔액이 즉시 이어집니다.
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            게임 중 화면에 보이는 금액은 게임사가 잔액을 다시 조회할 때 갱신될 수
            있습니다.
          </p>
        </>
      )}

      {err && (
        <p
          className={`rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200 ${
            isPage ? "mt-4" : "mb-4"
          }`}
        >
          {err}
        </p>
      )}

      {profile?.role === "USER" && (
        <>
          <div
            className={`flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1 ${
              isPage ? "mt-6" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setMainTab("fiat")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mainTab === "fiat"
                  ? "bg-gold-gradient text-black"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              원화 충전 · 출금
            </button>
            <button
              type="button"
              onClick={() => setMainTab("usdt")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mainTab === "usdt"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              USDT 충전
            </button>
          </div>

          <div
            className={`rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6 ${
              isPage ? "mt-6" : "mt-4"
            }`}
          >
            <p className="text-sm text-zinc-500">보유 머니 (심리스 공용)</p>
            <p className="mt-1 font-mono text-3xl font-bold text-main-gold">
              {balance ?? "—"}{" "}
              <span className="text-lg text-zinc-400">원</span>
            </p>
            <Link
              href="/lobby/live-casino"
              className="mt-4 inline-flex w-full justify-center rounded-xl border border-white/15 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              라이브 카지노 입장 →
            </Link>
          </div>

          {mainTab === "usdt" && (
            <div className={isPage ? "mt-6" : "mt-4"}>
              <UsdtDepositPanel
                krwBalanceDisplay={balance ?? undefined}
                onScrollToHistory={() =>
                  historyRef.current?.scrollIntoView({ behavior: "smooth" })
                }
              />
            </div>
          )}

          {mainTab === "fiat" && (
            <>
              <div
                className={`space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 ${
                  isPage ? "mt-6" : "mt-4"
                }`}
              >
                <h2 className="text-sm font-medium text-zinc-300">내 메모</h2>
                <p className="text-xs text-zinc-500">
                  본인만 수정할 수 있는 메모입니다. 총판이 남긴 안내는 아래에서만
                  읽을 수 있습니다.
                </p>
                {profile?.agentMemo ? (
                  <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 px-3 py-2 text-sm text-violet-100/90">
                    <p className="text-[11px] font-medium text-violet-300/90">
                      총판 안내
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-200">
                      {profile.agentMemo}
                    </p>
                  </div>
                ) : null}
                <form onSubmit={saveMyMemo} className="space-y-2">
                  <textarea
                    value={myMemo}
                    onChange={(e) => setMyMemo(e.target.value)}
                    rows={4}
                    placeholder="회원 메모를 입력하세요"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                  />
                  <button
                    type="submit"
                    disabled={memoSaving}
                    className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {memoSaving ? "저장 중…" : "회원 메모 저장"}
                  </button>
                </form>
              </div>

              <form
                onSubmit={submitRequest}
                className={`space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 ${
                  isPage ? "mt-6" : "mt-4"
                }`}
              >
                <div className="flex gap-2">
                  {(["DEPOSIT", "WITHDRAWAL"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                        tab === t
                          ? "bg-gold-gradient text-black"
                          : "border border-zinc-600 text-zinc-400"
                      }`}
                    >
                      {t === "DEPOSIT" ? "충전 신청" : "출금 신청"}
                    </button>
                  ))}
                </div>
                <label className="block text-sm text-zinc-400">
                  금액 (원)
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
                  />
                </label>
                {tab === "DEPOSIT" && (
                  <label className="block text-sm text-zinc-400">
                    입금자명 (반가상 자동 충전 시 은행 문자와 동일하게)
                    <input
                      value={depositorName}
                      onChange={(e) => setDepositorName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
                    />
                  </label>
                )}
                <label className="block text-sm text-zinc-400">
                  메모 (선택)
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gold-gradient py-3 font-semibold disabled:opacity-50"
                >
                  {submitting ? "처리 중…" : "신청하기"}
                </button>
              </form>
            </>
          )}

          <div
            ref={historyRef}
            className={`scroll-mt-24 ${isPage ? "mt-8" : "mt-6"}`}
          >
            <h2 className="text-sm font-medium text-zinc-400">내 신청 내역</h2>
            <ul className="mt-3 space-y-2">
              {(requests ?? []).length === 0 ? (
                <li className="text-sm text-zinc-600">내역 없음</li>
              ) : (
                (requests ?? []).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-300">
                      {r.type === "DEPOSIT" ? "충전" : "출금"}{" "}
                      <span className="font-mono text-white">{r.amount}</span>
                      {r.depositorName ? (
                        <span className="ml-2 text-xs text-zinc-500">
                          ({r.depositorName})
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        r.status === "PENDING"
                          ? "text-amber-400"
                          : r.status === "APPROVED"
                            ? "text-emerald-400"
                            : "text-red-400"
                      }
                    >
                      {r.status}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}

      {profile && profile.role !== "USER" && (
        <button
          type="button"
          onClick={() => {
            clearSession();
            router.push("/");
            onNeedLogin?.();
          }}
          className="mt-4 text-sm text-zinc-500 underline"
        >
          다른 계정으로 로그인
        </button>
      )}
    </div>
  );
}
