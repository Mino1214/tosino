const quotes = [
  {
    quote:
      "Their team shipped a production-grade admin and treasury stack on an aggressive timeline — without cutting corners on observability.",
    role: "Chief Technology Officer",
    org: "European sports entertainment group",
  },
  {
    quote:
      "Clear documentation, pragmatic APIs, and disciplined change management. Exactly what we needed for a multi-brand rollout.",
    role: "Head of Product",
    org: "APAC platform operator",
  },
  {
    quote:
      "We engaged them for architecture review and stayed for ongoing platform engineering. Strong communication at executive and engineering levels.",
    role: "VP Engineering",
    org: "White label solutions company",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 bg-[#050a14]/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Trusted by global teams
        </h2>
        <p className="mt-4 text-slate-400">
          B2B references available under NDA. Summarized feedback from recent long-term engagements.
        </p>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {quotes.map((q) => (
            <blockquote
              key={q.role}
              className="flex flex-col rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-8"
            >
              <p className="flex-1 text-sm leading-relaxed text-slate-300">&ldquo;{q.quote}&rdquo;</p>
              <footer className="mt-8 border-t border-white/[0.06] pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/90">
                  {q.role}
                </p>
                <p className="mt-1 text-xs text-slate-600">{q.org}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
