const steps = [
  { n: "01", title: "Consultation", desc: "Scope, markets, compliance constraints, and success metrics." },
  { n: "02", title: "Planning", desc: "Architecture, milestones, integrations, and risk register." },
  { n: "03", title: "Development", desc: "Iterative delivery with staging environments and QA gates." },
  { n: "04", title: "Launch", desc: "Cutover playbooks, observability, and war-room support." },
  { n: "05", title: "Maintenance & growth", desc: "SLAs, roadmap engineering, and capacity planning." },
];

export function Process() {
  return (
    <section id="process" className="scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          How we work
        </h2>
        <p className="mt-4 max-w-xl text-slate-400">
          Transparent phases with documentation you can audit — built for procurement and technical
          stakeholders alike.
        </p>

        <ol className="relative mt-16 space-y-10 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-2rem)] before:w-px before:bg-gradient-to-b before:from-amber-500/40 before:via-sky-500/30 before:to-transparent sm:before:left-[19px]">
          {steps.map((s) => (
            <li key={s.n} className="relative flex gap-6 sm:gap-10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-[#0a0f1c] font-mono text-xs font-semibold text-amber-400">
                {s.n}
              </span>
              <div className="pt-1">
                <h3 className="font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
