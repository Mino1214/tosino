"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  compPolicy?: {
    enabled?: boolean;
    settlementCycle?: "INSTANT" | "DAILY_MIDNIGHT" | "BET_DAY_PLUS";
    settlementOffsetDays?: number | null;
    ratePct?: string | null;
  } | null;
};

type MasterRow = {
  id: string;
  role: string;
  loginId?: string | null;
  displayName?: string | null;
};

type RollingForm = {
  rollingLockWithdrawals: boolean;
  rollingTurnoverMultiplier: string;
  agentCanEditMemberRolling: boolean;
  minDepositKrw: string | null;
  minDepositUsdt: string | null;
  minWithdrawKrw: string | null;
  minWithdrawUsdt: string | null;
  publicSignupCode: string | null;
  defaultSignupReferrerUserId: string | null;
};

type CompPolicyForm = {
  enabled: boolean;
  settlementCycle: "INSTANT" | "DAILY_MIDNIGHT" | "BET_DAY_PLUS";
  settlementOffsetDays: number | null;
  ratePct: string;
};

type PointTierForm = {
  id: string;
  minAmount: string;
  points: string;
};

type PointRulesForm = {
  minPointRedeemPoints: number | null;
  minPointRedeemKrw: string | null;
  minPointRedeemUsdt: string | null;
  redeemKrwPerPoint: string;
  redeemUsdtPerPoint: string;
  loseBetPointsPerStake: string;
  firstChargePoints: string;
  attendanceMode: "instant" | "batch";
  attendDailyPoints: string;
  attendBatchCount: string;
  attendBatchPoints: string;
  referrerFirstBetFlat: string;
  referrerFirstBetPct: string;
  depositPointTiers: PointTierForm[];
};

type TabKey = "rolling" | "comp" | "point";

const TABS: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "rolling", label: "롤링", hint: "배율 · 턴오버 · 총판 권한" },
  { key: "comp", label: "콤프", hint: "정산주기 · 지급률 정책" },
  { key: "point", label: "포인트", hint: "적립 · 전환 · 일괄 지급" },
];

const COMP_CYCLE_OPTIONS = [
  { value: "INSTANT", label: "즉시" },
  { value: "DAILY_MIDNIGHT", label: "매일 00시" },
  { value: "BET_DAY_PLUS", label: "배팅일 +x일" },
] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function normalizeCompPolicy(detail: Detail): CompPolicyForm {
  const raw = asRecord(detail.compPolicy);
  const settlementCycle =
    raw.settlementCycle === "DAILY_MIDNIGHT" || raw.settlementCycle === "BET_DAY_PLUS"
      ? raw.settlementCycle
      : "INSTANT";
  const offsetRaw = Number(raw.settlementOffsetDays ?? 0);
  return {
    enabled: raw.enabled === true,
    settlementCycle,
    settlementOffsetDays:
      settlementCycle === "BET_DAY_PLUS" && Number.isFinite(offsetRaw)
        ? Math.max(0, Math.trunc(offsetRaw))
        : null,
    ratePct: stringOrEmpty(raw.ratePct),
  };
}

function normalizePointRules(detail: Detail): {
  form: PointRulesForm;
  base: Record<string, unknown>;
} {
  const rules = asRecord(detail.pointRulesJson);
  const tiers = Array.isArray(rules.depositPointTiers)
    ? rules.depositPointTiers
        .map((item, index) => {
          const row = asRecord(item);
          return {
            id: `tier-${index}-${String(row.minAmount ?? "")}`,
            minAmount: stringOrEmpty(row.minAmount),
            points: stringOrEmpty(row.points),
          };
        })
        .filter((row) => row.minAmount || row.points)
    : [];

  return {
    base: rules,
    form: {
      minPointRedeemPoints: detail.minPointRedeemPoints,
      minPointRedeemKrw: detail.minPointRedeemKrw,
      minPointRedeemUsdt: detail.minPointRedeemUsdt,
      redeemKrwPerPoint: stringOrEmpty(rules.redeemKrwPerPoint),
      redeemUsdtPerPoint: stringOrEmpty(rules.redeemUsdtPerPoint),
      loseBetPointsPerStake: stringOrEmpty(rules.loseBetPointsPerStake),
      firstChargePoints: stringOrEmpty(rules.firstChargePoints),
      attendanceMode: rules.attendMode === "batch" ? "batch" : "instant",
      attendDailyPoints: stringOrEmpty(rules.attendDailyPoints),
      attendBatchCount: stringOrEmpty(
        rules.attendBatchCount ?? rules.attendStreakDays,
      ),
      attendBatchPoints: stringOrEmpty(
        rules.attendBatchPoints ?? rules.attendStreakBonusPoints,
      ),
      referrerFirstBetFlat: stringOrEmpty(rules.referrerFirstBetFlat),
      referrerFirstBetPct: stringOrEmpty(rules.referrerFirstBetPct),
      depositPointTiers: tiers,
    },
  };
}

function buildPointRulesJson(
  base: Record<string, unknown>,
  form: PointRulesForm,
): Record<string, unknown> {
  const next = { ...base };

  [
    "redeemKrwPerPoint",
    "redeemUsdtPerPoint",
    "loseBetPointsPerStake",
    "firstChargePoints",
    "attendMode",
    "attendDailyPoints",
    "attendBatchCount",
    "attendBatchPoints",
    "attendStreakDays",
    "attendStreakBonusPoints",
    "depositPointTiers",
    "referrerFirstBetFlat",
    "referrerFirstBetPct",
  ].forEach((key) => {
    delete next[key];
  });

  const redeemKrwPerPoint = nullableString(form.redeemKrwPerPoint);
  const redeemUsdtPerPoint = nullableString(form.redeemUsdtPerPoint);
  const loseBetPointsPerStake = nullableString(form.loseBetPointsPerStake);
  const firstChargePoints = nullableString(form.firstChargePoints);
  const referrerFirstBetFlat = nullableString(form.referrerFirstBetFlat);
  const referrerFirstBetPct = nullableString(form.referrerFirstBetPct);

  if (redeemKrwPerPoint) next.redeemKrwPerPoint = redeemKrwPerPoint;
  if (redeemUsdtPerPoint) next.redeemUsdtPerPoint = redeemUsdtPerPoint;
  if (loseBetPointsPerStake) next.loseBetPointsPerStake = loseBetPointsPerStake;
  if (firstChargePoints) next.firstChargePoints = firstChargePoints;
  if (referrerFirstBetFlat) next.referrerFirstBetFlat = referrerFirstBetFlat;
  if (referrerFirstBetPct) next.referrerFirstBetPct = referrerFirstBetPct;

  next.attendMode = form.attendanceMode;
  if (form.attendanceMode === "batch") {
    const count = numberOrNull(form.attendBatchCount);
    const points = numberOrNull(form.attendBatchPoints);
    if (count != null) next.attendBatchCount = count;
    if (points != null) next.attendBatchPoints = points;
  } else {
    const daily = numberOrNull(form.attendDailyPoints);
    if (daily != null) next.attendDailyPoints = daily;
  }

  const tiers = form.depositPointTiers
    .map((row) => ({
      minAmount: nullableString(row.minAmount),
      points: nullableString(row.points),
    }))
    .filter(
      (row): row is { minAmount: string; points: string } =>
        Boolean(row.minAmount && row.points),
    );

  if (tiers.length > 0) {
    next.depositPointTiers = tiers;
  }

  return next;
}

function createTier(): PointTierForm {
  return {
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    minAmount: "",
    points: "",
  };
}

export default function ConsoleOperationalPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [activeTab, setActiveTab] = useState<TabKey>("rolling");
  const [rolling, setRolling] = useState<RollingForm | null>(null);
  const [compPolicy, setCompPolicy] = useState<CompPolicyForm | null>(null);
  const [pointRules, setPointRules] = useState<PointRulesForm | null>(null);
  const [pointRulesBase, setPointRulesBase] = useState<Record<string, unknown>>({});
  const [masters, setMasters] = useState<MasterRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    setErr(null);
    return Promise.all([
      apiFetch<Detail>(`/platforms/${selectedPlatformId}`),
      apiFetch<MasterRow[]>(`/platforms/${selectedPlatformId}/users`),
    ])
      .then(([detail, users]) => {
        setRolling({
          rollingLockWithdrawals: detail.rollingLockWithdrawals,
          rollingTurnoverMultiplier: detail.rollingTurnoverMultiplier,
          agentCanEditMemberRolling: detail.agentCanEditMemberRolling,
          minDepositKrw: detail.minDepositKrw,
          minDepositUsdt: detail.minDepositUsdt,
          minWithdrawKrw: detail.minWithdrawKrw,
          minWithdrawUsdt: detail.minWithdrawUsdt,
          publicSignupCode: detail.publicSignupCode ?? "",
          defaultSignupReferrerUserId: detail.defaultSignupReferrerUserId ?? "",
        });
        setCompPolicy(normalizeCompPolicy(detail));
        const normalizedRules = normalizePointRules(detail);
        setPointRules(normalizedRules.form);
        setPointRulesBase(normalizedRules.base);
        setMasters(users.filter((user) => user.role === "MASTER_AGENT"));
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

  const pointRulesPreview = useMemo(() => {
    if (!pointRules) return "{}";
    return JSON.stringify(buildPointRulesJson(pointRulesBase, pointRules), null, 2);
  }, [pointRules, pointRulesBase]);

  function patchRolling<K extends keyof RollingForm>(key: K, value: RollingForm[K]) {
    setRolling((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchComp<K extends keyof CompPolicyForm>(
    key: K,
    value: CompPolicyForm[K],
  ) {
    setCompPolicy((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchPoint<K extends keyof PointRulesForm>(
    key: K,
    value: PointRulesForm[K],
  ) {
    setPointRules((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchTier(id: string, key: "minAmount" | "points", value: string) {
    setPointRules((prev) =>
      prev
        ? {
            ...prev,
            depositPointTiers: prev.depositPointTiers.map((tier) =>
              tier.id === id ? { ...tier, [key]: value } : tier,
            ),
          }
        : prev,
    );
  }

  function addTier() {
    setPointRules((prev) =>
      prev
        ? {
            ...prev,
            depositPointTiers: [...prev.depositPointTiers, createTier()],
          }
        : prev,
    );
  }

  function removeTier(id: string) {
    setPointRules((prev) =>
      prev
        ? {
            ...prev,
            depositPointTiers: prev.depositPointTiers.filter((tier) => tier.id !== id),
          }
        : prev,
    );
  }

  async function save() {
    if (!selectedPlatformId || !rolling || !compPolicy || !pointRules) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/operational`, {
        method: "PATCH",
        body: JSON.stringify({
          rollingLockWithdrawals: rolling.rollingLockWithdrawals,
          rollingTurnoverMultiplier: Number(rolling.rollingTurnoverMultiplier),
          agentCanEditMemberRolling: rolling.agentCanEditMemberRolling,
          minDepositKrw: rolling.minDepositKrw ?? "",
          minDepositUsdt: rolling.minDepositUsdt ?? "",
          minWithdrawKrw: rolling.minWithdrawKrw ?? "",
          minWithdrawUsdt: rolling.minWithdrawUsdt ?? "",
          minPointRedeemPoints: pointRules.minPointRedeemPoints ?? undefined,
          minPointRedeemKrw: pointRules.minPointRedeemKrw ?? "",
          minPointRedeemUsdt: pointRules.minPointRedeemUsdt ?? "",
          publicSignupCode: rolling.publicSignupCode ?? "",
          defaultSignupReferrerUserId: rolling.defaultSignupReferrerUserId ?? "",
          compPolicy: {
            enabled: compPolicy.enabled,
            settlementCycle: compPolicy.settlementCycle,
            settlementOffsetDays:
              compPolicy.settlementCycle === "BET_DAY_PLUS"
                ? compPolicy.settlementOffsetDays ?? 0
                : null,
            ratePct: compPolicy.ratePct.trim(),
          },
          pointRulesJson: buildPointRulesJson(pointRulesBase, pointRules),
        }),
      });
      setMsg("운영 정책을 저장했습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function grantAllPoints() {
    if (!selectedPlatformId) return;
    const amount = Number(grantAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("전체 지급 포인트 액수를 확인해주세요.");
      return;
    }

    setGranting(true);
    setErr(null);
    setMsg(null);
    try {
      const result = await apiFetch<{ count: number; amount: string }>(
        `/platforms/${selectedPlatformId}/points/grant-all`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            note: grantNote.trim() || undefined,
          }),
        },
      );
      setMsg(
        `일반 회원 ${result.count}명에게 ${result.amount}P 전체 지급을 완료했습니다.`,
      );
      setGrantAmount("");
      setGrantNote("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "전체 포인트 지급 실패");
    } finally {
      setGranting(false);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  if (!rolling || !compPolicy || !pointRules) {
    return err ? (
      <p className="text-red-400">{err}</p>
    ) : (
      <p className="text-zinc-500">불러오는 중…</p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">운영 설정</h1>
        <p className="mt-2 text-sm text-zinc-500">
          롤링, 콤프, 포인트 정책을 탭으로 나눠서 관리합니다. 기존 값은 유지한 채
          폼으로 저장되고, 포인트 적립 규칙은 아래 미리보기 JSON에도 같이 반영됩니다.
        </p>
      </div>

      {err ? (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-amber-500/50 bg-amber-950/20 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                {tab.label}
              </p>
              <p className="mt-3 text-sm font-medium text-zinc-100">{tab.hint}</p>
              {tab.key === "rolling" ? (
                <p className="mt-2 text-xs text-zinc-500">
                  턴오버 {rolling.rollingTurnoverMultiplier}배 · 총판 편집{" "}
                  {rolling.agentCanEditMemberRolling ? "허용" : "차단"}
                </p>
              ) : null}
              {tab.key === "comp" ? (
                <p className="mt-2 text-xs text-zinc-500">
                  {compPolicy.enabled ? "사용" : "미사용"} ·{" "}
                  {
                    COMP_CYCLE_OPTIONS.find(
                      (option) => option.value === compPolicy.settlementCycle,
                    )?.label
                  }
                </p>
              ) : null}
              {tab.key === "point" ? (
                <p className="mt-2 text-xs text-zinc-500">
                  출석 {pointRules.attendanceMode === "batch" ? "일괄수령" : "즉시수령"} ·
                  전체지급 가능
                </p>
              ) : null}
            </button>
          );
        })}
      </section>

      {activeTab === "rolling" ? (
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">롤링 정책</h2>
            <p className="mt-1 text-sm text-zinc-500">
              스포츠, 카지노, 슬롯, 미니게임 배율은 회원별로 관리되고, 이 화면에서는
              플랫폼 단위 정책과 총판 권한을 설정합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["스포츠", "카지노", "슬롯", "미니게임"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-400"
              >
                {label}
              </span>
            ))}
            <Link
              href="/console/users"
              className="rounded-full border border-amber-700/40 bg-amber-950/20 px-3 py-1 text-xs text-amber-200 hover:border-amber-600/60"
            >
              회원별 배율 설정 보기
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-medium text-zinc-200">입출금 한도</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["minDepositKrw", "원화 입금 최소", "비우면 제한 없음"],
                    ["minDepositUsdt", "USDT 입금 최소", "비우면 제한 없음"],
                    ["minWithdrawKrw", "원화 출금 최소", "비우면 제한 없음"],
                    ["minWithdrawUsdt", "USDT 출금 최소", "비우면 제한 없음"],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="text-xs text-zinc-500">{label}</label>
                    <input
                      type="text"
                      value={rolling[key] ?? ""}
                      onChange={(e) =>
                        patchRolling(
                          key,
                          (e.target.value.trim() || null) as RollingForm[typeof key],
                        )
                      }
                      placeholder={placeholder}
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-medium text-zinc-200">턴오버 / 권한</h3>
              <div className="mt-3 space-y-4">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={rolling.rollingLockWithdrawals}
                    onChange={(e) =>
                      patchRolling("rollingLockWithdrawals", e.target.checked)
                    }
                  />
                  미충족 롤링이 있으면 출금 차단
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={rolling.agentCanEditMemberRolling}
                    onChange={(e) =>
                      patchRolling("agentCanEditMemberRolling", e.target.checked)
                    }
                  />
                  총판이 하위 유저 배율 설정 가능
                </label>
                <div>
                  <label className="text-xs text-zinc-500">
                    롤링 턴오버 배수 (입금 대비)
                  </label>
                  <input
                    type="text"
                    value={rolling.rollingTurnoverMultiplier}
                    onChange={(e) =>
                      patchRolling("rollingTurnoverMultiplier", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <h3 className="text-sm font-medium text-zinc-200">회원가입 연결</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-zinc-500">공통 가입코드</label>
                <input
                  type="text"
                  value={rolling.publicSignupCode ?? ""}
                  onChange={(e) =>
                    patchRolling(
                      "publicSignupCode",
                      (e.target.value.trim().toUpperCase() || null) as RollingForm["publicSignupCode"],
                    )
                  }
                  placeholder="예: ION"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">공통 코드 연결 마스터</label>
                <select
                  value={rolling.defaultSignupReferrerUserId ?? ""}
                  onChange={(e) =>
                    patchRolling(
                      "defaultSignupReferrerUserId",
                      (e.target.value || null) as RollingForm["defaultSignupReferrerUserId"],
                    )
                  }
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
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
          </div>
        </section>
      ) : null}

      {activeTab === "comp" ? (
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">콤프 정책</h2>
            <p className="mt-1 text-sm text-zinc-500">
              콤프 정산주기와 지급률을 플랫폼 정책으로 저장합니다. 실제 정산 엔진이
              읽는 기준값으로 쓰기 좋게 구조를 단순화해 두었습니다.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={compPolicy.enabled}
              onChange={(e) => patchComp("enabled", e.target.checked)}
            />
            콤프 정책 사용
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs text-zinc-500">정산주기</label>
              <select
                value={compPolicy.settlementCycle}
                onChange={(e) =>
                  patchComp(
                    "settlementCycle",
                    e.target.value as CompPolicyForm["settlementCycle"],
                  )
                }
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              >
                {COMP_CYCLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-500">콤프률 (%)</label>
              <input
                type="text"
                value={compPolicy.ratePct}
                onChange={(e) => patchComp("ratePct", e.target.value)}
                placeholder="예: 0.8"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500">배팅일 +x일</label>
              <input
                type="number"
                min={0}
                value={compPolicy.settlementOffsetDays ?? 0}
                onChange={(e) =>
                  patchComp(
                    "settlementOffsetDays",
                    e.target.value ? Number(e.target.value) : 0,
                  )
                }
                disabled={compPolicy.settlementCycle !== "BET_DAY_PLUS"}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
            <p>
              현재 설정:{" "}
              <span className="font-medium text-zinc-100">
                {compPolicy.enabled ? "사용" : "미사용"}
              </span>
            </p>
            <p className="mt-2">
              주기:{" "}
              {
                COMP_CYCLE_OPTIONS.find(
                  (option) => option.value === compPolicy.settlementCycle,
                )?.label
              }
              {compPolicy.settlementCycle === "BET_DAY_PLUS"
                ? ` (${compPolicy.settlementOffsetDays ?? 0}일)`
                : ""}
            </p>
            <p className="mt-1">
              콤프률:{" "}
              <span className="font-medium text-zinc-100">
                {compPolicy.ratePct.trim() || "미설정"}%
              </span>
            </p>
          </div>
        </section>
      ) : null}

      {activeTab === "point" ? (
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">포인트 정책</h2>
            <p className="mt-1 text-sm text-zinc-500">
              첫충 포인트, 충전 구간별 적립, 낙첨 포인트, 출석체크, 포인트 전환,
              전체 포인트 지급을 한 화면에서 관리합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-medium text-zinc-200">포인트 전환</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-zinc-500">최소 교환 포인트</label>
                  <input
                    type="number"
                    value={pointRules.minPointRedeemPoints ?? ""}
                    onChange={(e) =>
                      patchPoint(
                        "minPointRedeemPoints",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="제한 없음"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">KRW 최소 지급</label>
                  <input
                    type="text"
                    value={pointRules.minPointRedeemKrw ?? ""}
                    onChange={(e) =>
                      patchPoint(
                        "minPointRedeemKrw",
                        (e.target.value.trim() || null) as PointRulesForm["minPointRedeemKrw"],
                      )
                    }
                    placeholder="제한 없음"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">USDT 최소 지급</label>
                  <input
                    type="text"
                    value={pointRules.minPointRedeemUsdt ?? ""}
                    onChange={(e) =>
                      patchPoint(
                        "minPointRedeemUsdt",
                        (e.target.value.trim() || null) as PointRulesForm["minPointRedeemUsdt"],
                      )
                    }
                    placeholder="제한 없음"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-500">1P당 KRW</label>
                  <input
                    type="text"
                    value={pointRules.redeemKrwPerPoint}
                    onChange={(e) => patchPoint("redeemKrwPerPoint", e.target.value)}
                    placeholder="예: 1"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">1P당 USDT</label>
                  <input
                    type="text"
                    value={pointRules.redeemUsdtPerPoint}
                    onChange={(e) => patchPoint("redeemUsdtPerPoint", e.target.value)}
                    placeholder="예: 0.00067"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-medium text-zinc-200">낙첨 / 추천 적립</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-zinc-500">낙첨 포인트 적립률</label>
                  <input
                    type="text"
                    value={pointRules.loseBetPointsPerStake}
                    onChange={(e) =>
                      patchPoint("loseBetPointsPerStake", e.target.value)
                    }
                    placeholder="예: 0.01 (1만원 → 100P)"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                  <div className="mt-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 px-2.5 py-2 text-xs space-y-0.5">
                    <p className="text-amber-300 font-semibold">📌 공식: 적립P = 패배 배팅금 × 이 값</p>
                    <p className="text-amber-200/70">
                      현재 <span className="font-mono text-amber-300">{pointRules.loseBetPointsPerStake || "미설정"}</span>
                      {pointRules.loseBetPointsPerStake ? (
                        <> → 1만원 패배 시 <span className="font-mono text-amber-300">{(Number(pointRules.loseBetPointsPerStake) * 10000).toLocaleString("ko-KR")}P</span> 적립</>
                      ) : null}
                    </p>
                    <p className="text-zinc-500">권장: <span className="font-mono">0.01</span> ~ <span className="font-mono">0.1</span> (1만원 → 100~1000P)</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">추천 첫베팅 고정 P</label>
                  <input
                    type="text"
                    value={pointRules.referrerFirstBetFlat}
                    onChange={(e) =>
                      patchPoint("referrerFirstBetFlat", e.target.value)
                    }
                    placeholder="예: 1000"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">추천 첫베팅 비율 %</label>
                  <input
                    type="text"
                    value={pointRules.referrerFirstBetPct}
                    onChange={(e) =>
                      patchPoint("referrerFirstBetPct", e.target.value)
                    }
                    placeholder="예: 1.5"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-zinc-200">충전 포인트</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  첫충 포인트와 충전 구간별 포인트 지급을 설정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                구간 추가
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_2fr]">
              <div>
                <label className="text-xs text-zinc-500">첫충전 포인트 지급</label>
                <input
                  type="text"
                  value={pointRules.firstChargePoints}
                  onChange={(e) => patchPoint("firstChargePoints", e.target.value)}
                  placeholder="예: 3000"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </div>

              <div className="space-y-3">
                {pointRules.depositPointTiers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-500">
                    아직 충전 포인트 구간이 없습니다. 예: 50,000원 이상 충전 시 500P
                  </div>
                ) : (
                  pointRules.depositPointTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <div>
                        <label className="text-xs text-zinc-500">최소 충전금액</label>
                        <input
                          type="text"
                          value={tier.minAmount}
                          onChange={(e) =>
                            patchTier(tier.id, "minAmount", e.target.value)
                          }
                          placeholder="예: 50000"
                          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">지급 포인트</label>
                        <input
                          type="text"
                          value={tier.points}
                          onChange={(e) => patchTier(tier.id, "points", e.target.value)}
                          placeholder="예: 500"
                          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTier(tier.id)}
                        className="mt-5 rounded-lg border border-red-900/40 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-medium text-zinc-200">출석체크 포인트</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["instant", "즉시수령"],
                    ["batch", "일괄수령"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patchPoint("attendanceMode", value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      pointRules.attendanceMode === value
                        ? "border-amber-500/50 bg-amber-950/20 text-amber-200"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {pointRules.attendanceMode === "instant" ? (
                <div className="mt-4">
                  <label className="text-xs text-zinc-500">하루 적립 포인트</label>
                  <input
                    type="text"
                    value={pointRules.attendDailyPoints}
                    onChange={(e) => patchPoint("attendDailyPoints", e.target.value)}
                    placeholder="예: 100"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-zinc-500">완수 횟수</label>
                    <input
                      type="text"
                      value={pointRules.attendBatchCount}
                      onChange={(e) => patchPoint("attendBatchCount", e.target.value)}
                      placeholder="예: 7"
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">일괄 수령 포인트</label>
                    <input
                      type="text"
                      value={pointRules.attendBatchPoints}
                      onChange={(e) => patchPoint("attendBatchPoints", e.target.value)}
                      placeholder="예: 1000"
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-medium text-zinc-200">전체 포인트 지급</h3>
              <p className="mt-1 text-xs text-zinc-500">
                현재 플랫폼의 일반 회원 전체에게 동일 포인트를 적립합니다.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-zinc-500">지급 포인트 액수</label>
                  <input
                    type="number"
                    min={1}
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="예: 500"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">메모 (선택)</label>
                  <input
                    type="text"
                    value={grantNote}
                    onChange={(e) => setGrantNote(e.target.value)}
                    placeholder="예: 4월 이벤트 일괄 지급"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <button
                  type="button"
                  disabled={granting}
                  onClick={() => void grantAllPoints()}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {granting ? "지급 중…" : "전체 포인트 지급"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-zinc-200">포인트 규칙 미리보기</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  현재 폼 값으로 저장될 JSON입니다. 기존 미노출 키는 그대로 보존됩니다.
                </p>
              </div>
            </div>
            <textarea
              value={pointRulesPreview}
              readOnly
              rows={12}
              className="mt-3 w-full rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
            />
          </div>
        </section>
      ) : null}

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
