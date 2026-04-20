const reasons = [
  "검증된 레퍼런스 아키텍처로 빠른 런칭",
  "멀티 리전을 고려한 확장 가능한 인프라 패턴",
  "실시간 데이터·스트리밍 파이프라인 연동",
  "다국어 UI 및 현지화 워크플로",
  "엔터프라이즈 수준 보안·접근 통제",
  "전담 기술 지원 채널",
  "로드맵에 맞춘 커스텀 기능 개발",
];

export function WhyUs() {
  return (
    <section id="why-us" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              사업자가 선택하는 이유
            </h2>
            <p className="mt-4 text-slate-400">
              신뢰성·측정 가능한 SLA·장기 유지보수에 집중하는 시니어 엔지니어링 파트너 — 일회성
              템플릿이 아닙니다.
            </p>
            <div className="mt-10 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-600/15 p-8">
              <p className="text-lg font-medium leading-relaxed text-white/90">
                “귀사의 플랫폼은 금융 인프라와 같습니다. 그렇게 다룹니다.”
              </p>
              <p className="mt-4 text-sm text-slate-500">— 토지노 솔루션 엔지니어링 리드</p>
            </div>
          </div>
          <ul className="space-y-4">
            {reasons.map((r) => (
              <li
                key={r}
                className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400">
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
