import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  Layers,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "스테이킹 가이드",
  description:
    "초보부터 전문가까지, 스테이킹 메커니즘과 실전 노하우를 단계별로 배워보세요.",
};

const TRACKS = [
  {
    id: "beginner",
    label: "초보 트랙",
    icon: GraduationCap,
    color: "from-emerald-200 to-cyan-300",
    badge: "bg-emerald-100 text-emerald-700",
    summary:
      "스테이킹이 무엇인지, 왜 보상이 발생하는지부터 차근차근 학습합니다.",
    chapters: [
      "PoS와 PoW의 차이",
      "검증인(Validator)과 위임자(Delegator)",
      "APR vs APY, 복리의 마법",
      "락업·언본딩 기간 이해하기",
      "첫 스테이킹: 거래소 vs 지갑 vs DeFi",
    ],
  },
  {
    id: "intermediate",
    label: "중급 트랙",
    icon: Layers,
    color: "from-amber-200 to-orange-300",
    badge: "bg-amber-100 text-amber-700",
    summary:
      "유동성 스테이킹(LST), 리스테이킹, 그리고 풀 분산 전략까지 다룹니다.",
    chapters: [
      "stETH·rETH 등 LST의 작동 원리",
      "EigenLayer와 리스테이킹 리스크",
      "AVS 보상 구조와 슬래싱 시나리오",
      "풀 분산 전략 (검증인 셋 다변화)",
      "수익률 vs 유동성 vs 리스크 트레이드오프",
    ],
  },
  {
    id: "advanced",
    label: "고급 트랙",
    icon: Zap,
    color: "from-pink-200 to-fuchsia-300",
    badge: "bg-pink-100 text-pink-700",
    summary:
      "검증인 직접 운영, MEV 추출, 그리고 기관 수준의 리스크 관리.",
    chapters: [
      "솔로 스테이킹 노드 운영 가이드",
      "DVT(분산 검증 기술) 클러스터 구성",
      "MEV-Boost·Relay 선정 기준",
      "유동성 풀 헷징 전략 (LST/LRT 페어)",
      "기관 보고용 KPI 및 리스크 메트릭",
    ],
  },
];

const RESOURCES = [
  {
    title: "용어 사전",
    desc: "Slashing부터 Restaking까지, 핵심 용어 50선.",
  },
  { title: "리포트 라이브러리", desc: "월간 리서치 PDF 무료 다운로드." },
  { title: "커뮤니티", desc: "Discord에서 공인 어드바이저와 상담하세요." },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-12 max-w-3xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
          Staking Guide
        </span>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          처음부터 전문가까지.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          StakingDemo 가이드는 스테이킹의 기초부터 기관급 운영까지 단계적으로
          학습할 수 있도록 구성되었습니다. 자신의 레벨에 맞는 트랙을 선택해
          시작하세요.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {TRACKS.map((t) => (
          <div
            key={t.id}
            className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div
              className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${t.color} opacity-50 blur-2xl transition group-hover:opacity-80`}
            />
            <span
              className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.badge}`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </span>
            <p className="relative mt-4 text-sm leading-relaxed text-muted">
              {t.summary}
            </p>
            <ul className="relative mt-6 space-y-2">
              {t.chapters.map((ch) => (
                <li
                  key={ch}
                  className="flex items-start gap-2 text-sm text-foreground/85"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" />
                  {ch}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="relative mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent-strong"
            >
              학습 시작 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-3xl border border-black/5 bg-white p-8 sm:p-10">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              학습에 도움이 되는 추가 리소스
            </h2>
            <p className="mt-2 text-sm text-muted">
              가이드 외에도 실무에 즉시 활용할 수 있는 자료를 제공합니다.
            </p>
          </div>
          <Link
            href="/about"
            className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-4 py-2.5 text-sm font-semibold hover:border-foreground/40"
          >
            팀에 문의하기 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {RESOURCES.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-black/5 bg-background p-4"
            >
              <p className="text-base font-bold">{r.title}</p>
              <p className="mt-1 text-sm text-muted">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
