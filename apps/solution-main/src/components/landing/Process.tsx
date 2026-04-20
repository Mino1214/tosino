const steps = [
  { n: "01", title: "상담", desc: "범위, 시장, 컴플라이언스 제약, 성공 지표를 정의합니다." },
  { n: "02", title: "기획", desc: "아키텍처, 마일스톤, 연동, 리스크 레지스터를 확정합니다." },
  { n: "03", title: "개발", desc: "스테이징 환경과 QA 게이트를 두고 반복 납품합니다." },
  { n: "04", title: "런칭", desc: "전환 플레이북, 관측성, 워룸 지원으로 컷오버합니다." },
  { n: "05", title: "유지보수 · 성장", desc: "SLA, 로드맵 엔지니어링, 용량 계획을 지속합니다." },
];

export function Process() {
  return (
    <section id="process" className="scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          진행 방식
        </h2>
        <p className="mt-4 max-w-xl text-slate-400">
          감사 가능한 문서와 함께 투명한 단계 — 조달·기술 이해관계자 모두가 따라갈 수 있게
          설계합니다.
        </p>

        <ol className="relative mt-16 space-y-10 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-2rem)] before:w-px before:bg-gradient-to-b before:from-cyan-500/50 before:via-violet-500/40 before:to-transparent sm:before:left-[19px]">
          {steps.map((s) => (
            <li key={s.n} className="relative flex gap-6 sm:gap-10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/35 bg-[#0a0a12] font-mono text-xs font-semibold text-cyan-300">
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
