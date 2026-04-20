import { LiveThroughputChart } from "@/components/landing/LiveThroughputChart";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-90" aria-hidden />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-[100px] animate-pulse-glow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-600/20 blur-[90px] animate-pulse-glow"
        style={{ animationDelay: "2s" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[120%] -translate-x-1/2 bg-gradient-to-t from-[#050505] via-transparent to-transparent"
        aria-hidden
      />

      <svg
        className="pointer-events-none absolute inset-x-0 top-24 mx-auto h-64 w-full max-w-4xl opacity-45 sm:top-32"
        viewBox="0 0 800 200"
        fill="none"
        aria-hidden
      >
        <path
          d="M0 120 Q200 40 400 100 T800 80"
          stroke="url(#heroLine1)"
          strokeWidth="1.2"
          strokeDasharray="8 6"
          className="animate-dash-flow"
        />
        <path
          d="M0 160 Q250 180 500 90 T800 140"
          stroke="url(#heroLine2)"
          strokeWidth="1"
          strokeDasharray="6 8"
          className="animate-dash-flow"
          style={{ animationDelay: "1.5s" }}
        />
        <defs>
          <linearGradient id="heroLine1" x1="0" y1="0" x2="800" y2="0">
            <stop stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="0.45" stopColor="#22d3ee" stopOpacity="0.85" />
            <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroLine2" x1="0" y1="0" x2="800" y2="0">
            <stop stopColor="#a78bfa" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#6366f1" stopOpacity="0.55" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0.35" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8">
        <div>
          <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/5 px-3 py-1 text-xs font-medium tracking-wide text-cyan-100/90">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            소프트웨어 · 인프라 파트너
          </p>
          <h1 className="animate-fade-up delay-100 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            더 빠르게, 더 견고하게 — <span className="brand-gradient-text">엔터테인먼트 플랫폼</span>을
            만듭니다
          </h1>
          <div className="animate-fade-up delay-200 mt-6 max-w-xl space-y-2 text-lg leading-relaxed">
            <p className="font-medium text-slate-100">
              한 스택으로 시장까지: 스포츠·카지노·총판·결제·CRM을 설계·구축·운영해 반복 비용과
              리스크를 줄입니다.
            </p>
            <p className="text-base text-slate-400">
              지금 상담을 남기면 귀사 스펙에 맞는 로드맵·일정·연동 범위를 바로 제안드리고, 착수
              가능한 형태로 정리해 드립니다.
            </p>
          </div>
          <div className="animate-fade-up delay-300 mt-10 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="brand-cta inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold transition"
            >
              상담 요청
            </a>
            <a
              href="#services"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-violet-400/35 hover:bg-violet-500/10"
            >
              솔루션 보기
            </a>
          </div>
          <p className="mt-8 max-w-md text-xs leading-relaxed text-slate-600">
            토지노 솔루션은 허가된 사업자·플랫폼 기업을 위한 소프트웨어 개발 및 기술 지원을
            제공합니다. 저희는 소비자 대상 베팅·게임 사이트를 직접 운영하지 않습니다.
          </p>
        </div>

        <div className="animate-float-slow relative lg:justify-self-end">
          <div className="glass-panel brand-ring relative overflow-hidden rounded-2xl p-1 shadow-2xl">
            <div className="rounded-xl bg-gradient-to-br from-slate-950/95 via-[#080818] to-violet-950/30 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    운영 개요
                  </p>
                  <p className="font-display text-sm font-semibold text-white">라이브 컨트롤 플레인</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                  정상 가동
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "동시 접속", val: "12.4k", tone: "text-cyan-300" },
                  { label: "입금(24h)", val: "₩ 482M", tone: "text-emerald-300" },
                  { label: "출금", val: "₩ 119M", tone: "text-violet-200/90" },
                  { label: "미처리 티켓", val: "23", tone: "text-slate-300" },
                  { label: "진행 프로모션", val: "8", tone: "text-fuchsia-300" },
                  { label: "순매출", val: "+4.2%", tone: "text-emerald-400" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-3"
                  >
                    <p className="text-[10px] text-slate-500">{m.label}</p>
                    <p className={`mt-1 font-mono text-sm font-semibold ${m.tone}`}>{m.val}</p>
                  </div>
                ))}
              </div>
              <LiveThroughputChart />
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-cyan-500/15 via-transparent to-violet-600/20 blur-2xl" />
        </div>
      </div>
    </section>
  );
}
