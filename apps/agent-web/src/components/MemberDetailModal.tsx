"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type MemberDetail = {
  id: string;
  loginId: string;
  email?: string | null;
  displayName: string | null;
  createdAt: string;
  registrationStatus: string;
  rollingEnabled: boolean;
  rollingSportsDomesticPct: number | null;
  rollingSportsOverseasPct: number | null;
  rollingCasinoPct: number | null;
  rollingSlotPct: number | null;
  rollingMinigamePct: number | null;
  agentMemo: string | null;
  userMemo: string | null;
  uplinePrivateMemo: string | null;
  balance: string;
};

type Tab = "basic" | "settlement" | "stats" | "revisions";

type RollingRevRow = {
  id: string;
  effectiveFrom: string;
  rollingEnabled: boolean;
  rollingSportsDomesticPct: number | null;
  rollingSportsOverseasPct: number | null;
  rollingCasinoPct: number | null;
  rollingSlotPct: number | null;
  rollingMinigamePct: number | null;
};

type WalletReqRow = {
  id: string;
  type: string;
  amount: string;
  status: string;
  note: string | null;
  depositorName: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

type LedgerRow = {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  createdAt: string;
};

function regLabel(s: string) {
  switch (s) {
    case "PENDING":
      return "승인 대기";
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "거절됨";
    default:
      return s;
  }
}

function wrTypeLabel(t: string) {
  switch (t) {
    case "DEPOSIT":
      return "충전";
    case "WITHDRAWAL":
      return "환전";
    default:
      return t;
  }
}

function ledgerTypeLabel(t: string) {
  switch (t) {
    case "BET":
      return "배팅";
    case "WIN":
      return "당첨";
    default:
      return t;
  }
}

export function MemberDetailModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<Tab>("basic");
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rollingEnabled, setRollingEnabled] = useState(false);
  const [spDom, setSpDom] = useState(0);
  const [spOver, setSpOver] = useState(0);
  const [ca, setCa] = useState(0);
  const [sl, setSl] = useState(0);
  const [mg, setMg] = useState(0);
  const [agentMemo, setAgentMemo] = useState("");
  const [uplinePrivateMemo, setUplinePrivateMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [settleRows, setSettleRows] = useState<WalletReqRow[]>([]);
  const [settleLoading, setSettleLoading] = useState(false);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [revHint, setRevHint] = useState<string | null>(null);
  const [revRows, setRevRows] = useState<RollingRevRow[]>([]);
  const [revLoading, setRevLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    setTab("basic");
    setErr(null);
    setLoading(true);
    apiFetch<MemberDetail>(`/me/agent/downline/${userId}`)
      .then((d) => {
        setDetail(d);
        setRollingEnabled(d.rollingEnabled);
        setSpDom(Number(d.rollingSportsDomesticPct ?? 0));
        setSpOver(Number(d.rollingSportsOverseasPct ?? 0));
        setCa(Number(d.rollingCasinoPct ?? 0));
        setSl(Number(d.rollingSlotPct ?? 0));
        setMg(Number(d.rollingMinigamePct ?? 0));
        setAgentMemo(d.agentMemo ?? "");
        setUplinePrivateMemo(d.uplinePrivateMemo ?? "");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId || tab !== "settlement") return;
    setSettleLoading(true);
    apiFetch<{ items: WalletReqRow[] }>(
      `/me/agent/downline/${userId}/wallet-requests`,
    )
      .then((d) => setSettleRows(d.items))
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"))
      .finally(() => setSettleLoading(false));
  }, [userId, tab]);

  useEffect(() => {
    if (!userId || tab !== "stats") return;
    setLedgerLoading(true);
    apiFetch<{ items: LedgerRow[] }>(
      `/me/agent/downline/${userId}/ledger?limit=100`,
    )
      .then((d) => setLedgerRows(d.items))
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"))
      .finally(() => setLedgerLoading(false));
  }, [userId, tab]);

  useEffect(() => {
    if (!userId || tab !== "revisions") return;
    setRevLoading(true);
    apiFetch<{ hint?: string; items: RollingRevRow[] }>(
      `/me/agent/downline/${userId}/rolling-revisions`,
    )
      .then((d) => {
        setRevHint(d.hint ?? null);
        setRevRows(d.items);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"))
      .finally(() => setRevLoading(false));
  }, [userId, tab]);

  async function saveRollingAndMemo() {
    if (!userId) return;
    setSaving(true);
    setErr(null);
    try {
      await apiFetch(`/me/agent/downline/${userId}/rolling`, {
        method: "PATCH",
        body: JSON.stringify({
          rollingEnabled,
          rollingSportsDomesticPct: spDom,
          rollingSportsOverseasPct: spOver,
          rollingCasinoPct: ca,
          rollingSlotPct: sl,
          rollingMinigamePct: mg,
        }),
      });
      await apiFetch(`/me/agent/downline/${userId}/agent-memo`, {
        method: "PATCH",
        body: JSON.stringify({ agentMemo }),
      });
      await apiFetch(`/me/agent/downline/${userId}/upline-private-memo`, {
        method: "PATCH",
        body: JSON.stringify({ uplinePrivateMemo }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (!userId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-zinc-100">회원 정보</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-zinc-800 px-2 pt-2">
          {(
            [
              ["basic", "기본정보"],
              ["settlement", "정산내역"],
              ["stats", "배팅·게임"],
              ["revisions", "롤링 이력"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setErr(null);
                setTab(k);
              }}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                tab === k
                  ? "bg-zinc-800 text-amber-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {err && (
            <p className="mb-3 rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {err}
            </p>
          )}
          {loading && <p className="text-sm text-zinc-500">불러오는 중…</p>}
          {!loading && detail && tab === "basic" && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  기본 정보
                </h3>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <Info label="아이디" value={detail.loginId} />
                  <Info
                    label="닉네임(표시명)"
                    value={detail.displayName ?? "—"}
                  />
                  <Info
                    label="가입 승인"
                    value={regLabel(detail.registrationStatus)}
                  />
                  <Info
                    label="가입일"
                    value={new Date(detail.createdAt).toLocaleString()}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  자산
                </h3>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                  <p className="text-sm text-zinc-500">보유 머니</p>
                  <p className="font-mono text-xl text-amber-200">
                    {detail.balance}{" "}
                    <span className="text-sm text-zinc-500">원</span>
                  </p>
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-zinc-200">
                    회원 롤링 배당 (%)
                  </h3>
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input
                      type="checkbox"
                      checked={rollingEnabled}
                      onChange={(e) => setRollingEnabled(e.target.checked)}
                      className="rounded border-zinc-600"
                    />
                    사용
                  </label>
                </div>
                <p className="text-xs text-zinc-600">
                  스포츠는 국내·해외를 각각 설정합니다. 카지노(라이브), 슬롯,
                  미니게임 구간별 배당입니다.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PctField
                    label="스포츠 롤링 (국내)"
                    value={spDom}
                    onChange={setSpDom}
                    disabled={!rollingEnabled}
                  />
                  <PctField
                    label="스포츠 롤링 (해외)"
                    value={spOver}
                    onChange={setSpOver}
                    disabled={!rollingEnabled}
                  />
                  <PctField
                    label="카지노 롤링 (라이브)"
                    value={ca}
                    onChange={setCa}
                    disabled={!rollingEnabled}
                  />
                  <PctField
                    label="슬롯 롤링"
                    value={sl}
                    onChange={setSl}
                    disabled={!rollingEnabled}
                  />
                  <PctField
                    label="미니게임 롤링"
                    value={mg}
                    onChange={setMg}
                    disabled={!rollingEnabled}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  메모
                </h3>
                <label className="block text-sm text-zinc-400">
                  식별 메모 (본인만 조회·수정, 하위 식별용)
                  <textarea
                    value={uplinePrivateMemo}
                    onChange={(e) => setUplinePrivateMemo(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-sm text-zinc-400">
                  총판 메모 (회원에게 안내)
                  <textarea
                    value={agentMemo}
                    onChange={(e) => setAgentMemo(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <div>
                  <p className="text-sm text-zinc-400">회원 메모 (읽기 전용)</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
                    {detail.userMemo?.trim() ? detail.userMemo : "—"}
                  </p>
                </div>
              </section>

              <button
                type="button"
                disabled={saving}
                onClick={() => saveRollingAndMemo()}
                className="w-full rounded-lg bg-sky-700 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "롤링·메모 저장"}
              </button>
            </div>
          )}

          {!loading && tab === "settlement" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                해당 회원의 충전·환전 신청 내역입니다.
              </p>
              {settleLoading ? (
                <p className="text-sm text-zinc-500">불러오는 중…</p>
              ) : settleRows.length === 0 ? (
                <p className="text-sm text-zinc-500">내역이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-500">
                      <tr>
                        <th className="px-2 py-2">구분</th>
                        <th className="px-2 py-2">금액</th>
                        <th className="px-2 py-2">상태</th>
                        <th className="px-2 py-2">일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settleRows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-800/60"
                        >
                          <td className="px-2 py-2 text-zinc-300">
                            {wrTypeLabel(r.type)}
                            {r.depositorName ? (
                              <span className="ml-1 text-zinc-500">
                                ({r.depositorName})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 font-mono text-zinc-200">
                            {r.amount}
                          </td>
                          <td className="px-2 py-2 text-zinc-400">
                            {regLabel(r.status)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-zinc-500">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loading && tab === "stats" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                최근 배팅·당첨 원장입니다. (BET / WIN)
              </p>
              {ledgerLoading ? (
                <p className="text-sm text-zinc-500">불러오는 중…</p>
              ) : ledgerRows.length === 0 ? (
                <p className="text-sm text-zinc-500">내역이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-500">
                      <tr>
                        <th className="px-2 py-2">유형</th>
                        <th className="px-2 py-2">금액</th>
                        <th className="px-2 py-2">잔액 후</th>
                        <th className="px-2 py-2">일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-800/60"
                        >
                          <td className="px-2 py-2 text-zinc-300">
                            {ledgerTypeLabel(r.type)}
                          </td>
                          <td
                            className={`px-2 py-2 font-mono ${
                              r.type === "WIN"
                                ? "text-emerald-400/90"
                                : "text-zinc-200"
                            }`}
                          >
                            {r.amount}
                          </td>
                          <td className="px-2 py-2 font-mono text-zinc-500">
                            {r.balanceAfter}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-zinc-500">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loading && tab === "revisions" && (
            <div className="space-y-3">
              {revHint && (
                <p className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
                  {revHint}
                </p>
              )}
              <p className="text-xs text-zinc-500">
                위에서부터 최신 적용 시점입니다. 정산 배치는 각 베팅/정산
                시각에 맞는 행의 %를 사용합니다.
              </p>
              {revLoading ? (
                <p className="text-sm text-zinc-500">불러오는 중…</p>
              ) : revRows.length === 0 ? (
                <p className="text-sm text-zinc-500">이력이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full min-w-[560px] text-left text-[11px]">
                    <thead className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-500">
                      <tr>
                        <th className="px-2 py-2">적용 시작</th>
                        <th className="px-2 py-2">사용</th>
                        <th className="px-2 py-2">국내</th>
                        <th className="px-2 py-2">해외</th>
                        <th className="px-2 py-2">카지노</th>
                        <th className="px-2 py-2">슬롯</th>
                        <th className="px-2 py-2">미니</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revRows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-800/60"
                        >
                          <td className="whitespace-nowrap px-2 py-2 text-zinc-400">
                            {new Date(r.effectiveFrom).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-zinc-300">
                            {r.rollingEnabled ? "O" : "—"}
                          </td>
                          <td className="font-mono px-2 py-2 text-zinc-300">
                            {r.rollingSportsDomesticPct ?? "—"}
                          </td>
                          <td className="font-mono px-2 py-2 text-zinc-300">
                            {r.rollingSportsOverseasPct ?? "—"}
                          </td>
                          <td className="font-mono px-2 py-2 text-zinc-300">
                            {r.rollingCasinoPct ?? "—"}
                          </td>
                          <td className="font-mono px-2 py-2 text-zinc-300">
                            {r.rollingSlotPct ?? "—"}
                          </td>
                          <td className="font-mono px-2 py-2 text-zinc-300">
                            {r.rollingMinigamePct ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-rose-900/50 bg-rose-950/30 py-2 text-sm text-rose-200 hover:bg-rose-950/50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800/80 bg-zinc-950/50 px-3 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-0.5 text-zinc-200">{value}</p>
    </div>
  );
}

function PctField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <label className={`block text-sm ${disabled ? "opacity-50" : ""}`}>
      <span className="text-zinc-400">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={Number.isFinite(value) ? value : 0}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-zinc-100 disabled:cursor-not-allowed"
        />
        <span className="text-zinc-500">%</span>
      </div>
    </label>
  );
}
