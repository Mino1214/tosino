import type { Metadata } from "next";
import { BotsClient } from "./bots-client";

export const metadata: Metadata = {
  title: "트레이딩 봇",
  description:
    "Spot/Futures 그리드, DCA, 리밸런싱, 자동투자까지 — 인기 봇 전략을 한 번에 비교하고 즉시 복사해 시작하세요.",
};

export default function BotsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-8 max-w-3xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
          Trading Bots
        </span>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          전략을 골라 1분만에 시작.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          현물·선물 그리드부터 DCA·리밸런싱까지. 다른 사용자들의 실시간 수익률과
          파라미터를 그대로 복사해 운용해보세요.
        </p>
      </header>
      <BotsClient />
    </div>
  );
}
