"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_RATE = 1488;
const STORAGE_PREFIX = "wallet-usdt-address:v1";

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

type UsdtDepositPanelProps = {
  userId: string;
  krwBalanceDisplay?: string | null;
};

function formatUsdtAmount(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function UsdtDepositPanel({
  userId,
  krwBalanceDisplay,
}: UsdtDepositPanelProps) {
  const rate = useMemo(() => {
    const n = Number(process.env.NEXT_PUBLIC_USDT_KRW_RATE);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE;
  }, []);

  const [savedAddress, setSavedAddress] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrTick, setQrTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(getStorageKey(userId)) ?? "";
    setSavedAddress(saved);
    setDraftAddress(saved);
    setIsEditing(!saved);
  }, [userId]);

  const withdrawableUsdt = useMemo(() => {
    const krw = Number(krwBalanceDisplay ?? 0);
    if (!Number.isFinite(krw) || krw <= 0) return 0;
    return krw / rate;
  }, [krwBalanceDisplay, rate]);

  const qrSource =
    isEditing && draftAddress.trim()
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(draftAddress.trim())}&t=${qrTick}`
      : "";

  const copyAddress = useCallback(async () => {
    if (!savedAddress) return;
    try {
      await navigator.clipboard.writeText(savedAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [savedAddress]);

  function saveWallet() {
    const trimmed = draftAddress.trim();
    if (trimmed.length < 20) {
      setNotice(null);
      setError("TRC20 지갑 주소를 다시 확인해주세요.");
      return;
    }
    if (typeof window === "undefined") return;

    localStorage.setItem(getStorageKey(userId), trimmed);
    setSavedAddress(trimmed);
    setDraftAddress(trimmed);
    setIsEditing(false);
    setError(null);
    setNotice("테더 지갑 주소가 이 브라우저에 저장되었습니다.");
  }

  function startEditing() {
    setNotice(null);
    setError(null);
    setIsEditing(true);
    setDraftAddress(savedAddress);
  }

  function cancelEditing() {
    setNotice(null);
    setError(null);
    setDraftAddress(savedAddress);
    setIsEditing(!savedAddress);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c12] text-zinc-200 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
      <div className="border-b border-white/8 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UsdtIcon />
            <div>
              <h2 className="text-lg font-bold text-white">테더 지갑</h2>
              <p className="mt-1 text-xs text-zinc-500">TRC20 출금 지갑 등록용</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-700/40 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-200">
            1 USDT = {rate.toLocaleString("ko-KR")} KRW
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {error ? (
          <p className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-xl bg-emerald-950/60 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {savedAddress && !isEditing ? "지갑 등록 완료" : "지갑 등록"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {savedAddress && !isEditing
                    ? "등록된 지갑 주소로 테더 출금 기준을 확인할 수 있습니다."
                    : "지갑 주소를 등록하면 이후 출금 기준을 한눈에 볼 수 있습니다."}
                </p>
              </div>
              {savedAddress && !isEditing ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
                >
                  주소 변경
                </button>
              ) : null}
            </div>

            {savedAddress && !isEditing ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[rgba(38,161,123,0.26)] bg-[rgba(38,161,123,0.1)] px-4 py-3">
                  <p className="text-xs text-zinc-500">등록된 지갑 주소</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-white">
                    {savedAddress}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
                >
                  {copied ? "복사됨" : "주소 복사"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block text-sm text-zinc-400">
                  TRC20 지갑 주소
                  <input
                    value={draftAddress}
                    onChange={(e) => setDraftAddress(e.target.value)}
                    placeholder="T로 시작하는 지갑 주소 입력"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500/70"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveWallet}
                    className="flex-1 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
                  >
                    지갑 저장
                  </button>
                  {savedAddress ? (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      취소
                    </button>
                  ) : null}
                </div>

                <p className="text-xs leading-relaxed text-zinc-500">
                  지금은 브라우저에 임시 저장되며, 이후 DB와 연결할 때 같은 구조로 옮기기 쉽게 맞춰둔 상태입니다.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
            <p className="text-sm font-semibold text-white">출금 가능 금액</p>
            <p className="mt-3 font-mono text-3xl font-bold text-main-gold">
              {formatUsdtAmount(withdrawableUsdt)}
              <span className="ml-2 text-base text-zinc-500">USDT</span>
            </p>
            <div className="mt-4 space-y-3 rounded-xl border border-white/8 bg-zinc-950/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">원화 보유금액</span>
                <span className="font-mono text-zinc-200">
                  {Number(krwBalanceDisplay ?? 0).toLocaleString("ko-KR", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  KRW
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">기준 환율</span>
                <span className="font-mono text-zinc-200">
                  {rate.toLocaleString("ko-KR")} KRW
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">지갑 등록 상태</span>
                <span className={savedAddress ? "text-emerald-300" : "text-amber-300"}>
                  {savedAddress ? "등록 완료" : "등록 필요"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
            <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">등록 중 QR 미리보기</p>
              <p className="mt-1 text-sm text-zinc-500">
                지갑 등록 단계에서만 QR을 보여주고, 저장이 끝나면 숨깁니다.
              </p>
            </div>

            <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-white p-4">
              {qrSource ? (
                <div className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSource}
                    alt="지갑 주소 QR"
                    width={220}
                    height={220}
                    className="h-[220px] w-[220px]"
                  />
                  <button
                    type="button"
                    onClick={() => setQrTick((tick) => tick + 1)}
                    className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    QR 새로고침
                  </button>
                </div>
              ) : (
                <span className="px-4 text-center text-xs text-zinc-500">
                  지갑 주소를 입력하면 QR 미리보기가 표시됩니다.
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
