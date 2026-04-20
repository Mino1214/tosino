"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SITE_NAME } from "@/lib/site";

const nav = [
  { href: "#services", label: "솔루션" },
  { href: "#platform", label: "플랫폼" },
  { href: "#why-us", label: "선택 이유" },
  { href: "#industries", label: "산업" },
  { href: "#process", label: "프로세스" },
  { href: "#testimonials", label: "고객사" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo.png"
            alt={`${SITE_NAME} 로고`}
            width={120}
            height={40}
            className="h-9 w-auto object-contain object-left"
            priority
          />
          <span className="hidden min-[380px]:flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold tracking-tight text-white">
              {SITE_NAME}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">
              B2B Software
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="주 메뉴">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            className="brand-cta rounded-full px-4 py-2 text-sm font-semibold transition"
          >
            상담
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 p-2 text-slate-300 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">메뉴</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-white/[0.06] bg-[#050505]/98 px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-3">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              className="brand-cta mt-1 rounded-full py-3 text-center text-sm font-semibold"
              onClick={() => setOpen(false)}
            >
              상담 요청
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
