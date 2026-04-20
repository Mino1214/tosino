const reasons = [
  "Fast launch time with proven reference architectures",
  "Scalable infrastructure patterns (multi-region ready)",
  "Real-time data integration and streaming pipelines",
  "Multi-language UI and localization workflows",
  "Enterprise security posture and access governance",
  "Dedicated technical support channels",
  "Custom feature development aligned to your roadmap",
];

export function WhyUs() {
  return (
    <section id="why-us" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Why operators choose us
            </h2>
            <p className="mt-4 text-slate-400">
              A senior engineering partner focused on reliability, measurable SLAs, and long-term
              maintainability — not short-lived templates.
            </p>
            <div className="mt-10 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-sky-500/10 via-transparent to-amber-500/5 p-8">
              <p className="font-display text-lg text-white/90">
                “We treat your platform like critical financial infrastructure — because it is.”
              </p>
              <p className="mt-4 text-sm text-slate-500">— Engineering leadership, Tozino Solution</p>
            </div>
          </div>
          <ul className="space-y-4">
            {reasons.map((r) => (
              <li
                key={r}
                className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden>
                    <path
                      d="M10 3L4.5 8.5 2 6"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm leading-relaxed text-slate-300">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
