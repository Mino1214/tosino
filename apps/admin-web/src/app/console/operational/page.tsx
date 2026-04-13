"use client";

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
};

export default function ConsoleOperationalPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [row, setRow] = useState<Detail | null>(null);
  const [rulesText, setRulesText] = useState("{}");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    setErr(null);
    return apiFetch<Detail>(`/platforms/${selectedPlatformId}`)
      .then((d) => {
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
        });
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">운영 · 롤링 · 한도</h1>
        <p className="mt-2 text-sm text-zinc-500">
          최소 입출금(원/USDT), 포인트 교환, 롤링 출금 잠금, 총판 롤링 편집 권한,
          포인트 규칙 JSON(attendDailyPoints, redeemKrwPerPoint 등).
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

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">롤링 출금 잠금</h2>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={row.rollingLockWithdrawals}
            onChange={(e) =>
              setRow({ ...row, rollingLockWithdrawals: e.target.checked })
            }
          />
          rollingEnabled 회원 입금 시 롤링 의무 생성 · 미달 시 출금 차단
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={row.agentCanEditMemberRolling}
            onChange={(e) =>
              setRow({ ...row, agentCanEditMemberRolling: e.target.checked })
            }
          />
          총판이 하위 회원 롤링 % 편집 허용
        </label>
        <div>
          <label className="text-xs text-zinc-500">롤링 턴오버 배수 (입금 대비)</label>
          <input
            type="text"
            value={row.rollingTurnoverMultiplier}
            onChange={(e) =>
              setRow({ ...row, rollingTurnoverMultiplier: e.target.value })
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-2">
        {(
          [
            ["minDepositKrw", "최소 입금 KRW", "minDepositKrw"],
            ["minDepositUsdt", "최소 입금 USDT", "minDepositUsdt"],
            ["minWithdrawKrw", "최소 출금 KRW", "minWithdrawKrw"],
            ["minWithdrawUsdt", "최소 출금 USDT", "minWithdrawUsdt"],
          ] as const
        ).map(([key, label, rk]) => (
          <div key={key}>
            <label className="text-xs text-zinc-500">{label}</label>
            <input
              type="text"
              value={row[rk] ?? ""}
              onChange={(e) =>
                setRow({
                  ...row,
                  [rk]: e.target.value.trim() || null,
                })
              }
              placeholder="비우면 제한 없음"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-zinc-500">최소 교환 포인트</label>
          <input
            type="number"
            value={row.minPointRedeemPoints ?? ""}
            onChange={(e) =>
              setRow({
                ...row,
                minPointRedeemPoints: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
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
              setRow({
                ...row,
                minPointRedeemKrw: e.target.value.trim() || null,
              })
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500">최소 교환 금액 USDT (지급)</label>
          <input
            type="text"
            value={row.minPointRedeemUsdt ?? ""}
            onChange={(e) =>
              setRow({
                ...row,
                minPointRedeemUsdt: e.target.value.trim() || null,
              })
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">pointRulesJson</h2>
        <p className="mt-1 text-xs text-zinc-500">
          예: attendDailyPoints, attendStreakDays, attendStreakBonusPoints,
          loseBetPointsPerStake, referrerFirstBetFlat, referrerFirstBetPct,
          redeemKrwPerPoint, redeemUsdtPerPoint
        </p>
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
