"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Cpu,
  Gauge,
  Layers3,
  Play,
  Radar,
  ShieldCheck,
  Target,
} from "lucide-react";
import { MyAssetsClient } from "@/app/a/me/my-assets/my-assets-client";

type DashboardTab = "staking" | "bots";

type ModuleKey =
  | "market"
  | "rebalance"
  | "arbitrage"
  | "factor"
  | "onchain"
  | "volatility"
  | "deep";

type DashboardClientProps = {
  user: {
    id: string;
    username: string;
  };
  adminEvmWallet: string;
  adminTronWallet: string | null;
};

const botModules: Array<{
  key: ModuleKey;
  title: string;
  english: string;
  accent: string;
  icon: typeof BrainCircuit;
  analysis: string;
  signals: string;
  status: string;
  runTime: string;
  description: string;
  methods: string[];
  features: string[];
}> = [
  {
    key: "market",
    title: "AI 시장 분석 엔진",
    english: "AI Market Analyzer",
    accent: "text-sky-600",
    icon: BrainCircuit,
    analysis: "20",
    signals: "0",
    status: "대기",
    runTime: "--:--:--",
    description:
      "인공지능 기반으로 글로벌 암호화폐 시장의 흐름을 실시간으로 분석하고 최적의 매매 타이밍을 판단하는 핵심 전략입니다.",
    methods: [
      "200개 이상의 시장 데이터 포인트 실시간 수집",
      "머신러닝 모델 기반 시장 방향성 예측",
      "뉴스·소셜 센티먼트와 기술적 지표 결합",
    ],
    features: [
      "24시간 자동 시장 모니터링",
      "감정 배제 데이터 기반 의사결정",
      "시장 변화에 적응하는 학습 알고리즘",
    ],
  },
  {
    key: "rebalance",
    title: "스마트 리밸런싱",
    english: "Smart Rebalancing",
    accent: "text-blue-600",
    icon: Layers3,
    analysis: "12",
    signals: "3",
    status: "관찰",
    runTime: "01:23:18",
    description:
      "포트폴리오 목표 비중을 자동 계산하고 변동성 확대 구간에서 노출을 재조정합니다.",
    methods: ["목표 비중 편차 추적", "자산별 변동성 스코어링", "리스크 한도 기반 조정"],
    features: ["과도한 편중 완화", "현물·스테이킹 자산 분리 관리", "실행 전 로그 기록"],
  },
  {
    key: "arbitrage",
    title: "아비트리지 무위험 모듈",
    english: "Arbitrage Guard",
    accent: "text-emerald-600",
    icon: ShieldCheck,
    analysis: "8",
    signals: "1",
    status: "대기",
    runTime: "--:--:--",
    description:
      "거래소 간 가격 괴리와 수수료를 함께 계산해 실현 가능한 차익 기회만 선별합니다.",
    methods: ["호가 스프레드 비교", "수수료·슬리피지 차감", "거래 가능 잔액 확인"],
    features: ["저위험 기회 우선", "실행 조건 로그화", "급변 구간 자동 보류"],
  },
  {
    key: "factor",
    title: "멀티 팩터 스코어링",
    english: "Multi Factor Scoring",
    accent: "text-violet-600",
    icon: Target,
    analysis: "16",
    signals: "2",
    status: "대기",
    runTime: "--:--:--",
    description:
      "추세, 거래량, 변동성, 온체인 플로우를 점수화하여 자산별 우선순위를 정렬합니다.",
    methods: ["팩터별 가중치 산정", "단기·중기 추세 분리", "과열 구간 감점"],
    features: ["투명한 점수 근거", "전략별 필터", "대시보드 요약 제공"],
  },
  {
    key: "onchain",
    title: "온체인 데이터 추적",
    english: "On-chain Tracker",
    accent: "text-teal-600",
    icon: Radar,
    analysis: "34",
    signals: "5",
    status: "활성",
    runTime: "06:42:09",
    description:
      "대형 지갑 이동, 스테이블코인 유입, 거래소 입출금 변화를 추적해 시장 압력을 감지합니다.",
    methods: ["거래소 유입량 추적", "고래 지갑 클러스터링", "스테이블코인 공급 변화 확인"],
    features: ["온체인 알림", "거래소별 분리", "시장 스캔 기록"],
  },
  {
    key: "volatility",
    title: "변동성 적응 알고리즘",
    english: "Volatility Adapter",
    accent: "text-orange-600",
    icon: Gauge,
    analysis: "14",
    signals: "1",
    status: "대기",
    runTime: "--:--:--",
    description:
      "실시간 변동성 수준에 맞춰 포지션 크기와 신호 민감도를 자동으로 조절합니다.",
    methods: ["ATR 기반 변동성 측정", "급등락 구간 민감도 축소", "손익 변동폭 제한"],
    features: ["위험 구간 방어", "자동 민감도 조절", "포지션 크기 가이드"],
  },
  {
    key: "deep",
    title: "딥 러닝 패턴 인식",
    english: "Deep Pattern Recognition",
    accent: "text-indigo-600",
    icon: Cpu,
    analysis: "11",
    signals: "0",
    status: "학습",
    runTime: "00:42:11",
    description:
      "과거 가격 패턴과 현재 시장 구조의 유사도를 비교해 반복 가능한 신호를 포착합니다.",
    methods: ["캔들 패턴 임베딩", "유사 구간 샘플링", "노이즈 제거 후 신호 검증"],
    features: ["반복 패턴 감지", "신호 신뢰도 표시", "학습 상태 모니터링"],
  },
];

const botLogs = [
  ["12:17:21", "[시스템]", "스마트 리밸런싱 모듈 - TRX 58.5%, USDT 29.5%"],
  ["12:17:52", "[시스템]", "모듈 실행이 시작되었습니다"],
  ["12:17:55", "[시스템]", "아비트리지 무위험 모듈 실행이 시작되었습니다"],
  ["11:07:25", "[시스템]", "모듈 실행이 중지되었습니다"],
  ["23:01:16", "[시스템]", "스마트 리밸런싱 목표 비중이 업데이트되었습니다"],
];

export function DashboardClient({
  user,
  adminEvmWallet,
  adminTronWallet,
}: DashboardClientProps) {
  const [tab, setTab] = useState<DashboardTab>("staking");
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("market");
  const activeModule = useMemo(
    () => botModules.find((module) => module.key === selectedModule) ?? botModules[0],
    [selectedModule],
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              {user.username}님의 대시보드
            </h1>
          </div>
          <div className="grid h-11 grid-cols-2 rounded-2xl border border-black/10 bg-white p-1 text-sm font-bold text-muted shadow-sm">
            <button
              type="button"
              onClick={() => setTab("staking")}
              className={`rounded-xl px-4 transition ${
                tab === "staking"
                  ? "bg-accent-strong text-white shadow-sm"
                  : "hover:bg-black/[0.04] hover:text-foreground"
              }`}
            >
              스테이킹
            </button>
            <button
              type="button"
              onClick={() => setTab("bots")}
              className={`rounded-xl px-4 transition ${
                tab === "bots"
                  ? "bg-accent-strong text-white shadow-sm"
                  : "hover:bg-black/[0.04] hover:text-foreground"
              }`}
            >
              트레이딩 봇
            </button>
          </div>
        </div>
      </div>

      {tab === "staking" ? (
        <MyAssetsClient
          user={user}
          adminEvmWallet={adminEvmWallet}
          adminTronWallet={adminTronWallet}
        />
      ) : (
        <BotDashboard activeModule={activeModule} onSelect={setSelectedModule} />
      )}
    </div>
  );
}

function BotDashboard({
  activeModule,
  onSelect,
}: {
  activeModule: (typeof botModules)[number];
  onSelect: (key: ModuleKey) => void;
}) {
  const ActiveIcon = activeModule.icon;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-12 sm:px-6 lg:px-8">
      <section className="grid gap-4 rounded-3xl border border-black/5 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(255,107,72,0.18)] lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Trading Bot
          </p>
          <p className="mt-2 font-mono text-4xl font-extrabold tracking-tight text-foreground">
            9.82 USD
          </p>
          <p className="mt-2 font-mono text-lg font-bold text-emerald-700">
            누적 수익: +3,215.09 USD
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-accent-strong/25 bg-accent-strong/[0.08] px-4 py-2 text-sm font-extrabold text-accent-strong">
              현물 10 USD
            </span>
            <span className="rounded-full bg-black/[0.04] px-4 py-2 text-sm font-bold text-muted">
              선물 0 USD
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <ConsoleMetric icon={Activity} label="활성 모듈" value="0" />
          <ConsoleMetric icon={BarChart3} label="총 분석" value="0" tone="blue" />
          <ConsoleMetric icon={Target} label="오늘 시그널" value="0" tone="violet" />
          <ConsoleMetric icon={Radar} label="시장 스캔" value="0" tone="green" />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-black/5 bg-white p-4">
          <h2 className="mb-4 text-sm font-extrabold text-foreground">모듈 목록</h2>
          <div className="space-y-2">
            {botModules.map((module) => {
              const Icon = module.icon;
              const selected = activeModule.key === module.key;
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onSelect(module.key)}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm transition ${
                    selected
                      ? "bg-accent-strong/[0.1] text-foreground shadow-[inset_3px_0_0_var(--accent-strong)]"
                      : "text-foreground/65 hover:bg-black/[0.04] hover:text-foreground"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className={`h-4 w-4 shrink-0 ${module.accent}`} />
                    <span className="truncate font-semibold">{module.title}</span>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    시작
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="rounded-3xl border border-black/5 bg-white p-5">
          <div className="flex flex-col gap-3 border-b border-black/5 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-3 w-3 rounded-full bg-accent-strong" />
              <div>
                <h2 className="text-xl font-extrabold text-foreground">
                  {activeModule.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{activeModule.english}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-muted">
                {activeModule.runTime}
              </span>
              <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-bold text-foreground/65">
                {activeModule.status}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <SmallStat label="분석 횟수" value={activeModule.analysis} />
            <SmallStat label="시그널" value={activeModule.signals} />
            <SmallStat label="상태" value={activeModule.status} />
            <SmallStat label="실행 시간" value={activeModule.runTime} />
          </div>

          <div className="mt-5 rounded-3xl bg-black/[0.025] p-5">
            <div className="flex items-center gap-2">
              <ActiveIcon className={`h-5 w-5 ${activeModule.accent}`} />
              <h3 className="text-lg font-extrabold text-foreground">모듈 상세</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              {activeModule.description}
            </p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <ModuleList title="분석 방식" items={activeModule.methods} />
              <ModuleList title="주요 특징" items={activeModule.features} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-black/5 bg-white p-5">
          <h2 className="text-lg font-extrabold text-foreground">자산 상세</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead className="bg-black/[0.04] text-xs text-muted">
                <tr>
                  <th className="px-3 py-3">코인</th>
                  <th className="px-3 py-3 text-right">수량</th>
                  <th className="px-3 py-3 text-right">가치 (USD)</th>
                  <th className="px-3 py-3 text-right">비중</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-black/5 text-foreground">
                  <td className="px-3 py-4">
                    <span className="inline-flex items-center gap-2 font-bold">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        TRX
                      </span>
                      TRX
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right font-mono">24.680901</td>
                  <td className="px-3 py-4 text-right font-mono">8.71 USD</td>
                  <td className="px-3 py-4 text-right font-mono text-muted">88.7%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-foreground">모듈 실행 내역</h2>
            <span className="text-xs font-bold text-accent-strong">활동 로그 10건</span>
          </div>
          <div className="mt-4 space-y-3">
            {botLogs.map(([time, label, message]) => (
              <div
                key={`${time}-${message}`}
                className="grid grid-cols-[68px_74px_minmax(0,1fr)] gap-3 border-t border-black/5 pt-3 text-sm"
              >
                <span className="font-mono text-muted">{time}</span>
                <span className="text-foreground/55">{label}</span>
                <span className="min-w-0 text-foreground/75">{message}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ConsoleMetric({
  icon: Icon,
  label,
  value,
  tone = "orange",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "orange" | "blue" | "green" | "violet";
}) {
  const colors = {
    orange: "text-accent-strong",
    blue: "text-blue-600",
    green: "text-emerald-600",
    violet: "text-violet-600",
  } as const;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <Icon className={`h-5 w-5 ${colors[tone]}`} />
      <p className="mt-4 font-mono text-3xl font-extrabold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-lg font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function ModuleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-extrabold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-5 text-foreground/65">
            <Play className="mt-1 h-3 w-3 shrink-0 fill-accent-strong text-accent-strong" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
