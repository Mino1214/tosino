"use client";

import type { ReactNode } from "react";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  title?: string;
  /** 좌측에 라벨을 두고 우측에 스위치를 배치할지 여부 (기본 true) */
  reverse?: boolean;
};

/**
 * 일반 사용자가 직관적으로 ON/OFF를 이해할 수 있도록 만든 iOS 스타일 스위치.
 * solution-agent 의 "운영 실시간 모드" 토글과 동일한 시각 규격.
 */
export function SwitchToggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  title,
  reverse = true,
}: Props) {
  const btn = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  if (!label && !description) return btn;

  return (
    <label
      className={`flex cursor-pointer select-none items-start gap-3 rounded-lg px-1 py-1 ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      {!reverse ? btn : null}
      <span className="flex min-w-0 flex-col">
        {label ? (
          <span className="text-sm font-medium text-gray-800">{label}</span>
        ) : null}
        {description ? (
          <span className="mt-0.5 text-xs text-gray-500">{description}</span>
        ) : null}
      </span>
      {reverse ? <span className="ml-auto shrink-0">{btn}</span> : null}
    </label>
  );
}
