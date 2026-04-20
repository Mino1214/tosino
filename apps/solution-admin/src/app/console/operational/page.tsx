"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { SwitchToggle } from "@/components/SwitchToggle";

type Detail = {
  rollingLockWithdrawals: boolean;
  rollingTurnoverMultiplier: string;
  rollingTurnoverSports: string | null;
  rollingTurnoverCasino: string | null;
  rollingTurnoverSlot: string | null;
  rollingTurnoverMinigame: string | null;
  rollingTurnoverArcade: string | null;
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
  compAutomation?: {
    autoEnabled?: boolean;
    cron?: string | null;
    backfillDays?: number | null;
  } | null;
  solutionRatePolicy?: {
    upstreamCasinoPct?: string | null;
    upstreamSportsPct?: string | null;
    platformCasinoPct?: string | null;
    platformSportsPct?: string | null;
    autoMarginPct?: string | null;
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
  rollingTurnoverSports: string;
  rollingTurnoverCasino: string;
  rollingTurnoverSlot: string;
  rollingTurnoverMinigame: string;
  rollingTurnoverArcade: string;
  agentCanEditMemberRolling: boolean;
  minDepositKrw: string | null;
  minDepositUsdt: string | null;
  minWithdrawKrw: string | null;
  minWithdrawUsdt: string | null;
  publicSignupCode: string | null;
  defaultSignupReferrerUserId: string | null;
};

type PolicyHistoryRow = {
  id: string;
  policyType: string;
  beforeJson: Record<string, unknown>;
  afterJson: Record<string, unknown>;
  changedByUserId: string | null;
  changedByLoginId: string | null;
  note: string | null;
  createdAt: string;
};

const PER_GAME_ROLLING_FIELDS = [
  { key: "rollingTurnoverSports", label: "스포츠", defaultValue: "1" },
  { key: "rollingTurnoverCasino", label: "카지노", defaultValue: "1" },
  { key: "rollingTurnoverSlot", label: "슬롯", defaultValue: "1" },
  { key: "rollingTurnoverMinigame", label: "미니게임", defaultValue: "1" },
  { key: "rollingTurnoverArcade", label: "아케이드", defaultValue: "1" },
] as const;

type CompPolicyForm = {
  enabled: boolean;
  settlementCycle: "INSTANT" | "DAILY_MIDNIGHT" | "BET_DAY_PLUS";
  settlementOffsetDays: number | null;
  ratePct: string;
};

type CompAutomationForm = {
  autoEnabled: boolean;
  cron: string;
  backfillDays: number | null;
};

type SolutionRatePolicyForm = {
  upstreamCasinoPct: string;
  upstreamSportsPct: string;
  autoMarginPct: string;
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

type CompSettlementHistoryItem = {
  id: string;
  userId: string;
  loginId: string;
  displayName: string;
  periodFrom: string;
  periodTo: string;
  baseAmount: string;
  ratePct: string;
  amount: string;
  settlementCycle: "INSTANT" | "DAILY_MIDNIGHT" | "BET_DAY_PLUS" | string;
  settlementOffsetDays: number | null;
  note: string | null;
  settledByUserId: string | null;
  settledByLoginId: string | null;
  ledgerReference: string | null;
  createdAt: string;
};

type CompSettlementListResponse = {
  count: number;
  totalAmount: string;
  items: CompSettlementHistoryItem[];
};

type CompRunRow = {
  userId: string;
  loginId: string;
  displayName: string;
  baseAmount: string;
  amount: string;
  status: "already_settled" | "ready" | "wallet_missing";
};

type CompRunResult = {
  dryRun: boolean;
  period: { from: string; to: string };
  policy: {
    enabled: boolean;
    settlementCycle: "INSTANT" | "DAILY_MIDNIGHT" | "BET_DAY_PLUS";
    settlementOffsetDays: number | null;
    ratePct: string | null;
  };
  totals: {
    eligibleUsers: number;
    readyUsers: number;
    skippedExistingUsers: number;
    totalBaseAmount: string;
    totalAmount: string;
    createdUsers: number;
    createdAmount: string;
  };
  rows: CompRunRow[];
};

type TabKey = "rolling" | "signup" | "comp" | "point";

const TABS: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "rolling", label: "롤링", hint: "배율 · 턴오버 · 총판 권한" },
  { key: "signup", label: "회원가입 연결", hint: "공통 가입코드 · 기본 마스터" },
  { key: "comp", label: "콤프", hint: "정산주기 · 지급률 정책" },
  { key: "point", label: "포인트", hint: "적립 · 전환 · 일괄 지급" },
];

const COMP_CYCLE_OPTIONS = [
  { value: "INSTANT", label: "즉시 지급" },
  { value: "DAILY_MIDNIGHT", label: "매일 자정 자동" },
  { value: "BET_DAY_PLUS", label: "배팅일 +N일 후" },
] as const;

/** 사용자 친화적 자동정산 시간 옵션 (cron 노출 대신 선택지 제공) */
const COMP_AUTO_TIME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "서버 기본값" },
  { value: "5 0 * * *", label: "매일 자정 직후 (00:05)" },
  { value: "0 1 * * *", label: "매일 새벽 1시" },
  { value: "0 3 * * *", label: "매일 새벽 3시" },
  { value: "0 6 * * *", label: "매일 아침 6시" },
  { value: "0 9 * * *", label: "매일 오전 9시" },
];

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

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("ko-KR");
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

function normalizeCompAutomation(detail: Detail): CompAutomationForm {
  const raw = asRecord(detail.compAutomation);
  const backfillRaw = Number(raw.backfillDays ?? 7);
  return {
    autoEnabled: raw.autoEnabled === true,
    cron: stringOrEmpty(raw.cron),
    backfillDays:
      Number.isFinite(backfillRaw) && backfillRaw > 0
        ? Math.max(1, Math.trunc(backfillRaw))
        : 7,
  };
}

function normalizeSolutionRatePolicy(detail: Detail): SolutionRatePolicyForm {
  const raw = asRecord(detail.solutionRatePolicy);
  return {
    upstreamCasinoPct: stringOrEmpty(raw.upstreamCasinoPct) || "0.00",
    upstreamSportsPct: stringOrEmpty(raw.upstreamSportsPct) || "0.00",
    autoMarginPct: stringOrEmpty(raw.autoMarginPct) || "1.00",
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

/**
 * 내부 저장은 비율(0.03 = 3%). UI에서는 "3" 처럼 퍼센트 숫자로 보여준다.
 * 비어 있으면 UI도 비움.
 */
function pointRatioToPercent(ratio: string): string {
  const trimmed = ratio.trim();
  if (!trimmed) return "";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return trimmed;
  const pct = n * 100;
  const rounded = Math.round(pct * 1000) / 1000;
  return String(rounded);
}

function pointPercentToRatio(pct: string): string {
  const trimmed = pct.trim();
  if (!trimmed) return "";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return pct;
  const ratio = n / 100;
  const rounded = Math.round(ratio * 100000) / 100000;
  return String(rounded);
}

function createTier(): PointTierForm {
  return {
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    minAmount: "",
    points: "",
  };
}

export default function ConsoleOperationalPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const userRole = getStoredUser()?.role;
  const canEditSolutionRates = userRole === "SUPER_ADMIN";
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [activeTab, setActiveTab] = useState<TabKey>("rolling");
  const [rolling, setRolling] = useState<RollingForm | null>(null);
  const [compPolicy, setCompPolicy] = useState<CompPolicyForm | null>(null);
  const [compAutomation, setCompAutomation] = useState<CompAutomationForm | null>(
    null,
  );
  const [solutionRatePolicy, setSolutionRatePolicy] =
    useState<SolutionRatePolicyForm | null>(null);
  const [pointRules, setPointRules] = useState<PointRulesForm | null>(null);
  const [pointRulesBase, setPointRulesBase] = useState<Record<string, unknown>>({});
  const [masters, setMasters] = useState<MasterRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);
  const [compPeriodFrom, setCompPeriodFrom] = useState(monthStart);
  const [compPeriodTo, setCompPeriodTo] = useState(today);
  const [compSettlementNote, setCompSettlementNote] = useState("");
  const [compRunning, setCompRunning] = useState(false);
  const [compPreviewing, setCompPreviewing] = useState(false);
  const [compResult, setCompResult] = useState<CompRunResult | null>(null);
  const [compHistory, setCompHistory] = useState<CompSettlementHistoryItem[]>([]);
  const [compHistorySummary, setCompHistorySummary] = useState({
    count: 0,
    totalAmount: "0.00",
  });

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    setErr(null);
    return Promise.all([
      apiFetch<Detail>(`/platforms/${selectedPlatformId}`),
      apiFetch<MasterRow[]>(`/platforms/${selectedPlatformId}/users`),
      apiFetch<CompSettlementListResponse>(
        `/platforms/${selectedPlatformId}/comp-settlements?take=20`,
      ),
    ])
      .then(([detail, users, compSettlements]) => {
        setRolling({
          rollingLockWithdrawals: detail.rollingLockWithdrawals,
          rollingTurnoverMultiplier: detail.rollingTurnoverMultiplier,
          // 기본값: 게임별 롤링이 비어 있으면 1배로 채워 "게임별 롤링"이 기본 모드가 되도록 한다
          rollingTurnoverSports: (detail.rollingTurnoverSports ?? "").trim() || "1",
          rollingTurnoverCasino: (detail.rollingTurnoverCasino ?? "").trim() || "1",
          rollingTurnoverSlot: (detail.rollingTurnoverSlot ?? "").trim() || "1",
          rollingTurnoverMinigame:
            (detail.rollingTurnoverMinigame ?? "").trim() || "1",
          rollingTurnoverArcade:
            (detail.rollingTurnoverArcade ?? "").trim() || "1",
          agentCanEditMemberRolling: detail.agentCanEditMemberRolling,
          minDepositKrw: detail.minDepositKrw,
          minDepositUsdt: detail.minDepositUsdt,
          minWithdrawKrw: detail.minWithdrawKrw,
          minWithdrawUsdt: detail.minWithdrawUsdt,
          publicSignupCode: detail.publicSignupCode ?? "",
          defaultSignupReferrerUserId: detail.defaultSignupReferrerUserId ?? "",
        });
        setCompPolicy(normalizeCompPolicy(detail));
        setCompAutomation(normalizeCompAutomation(detail));
        setSolutionRatePolicy(normalizeSolutionRatePolicy(detail));
        const normalizedRules = normalizePointRules(detail);
        setPointRules(normalizedRules.form);
        setPointRulesBase(normalizedRules.base);
        setMasters(users.filter((user) => user.role === "MASTER_AGENT"));
        setCompHistory(compSettlements.items);
        setCompHistorySummary({
          count: compSettlements.count,
          totalAmount: compSettlements.totalAmount,
        });
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "불러오기 실패"));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) return;
    void load();
  }, [load, selectedPlatformId, platformLoading]);

  function patchRolling<K extends keyof RollingForm>(key: K, value: RollingForm[K]) {
    setRolling((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchComp<K extends keyof CompPolicyForm>(
    key: K,
    value: CompPolicyForm[K],
  ) {
    setCompPolicy((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchCompAutomation<K extends keyof CompAutomationForm>(
    key: K,
    value: CompAutomationForm[K],
  ) {
    setCompAutomation((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchSolutionRate<K extends keyof SolutionRatePolicyForm>(
    key: K,
    value: SolutionRatePolicyForm[K],
  ) {
    setSolutionRatePolicy((prev) => (prev ? { ...prev, [key]: value } : prev));
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
    if (
      !selectedPlatformId ||
      !rolling ||
      !compPolicy ||
      !compAutomation ||
      !solutionRatePolicy ||
      !pointRules
    )
      return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/operational`, {
        method: "PATCH",
        body: JSON.stringify({
          rollingLockWithdrawals: rolling.rollingLockWithdrawals,
          rollingTurnoverMultiplier: Number(rolling.rollingTurnoverMultiplier),
          rollingTurnoverSports:
            rolling.rollingTurnoverSports.trim() === ""
              ? null
              : Number(rolling.rollingTurnoverSports),
          rollingTurnoverCasino:
            rolling.rollingTurnoverCasino.trim() === ""
              ? null
              : Number(rolling.rollingTurnoverCasino),
          rollingTurnoverSlot:
            rolling.rollingTurnoverSlot.trim() === ""
              ? null
              : Number(rolling.rollingTurnoverSlot),
          rollingTurnoverMinigame:
            rolling.rollingTurnoverMinigame.trim() === ""
              ? null
              : Number(rolling.rollingTurnoverMinigame),
          rollingTurnoverArcade:
            rolling.rollingTurnoverArcade.trim() === ""
              ? null
              : Number(rolling.rollingTurnoverArcade),
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
          compAutomation: {
            autoEnabled: compAutomation.autoEnabled,
            cron: compAutomation.cron.trim(),
            backfillDays: compAutomation.backfillDays ?? undefined,
          },
          ...(canEditSolutionRates
            ? {
                solutionRatePolicy: {
                  upstreamCasinoPct: solutionRatePolicy.upstreamCasinoPct.trim(),
                  upstreamSportsPct: solutionRatePolicy.upstreamSportsPct.trim(),
                  autoMarginPct: solutionRatePolicy.autoMarginPct.trim(),
                },
              }
            : {}),
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

  async function runCompSettlement(dryRun: boolean) {
    if (!selectedPlatformId) return;
    if (!compPeriodFrom || !compPeriodTo) {
      setErr("콤프 정산 기간을 확인해주세요.");
      return;
    }

    if (dryRun) {
      setCompPreviewing(true);
    } else {
      setCompRunning(true);
    }
    setErr(null);
    setMsg(null);

    try {
      const result = await apiFetch<CompRunResult>(
        `/platforms/${selectedPlatformId}/comp-settlements/run`,
        {
          method: "POST",
          body: JSON.stringify({
            from: `${compPeriodFrom}T00:00:00.000Z`,
            to: `${compPeriodTo}T23:59:59.999Z`,
            note: compSettlementNote.trim() || undefined,
            dryRun,
          }),
        },
      );
      setCompResult(result);
      if (dryRun) {
        setMsg(
          `콤프 미리보기: 대상 ${result.totals.eligibleUsers}명, 지급 예정 ${result.totals.totalAmount}원`,
        );
      } else {
        setMsg(
          `콤프 정산 완료: ${result.totals.createdUsers}명, 실제 지급 ${result.totals.createdAmount}원`,
        );
        await load();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "콤프 정산 실행 실패");
    } finally {
      setCompPreviewing(false);
      setCompRunning(false);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-gray-500">불러오는 중…</p>
    ) : (
      <p className="rounded-lg border border-[#3182f6]/20 bg-[#3182f6]/5 px-4 py-3 text-sm text-gray-700">
        플랫폼 컨텍스트가 없습니다. 로그아웃 후 다시 로그인하거나 API 연결을
        확인하세요. 시드 데모 계정은{" "}
        <span className="font-mono text-[#3182f6]">platform@tosino.local</span>{" "}
        입니다.
      </p>
    );
  }

  if (
    !rolling ||
    !compPolicy ||
    !compAutomation ||
    !solutionRatePolicy ||
    !pointRules
  ) {
    return err ? (
      <p className="text-red-400">{err}</p>
    ) : (
      <p className="text-gray-500">불러오는 중…</p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black">운영 설정</h1>
        <p className="mt-2 text-sm text-gray-500">
          롤링, 회원가입 연결, 콤프, 포인트 정책을 카테고리별로 관리합니다.
          탭을 선택해 변경한 뒤 하단의 <span className="font-medium text-black">저장</span>
          버튼을 누르세요.
        </p>
      </div>

      {err ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msg}
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-amber-500/50 bg-[#3182f6]/5 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3182f6]/80">
                {tab.label}
              </p>
              <p className="mt-3 text-sm font-medium text-black">{tab.hint}</p>
              {tab.key === "rolling" ? (
                <p className="mt-2 text-xs text-gray-500">
                  턴오버 {rolling.rollingTurnoverMultiplier}배 · 총판 편집{" "}
                  {rolling.agentCanEditMemberRolling ? "허용" : "차단"}
                </p>
              ) : null}
              {tab.key === "signup" ? (
                <p className="mt-2 text-xs text-gray-500">
                  코드{" "}
                  <span className="font-mono">
                    {(rolling.publicSignupCode ?? "").trim() || "미설정"}
                  </span>
                  {" · "}
                  마스터{" "}
                  {rolling.defaultSignupReferrerUserId
                    ? masters.find(
                        (m) => m.id === rolling.defaultSignupReferrerUserId,
                      )?.loginId ?? "선택됨"
                    : "미선택"}
                </p>
              ) : null}
              {tab.key === "comp" ? (
                <p className="mt-2 text-xs text-gray-500">
                  {compPolicy.enabled ? "사용" : "미사용"} ·{" "}
                  {
                    COMP_CYCLE_OPTIONS.find(
                      (option) => option.value === compPolicy.settlementCycle,
                    )?.label
                  }
                  {compAutomation.autoEnabled ? " · 자동" : " · 수동"}
                </p>
              ) : null}
              {tab.key === "point" ? (
                <p className="mt-2 text-xs text-gray-500">
                  출석 {pointRules.attendanceMode === "batch" ? "일괄수령" : "즉시수령"} ·
                  전체지급 가능
                </p>
              ) : null}
            </button>
          );
        })}
      </section>

      {activeTab === "rolling" ? (
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-black">롤링 정책</h2>
            <p className="mt-1 text-sm text-gray-500">
              스포츠, 카지노, 슬롯, 미니게임, 아케이드 배율은 회원별로 관리되고,
              이 화면에서는 플랫폼 단위 정책과 총판 권한을 설정합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["스포츠", "카지노", "슬롯", "미니게임", "아케이드"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-500"
              >
                {label}
              </span>
            ))}
            <Link
              href="/console/users"
              className="rounded-full border border-amber-700/40 bg-[#3182f6]/5 px-3 py-1 text-xs text-[#3182f6] hover:border-amber-600/60"
            >
              회원별 배율 설정 보기
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">입출금 한도</h3>
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
                    <label className="text-xs text-gray-500">{label}</label>
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
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">출금 조건 / 총판 권한</h3>
              <div className="mt-3 space-y-2 divide-y divide-gray-100">
                <SwitchToggle
                  checked={rolling.rollingLockWithdrawals}
                  onChange={(v) => patchRolling("rollingLockWithdrawals", v)}
                  label="미충족 롤링 있으면 출금 차단"
                  description="입금 후 필요 턴오버를 채우기 전엔 출금 신청을 막습니다."
                />
                <div className="pt-2">
                  <SwitchToggle
                    checked={rolling.agentCanEditMemberRolling}
                    onChange={(v) =>
                      patchRolling("agentCanEditMemberRolling", v)
                    }
                    label="총판이 하위 유저 배율 설정 가능"
                    description="총판이 자기 산하 회원에게 다른 배율을 적용할 수 있도록 허용합니다."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 md:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-800">
                    게임별 롤링 턴오버 배수
                  </h3>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    각 게임별로 입금액 대비 몇 배 만큼 배팅해야 출금이 허용되는지
                    설정합니다. 예) 카지노 1배 = 10만원 입금 시 10만원 배팅 필요.
                  </p>
                </div>
                <span className="rounded-full bg-[#3182f6]/10 px-2 py-0.5 text-[11px] font-medium text-[#3182f6]">
                  기본 모드
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {PER_GAME_ROLLING_FIELDS.map((f) => (
                  <div
                    key={f.key}
                    className="rounded-lg border border-gray-200 bg-gray-50/60 p-3"
                  >
                    <label className="text-xs font-semibold text-gray-700">
                      {f.label}
                    </label>
                    <div className="mt-1.5 flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={rolling[f.key]}
                        onChange={(e) => patchRolling(f.key, e.target.value)}
                        placeholder={`예: ${f.defaultValue}`}
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm font-mono text-black"
                      />
                      <span className="text-xs text-gray-500">배</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                비우면 해당 게임은 기본 배수 ({rolling.rollingTurnoverMultiplier || "1"}배)로
                적용됩니다. 롤링 정책은 저장 즉시 반영됩니다.
              </p>
            </div>
          </div>

          <RollingHistoryPanel platformId={selectedPlatformId} />

          {canEditSolutionRates ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">
                상위업체 요율
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                상위 카지노·스포츠 알값은 각각 매입(벤더) 기준이며, 자동 마진은 카지노
                청구율에만 더해집니다. 스포츠 청구율은 상위 스포츠 알값과 같습니다.
                카지노·슬롯·미니 GGR은 동일(카지노) 버킷으로 합산됩니다.
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">상위 카지노 %</label>
                  <input
                    type="text"
                    value={solutionRatePolicy.upstreamCasinoPct}
                    onChange={(e) =>
                      patchSolutionRate("upstreamCasinoPct", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">상위 스포츠 %</label>
                  <input
                    type="text"
                    value={solutionRatePolicy.upstreamSportsPct}
                    onChange={(e) =>
                      patchSolutionRate("upstreamSportsPct", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    자동 마진 % (카지노 청구에만 가산)
                  </label>
                  <input
                    type="text"
                    value={solutionRatePolicy.autoMarginPct}
                    onChange={(e) =>
                      patchSolutionRate("autoMarginPct", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs text-gray-500">플랫폼 카지노 청구율</p>
                  <p className="mt-1 font-mono text-lg text-emerald-700">
                    {(
                      (Number(solutionRatePolicy.upstreamCasinoPct || 0) || 0) +
                      (Number(solutionRatePolicy.autoMarginPct || 0) || 0)
                    ).toFixed(2)}
                    %
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs text-gray-500">플랫폼 스포츠 청구율</p>
                  <p className="mt-1 font-mono text-lg text-emerald-700">
                    {(Number(solutionRatePolicy.upstreamSportsPct || 0) || 0).toFixed(2)}%
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    상위 스포츠 알값과 동일 (카지노 마진 미적용)
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "signup" ? (
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-black">회원가입 연결</h2>
            <p className="mt-1 text-sm text-gray-500">
              회원이 가입할 때 사용하는 공통 코드와, 그 코드를 통해 들어온 회원이
              자동으로 묶일 기본 마스터(총판)를 지정합니다.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500">공통 가입코드</label>
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
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  비워두면 추천코드 없이도 누구나 가입할 수 있습니다.
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">공통 코드 연결 마스터</label>
                <select
                  value={rolling.defaultSignupReferrerUserId ?? ""}
                  onChange={(e) =>
                    patchRolling(
                      "defaultSignupReferrerUserId",
                      (e.target.value || null) as RollingForm["defaultSignupReferrerUserId"],
                    )
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                >
                  <option value="">선택 안 함</option>
                  {masters.map((master) => (
                    <option key={master.id} value={master.id}>
                      {master.displayName?.trim() || master.loginId || master.id}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  공통 가입코드로 들어온 회원은 자동으로 이 마스터 산하에 배정됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "comp" ? (
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-black">콤프 정책</h2>
            <p className="mt-1 text-sm text-gray-500">
              낙첨금의 일부를 회원에게 돌려주는 정책입니다. 자동/수동 중 선택하고
              콤프률만 정하면 됩니다.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SwitchToggle
              checked={compPolicy.enabled}
              onChange={(v) => patchComp("enabled", v)}
              label="콤프 정책 사용"
              description="끄면 아래 설정과 자동/수동 정산 모두 동작하지 않습니다."
            />
          </div>

          {compPolicy.enabled ? (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  실행 방식
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  자동이면 정해진 시간에 시스템이 지급하고, 수동이면 아래 &ldquo;수동 정산&rdquo;
                  버튼을 눌러야 지급됩니다.
                </p>
                <div className="mt-3 inline-flex rounded-full border border-gray-200 bg-gray-100 p-1 text-xs font-semibold">
                  {(
                    [
                      { value: true, label: "자동" },
                      { value: false, label: "수동" },
                    ] as const
                  ).map((opt) => {
                    const active = compAutomation.autoEnabled === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => patchCompAutomation("autoEnabled", opt.value)}
                        className={`rounded-full px-4 py-1.5 transition ${
                          active
                            ? "bg-white text-[#3182f6] shadow"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <label className="text-xs font-medium text-gray-600">
                    콤프률
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={compPolicy.ratePct}
                      onChange={(e) => patchComp("ratePct", e.target.value)}
                      placeholder="예: 0.8"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-black"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    낙첨금의 이 비율만큼 회원에게 되돌려줍니다. (예: 0.8 → 100만원 낙첨 → 8,000원 지급)
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <label className="text-xs font-medium text-gray-600">
                    지급 시점
                  </label>
                  <select
                    value={compPolicy.settlementCycle}
                    onChange={(e) =>
                      patchComp(
                        "settlementCycle",
                        e.target.value as CompPolicyForm["settlementCycle"],
                      )
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  >
                    {COMP_CYCLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {compPolicy.settlementCycle === "BET_DAY_PLUS" ? (
                    <div className="mt-3">
                      <label className="text-[11px] text-gray-500">
                        배팅 후 며칠 뒤에 지급?
                      </label>
                      <div className="mt-1 flex items-center gap-2">
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
                          className="w-24 rounded border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-mono text-black"
                        />
                        <span className="text-xs text-gray-500">일 후</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {compAutomation.autoEnabled ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-gray-800">자동 정산 설정</h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs text-gray-500">자동 실행 시간</label>
                      <select
                        value={
                          COMP_AUTO_TIME_OPTIONS.some(
                            (option) => option.value === compAutomation.cron.trim(),
                          )
                            ? compAutomation.cron.trim()
                            : "__custom__"
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "__custom__") return;
                          patchCompAutomation("cron", value);
                        }}
                        className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                      >
                        {COMP_AUTO_TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                        {!COMP_AUTO_TIME_OPTIONS.some(
                          (option) => option.value === compAutomation.cron.trim(),
                        ) && compAutomation.cron.trim() ? (
                          <option value="__custom__">사용자 지정 (현재 값 유지)</option>
                        ) : null}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">
                        놓친 날짜 얼마까지 소급?
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={compAutomation.backfillDays ?? ""}
                          onChange={(e) =>
                            patchCompAutomation(
                              "backfillDays",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="w-24 rounded border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-mono text-black"
                        />
                        <span className="text-xs text-gray-500">일</span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        자동 정산이 누락된 경우 최대 며칠 전까지 소급할지 정합니다.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div className={`grid gap-4 xl:grid-cols-[1.2fr_0.8fr] ${!compPolicy.enabled || compAutomation.autoEnabled ? "opacity-60" : ""}`}>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">수동 콤프 정산</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                승인 입출금 기준 회원별 낙첨금(충전 − 환전)에 현재 콤프률을 적용해
                실제 지갑으로 지급합니다. 같은 회원/같은 기간은 중복 정산되지 않습니다.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">시작일</label>
                  <input
                    type="date"
                    value={compPeriodFrom}
                    onChange={(e) => setCompPeriodFrom(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">종료일</label>
                  <input
                    type="date"
                    value={compPeriodTo}
                    onChange={(e) => setCompPeriodTo(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">메모</label>
                  <input
                    type="text"
                    value={compSettlementNote}
                    onChange={(e) => setCompSettlementNote(e.target.value)}
                    placeholder="예: 4월 1차 콤프"
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void runCompSettlement(true)}
                  disabled={compPreviewing || compRunning}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:border-gray-300 disabled:opacity-50"
                >
                  {compPreviewing ? "미리보기 중..." : "미리보기"}
                </button>
                <button
                  type="button"
                  onClick={() => void runCompSettlement(false)}
                  disabled={compPreviewing || compRunning || !compPolicy.enabled}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {compRunning ? "정산 실행 중..." : "정산 실행"}
                </button>
              </div>

              {compResult ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">대상 회원</p>
                      <p className="mt-1 text-lg font-semibold text-black">
                        {compResult.totals.eligibleUsers}명
                      </p>
                      <p className="text-xs text-gray-400">
                        신규 {compResult.totals.readyUsers} / 기존 {compResult.totals.skippedExistingUsers}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">총 기준금액</p>
                      <p className="mt-1 text-lg font-semibold text-black">
                        {compResult.totals.totalBaseAmount}원
                      </p>
                      <p className="text-xs text-gray-400">
                        콤프률 {compResult.policy.ratePct ?? "0"}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">
                        {compResult.dryRun ? "지급 예정" : "실제 지급"}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[#3182f6]">
                        {compResult.dryRun
                          ? `${compResult.totals.totalAmount}원`
                          : `${compResult.totals.createdAmount}원`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateOnly(compResult.period.from)} ~ {formatDateOnly(compResult.period.to)}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full min-w-[640px] text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-white text-gray-500">
                          {["회원", "기준금액", "콤프", "상태"].map((label) => (
                            <th key={label} className="px-3 py-2 text-left font-medium">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compResult.rows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                              해당 기간에 지급 대상 회원이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          compResult.rows.map((row) => (
                            <tr key={row.userId} className="border-b border-gray-200">
                              <td className="px-3 py-2">
                                <p className="font-mono text-black">{row.loginId}</p>
                                <p className="text-gray-500">{row.displayName || "—"}</p>
                              </td>
                              <td className="px-3 py-2 font-mono text-gray-800">
                                {row.baseAmount}원
                              </td>
                              <td className="px-3 py-2 font-mono text-[#3182f6]">
                                {row.amount}원
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] ${
                                    row.status === "already_settled"
                                      ? "bg-gray-100 text-gray-700"
                                      : row.status === "wallet_missing"
                                        ? "bg-red-50 text-red-700"
                                        : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {row.status === "already_settled"
                                    ? "기정산"
                                    : row.status === "wallet_missing"
                                      ? "지갑 없음"
                                      : compResult.dryRun
                                        ? "지급 예정"
                                        : "정산 완료"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-800">최근 집행 내역</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    최근 20건 기준 · 누적 {compHistorySummary.count}건 / {compHistorySummary.totalAmount}원
                  </p>
                </div>
              </div>

              {compHistory.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">아직 집행된 콤프 원장이 없습니다.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {compHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-black">
                            {item.loginId}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {item.displayName || "닉네임 없음"}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-sm font-semibold text-[#3182f6]">
                          {item.amount}원
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                        <span>
                          기준 {item.baseAmount}원 × {item.ratePct}%
                        </span>
                        <span>
                          기간 {formatDateOnly(item.periodFrom)} ~ {formatDateOnly(item.periodTo)}
                        </span>
                        <span>실행 {new Date(item.createdAt).toLocaleString("ko-KR")}</span>
                        <span>처리자 {item.settledByLoginId || "시스템"}</span>
                      </div>
                      {item.note ? (
                        <p className="mt-1 text-[11px] text-gray-500">메모: {item.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "point" ? (
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-black">포인트 정책</h2>
            <p className="mt-1 text-sm text-gray-500">
              첫충 포인트, 충전 구간별 적립, 낙첨 포인트, 출석체크, 포인트 전환,
              전체 포인트 지급을 한 화면에서 관리합니다.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">포인트 전환</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">최소 교환 포인트</label>
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
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">KRW 최소 지급</label>
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
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">USDT 최소 지급</label>
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
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-500">1P당 KRW</label>
                  <input
                    type="text"
                    value={pointRules.redeemKrwPerPoint}
                    onChange={(e) => patchPoint("redeemKrwPerPoint", e.target.value)}
                    placeholder="예: 1"
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">1P당 USDT</label>
                  <input
                    type="text"
                    value={pointRules.redeemUsdtPerPoint}
                    onChange={(e) => patchPoint("redeemUsdtPerPoint", e.target.value)}
                    placeholder="예: 0.00067"
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">낙첨 / 추천 적립</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-500">낙첨 포인트 적립률</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pointRatioToPercent(pointRules.loseBetPointsPerStake)}
                      onChange={(e) =>
                        patchPoint(
                          "loseBetPointsPerStake",
                          pointPercentToRatio(e.target.value),
                        )
                      }
                      placeholder="예: 3"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-center text-sm font-mono text-black"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    패배 배팅금의 이 퍼센트만큼 포인트로 적립합니다.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">추천 첫베팅 고정 P</label>
                  <input
                    type="text"
                    value={pointRules.referrerFirstBetFlat}
                    onChange={(e) =>
                      patchPoint("referrerFirstBetFlat", e.target.value)
                    }
                    placeholder="예: 1000"
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">추천한 회원이 첫 배팅 시 추천인에게 고정 지급.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">추천 첫베팅 비율</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pointRules.referrerFirstBetPct}
                      onChange={(e) =>
                        patchPoint("referrerFirstBetPct", e.target.value)
                      }
                      placeholder="예: 1.5"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-center text-sm font-mono text-black"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">첫 배팅금의 이 비율만큼 추천인에게 지급.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-800">충전 포인트</h3>
                <p className="mt-1 text-xs text-gray-500">
                  첫충 포인트와 충전 구간별 포인트 지급을 설정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 hover:bg-gray-100"
              >
                구간 추가
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_2fr]">
              <div>
                <label className="text-xs text-gray-500">첫충전 포인트 지급</label>
                <input
                  type="text"
                  value={pointRules.firstChargePoints}
                  onChange={(e) => patchPoint("firstChargePoints", e.target.value)}
                  placeholder="예: 3000"
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                />
              </div>

              <div className="space-y-3">
                {pointRules.depositPointTiers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                    아직 충전 포인트 구간이 없습니다. 예: 50,000원 이상 충전 시 500P
                  </div>
                ) : (
                  pointRules.depositPointTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <div>
                        <label className="text-xs text-gray-500">최소 충전금액</label>
                        <input
                          type="text"
                          value={tier.minAmount}
                          onChange={(e) =>
                            patchTier(tier.id, "minAmount", e.target.value)
                          }
                          placeholder="예: 50000"
                          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">지급 포인트</label>
                        <input
                          type="text"
                          value={tier.points}
                          onChange={(e) => patchTier(tier.id, "points", e.target.value)}
                          placeholder="예: 500"
                          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTier(tier.id)}
                        className="mt-5 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
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
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">출석체크 포인트</h3>
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
                        ? "border-amber-500/50 bg-[#3182f6]/5 text-[#3182f6]"
                        : "border-gray-300 bg-white text-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {pointRules.attendanceMode === "instant" ? (
                <div className="mt-4">
                  <label className="text-xs text-gray-500">하루 적립 포인트</label>
                  <input
                    type="text"
                    value={pointRules.attendDailyPoints}
                    onChange={(e) => patchPoint("attendDailyPoints", e.target.value)}
                    placeholder="예: 100"
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-gray-500">완수 횟수</label>
                    <input
                      type="text"
                      value={pointRules.attendBatchCount}
                      onChange={(e) => patchPoint("attendBatchCount", e.target.value)}
                      placeholder="예: 7"
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">일괄 수령 포인트</label>
                    <input
                      type="text"
                      value={pointRules.attendBatchPoints}
                      onChange={(e) => patchPoint("attendBatchPoints", e.target.value)}
                      placeholder="예: 1000"
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-800">전체 포인트 지급</h3>
              <p className="mt-1 text-xs text-gray-500">
                현재 플랫폼의 일반 회원 전체에게 동일 포인트를 적립합니다.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500">지급 포인트 액수</label>
                  <input
                    type="number"
                    min={1}
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="예: 500"
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">메모 (선택)</label>
                  <input
                    type="text"
                    value={grantNote}
                    onChange={(e) => setGrantNote(e.target.value)}
                    placeholder="예: 4월 이벤트 일괄 지급"
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  />
                </div>
                <button
                  type="button"
                  disabled={granting}
                  onClick={() => void grantAllPoints()}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-black hover:bg-emerald-500 disabled:opacity-50"
                >
                  {granting ? "지급 중…" : "전체 포인트 지급"}
                </button>
              </div>
            </div>
          </div>

        </section>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-[#3182f6] px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}

function formatHistoryValue(v: unknown): string {
  if (v === null || v === undefined) return "기본값";
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

const ROLLING_HISTORY_LABEL: Record<string, string> = {
  rollingLockWithdrawals: "출금 잠금",
  rollingTurnoverMultiplier: "기본 배수",
  rollingTurnoverSports: "스포츠",
  rollingTurnoverCasino: "카지노",
  rollingTurnoverSlot: "슬롯",
  rollingTurnoverMinigame: "미니게임",
  rollingTurnoverArcade: "아케이드",
  agentCanEditMemberRolling: "총판 편집 권한",
};

function RollingHistoryPanel({ platformId }: { platformId: string | null }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PolicyHistoryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!platformId) return;
    try {
      setErr(null);
      const list = await apiFetch<PolicyHistoryRow[]>(
        `/platforms/${platformId}/policy-history?policyType=rolling&take=30`,
      );
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    }
  }, [platformId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-800">롤링 변경 이력</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            기본 / 게임별 롤링 배수 등 운영 설정의 변경 이력을 시간순으로
            보관합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          {open ? "접기" : "펼치기"}
        </button>
      </div>

      {open ? (
        err ? (
          <p className="mt-3 text-xs text-rose-600">{err}</p>
        ) : rows === null ? (
          <p className="mt-3 text-xs text-gray-400">불러오는 중...</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
            이력이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((r) => {
              const before = asRecord(r.beforeJson);
              const after = asRecord(r.afterJson);
              const keys = Array.from(
                new Set([...Object.keys(before), ...Object.keys(after)]),
              );
              const diffs = keys.filter(
                (k) => formatHistoryValue(before[k]) !== formatHistoryValue(after[k]),
              );
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/60 p-3"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      {new Date(r.createdAt).toLocaleString("ko-KR", {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>
                      {r.changedByLoginId
                        ? `by ${r.changedByLoginId}`
                        : r.changedByUserId
                          ? `by ${r.changedByUserId.slice(0, 8)}`
                          : "시스템"}
                    </span>
                  </div>
                  {diffs.length === 0 ? (
                    <p className="text-xs text-gray-400">변경된 항목 없음</p>
                  ) : (
                    <ul className="space-y-0.5 text-xs">
                      {diffs.map((k) => (
                        <li key={k} className="flex items-center gap-2">
                          <span className="w-24 font-medium text-gray-600">
                            {ROLLING_HISTORY_LABEL[k] ?? k}
                          </span>
                          <span className="font-mono text-gray-500 line-through">
                            {formatHistoryValue(before[k])}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-mono font-semibold text-emerald-700">
                            {formatHistoryValue(after[k])}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}
