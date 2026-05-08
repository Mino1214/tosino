import type { Metadata } from "next";
import { Newspaper, ExternalLink } from "lucide-react";
import { NEWS_ITEMS } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "뉴스",
  description: "AI가 큐레이션한 핵심 크립토·스테이킹 뉴스.",
};

const CATEGORY_COLOR: Record<string, string> = {
  프로토콜: "bg-violet-100 text-violet-700",
  규제: "bg-amber-100 text-amber-700",
  시장: "bg-emerald-100 text-emerald-700",
  리서치: "bg-sky-100 text-sky-700",
};

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-10 max-w-3xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
          AI Curated News
        </span>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          오늘의 스테이킹 뉴스.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          매일 6시간마다 갱신되는 AI 큐레이션 뉴스. 프로토콜·시장·규제·리서치
          카테고리로 분류되어 한눈에 확인할 수 있습니다.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {NEWS_ITEMS.map((item) => (
          <article
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div
              className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${item.imageHue}`}
            >
              <Newspaper className="h-12 w-12 text-white/85" strokeWidth={1.6} />
              <span
                className={`absolute left-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-semibold ${CATEGORY_COLOR[item.category] ?? "bg-black/10 text-foreground"}`}
              >
                {item.category}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="text-base font-bold leading-snug">{item.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                {item.excerpt}
              </p>
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted">
                <span className="font-medium text-foreground/80">
                  {item.source}
                </span>
                <time>{item.publishedAt}</time>
              </div>
            </div>
            <div className="border-t border-black/5 px-5 py-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong group-hover:underline">
                자세히 보기 <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
