import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CircleDot,
  Globe,
  Lock,
  Newspaper,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Calendar } from "lucide-react";
import { LiveTicker } from "@/components/live-ticker";
import { NetworksMarquee } from "@/components/networks-marquee";
import { STAKING_OPTIONS } from "@/lib/mock-data";

const SERVICES = [
  {
    icon: Search,
    title: "스테이킹 스캐너",
    desc: "30개 이상 코인의 거래소, DeFi, 지갑 APY를 실시간으로 비교합니다.",
    href: "/scanner",
    color: "from-orange-200 to-pink-300",
  },
  {
    icon: Newspaper,
    title: "AI 뉴스",
    desc: "핵심 크립토 뉴스를 프로토콜, 시장, 규제, 리서치로 큐레이션합니다.",
    href: "/news",
    color: "from-violet-200 to-fuchsia-300",
  },
  {
    icon: Calendar,
    title: "에어드롭 캘린더",
    desc: "검증된 에어드롭과 스냅샷, 거버넌스 일정을 한눈에 확인합니다.",
    href: "/calendar",
    color: "from-emerald-200 to-cyan-300",
  },
  {
    icon: Wallet,
    title: "대시보드",
    desc: "포트폴리오와 누적 보상 추이를 지갑 연결 기반으로 추적합니다.",
    href: "/dashboard",
    color: "from-amber-200 to-orange-300",
  },
  {
    icon: BookOpen,
    title: "스테이킹 가이드",
    desc: "초보부터 전문가까지 단계별 학습 콘텐츠를 제공합니다.",
    href: "/guide",
    color: "from-sky-200 to-blue-300",
  },
  {
    icon: Building2,
    title: "회사 소개",
    desc: "StakingDemo DMCC, Dubai UAE 기반 글로벌 플랫폼입니다.",
    href: "/about",
    color: "from-slate-200 to-zinc-300",
  },
] as const;

const STEPS = [
  { n: "01", title: "코인 검색", desc: "스캐너에서 원하는 코인을 찾고 풀/검증인을 비교합니다." },
  { n: "02", title: "APY 비교", desc: "거래소, DeFi, 지갑별 이자율을 한 화면에서 점검합니다." },
  { n: "03", title: "최적 선택", desc: "감사 완료된 플랫폼에서 안전하게 스테이킹을 시작하세요." },
] as const;

const FAQS = [
  {
    q: "StakingDemo는 어떤 서비스인가요?",
    a: "거래소, DeFi, 지갑의 스테이킹 이자율(APY/APR)을 정규화하여 비교하는 데이터 플랫폼입니다. 직접 자산을 수탁하지 않습니다.",
  },
  {
    q: "직접 스테이킹을 제공하나요?",
    a: "아니요. 비수탁 구조로, 추천된 외부 플랫폼에서 사용자가 직접 스테이킹을 수행합니다.",
  },
  {
    q: "회원가입 없이도 이용할 수 있나요?",
    a: "스캐너, 뉴스, 캘린더, 가이드는 비회원도 이용 가능합니다. 대시보드와 지갑 연동은 로그인이 필요합니다.",
  },
] as const;

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "";
  if (host === "admin.localhost:3016" || host === "admin.ropejfwe1.win") {
    redirect("/admin");
  }

  const topPools = [...STAKING_OPTIONS].sort((a, b) => b.apy - a.apy).slice(0, 5);
  const averageApy = (
    STAKING_OPTIONS.reduce((sum, item) => sum + item.apy, 0) / STAKING_OPTIONS.length
  ).toFixed(2);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/3 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute top-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-pink-300/30 blur-3xl" />
          <div className="absolute -bottom-32 left-[-80px] h-[360px] w-[460px] rounded-full bg-amber-200/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div className="flex flex-col items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-foreground/70 backdrop-blur">
                <Sparkles className="h-3 w-3 text-accent-strong" />
                Data-Driven Staking
              </span>
              <h1 className="mt-5 text-[44px] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-[76px]">
                스테이킹 수익률을
                <br />
                <span className="text-accent-strong">한 화면에서.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                30개 이상의 코인, 100+ 거래소·DeFi·지갑의 스테이킹 APY를 정규화해 비교합니다.
                비수탁 구조라 자산은 항상 사용자 것입니다.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/scanner"
                  className="glow-btn inline-flex items-center gap-2 rounded-full bg-accent-strong px-6 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                >
                  스캐너 시작하기
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/guide"
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-6 py-4 text-sm font-semibold text-foreground backdrop-blur transition hover:border-foreground/30 hover:bg-white"
                >
                  가이드 보기
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <dl className="mt-10 grid w-full max-w-lg grid-cols-3 gap-6 border-t border-black/10 pt-6">
                <Stat label="평균 APY" value={`${averageApy}%`} />
                <Stat label="분석 코인" value="30+" />
                <Stat label="플랫폼" value="100+" />
              </dl>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-[36px] bg-gradient-to-br from-white/70 to-white/30 blur-xl" />
              <div className="rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-[0_30px_60px_-30px_rgba(255,138,101,0.45)] backdrop-blur sm:p-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                      Live · Top APY
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-muted">30초마다 갱신</span>
                </div>

                <div className="mt-5 rounded-2xl bg-gradient-to-br from-accent/15 via-pink-200/30 to-amber-200/30 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/60">
                    오늘의 Top 1
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-foreground">
                        {topPools[0].coin} <span className="text-foreground/40">·</span>{" "}
                        {topPools[0].platform}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {topPools[0].category} · {topPools[0].lockup} · {topPools[0].payoutToken}
                      </p>
                    </div>
                    <p className="text-5xl font-extrabold tracking-tight text-accent-strong">
                      {topPools[0].apy}%
                    </p>
                  </div>
                </div>

                <ul className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5">
                  {topPools.slice(1).map((pool) => (
                    <li key={pool.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <CircleDot className="h-4 w-4 shrink-0 text-foreground/30" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {pool.coin} <span className="font-normal text-foreground/50">· {pool.platform}</span>
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {pool.category} · {pool.lockup}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 font-bold text-foreground">{pool.apy}%</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/scanner"
                  className="mt-5 flex items-center justify-center gap-2 rounded-full bg-foreground/[0.04] py-3 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.08]"
                >
                  전체 풀 비교 보기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <LiveTicker />
      </section>

      <section className="border-y border-black/5 bg-white/70 py-14 sm:py-16">
        <div className="mx-auto mb-10 max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">지원가능 네트워크</p>
        </div>
        <NetworksMarquee />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">주요 서비스</h2>
          <p className="mt-2 text-muted">데이터 기반 스테이킹 인사이트의 모든 것</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <FeatureCard key={service.title} {...service} />
          ))}
        </div>
      </section>

      <section className="border-y border-black/5 bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">How it works</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            3단계로 최적의 스테이킹을 찾으세요
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-3xl border border-black/5 bg-white p-6">
                <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
                  STEP {step.n}
                </span>
                <h3 className="mt-2 text-2xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
              Non-custodial
            </span>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Security & Trust
            </h2>
            <p className="mt-4 text-muted">
              StakingDemo는 사용자 자산에 직접 접근하지 않습니다. 데이터 분석과 플랫폼 검증만을 수행하며,
              실제 스테이킹은 추천된 외부 플랫폼에서 이루어집니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TrustCard icon={Lock} title="비수탁 구조" desc="사용자 자산에 직접 접근하지 않는 Non-custodial 아키텍처." />
            <TrustCard icon={ShieldCheck} title="데이터 암호화" desc="모든 통신은 TLS 1.3으로 암호화되며 사용자 데이터를 보호합니다." />
            <TrustCard icon={Globe} title="Cloudflare 보호" desc="엔터프라이즈급 DDoS 방어와 WAF로 서비스 안정성 보장." />
          </div>
        </div>
      </section>

      <section className="border-t border-black/5 bg-white/60 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">자주 묻는 질문</h2>
          <div className="mt-8 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
            {FAQS.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-foreground">
                  {item.q}
                  <span className="text-xl text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-foreground p-10 text-white sm:p-14">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                지금 바로 최적의 스테이킹을 찾아보세요.
              </h3>
              <p className="mt-3 max-w-xl text-white/70">
                회원가입 후 지갑을 연결하면 포트폴리오와 보상 추이까지 한 번에 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/signup" className="rounded-full bg-accent-strong px-6 py-3.5 text-sm font-semibold text-white">
                회원가입
              </Link>
              <Link href="/scanner" className="rounded-full border border-white/20 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                스캐너 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-1.5 text-2xl font-extrabold text-foreground">{value}</dd>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  href,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${color} opacity-50 blur-2xl transition group-hover:opacity-80`} />
      <Icon className="relative h-7 w-7 text-foreground" />
      <h3 className="relative mt-5 text-lg font-bold">{title}</h3>
      <p className="relative mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
      <div className="relative mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent-strong">
        바로가기 <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function TrustCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6">
      <Icon className="h-6 w-6 text-accent-strong" />
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}
