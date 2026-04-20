const items = [
  {
    title: "스포츠 엔터테인먼트 스타트업",
    desc: "MVP부터 시장 투입까지, 벤더에 종속되지 않는 연동 패턴으로 스택을 구성합니다.",
  },
  {
    title: "카지노 · 어그리게이터 운영사",
    desc: "지갑 코어, 세션 무결성, 복잡한 카탈로그에 맞는 대사·정산 도구.",
  },
  {
    title: "화이트라벨 사업",
    desc: "멀티 테넌트 경계, 브랜딩 파이프라인, 테넌트별 설정 거버넌스.",
  },
  {
    title: "총판 · 파트너 네트워크",
    desc: "추적, 지급, 사기 신호, 파트너용 리포팅 API.",
  },
  {
    title: "게이밍 · 엔터테인먼트 투자자",
    desc: "기술 실사, 아키텍처 리뷰, 인수 후 통합 지원.",
  },
];

export function Industries() {
  return (
    <section id="industries" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          함께하는 산업
        </h2>
        <p className="mt-4 max-w-2xl text-slate-400">
          초기 팀부터 신규 버티컬 확장 중인 그룹까지 — 규제·상업적 맥락에 맞춰 엔지니어링 역량을
          맞춥니다.
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
