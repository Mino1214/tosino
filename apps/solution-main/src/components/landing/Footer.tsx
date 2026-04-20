import Link from "next/link";
import { SITE_NAME, contactEmail, telegramUrl, whatsappUrl } from "@/lib/site";

const footerCols = [
  {
    title: "Company",
    links: [
      { href: "#why-us", label: "Why us" },
      { href: "#process", label: "Process" },
      { href: "#testimonials", label: "Clients" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "#services", label: "All services" },
      { href: "#platform", label: "Platform" },
      { href: "#industries", label: "Industries" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: `#contact`, label: "Contact" },
      { href: `mailto:${contactEmail}`, label: "Email" },
      { href: telegramUrl, label: "Telegram", external: true },
      { href: whatsappUrl, label: "WhatsApp", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#020617] py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="font-display text-lg font-semibold text-white">
              {SITE_NAME}
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              B2B software, infrastructure, and integrations for licensed entertainment and platform
              businesses.{" "}
              <span className="text-slate-600">
                We do not operate consumer gaming or wagering sites.
              </span>
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"external" in l && l.external ? (
                      <a
                        href={l.href}
                        className="text-sm text-slate-400 transition hover:text-white"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <a
                        href={l.href}
                        className="text-sm text-slate-400 transition hover:text-white"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-white/[0.06] pt-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p className="font-mono text-[11px] text-slate-700">tozinosolution.com</p>
        </div>
      </div>
    </footer>
  );
}
