"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";
import {
  formatKrwNumber,
  formatKrwWithSymbol,
} from "@/lib/format-currency";

const numberCls = "font-mono tabular-nums";

function toFiniteNumber(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function formatPoints(value: string | number | null | undefined) {
  const n = toFiniteNumber(value);
  if (n == null) return "—";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatPercent(value: number | null | undefined) {
  const n = toFiniteNumber(value);
  if (n == null) return "0";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export function ProfileWalletSection() {
  const [balance, setBalance] = useState<string | null>(null);
  const [points, setPoints] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!getAccessToken()) return;
    void apiFetch<{ balance: string; pointBalance: string }>("/me/wallet").then(
      (w) => {
        setBalance(w.balance);
        setPoints(w.pointBalance);
      },
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const b = formatKrwWithSymbol(balance, "₩ —");
  const p = formatPoints(points);

  return (
    <section className="py-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-zinc-800 text-3xl">
          👤
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">회원</p>
          <p className="text-xs text-zinc-500">Lv.1</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/3 py-4">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              MONEY
            </span>
            <span className={`${numberCls} text-lg font-bold text-main-gold sm:text-xl`}>
              {b}
            </span>
          </div>
          <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/3 py-4">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              POINT
            </span>
            <span className={`${numberCls} text-lg font-bold text-pink-400 sm:text-xl`}>
              {p}
            </span>
            <span className="text-[10px] text-zinc-500">P</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RollingLiveSection() {
  const [data, setData] = useState<{
    achievementPct: number;
    requiredTurnover: string;
    appliedTurnover: string;
    remainingTurnover: string;
    rollingEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    void apiFetch<{
      achievementPct: number;
      requiredTurnover: string;
      appliedTurnover: string;
      remainingTurnover: string;
      rollingEnabled: boolean;
    }>("/me/rolling-summary").then(setData);
  }, []);

  const rolling = formatPercent(data?.achievementPct ?? 0);
  const req = formatKrwNumber(data?.requiredTurnover, "—");
  const app = formatKrwNumber(data?.appliedTurnover, "—");
  const rem = formatKrwNumber(data?.remainingTurnover, "—");
  const en = data?.rollingEnabled ?? false;

  return (
    <section id="rolling" className="py-6">
      <h2 className="mb-4 text-sm font-bold text-white">롤링현황</h2>
      <div className="space-y-4">
        <p className="text-[11px] text-zinc-500">
          롤링 프로그램: {en ? "적용 중" : "미적용"} · 출금은 미충족 시 제한될 수
          있습니다.
        </p>
        <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
          <span className="shrink-0 text-zinc-400">롤링 달성</span>
          <span className={`truncate text-right ${numberCls} text-zinc-200`}>
            ₩ {app} / ₩ {req} ({rolling}%)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gold-gradient transition-all duration-500"
            style={{ width: `${rolling}%` }}
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-white/8">
          {[
            ["필요 턴오버", `₩ ${req}`],
            ["충족 턴오버", `₩ ${app}`],
            ["잔여", `₩ ${rem}`],
            ["달성률", `${rolling}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex min-w-0 items-center justify-between gap-2 border-b border-white/5 px-3 py-3 last:border-b-0 sm:px-4"
            >
              <span className="shrink-0 text-xs text-zinc-500">{label}</span>
              <span className={`truncate text-right ${numberCls} text-sm text-zinc-200`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AttendCheckButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAttend() {
    if (!getAccessToken()) {
      setErr("로그인이 필요합니다.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await apiFetch<{
        pointBalance: string;
        grantedDaily: string;
        grantedStreak: string | null;
      }>("/me/points/attend", { method: "POST" });
      setMsg(
        `출석 완료 · 보유 ${r.pointBalance} P` +
          (r.grantedStreak ? ` (연속 보너스 +${r.grantedStreak})` : ""),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "출석 처리 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onAttend()}
        className="w-full rounded-xl bg-pink-600/90 py-3 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
      >
        {busy ? "처리 중…" : "출석 체크"}
      </button>
      {msg && <p className="text-center text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-center text-xs text-red-400">{err}</p>}
    </div>
  );
}
