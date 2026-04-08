/**
 * Vinus play-game 매트릭스 결과(에이전트·키 기준).
 * 갱신: apps/api 에서 `pnpm run vinus:vendor-matrix` 후 성공 목록 확인.
 *
 * surface
 * - casino-window: 별도 팝업 창 안에 iframe (카지노 로비·라이브류)
 * - slot-iframe: 메인 앱 위 16:9 모달 iframe (슬·로비형 슬롯)
 *
 * embedNote: X-Frame-Options / 쿠키 도메인 이슈 가능성 — 현장에서 확인.
 */
export type LaunchSurface = "casino-window" | "slot-iframe";

export type VinusHomeCard = {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  vendor: string;
  game: string;
  method: "transfer";
  surface: LaunchSurface;
  embedNote?: string;
};

/** 2026-04-07 에이전트 측정: result===0 + 유효 https URL (cq9 슬롯 lobby 제외 등) */
export const VINUS_VERIFIED_HOME_CARDS: VinusHomeCard[] = [
  {
    slug: "cq9-casino",
    title: "CQ9 카지노",
    subtitle: "로비 · 트랜스퍼",
    icon: "🎴",
    gradient: "from-teal-900/45 to-zinc-950",
    vendor: "cq9_casino",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
  {
    slug: "tomhorn-vivo",
    title: "비보 카지노",
    subtitle: "탐혼 VIVO",
    icon: "🃏",
    gradient: "from-slate-800/50 to-zinc-950",
    vendor: "TOMHORN_VIVO",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
  {
    slug: "tomhorn-7mojos",
    title: "탐혼 7모조",
    subtitle: "라이브 카지노",
    icon: "7️⃣",
    gradient: "from-amber-900/35 to-zinc-950",
    vendor: "TOMHORN_7Mojos",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
  {
    slug: "tomhorn-absolutelive",
    title: "탐혼 앱솔루트라이브",
    subtitle: "라이브",
    icon: "📡",
    gradient: "from-cyan-900/35 to-zinc-950",
    vendor: "TOMHORN_AbsoluteLive",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
  {
    slug: "micro-casino",
    title: "마이크로 카지노",
    subtitle: "로비",
    icon: "🎰",
    gradient: "from-rose-900/40 to-zinc-950",
    vendor: "MICRO_Casino",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
  {
    slug: "pragmatic-slot",
    title: "프라그마틱 슬롯",
    subtitle: "로비",
    icon: "🎡",
    gradient: "from-violet-900/40 to-zinc-950",
    vendor: "pragmatic_slot",
    game: "lobby",
    method: "transfer",
    surface: "slot-iframe",
    embedNote: "일부 환경은 새 탭만 허용할 수 있음",
  },
  {
    slug: "tomhorn-slot",
    title: "탐혼 슬롯",
    subtitle: "로비",
    icon: "🎰",
    gradient: "from-indigo-900/40 to-zinc-950",
    vendor: "TOMHORN_SLOT",
    game: "lobby",
    method: "transfer",
    surface: "slot-iframe",
  },
  {
    slug: "habanero-slot",
    title: "하바네로 슬롯",
    subtitle: "로비",
    icon: "🌶️",
    gradient: "from-orange-900/40 to-zinc-950",
    vendor: "habanero",
    game: "lobby",
    method: "transfer",
    surface: "slot-iframe",
  },
  {
    slug: "micro-slot",
    title: "마이크로 슬롯",
    subtitle: "로비",
    icon: "⭐",
    gradient: "from-fuchsia-900/35 to-zinc-950",
    vendor: "MICRO_Slot",
    game: "lobby",
    method: "transfer",
    surface: "slot-iframe",
  },
];
