import Link from "next/link";
import { Hexagon } from "lucide-react";

const COLUMNS: Array<{
  title: string;
  links: Array<{ href: string; label: string }>;
}> = [
  {
    title: "Products",
    links: [
      { href: "/scanner", label: "스테이킹 스캐너" },
      { href: "/a/me/my-assets", label: "내 자산 리포트" },
      { href: "/calendar", label: "에어드롭 캘린더" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/news", label: "뉴스" },
      { href: "/guide", label: "가이드" },
      { href: "/about", label: "회사 소개" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "mailto:contact@stakingdemo.app", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,_1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Hexagon
                className="h-7 w-7 text-accent-strong"
                strokeWidth={2.2}
              />
              <span className="text-xl font-extrabold tracking-tight">
                StakingDemo
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              인증된 거래소·DeFi·지갑의 스테이킹 이자율을 기관 수준으로
              검증·분석하는 비수탁 데이터 플랫폼.
            </p>
            <p className="mt-4 text-xs text-muted">
              StakingDemo DMCC · Dubai, UAE
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-foreground/80 hover:text-accent-strong"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-black/5 pt-6 text-xs text-muted sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} StakingDemo DMCC. All rights reserved.</p>
          <p className="max-w-md leading-relaxed">
            APR/APY 수치는 추정치이며 보장되지 않습니다. 본 사이트는 투자 자문을
            제공하지 않으며 모든 스테이킹은 사용자 책임 하에 진행됩니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
