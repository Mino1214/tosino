import { contactEmail } from "@/lib/site";

export function FinalCta() {
  const subject = encodeURIComponent("상담 요청 - 토지노 솔루션");
  return (
    <section
      id="contact"
      className="scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-[#0a0a12] to-violet-900/25 px-8 py-14 text-center sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

          <h2
            id="cta-heading"
            className="relative font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            지금 플랫폼을 런칭하세요
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-slate-400">
            로드맵과 규제 권역 맥락을 알려주시면, 구조화된 제안서와 연동 개요로 답변드립니다.
          </p>
          <div className="relative mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={`mailto:${contactEmail}?subject=${subject}`}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-xl transition hover:bg-cyan-50"
            >
              문의하기
            </a>
            <a
              href="#services"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-violet-500/15"
            >
              솔루션 더보기
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
