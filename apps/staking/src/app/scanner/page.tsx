import type { Metadata } from "next";
import { ScannerClient } from "./scanner-client";

export const metadata: Metadata = {
  title: "스테이킹 토큰",
  description:
    "대시보드에서 보이는 네트워크별 대표 스테이킹 토큰(LST)을 한 화면에서 비교하세요.",
};

export default function ScannerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-8 max-w-3xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
          Supported LST
        </span>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          대표 스테이킹 토큰 목록.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          네트워크별 대표 LST와 예상 수익률을 한 화면에서 비교하세요. 대시보드의
          포트폴리오와 동일한 토큰 카탈로그를 사용합니다.
        </p>
      </header>
      <ScannerClient />
    </div>
  );
}
