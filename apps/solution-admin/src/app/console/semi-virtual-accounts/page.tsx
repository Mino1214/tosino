"use client";

/**
 * 반가상 입금 계좌 관리 (플랫폼 어드민).
 *
 * 핵심 요구:
 *  - 여러 계좌를 하나의 "번들"로 묶어 저장
 *  - 번들을 새로 등록하면 이전 번들은 자동으로 RETIRED 로 보존
 *    → 과거 계좌로 입금하는 회원을 구분·안내하기 위함
 *  - 저장 즉시 현재 번들(아이콘: ●)과 이전 번들(아이콘: ◌)을 타임라인으로 표시
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type Account = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  memo: string | null;
  sortOrder: number;
  createdAt: string;
};

type Bundle = {
  id: string;
  platformId: string;
  label: string | null;
  status: "CURRENT" | "RETIRED" | string;
  createdAt: string;
  retiredAt: string | null;
  retiredReason: string | null;
  accounts: Account[];
};

type Draft = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  memo: string;
};

const emptyDraft = (): Draft => ({
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  memo: "",
});

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function ConsoleSemiVirtualAccountsPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [label, setLabel] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);

  const load = useCallback(async () => {
    if (!selectedPlatformId) {
      setBundles(null);
      return;
    }
    setErr(null);
    try {
      const rows = await apiFetch<Bundle[]>(
        `/platforms/${selectedPlatformId}/semi-virtual-bundles`,
      );
      setBundles(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "조회 실패");
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentBundle = useMemo(
    () => bundles?.find((b) => b.status === "CURRENT") ?? null,
    [bundles],
  );
  const retiredBundles = useMemo(
    () => (bundles ?? []).filter((b) => b.status !== "CURRENT"),
    [bundles],
  );

  const updateDraft = (index: number, patch: Partial<Draft>) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const addDraft = () => setDrafts((prev) => [...prev, emptyDraft()]);

  const loadCurrentIntoDraft = () => {
    if (!currentBundle) return;
    setLabel(currentBundle.label ?? "");
    setDrafts(
      currentBundle.accounts.length > 0
        ? currentBundle.accounts.map((a) => ({
            bankName: a.bankName,
            accountNumber: a.accountNumber,
            accountHolder: a.accountHolder,
            memo: a.memo ?? "",
          }))
        : [emptyDraft()],
    );
  };

  const save = useCallback(async () => {
    if (!selectedPlatformId) return;
    const cleaned = drafts.map((d) => ({
      bankName: d.bankName.trim(),
      accountNumber: d.accountNumber.trim(),
      accountHolder: d.accountHolder.trim(),
      memo: d.memo.trim() || null,
    }));
    if (cleaned.some((a) => !a.bankName || !a.accountNumber || !a.accountHolder)) {
      setErr("모든 계좌의 은행명·계좌번호·예금주를 입력해 주세요");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/semi-virtual-bundles`, {
        method: "POST",
        body: JSON.stringify({
          label: label.trim() || null,
          accounts: cleaned,
        }),
      });
      setLabel("");
      setDrafts([emptyDraft()]);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }, [drafts, label, load, selectedPlatformId]);

  if (platformLoading) {
    return <div className="p-6 text-sm text-gray-500">플랫폼 정보를 불러오는 중...</div>;
  }
  if (!selectedPlatformId) {
    return (
      <div className="p-6 text-sm text-gray-500">
        플랫폼을 먼저 선택해 주세요.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-2 md:p-0">
      <header>
        <h1 className="text-xl font-semibold text-black">반가상 입금 계좌 관리</h1>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          회원이 입금 시 안내받는 계좌들을 <b>하나의 번들</b>로 묶어 관리합니다.
          번들을 새로 저장하면 이전 번들은 자동으로 &ldquo;이전&rdquo;으로 보존되며,
          과거 번들 계좌로 들어오는 입금도 추적·확인할 수 있습니다.
        </p>
      </header>

      {err ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-black">새 번들 등록</h2>
            <p className="text-[11px] text-gray-500">
              여러 개의 계좌를 함께 저장해 하나의 번들로 묶습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadCurrentIntoDraft}
              disabled={!currentBundle}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              현재 번들에서 불러오기
            </button>
            <button
              type="button"
              onClick={addDraft}
              className="rounded-lg border border-[#3182f6] bg-[#3182f6]/5 px-3 py-1.5 text-xs font-semibold text-[#3182f6] hover:bg-[#3182f6]/10"
            >
              + 계좌 추가
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <label className="block text-xs font-medium text-gray-600">
            번들 별칭 (선택)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 2026-04 1차"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 space-y-3">
          {drafts.map((d, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-gray-50/50 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500">
                  계좌 #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeDraft(i)}
                  disabled={drafts.length <= 1}
                  className="text-[11px] text-rose-500 hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                >
                  삭제
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  type="text"
                  value={d.bankName}
                  onChange={(e) => updateDraft(i, { bankName: e.target.value })}
                  placeholder="은행명"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={d.accountNumber}
                  onChange={(e) =>
                    updateDraft(i, { accountNumber: e.target.value })
                  }
                  placeholder="계좌번호"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={d.accountHolder}
                  onChange={(e) =>
                    updateDraft(i, { accountHolder: e.target.value })
                  }
                  placeholder="예금주"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <input
                type="text"
                value={d.memo}
                onChange={(e) => updateDraft(i, { memo: e.target.value })}
                placeholder="메모 (선택)"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-600"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-[#3182f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2970e4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "저장 중..." : "번들 저장"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-black">번들 타임라인</h2>
        {bundles === null ? (
          <p className="text-xs text-gray-500">불러오는 중...</p>
        ) : bundles.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-gray-500">
            아직 등록된 번들이 없습니다. 위에서 첫 번들을 등록해 주세요.
          </p>
        ) : (
          <div className="space-y-3">
            {currentBundle ? (
              <BundleCard bundle={currentBundle} current />
            ) : null}
            {retiredBundles.map((b) => (
              <BundleCard key={b.id} bundle={b} current={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BundleCard({ bundle, current }: { bundle: Bundle; current: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        current
          ? "border-[#3182f6]/40 bg-[#3182f6]/5"
          : "border-gray-200 bg-white",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            current
              ? "bg-[#3182f6] text-white"
              : "bg-gray-200 text-gray-600",
          ].join(" ")}
        >
          {current ? "● 현재" : "◌ 이전"}
        </span>
        <span className="text-sm font-semibold text-black">
          {bundle.label ?? (current ? "현재 번들" : "이전 번들")}
        </span>
        <span className="text-[11px] text-gray-400">
          {fmtDate(bundle.createdAt)} 등록
          {bundle.retiredAt ? ` · ${fmtDate(bundle.retiredAt)} 보존` : ""}
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {bundle.accounts.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <div className="text-[11px] font-semibold text-gray-500">
              {a.bankName}
            </div>
            <div className="mt-1 font-mono text-sm text-black">
              {a.accountNumber}
            </div>
            <div className="mt-1 text-xs text-gray-600">{a.accountHolder}</div>
            {a.memo ? (
              <div className="mt-1 text-[11px] text-gray-400">{a.memo}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
