"use client";

/** 운영 빌드에 실수로 PREVIEW_PORT가 들어가도 노출되지 않도록 개발 전용 */
export function PreviewRibbon() {
  if (process.env.NODE_ENV !== "development") return null;
  const port = process.env.NEXT_PUBLIC_PREVIEW_PORT;
  if (!port) return null;
  return (
    <div className="sticky top-0 z-[70] border-b border-amber-900/40 bg-amber-500/95 py-1.5 text-center text-[11px] font-medium text-zinc-950 shadow-sm">
      미리보기 · 이 창 포트 {port}로 API에서 플랫폼을 찾습니다. 운영 도메인과
      별도로 동작합니다.
    </div>
  );
}
