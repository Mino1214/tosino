import type { Metadata } from "next";
import { ScannerClient } from "./scanner-client";

export const metadata: Metadata = {
  title: "스테이킹 스캐너",
  description:
    "30개 이상 코인의 거래소·DeFi·지갑 스테이킹 APY를 한눈에 비교하세요.",
};

export default function ScannerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-8 max-w-3xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
          Staking Scanner
        </span>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          모든 스테이킹을 한 화면에.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          거래소·DeFi·지갑별 APY를 정규화해 비교합니다. 카테고리, 코인, 정렬
          기준을 자유롭게 조합해 최적의 풀을 찾아보세요.
        </p>
      </header>
      <ScannerClient />
    </div>
  );
}
