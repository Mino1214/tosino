const items = [
  {
    title: "Sports entertainment startups",
    desc: "MVP to market-ready stacks with vendor-agnostic integration patterns.",
  },
  {
    title: "Casino & aggregator operators",
    desc: "Wallet core, session integrity, and reconciliation tooling for complex catalogs.",
  },
  {
    title: "White label businesses",
    desc: "Multi-tenant boundaries, branding pipelines, and per-tenant configuration governance.",
  },
  {
    title: "Affiliate & partner networks",
    desc: "Tracking, payouts, fraud signals, and partner-grade reporting APIs.",
  },
  {
    title: "Gaming & entertainment investors",
    desc: "Technical due diligence, architecture reviews, and post-acquisition integration.",
  },
];

export function Industries() {
  return (
    <section id="industries" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Industries we support
        </h2>
        <p className="mt-4 max-w-2xl text-slate-400">
          From early-stage teams to established groups expanding into new verticals — we align
          engineering capacity with your regulatory and commercial context.
        </p>
        <div className="mt-14 columns-1 gap-5 space-y-5 md:columns-2">
          {items.map((item) => (
            <article
              key={item.title}
              className="break-inside-avoid rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6"
            >
              <h3 className="font-display text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
