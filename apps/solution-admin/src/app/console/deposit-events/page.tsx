"use client";

/**
 * 특수이벤트 설정 — 추후 "토너먼트"로 개편 예정.
 * 마스터가 주최하고 모든 솔루션 사용자가 참여하는 이벤트로 전환될 예정이라
 * 우선 기존 입금이벤트 설정 UI는 비워두고 안내 화면을 노출한다.
 */
export default function ConsoleSpecialEventPlaceholderPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-14 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#3182f6]/30 bg-[#3182f6]/10 text-xl text-[#3182f6]">
          ✦
        </div>
        <h1 className="text-xl font-semibold text-black">특수이벤트 설정</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          본 메뉴는 곧
          <span className="mx-1 rounded-full bg-[#3182f6]/10 px-2 py-0.5 font-medium text-[#3182f6]">
            토너먼트
          </span>
          로 개편될 예정입니다.
          <br />
          마스터가 주최하고 모든 솔루션 사용자가 함께 참여하는 이벤트로 전환됩니다.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          개편이 완료되기 전까지 이 화면에는 별도 설정이 노출되지 않습니다.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-500">
          준비 중
        </div>
      </div>
    </div>
  );
}
