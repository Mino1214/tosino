const widgets = [
  { title: "Live users", meta: "Concurrent · geo heatmap", accent: "from-sky-500/30 to-cyan-400/10" },
  { title: "Deposit / withdraw", meta: "Treasury queue & limits", accent: "from-emerald-500/25 to-teal-500/5" },
  { title: "Bet analytics", meta: "Margin, exposure, sports mix", accent: "from-violet-500/25 to-fuchsia-500/5" },
  { title: "Promotion control", meta: "Campaigns & eligibility", accent: "from-amber-500/25 to-orange-600/5" },
  { title: "User management", meta: "KYC state · tags · notes", accent: "from-slate-400/20 to-slate-600/5" },
  { title: "Agent hierarchy", meta: "Tree, commissions, settlements", accent: "from-blue-600/25 to-indigo-600/5" },
  { title: "Revenue reports", meta: "GGR, NGR, cohort exports", accent: "from-rose-500/20 to-amber-400/10" },
];

export function PlatformMockup() {
  return (
    <section id="platform" className="scroll-mt-24 border-t border-white/[0.06] bg-[#050a14]/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Platform capabilities
            </h2>
            <p className="mt-4 text-slate-400">
              Representative modules from our operator consoles — tailored layouts and permissions
              per your organization structure.
            </p>
          </div>
          <p className="max-w-sm text-sm text-slate-600">
            Illustrative UI for B2B software scope. Final modules depend on your product, licensing,
            and integration scope.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <div
              key={w.title}
              className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${w.accent} p-px`}
            >
              <div className="h-full rounded-[15px] bg-[#0a0f1c]/95 p-5">
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="font-display text-sm font-semibold text-white">{w.title}</h3>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
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
