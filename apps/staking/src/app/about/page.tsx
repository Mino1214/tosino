import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Mail,
  MapPin,
  Target,
  Eye,
  HeartHandshake,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "StakingDemo DMCC는 두바이 기반의 글로벌 스테이킹 데이터 플랫폼입니다.",
};

const VALUES = [
  {
    icon: Target,
    title: "Mission",
    desc: "전 세계 스테이커가 신뢰할 수 있는 데이터를 토대로 최적의 결정을 내리도록 돕는다.",
  },
  {
    icon: Eye,
    title: "Vision",
    desc: "스테이킹 산업의 ‘블룸버그 터미널’이 되어, 표준화된 비교 데이터를 제공한다.",
  },
  {
    icon: HeartHandshake,
    title: "Values",
    desc: "투명성, 비수탁, 사용자 우선 — 우리는 사용자의 자산에 절대 접근하지 않습니다.",
  },
];

const STATS = [
  { value: "2024", label: "DMCC 등록" },
  { value: "30+", label: "추적 코인" },
  { value: "100+", label: "분석 플랫폼" },
  { value: "TLS 1.3", label: "전구간 암호화" },
];

export default function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/4 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
            About StakingDemo
          </span>
          <h1 className="mt-3 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            데이터로 스테이킹의 표준을 만듭니다.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            StakingDemo DMCC는 두바이에 본사를 둔 글로벌 스테이킹 데이터 플랫폼
            기업입니다. 우리는 전 세계 100개 이상의 거래소·DeFi·지갑 플랫폼을
            추적하여, 스테이커가 가장 합리적인 결정을 내릴 수 있도록 돕습니다.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-3xl border border-black/5 bg-white p-5"
              >
                <p className="text-3xl font-extrabold tracking-tight">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-3xl border border-black/5 bg-white p-7"
              >
                <v.icon className="h-7 w-7 text-accent-strong" />
                <h2 className="mt-5 text-xl font-bold">{v.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-3xl border border-black/5 bg-foreground p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Building2 className="h-8 w-8 text-accent" />
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              StakingDemo DMCC
            </h2>
            <p className="mt-4 max-w-xl text-white/75">
              UAE 두바이 DMCC Free Zone에 정식 등록된 법인입니다. 글로벌 사용자
              누구나 안심하고 사용할 수 있도록 엄격한 데이터 거버넌스와 보안
              표준을 준수합니다.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-2 text-white/85">
                <MapPin className="h-4 w-4 text-accent" />
                Dubai, United Arab Emirates
              </li>
              <li className="flex items-center gap-2 text-white/85">
                <Mail className="h-4 w-4 text-accent" />
                contact@stakingdemo.app
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white/5 p-6">
            <h3 className="text-base font-semibold text-white">
              파트너십 / 데이터 제휴
            </h3>
            <p className="mt-2 text-sm text-white/70">
              데이터 API, 화이트라벨 통합, 또는 기관 파트너십에 관심이
              있으시다면 언제든 연락주세요.
            </p>
            <Link
              href="mailto:contact@stakingdemo.app"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-strong px-5 py-3 text-sm font-semibold text-white"
            >
              <Mail className="h-4 w-4" /> 문의 보내기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
