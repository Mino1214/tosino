const services = [
  {
    title: "Sportsbook Platform Development",
    desc: "Trading-grade architecture, odds pipelines, live score ingestion, and risk-aware settlement workflows for regulated markets.",
  },
  {
    title: "Casino Platform Development",
    desc: "Aggregator integrations, wallet orchestration, session telemetry, and compliance-ready audit trails for entertainment operators.",
  },
  {
    title: "API Integration",
    desc: "Odds feeds, live data, KYC/AML hooks, PSP connectors, and third-party vendor orchestration with observability built in.",
  },
  {
    title: "Affiliate & Referral Systems",
    desc: "Commission engines, attribution, multi-tier hierarchies, and partner portals designed for scale and transparency.",
  },
  {
    title: "Admin Dashboard & CRM",
    desc: "Role-based consoles for finance, support, marketing, and risk — unified views across users, agents, and treasury.",
  },
  {
    title: "Security & Risk Management",
    desc: "Device intelligence, velocity checks, anomaly detection patterns, and hardened deployment baselines for production workloads.",
  },
  {
    title: "Event & Bonus Engine",
    desc: "Configurable campaigns, eligibility rules, ledger-safe crediting, and rollback-safe promotion lifecycles.",
  },
  {
    title: "White Label Launch Support",
    desc: "Branding, environment provisioning, handover documentation, and go-live war rooms with your technical stakeholders.",
  },
];

export function Services() {
  return (
    <section id="services" className="scroll-mt-24 border-t border-white/[0.06] bg-[#050a14]/80 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Services
          </h2>
          <p className="mt-4 text-slate-400">
            Modular delivery from discovery to production — API-first design, clear SLAs, and
            documentation your teams can own.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <article
              key={s.title}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-transparent p-6 transition hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/5"
            >
              <span className="font-mono text-[10px] text-slate-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 transition group-hover:text-slate-400">
                {s.desc}
              </p>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl transition group-hover:bg-amber-500/10" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
