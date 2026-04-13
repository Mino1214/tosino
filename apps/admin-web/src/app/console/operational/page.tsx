"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type Detail = {
  rollingLockWithdrawals: boolean;
  rollingTurnoverMultiplier: string;
  agentCanEditMemberRolling: boolean;
  minDepositKrw: string | null;
  minDepositUsdt: string | null;
  minWithdrawKrw: string | null;
  minWithdrawUsdt: string | null;
  minPointRedeemPoints: number | null;
  minPointRedeemKrw: string | null;
  minPointRedeemUsdt: string | null;
  pointRulesJson: unknown;
  publicSignupCode: string | null;
  defaultSignupReferrerUserId: string | null;
};

type MasterRow = {
  id: string;
  role: string;
  loginId?: string | null;
  displayName?: string | null;
};

const POINT_RULE_KEYS = [
  "attendDailyPoints",
  "attendStreakDays",
  "attendStreakBonusPoints",
  "loseBetPointsPerStake",
  "referrerFirstBetFlat",
  "referrerFirstBetPct",
  "redeemKrwPerPoint",
  "redeemUsdtPerPoint",
] as const;

export default function ConsoleOperationalPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [row, setRow] = useState<Detail | null>(null);
  const [masters, setMasters] = useState<MasterRow[]>([]);
  const [rulesText, setRulesText] = useState("{}");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function patchRow<K extends keyof Detail>(key: K, value: Detail[K]) {
    setRow((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    setErr(null);
    return Promise.all([
      apiFetch<Detail>(`/platforms/${selectedPlatformId}`),
      apiFetch<MasterRow[]>(`/platforms/${selectedPlatformId}/users`),
    ])
      .then(([d, users]) => {
        setRow({
          rollingLockWithdrawals: d.rollingLockWithdrawals,
          rollingTurnoverMultiplier: d.rollingTurnoverMultiplier,
          agentCanEditMemberRolling: d.agentCanEditMemberRolling,
          minDepositKrw: d.minDepositKrw,
          minDepositUsdt: d.minDepositUsdt,
          minWithdrawKrw: d.minWithdrawKrw,
          minWithdrawUsdt: d.minWithdrawUsdt,
          minPointRedeemPoints: d.minPointRedeemPoints,
          minPointRedeemKrw: d.minPointRedeemKrw,
          minPointRedeemUsdt: d.minPointRedeemUsdt,
          pointRulesJson: d.pointRulesJson,
          publicSignupCode: d.publicSignupCode ?? "",
          defaultSignupReferrerUserId: d.defaultSignupReferrerUserId ?? "",
        });
        setMasters(users.filter((user) => user.role === "MASTER_AGENT"));
        try {
          setRulesText(JSON.stringify(d.pointRulesJson ?? {}, null, 2));
        } catch {
          setRulesText("{}");
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "불러오기 실패"));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) return;
    void load();
  }, [load, router, selectedPlatformId, platformLoading]);

  async function save() {
    if (!selectedPlatformId || !row) return;
    let pointRulesJson: Record<string, unknown> = {};
    try {
      pointRulesJson = JSON.parse(rulesText) as Record<string, unknown>;
      if (!pointRulesJson || typeof pointRulesJson !== "object") {
        throw new Error("pointRulesJson must be object");
      }
    } catch {
      setErr("포인트 규칙 JSON 형식이 올바르지 않습니다.");
      return;
    }
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/operational`, {
        method: "PATCH",
        body: JSON.stringify({
          rollingLockWithdrawals: row.rollingLockWithdrawals,
          rollingTurnoverMultiplier: Number(row.rollingTurnoverMultiplier),
          agentCanEditMemberRolling: row.agentCanEditMemberRolling,
          minDepositKrw: row.minDepositKrw ?? "",
          minDepositUsdt: row.minDepositUsdt ?? "",
          minWithdrawKrw: row.minWithdrawKrw ?? "",
          minWithdrawUsdt: row.minWithdrawUsdt ?? "",
          minPointRedeemPoints: row.minPointRedeemPoints ?? undefined,
          minPointRedeemKrw: row.minPointRedeemKrw ?? "",
          minPointRedeemUsdt: row.minPointRedeemUsdt ?? "",
          publicSignupCode: row.publicSignupCode ?? "",
          defaultSignupReferrerUserId: row.defaultSignupReferrerUserId ?? "",
          pointRulesJson,
        }),
      });
      setMsg("저장했습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }
  if (!row) {
    return err ? (
      <p className="text-red-400">{err}</p>
    ) : (
      <p className="text-zinc-500">불러오는 중…</p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">운영 설정</h1>
        <p className="mt-2 text-sm text-zinc-500">
          입출금 한도, 롤링 정책, 포인트 전환 규칙을 각각 분리해서 관리합니다.
          기존처럼 한 화면에 모여 있어도 역할이 겹치지 않도록 구역을 나눠 두었습니다.
        </p>
      </div>
      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </p>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">
            입출금 한도
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            입금 최소 KRW {row.minDepositKrw ?? "제한 없음"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            출금 최소 KRW {row.minWithdrawKrw ?? "제한 없음"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            USDT 입/출금 {row.minDepositUsdt ?? "무제한"} /{" "}
            {row.minWithdrawUsdt ?? "무제한"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            롤링 정책
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            출금 잠금 {row.rollingLockWithdrawals ? "사용" : "사용 안 함"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            턴오버 배수 {row.rollingTurnoverMultiplier}배
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            총판 편집 {row.agentCanEditMemberRolling ? "허용" : "차단"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            포인트 전환
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            최소 포인트 {row.minPointRedeemPoints ?? "제한 없음"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            KRW 지급 최소 {row.minPointRedeemKrw ?? "제한 없음"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            USDT 지급 최소 {row.minPointRedeemUsdt ?? "제한 없음"}
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">입출금 한도</h2>
          <p className="mt-1 text-sm text-zinc-500">
            회원 지갑에서 직접 쓰이는 최소 입금/출금 금액입니다. 포인트 전환, 롤링과는 별도입니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <h3 className="text-sm font-medium text-zinc-200">입금 최소 금액</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["minDepositKrw", "원화 입금", "비우면 제한 없음"],
                  ["minDepositUsdt", "USDT 입금", "비우면 제한 없음"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="text-xs text-zinc-500">{label}</label>
                  <input
                    type="text"
                    value={row[key] ?? ""}
                    onChange={(e) =>
                      patchRow(key, (e.target.value.trim() || null) as Detail[typeof key])
                    }
                    placeholder={placeholder}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <h3 className="text-sm font-medium text-zinc-200">출금 최소 금액</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["minWithdrawKrw", "원화 출금", "비우면 제한 없음"],
                  ["minWithdrawUsdt", "USDT 출금", "비우면 제한 없음"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="text-xs text-zinc-500">{label}</label>
                  <input
                    type="text"
                    value={row[key] ?? ""}
                    onChange={(e) =>
                      patchRow(key, (e.target.value.trim() || null) as Detail[typeof key])
                    }
                    placeholder={placeholder}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">회원가입 연결</h2>
          <p className="mt-1 text-sm text-zinc-500">
            공통 가입코드와 그 코드를 사용할 때 연결할 마스터를 설정합니다. 추천인 로그인 아이디 입력은 회원가입 화면에서 별도로 함께 지원됩니다.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            추천인 아이디는 별도 설정 없이 기존 회원의 `loginId`를 그대로 씁니다.
            각 총판의 개별 마스터 코드는{" "}
            <Link href="/console/users" className="text-amber-300 hover:text-amber-200">
              유저 관리
            </Link>
            에서 수정할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-zinc-500">공통 가입코드</label>
            <input
              type="text"
              value={row.publicSignupCode ?? ""}
              onChange={(e) =>
                patchRow(
                  "publicSignupCode",
                  (e.target.value.trim().toUpperCase() || null) as Detail["publicSignupCode"],
                )
              }
              placeholder="예: ION"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">공통 코드 연결 마스터</label>
            <select
              value={row.defaultSignupReferrerUserId ?? ""}
              onChange={(e) =>
                patchRow(
                  "defaultSignupReferrerUserId",
                  (e.target.value || null) as Detail["defaultSignupReferrerUserId"],
                )
              }
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">선택 안 함</option>
              {masters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.displayName?.trim() || master.loginId || master.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">롤링 정책</h2>
          <p className="mt-1 text-sm text-zinc-500">
            입금 후 턴오버 조건을 어떻게 적용할지 정하는 영역입니다. 운영 한도나 포인트 교환과는 별개로 동작합니다.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={row.rollingLockWithdrawals}
            onChange={(e) => patchRow("rollingLockWithdrawals", e.target.checked)}
          />
          rollingEnabled 회원 입금 시 롤링 의무 생성 · 미달 시 출금 차단
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={row.agentCanEditMemberRolling}
            onChange={(e) => patchRow("agentCanEditMemberRolling", e.target.checked)}
          />
          총판이 하위 회원 롤링 % 편집 허용
        </label>
        <div>
          <label className="text-xs text-zinc-500">롤링 턴오버 배수 (입금 대비)</label>
          <input
            type="text"
            value={row.rollingTurnoverMultiplier}
            onChange={(e) => patchRow("rollingTurnoverMultiplier", e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">포인트 전환 설정</h2>
          <p className="mt-1 text-sm text-zinc-500">
            포인트를 KRW/USDT로 바꿀 때 필요한 최소 조건입니다. 적립 규칙 JSON은 아래 고급 설정에서 별도로 관리합니다.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-zinc-500">최소 교환 포인트</label>
            <input
              type="number"
              value={row.minPointRedeemPoints ?? ""}
              onChange={(e) =>
                patchRow(
                  "minPointRedeemPoints",
                  (e.target.value ? Number(e.target.value) : null) as Detail["minPointRedeemPoints"],
                )
              }
              placeholder="비우면 제한 없음"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">최소 교환 금액 KRW (지급)</label>
            <input
              type="text"
              value={row.minPointRedeemKrw ?? ""}
              onChange={(e) =>
                patchRow(
                  "minPointRedeemKrw",
                  (e.target.value.trim() || null) as Detail["minPointRedeemKrw"],
                )
              }
              placeholder="비우면 제한 없음"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">최소 교환 금액 USDT (지급)</label>
            <input
              type="text"
              value={row.minPointRedeemUsdt ?? ""}
              onChange={(e) =>
                patchRow(
                  "minPointRedeemUsdt",
                  (e.target.value.trim() || null) as Detail["minPointRedeemUsdt"],
                )
              }
              placeholder="비우면 제한 없음"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-base font-semibold text-zinc-100">
          포인트 적립 규칙 JSON
          <span className="ml-2 text-xs font-normal text-zinc-500">고급 설정</span>
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          출석, 낙첨, 추천인, 포인트 환율 같은 세부 규칙입니다. 위의 “포인트 전환 설정”과는 다르게 적립/환율 로직을 다룹니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {POINT_RULE_KEYS.map((key) => (
            <span
              key={key}
              className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-400"
            >
              {key}
            </span>
          ))}
        </div>
        <textarea
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          rows={12}
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
        />
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}
