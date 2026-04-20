import Image from "next/image";
import Link from "next/link";
import { SITE_NAME, contactEmail, telegramUrl, whatsappUrl } from "@/lib/site";

const footerCols = [
  {
    title: "회사",
    links: [
      { href: "#why-us", label: "선택 이유" },
      { href: "#process", label: "프로세스" },
      { href: "#testimonials", label: "고객사" },
    ],
  },
  {
    title: "솔루션",
    links: [
      { href: "#services", label: "서비스 전체" },
      { href: "#platform", label: "플랫폼" },
      { href: "#industries", label: "산업" },
    ],
  },
  {
    title: "지원",
    links: [
      { href: "#contact", label: "문의" },
      { href: `mailto:${contactEmail}`, label: "이메일" },
      { href: telegramUrl, label: "Telegram", external: true },
      { href: whatsappUrl, label: "WhatsApp", external: true },
    ],
  },
];

type FooterLink = { href: string; label: string; external?: boolean };

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#020205] py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/logo.png"
                alt={`${SITE_NAME} 로고`}
                width={100}
                height={36}
                className="h-8 w-auto object-contain object-left"
              />
              <span className="font-display text-lg font-semibold text-white">{SITE_NAME}</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              허가된 엔터테인먼트·플랫폼 사업을 위한 B2B 소프트웨어, 인프라, 연동 구현.
              <span className="mt-1 block text-slate-600">
                저희는 소비자 대상 베팅·게임 사이트를 직접 운영하지 않습니다.
              </span>
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2">
                {(col.links as FooterLink[]).map((l) => (
                  <li key={l.label}>
                    {l.external ? (
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
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="font-mono text-[11px] text-slate-700">tozinosolution.com</p>
        </div>
      </div>
    </footer>
  );
}
