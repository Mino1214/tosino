import { contactEmail } from "@/lib/site";

export function FinalCta() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[#0a0f1c] to-sky-900/20 px-8 py-14 text-center sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

          <h2
            id="cta-heading"
            className="relative font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Launch Your Platform Today
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-slate-400">
            Share your roadmap and jurisdiction context — we will respond with a structured proposal
            and integration outline.
          </p>
          <div className="relative mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={`mailto:${contactEmail}?subject=Consultation%20request%20-%20Tozino%20Solution`}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-xl transition hover:bg-amber-100"
            >
              Contact Us
            </a>
            <a
              href="#services"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Explore solutions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
