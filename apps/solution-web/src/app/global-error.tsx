"use client";

/**
 * 루트 레이아웃 밖에서도 동작해야 하므로 next/document 의 Html 을 쓰지 않고
 * 일반 html/body 만 사용 (App Router 권장 패턴).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-medium">일시적인 오류가 났습니다</p>
          {process.env.NODE_ENV === "development" && (
            <pre className="max-w-full text-left text-xs text-zinc-500">
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
