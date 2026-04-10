"use client";

import { useCallback, useMemo, useState } from "react";

const MIN_USDT = 50;
const DEFAULT_RATE = 1488;

function UsdtIcon({ className }: { className?: string }) {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" className={className} aria-hidden>
      <g fill="none" fillRule="evenodd">
        <circle fill="#26A17B" cx={16} cy={16} r={16} />
        <path
          fill="#FFF"
          d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
        />
      </g>
    </svg>
  );
}

const GUIDES = [
  "50 USDT 이상 입금 가능합니다",
  "50 USDT 보다 적은 금액을 입금한 경우, 추가 입금을 하여 50 USDT가 넘는 금액이 입금되면 자동 충전처리 됩니다",
  "국내 및 해외 거래소 계좌로 충전해주시기 바랍니다",
  "충전은 자동으로 처리되며 블록체인 합의가 완료된 거래에 대해 승인처리가 됩니다",
  "승인까지 송금 후 약 1분 소요될 수 있습니다",
];

type UsdtDepositPanelProps = {
  /** 원화 지갑 잔액 표시용 (문자열) */
  krwBalanceDisplay?: string | null;
  onScrollToHistory?: () => void;
};

export function UsdtDepositPanel({
  krwBalanceDisplay,
  onScrollToHistory,
}: UsdtDepositPanelProps) {
  const address =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_USDT_TRC20_ADDRESS?.trim()) ||
    "";

  const rate = useMemo(() => {
    const n = Number(process.env.NEXT_PUBLIC_USDT_KRW_RATE);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE;
  }, []);

  const [copied, setCopied] = useState(false);
  const [qrTick, setQrTick] = useState(0);

  const qrSrc = address
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&t=${qrTick}`
    : "";

  const copy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [address]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c12] text-zinc-200">
      {/* 헤더 */}
      <div className="relative border-b border-white/8 px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <UsdtIcon />
          <h2 className="text-lg font-bold text-white">USDT 충전</h2>
        </div>
        <p className="mt-2 text-xs text-zinc-500">TRC20 (TRON 네트워크)</p>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* QR */}
          <div className="flex flex-1 flex-col items-center">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-white/10 bg-white p-2">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="USDT 입금 QR"
                  width={180}
                  height={180}
                  className="h-[180px] w-[180px]"
                />
              ) : (
                <span className="px-4 text-center text-xs text-zinc-500">
                  입금 주소가 설정되지 않았습니다.
                  <br />
                  <span className="mt-1 block font-mono text-[10px] text-zinc-600">
                    NEXT_PUBLIC_USDT_TRC20_ADDRESS
                  </span>
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
              <button
                type="button"
                title="QR 새로고침"
                onClick={() => setQrTick((t) => t + 1)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5"
              >
                새로고침
              </button>
              <span>QR 코드로 빠른 충전</span>
            </div>
            <p className="mt-1 text-center text-[11px] text-zinc-500">
              QR코드를 스캔하여 입금주소를 <span className="text-zinc-300">확인하세요</span>
            </p>
          </div>

          {/* 주소 · 정보 */}
          <div className="min-w-0 flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-200">
              <span className="text-emerald-400">◎</span>
              TRON 네트워크 (TRC20)
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="text-zinc-500">✓</span> 입금 주소
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={address || "주소를 불러오는 중..."}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-xs text-zinc-200"
                />
                <button
                  type="button"
                  onClick={copy}
                  disabled={!address}
                  className="shrink-0 rounded-lg border border-[rgba(218,174,87,0.5)] bg-[rgba(218,174,87,0.1)] px-4 py-2 text-xs font-semibold text-main-gold disabled:opacity-40"
                >
                  {copied ? "복사됨" : "복사"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-white/8 bg-black/25 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">최소 충전금액</span>
                <span className="font-semibold text-white">{MIN_USDT} USDT</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">현재 환율 (참고)</span>
                <span className="font-mono text-zinc-200">
                  1 USDT = {rate.toLocaleString("ko-KR")} KRW
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">원화 지갑 잔액</span>
                <span className="font-mono text-main-gold">
                  {krwBalanceDisplay ?? "—"} 원
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="my-6 h-px bg-white/10" />

        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <span className="text-zinc-500">◎</span>
            충전 안내사항
          </p>
          <ul className="space-y-2 text-xs leading-relaxed text-zinc-400">
            {GUIDES.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="shrink-0 text-zinc-600">·</span>
                <span>{t}</span>
              </li>
            ))}
            <li className="flex gap-2 text-amber-200/90">
              <span className="shrink-0">⚠</span>
              <span>
                TRC20 네트워크로만 입금해주세요 (다른 네트워크 입금 시 자산 손실 위험)
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-4">
        <button
          type="button"
          onClick={onScrollToHistory}
          className="w-full rounded-xl border border-white/15 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5"
        >
          거래내역 확인
        </button>
      </div>
    </div>
  );
}
