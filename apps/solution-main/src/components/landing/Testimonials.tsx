const quotes = [
  {
    quote:
      "공격적인 일정에도 관리자·자금 스택을 프로덕션급으로 납품했고, 관측성을 타협하지 않았습니다.",
    role: "CTO",
    org: "유럽 스포츠 엔터테인먼트 그룹",
  },
  {
    quote:
      "문서화가 명확하고 API가 실용적이며 변경 관리가 체계적이었습니다. 멀티 브랜드 롤아웃에 딱 맞았습니다.",
    role: "프로덕트 리드",
    org: "아시아 태평양 플랫폼 운영사",
  },
  {
    quote:
      "아키텍처 리뷰로 시작해 장기 플랫폼 엔지니어링으로 이어졌습니다. 경영·엔지니어링 커뮤니케이션이 모두 훌륭했습니다.",
    role: "엔지니어링 VP",
    org: "화이트라벨 솔루션사",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 bg-[#080818]/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          글로벌 팀의 신뢰
        </h2>
        <p className="mt-4 text-slate-400">
          B2B 레퍼런스는 NDA 하에 제공됩니다. 최근 장기 프로젝트에서의 요약 피드백입니다.
        </p>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {quotes.map((q) => (
            <blockquote
              key={q.role}
              className="flex flex-col rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-8"
            >
              <p className="flex-1 text-sm leading-relaxed text-slate-300">&ldquo;{q.quote}&rdquo;</p>
              <footer className="mt-8 border-t border-white/[0.06] pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/95">
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
