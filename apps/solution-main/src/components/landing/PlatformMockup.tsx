const highlights = [
  {
    stat: "즉시",
    label: "원터치 충전 → 즉시 작업 가능",
    hint: "가동 지연 최소화",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    stat: "≤7일",
    label: "7일 이내 런칭 보장",
    hint: "표준 스코프 기준",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2v-6H3v6a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    stat: "24/7",
    label: "24/7 운영 지원",
    hint: "장애·패치 대응",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="12" cy="12" r="9" strokeLinecap="round" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const widgets = [
  { title: "라이브 유저", meta: "동시 접속 · 지역 히트맵", accent: "from-cyan-500/30 to-violet-600/10" },
  { title: "입금 / 출금", meta: "자금 큐 · 한도", accent: "from-emerald-500/25 to-teal-500/5" },
  { title: "베팅 분석", meta: "마진 · 익스포저 · 종목 믹스", accent: "from-violet-500/30 to-fuchsia-500/10" },
  { title: "프로모션 제어", meta: "캠페인 · 자격", accent: "from-sky-500/25 to-indigo-600/10" },
  { title: "유저 관리", meta: "KYC 상태 · 태그 · 메모", accent: "from-slate-400/20 to-slate-600/5" },
  { title: "총판 계층", meta: "트리 · 수수료 · 정산", accent: "from-blue-600/25 to-violet-600/10" },
  { title: "매출 리포트", meta: "GGR, NGR, 코호트보내기", accent: "from-fuchsia-500/20 to-cyan-400/10" },
];

export function PlatformMockup() {
  return (
    <section id="platform" className="scroll-mt-24 border-t border-white/[0.06] bg-[#080818]/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              플랫폼 기능
            </h2>
            <p className="mt-4 text-slate-400">
              운영자 콘솔에서 자주 다루는 모듈 예시 — 조직 구조에 맞게 레이아웃·권한을 맞춤화합니다.
            </p>
          </div>
          <p className="max-w-sm text-sm text-slate-600">
            B2B 소프트웨어 범위를 보여주는 일러스트입니다. 최종 모듈은 제품·라이선스·연동 범위에
            따라 달라집니다.
          </p>
        </div>

        {/* Linear / Vercel 스타일 하이라이트 바 */}
        <div className="mt-10 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a12]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
          <div className="grid divide-y divide-white/[0.06] md:grid-cols-3 md:divide-x md:divide-y-0">
            {highlights.map((h) => (
              <div
                key={h.label}
                className="flex gap-4 px-5 py-5 sm:px-6 sm:py-6 md:flex-col md:gap-3 lg:flex-row lg:items-start"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-cyan-300/90">
                  {h.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-cyan-200">
                      {h.stat}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">{h.hint}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug text-slate-200">{h.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <div
              key={w.title}
              className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${w.accent} p-px`}
            >
              <div className="h-full rounded-[15px] bg-[#0a0a12]/95 p-5">
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="font-display text-sm font-semibold text-white">{w.title}</h3>
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.55)]" />
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-3/4 rounded bg-white/10" />
                  <div className="h-2 w-1/2 rounded bg-white/5" />
                  <div className="h-2 w-5/6 rounded bg-white/5" />
                </div>
                <p className="mt-6 text-[11px] uppercase tracking-wider text-slate-500">{w.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
