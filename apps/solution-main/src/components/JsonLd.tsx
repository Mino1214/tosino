import { SITE_NAME, SITE_URL, contactEmail } from "@/lib/site";

export function JsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/logo.png`,
    description:
      "스포츠 엔터테인먼트·카지노·총판·제휴·결제·CRM·운영 도구를 위한 B2B 소프트웨어 개발 및 인프라. 소비자 대상 게임 사이트는 직접 운영하지 않습니다.",
    sameAs: [] as string[],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: contactEmail,
        availableLanguage: ["Korean", "English"],
      },
    ],
    knowsAbout: [
      "토지노개발",
      "카지노개발",
      "토토사이트개발",
      "스포츠북 개발",
      "아너키",
      "아너링크",
      "B2B 엔터테인먼트 플랫폼",
      "화이트라벨 솔루션",
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "ko-KR",
    description:
      "엔터프라이즈 B2B 플랫폼 엔지니어링 — 스포츠북, 카지노, 제휴, 결제, 자동화.",
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  const professionalService = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    url: SITE_URL,
    areaServed: "Worldwide",
    availableLanguage: ["Korean", "English"],
    serviceType: [
      "토지노개발",
      "카지노개발",
      "토토사이트개발",
      "스포츠 엔터테인먼트 플랫폼 개발",
      "카지노 플랫폼 소프트웨어",
      "아너키·아너링크 연동",
      "총판·제휴 시스템",
      "결제 연동",
      "관리자 대시보드 및 CRM",
      "인프라 및 DevOps",
    ],
  };

  const payload = [org, website, professionalService];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
