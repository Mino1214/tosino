"use client";

export function PreviewRibbon() {
  const port = process.env.NEXT_PUBLIC_PREVIEW_PORT;
  if (!port) return null;
  return (
    <div className="sticky top-0 z-[70] border-b border-amber-900/40 bg-amber-500/95 py-1.5 text-center text-[11px] font-medium text-zinc-950 shadow-sm">
      미리보기 · 이 창 포트 {port}로 API에서 플랫폼을 찾습니다. 운영 도메인과
      별도로 동작합니다.
    </div>
  );
}
