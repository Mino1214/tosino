const services = [
  {
    title: "스포츠북 플랫폼 개발",
    desc: "트레이딩급 아키텍처, 배당 파이프라인, 라이브 스코어 수집, 규제 시장에 맞는 리스크·정산 워크플로.",
  },
  {
    title: "카지노 플랫폼 개발",
    desc: "어그리게이터 연동, 지갑 오케스트레이션, 세션 텔레메트리, 감사 추적 가능한 엔터테인먼트 운영.",
  },
  {
    title: "API 연동",
    desc: "배당·라이브 데이터, KYC/AML, PSP, 제3자 벤더 연동과 관측 가능성(Observability)까지 일괄 설계.",
  },
  {
    title: "총판·제휴 시스템",
    desc: "수수료 엔진, 어트리뷰션, 다단계 계층, 파트너 포털 — 확장성과 투명성을 기본값으로.",
  },
  {
    title: "관리자 대시보드 · CRM",
    desc: "재무·고객지원·마케팅·리스크 등 역할 기반 콘솔 — 유저·총판·자금 흐름을 한 화면에서.",
  },
  {
    title: "보안 · 리스크 관리",
    desc: "디바이스 인텔리전스, 속도·한도 검사, 이상 징후 패턴, 프로덕션용 하드닝 베이스라인.",
  },
  {
    title: "이벤트 · 보너스 엔진",
    desc: "캠페인·자격 규칙 설정, 원장 안전 크레딧, 롤백 가능한 프로모션 라이프사이클.",
  },
  {
    title: "화이트라벨 런치 지원",
    desc: "브랜딩, 환경 프로비저닝, 인수인계 문서, 기술 이해관계자와 함께하는 고라이브 워룸.",
  },
];

export function Services() {
  return (
    <section id="services" className="scroll-mt-24 border-t border-white/[0.06] bg-[#080818]/80 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            서비스
          </h2>
          <p className="mt-4 text-slate-400">
            기획부터 프로덕션까지 모듈형 납품 — API 우선 설계, 명확한 SLA, 팀이 소유할 수 있는
            문서화.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <article
              key={s.title}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-transparent p-6 transition hover:border-violet-500/35 hover:shadow-lg hover:shadow-violet-500/10"
            >
              <span className="font-mono text-[10px] text-slate-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 transition group-hover:text-slate-400">
                {s.desc}
              </p>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/5 blur-2xl transition group-hover:bg-violet-500/10" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
