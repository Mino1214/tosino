"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";

type SettlementItem = {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  createdAt: string;
  isSettlement: boolean;
};

type SettlementsRes = {
  items: SettlementItem[];
  totalReceived: string;
  myBalance: string;
  subAgentSettlementTotal: string;
  effectiveAgentSharePct: number;
};

function fmt(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ko-KR");
}

type EntryKind = "deposit" | "ggr" | "withdrawal" | "other";

function getEntryKind(ref: string | null, amount: string): EntryKind {
  if (ref?.includes("agent_commission:deposit")) return "deposit";
  if (ref?.includes("agent_commission:withdrawal")) return "withdrawal";
  if (ref?.includes("agent_bet_commission") || ref?.includes("ggr_settlement") || ref?.includes(":settlement:")) return "ggr";
  if (Number(amount) < 0) return "withdrawal";
  return "other";
}

function kindBadge(kind: EntryKind) {
  switch (kind) {
    case "deposit":
      return <span className="rounded bg-[#3182f6]/10 px-2 py-0.5 text-[11px] font-bold text-[#3182f6]">입금</span>;
    case "ggr":
      return <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">낙첨</span>;
    case "withdrawal":
      return <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">출금</span>;
    default:
      return <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">조정</span>;
  }
}

export default function CommissionHistoryPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<SettlementsRes | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 환전신청 폼
  const [usdtRate, setUsdtRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [withdrawErr, setWithdrawErr] = useState<string | null>(null);
  const [withdrawOk, setWithdrawOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      q.set("limit", "200");
      const res = await apiFetch<SettlementsRes>(`/me/agent/my-settlements?${q}`);
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const fetchUsdtRate = useCallback(async () => {
    setRateLoading(true);
    try {
      const res = await fetch("https://api.upbit.com/v1/ticker?markets=KRW-USDT");
      const json = await res.json() as Array<{ trade_price: number }>;
      if (json?.[0]?.trade_price) {
        setUsdtRate(json[0].trade_price);
      }
    } catch {
      setUsdtRate(null);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void fetchUsdtRate();
  }, [load, fetchUsdtRate]);

  if (!getAccessToken()) return null;

  const allItems = data?.items ?? [];

  // 각 항목의 구분 계산
  const itemsWithKind = allItems.map((i) => ({
    ...i,
    kind: getEntryKind(i.reference, i.amount),
  }));

  // 요약 집계
  const depositItems  = itemsWithKind.filter((i) => i.kind === "deposit");
  const ggrItems      = itemsWithKind.filter((i) => i.kind === "ggr");
  const withdrawalItems = itemsWithKind.filter((i) => i.kind === "withdrawal");

  const depositTotal  = depositItems.reduce((s, i) => s + Number(i.amount), 0);
  const ggrTotal      = ggrItems.reduce((s, i) => s + Number(i.amount), 0);
  const settlementTotal = depositTotal + ggrTotal;
  const totalWithdrawn = withdrawalItems.reduce((s, i) => s + Math.abs(Number(i.amount)), 0);

  // 환전가능 정산금: 최신 balanceAfter
  const sortedItems = [...allItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const availableBalance = sortedItems.length > 0
    ? Number(sortedItems[0].balanceAfter)
    : Math.max(0, settlementTotal - totalWithdrawn);

  const amtNum = Number(withdrawAmt.replace(/,/g, "")) || 0;
  const usdtAmount = usdtRate && usdtRate > 0 ? amtNum / usdtRate : 0;

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawErr(null);
    setWithdrawOk(false);
    if (!address.trim()) { setWithdrawErr("USDT 주소를 입력해주세요."); return; }
    if (amtNum <= 0) { setWithdrawErr("환전 금액을 입력해주세요."); return; }
    if (amtNum > availableBalance) { setWithdrawErr("환전가능 정산금을 초과합니다."); return; }
    setSubmitting(true);
    try {
      await apiFetch("/me/agent/settlement-withdrawal", {
        method: "POST",
        body: JSON.stringify({ address: address.trim(), amountKrw: amtNum }),
      });
      setWithdrawOk(true);
      setAddress("");
      setWithdrawAmt("");
      setShowWithdrawForm(false);
      await load();
    } catch (e2) {
      setWithdrawErr(e2 instanceof Error ? e2.message : "환전 신청 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">결제요청</p>
        <h1 className="mt-0.5 text-[22px] font-bold text-black">정산 내역</h1>
        <p className="mt-1 text-[14px] text-gray-500">정산금 수령 이력 및 USDT 환전 신청</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-[13px] font-medium text-gray-700">
          시작
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        <label className="block text-[13px] font-medium text-gray-700">
          종료
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="rounded-lg bg-[#3182f6] px-5 py-1.5 text-[14px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition">
          {loading ? "조회 중…" : "조회"}
        </button>
      </div>

      {err && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}

      {/* 요약 카드 — 단일 카드 */}
      {data && (
        <div className="rounded-2xl border-2 border-[#3182f6]/30 bg-[#3182f6]/5 p-5">
          {/* 상단: 대금 가능 금액 + 환전 버튼 */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#3182f6]">대금 가능 금액</p>
              <p className="mt-1 text-[34px] font-bold leading-none text-[#3182f6]">₩{fmt(availableBalance)}</p>
              <p className="mt-1 text-[12px] text-[#3182f6]/60">현재 잔액 기준</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowWithdrawForm((v) => !v); setWithdrawErr(null); setWithdrawOk(false); }}
              className="shrink-0 rounded-xl bg-[#3182f6] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-blue-600 transition"
            >
              {showWithdrawForm ? "취소" : "환전 신청"}
            </button>
          </div>

          {/* 구분선 */}
          <div className="my-4 border-t border-[#3182f6]/20" />

          {/* 하단: 커미션 내역 3열 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/60 px-3 py-2.5">
              <span className="flex items-center gap-1">
                <span className="rounded bg-[#3182f6]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#3182f6]">입금</span>
                <span className="text-[11px] text-gray-500">커미션</span>
              </span>
              <p className="mt-1.5 text-[15px] font-bold text-gray-800">₩{fmt(depositTotal)}</p>
              <p className="text-[11px] text-gray-400">{depositItems.length}건</p>
            </div>
            <div className="rounded-xl bg-white/60 px-3 py-2.5">
              <span className="flex items-center gap-1">
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">낙첨</span>
                <span className="text-[11px] text-gray-500">커미션</span>
              </span>
              <p className="mt-1.5 text-[15px] font-bold text-gray-800">₩{fmt(ggrTotal)}</p>
              <p className="text-[11px] text-gray-400">{ggrItems.length}건</p>
            </div>
            <div className="rounded-xl bg-white/60 px-3 py-2.5">
              <span className="flex items-center gap-1">
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">출금</span>
                <span className="text-[11px] text-gray-500">차감</span>
              </span>
              <p className="mt-1.5 text-[15px] font-bold text-red-500">−₩{fmt(totalWithdrawn)}</p>
              <p className="text-[11px] text-gray-400">{withdrawalItems.length}건</p>
            </div>
          </div>
        </div>
      )}

      {/* 환전 신청 폼 */}
      {showWithdrawForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-black">USDT 환전 신청</h2>
            {/* 업비트 USDT 환율 */}
            <div className="text-right">
              <p className="text-[11px] text-gray-400">업비트 USDT/KRW</p>
              <p className="text-[15px] font-bold text-black">
                {rateLoading ? "조회 중…" : usdtRate ? `₩${usdtRate.toLocaleString("ko-KR")}` : "—"}
              </p>
              <button type="button" onClick={() => void fetchUsdtRate()}
                className="text-[11px] text-[#3182f6] hover:underline">
                새로고침
              </button>
            </div>
          </div>

          <form onSubmit={submitWithdrawal} className="space-y-4">
            <label className="block text-[13px] font-medium text-gray-700">
              USDT 수령 주소 (TRC20 / ERC20)
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="지갑 주소 입력"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-[14px] text-gray-900 placeholder:text-gray-400"
              />
            </label>
            <div>
              <label className="block text-[13px] font-medium text-gray-700">
                환전 금액 (원)
                <input
                  type="number"
                  min={0}
                  max={availableBalance}
                  step={1000}
                  value={withdrawAmt}
                  onChange={(e) => setWithdrawAmt(e.target.value)}
                  placeholder="환전할 원화 금액"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[14px] text-gray-900"
                />
              </label>
              {amtNum > 0 && usdtRate && (
                <p className="mt-1.5 text-[13px] text-gray-600">
                  환산 USDT:{" "}
                  <span className="font-mono font-bold text-[#3182f6]">
                    {usdtAmount.toFixed(2)} USDT
                  </span>
                  <span className="ml-2 text-[12px] text-gray-400">(환율 ₩{usdtRate.toLocaleString()} 기준)</span>
                </p>
              )}
            </div>
            {withdrawErr && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{withdrawErr}</p>
            )}
            {withdrawOk && (
              <p className="rounded-lg border border-[#3182f6]/30 bg-[#3182f6]/5 px-3 py-2 text-[13px] font-semibold text-[#3182f6]">
                환전 신청이 완료되었습니다.
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#3182f6] py-2.5 text-[14px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
            >
              {submitting ? "신청 중…" : "환전 신청 완료"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-[14px] text-gray-500">불러오는 중…</p>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-[15px] font-semibold text-gray-700">지급된 정산 내역이 없습니다</p>
          <p className="mt-2 text-[13px] text-gray-500">
            정산은 플랫폼 관리자가 배치 처리하거나 슈퍼어드민에서 수동 지급합니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold text-black">
            정산 내역
            <span className="ml-2 text-[13px] font-normal text-gray-500">({itemsWithKind.length}건)</span>
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">일시</th>
                    <th className="px-4 py-3">구분</th>
                    <th className="px-4 py-3 text-right">금액</th>
                    <th className="px-4 py-3 text-right">잔액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemsWithKind.map((row) => {
                    const isDebit = row.kind === "withdrawal";
                    const amtN = Number(row.amount);
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-600">
                          {new Date(row.createdAt).toLocaleString("ko-KR")}
                        </td>
                        <td className="px-4 py-3">{kindBadge(row.kind)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${isDebit ? "text-red-500" : "text-[#3182f6]"}`}>
                          {isDebit ? "−" : "+"}₩{fmt(Math.abs(amtN))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[13px] text-gray-500">
                          ₩{fmt(row.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
