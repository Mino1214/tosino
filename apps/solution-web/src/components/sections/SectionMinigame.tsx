"use client";

/*
  ─── SectionMinigame (ZXX.BET main-minigame-grid 참조) ──────────
  구조:
    .main-minigame-grid-wrapper
      .text-wrapper (타이틀 + "전체 보기")
      .grid-wrapper
        .card-list-wrapper
          .card-row × 3
            .card-item × N  (배경이미지 + 상태뱃지 + 카테고리 + 제공사명)
  ─────────────────────────────────────────────────────────────────
*/

import Link from "next/link";

/* 미니게임 카드 목록 (ZXX.BET 참조) */
const MINIGAME_ITEMS = [
  { provider: "스카이 바카라",      status: "LIVE" },
  { provider: "스카이 블랙잭",      status: "LIVE" },
  { provider: "스카이 스피드바카라", status: "LIVE" },
  { provider: "스카이 드래곤타이거", status: "LIVE" },
  { provider: "로투스 식보",        status: "LIVE" },
  { provider: "로투스 홀짝",        status: "LIVE" },
  { provider: "로투스 바카라",      status: "LIVE" },
  { provider: "보글보글 1분",           status: "1분"  },
  { provider: "보글보글 2분",           status: "2분"  },
  { provider: "보글보글 3분",           status: "3분"  },
  { provider: "슈퍼마리오 1분",         status: "1분"  },
  { provider: "슈퍼마리오 2분",         status: "2분"  },
  { provider: "슈퍼마리오 3분",         status: "3분"  },
  { provider: "가위바위보 1분",               status: "1분"  },
  { provider: "가위바위보 2분",               status: "2분"  },
];

export function SectionMinigame() {
  return (
    <div className="px-3 py-4 sm:px-4">
      {/* 섹션 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">미니게임</h2>
        <Link href="/lobby/minigame" className="text-xs text-main-gold">
          전체 보기 →
        </Link>
      </div>

      {/* 카드 그리드 (ZXX.BET: .grid-wrapper) */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {MINIGAME_ITEMS.map((item, i) => (
          <button
            key={i}
            type="button"
            className="relative flex aspect-[4/3] flex-col items-start justify-between overflow-hidden rounded border border-white/8 bg-white/3 p-2"
          >
            {/* 상태 뱃지 (.card-status) */}
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                item.status === "LIVE"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {item.status}
            </span>

            {/* 제공사명 (.card-provider) */}
            <span className="text-[11px] font-medium text-zinc-300">{item.provider}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
