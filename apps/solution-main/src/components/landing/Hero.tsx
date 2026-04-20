export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-90" aria-hidden />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-[100px] animate-pulse-glow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-amber-500/15 blur-[90px] animate-pulse-glow"
        style={{ animationDelay: "2s" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[120%] -translate-x-1/2 bg-gradient-to-t from-[#030712] via-transparent to-transparent"
        aria-hidden
      />

      {/* Network / chart lines */}
      <svg
        className="pointer-events-none absolute inset-x-0 top-24 mx-auto h-64 w-full max-w-4xl opacity-40 sm:top-32"
        viewBox="0 0 800 200"
        fill="none"
        aria-hidden
      >
        <path
          d="M0 120 Q200 40 400 100 T800 80"
          stroke="url(#g1)"
          strokeWidth="1.2"
          strokeDasharray="8 6"
          className="animate-dash-flow"
        />
        <path
          d="M0 160 Q250 180 500 90 T800 140"
          stroke="url(#g2)"
          strokeWidth="1"
          strokeDasharray="6 8"
          className="animate-dash-flow"
          style={{ animationDelay: "1.5s" }}
        />
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="800" y2="0">
            <stop stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="1" stopColor="#d4af37" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="800" y2="0">
            <stop stopColor="#d4af37" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#64748b" stopOpacity="0.6" />
            <stop offset="1" stopColor="#38bdf8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8">
        <div>
          <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-200/90">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Software & infrastructure partner
          </p>
          <h1 className="animate-fade-up delay-100 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Build Your{" "}
            <span className="gold-gradient-text">Gaming Business</span> Faster
          </h1>
          <p className="animate-fade-up delay-200 mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            Complete B2B solutions for sports entertainment platforms, casino systems, affiliate
            programs, payments, CRM, and operations management. We engineer and maintain the stack —
            you focus on growth and compliance in your markets.
          </p>
          <div className="animate-fade-up delay-300 mt-10 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-xl shadow-amber-500/25 transition hover:from-amber-400 hover:to-amber-500"
            >
              Request Consultation
            </a>
            <a
              href="#services"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-sky-400/40 hover:bg-white/[0.08]"
            >
              View Solutions
            </a>
          </div>
          <p className="mt-8 max-w-md text-xs leading-relaxed text-slate-600">
            Tozino Solution provides software development and technical services for licensed
            operators and platform businesses. We do not operate consumer-facing gaming websites.
          </p>
        </div>

        {/* Dashboard mock */}
        <div className="animate-float-slow relative lg:justify-self-end">
          <div className="glass-panel blue-ring relative overflow-hidden rounded-2xl p-1 shadow-2xl">
            <div className="rounded-xl bg-gradient-to-br from-slate-900/90 to-[#0a0f1c] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    Operations overview
                  </p>
                  <p className="font-display text-sm font-semibold text-white">Live control plane</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                  All systems nominal
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "Active sessions", val: "12.4k", tone: "text-sky-300" },
                  { label: "Deposits (24h)", val: "₩ 482M", tone: "text-emerald-300" },
                  { label: "Withdrawals", val: "₩ 119M", tone: "text-amber-200/90" },
                  { label: "Open tickets", val: "23", tone: "text-slate-300" },
                  { label: "Promotions live", val: "8", tone: "text-violet-300" },
                  { label: "Net revenue", val: "+4.2%", tone: "text-emerald-400" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-3"
                  >
                    <p className="text-[10px] text-slate-500">{m.label}</p>
                    <p className={`mt-1 font-mono text-sm font-semibold ${m.tone}`}>{m.val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/40 p-3">
                <div className="mb-2 flex justify-between text-[10px] text-slate-500">
                  <span>Throughput</span>
                  <span className="text-sky-400/80">Real-time</span>
                </div>
                <div className="flex h-16 items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-sky-600/40 to-sky-400/80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-sky-500/10 via-transparent to-amber-500/10 blur-2xl" />
        </div>
      </div>
    </section>
  );
}
