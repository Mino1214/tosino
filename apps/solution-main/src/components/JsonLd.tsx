import { SITE_NAME, SITE_URL, contactEmail } from "@/lib/site";

export function JsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "B2B software development and infrastructure for sports entertainment platforms, casino systems, affiliate programs, payments, CRM, and operations tooling. We do not operate consumer gaming sites.",
    sameAs: [] as string[],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: contactEmail,
        availableLanguage: ["English", "Korean"],
      },
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Enterprise B2B platform engineering for gaming and entertainment operators — sportsbook, casino, affiliate, payments, and automation.",
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  const professionalService = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    url: SITE_URL,
    areaServed: "Worldwide",
    serviceType: [
      "Sports entertainment platform development",
      "Casino platform software",
      "Affiliate and referral systems",
      "Payment integration",
      "Admin dashboards and CRM",
      "Infrastructure and DevOps",
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
