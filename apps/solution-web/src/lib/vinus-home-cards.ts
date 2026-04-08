/**
 * Vinus play-game 연동 카드(에이전트별로 재검증 권장).
 * 갱신: `pnpm run vinus:vendor-matrix` (apps/api)
 *
 * surface
 * - casino-window: 팝업 창 + 내부 iframe (CQ9)
 * - slot-iframe: 메인 앱 16:9 모달 (하바네로·마이크로 슬롯)
 * - new-tab: 브라우저 새 탭 직접 열기 (프라그마틱 슬롯, 비보, 앱솔루트라이브)
 * - 모바일: 카지노·슬롯 모두 새 탭으로 게임 URL 직행(클릭 시 동기 프리탭으로 차단 완화).
 * - PC: 카지노는 `casino-window` = 새 창+iframe, 슬롯은 surface대로.
 *
 * ---
 * 개별 슬롯(게임 ID) 목록을 "가져오기":
 * - 이 레포의 Vinus **info** 연동(`info.vinus-gaming.com`)에는 게임 카탈로그 API가 없고,
 *   잔액/거래내역 위주입니다 (`VinusInfoService`).
 * - 실무에서는 (1) Vinus/대행사 매뉴얼의 게임 ID 표 (2) 벤더 백오피스 Export
 *   (3) 로비(`game=lobby`)에서 선택 후 URL/심볼 확인 (4) 별도 게임 리스트 API를
 *   계약에 포함해 달라고 요청 — 중 하나로 진행합니다.
 * - 확인된 ID는 `SlotLaunchOverride` 형태로 카드/목록에 추가해 `/me/casino/vinus/launch`의 `game`으로 넣으면 됩니다.
 * - 매트릭스 성공 벤더의 **개별 게임 ID·제목·아이콘** 전체 목록: `vinus-verified-game-catalog.ts` (`VINUS_VERIFIED_GAMES_BY_VENDOR`).
 */
export type LaunchSurface = "casino-window" | "slot-iframe" | "new-tab";

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
  category: "casino" | "slot";
  embedNote?: string;
};

/**
 * 홈에서 노출하는 카드(요청 반영).
 */
export const VINUS_VERIFIED_HOME_CARDS: VinusHomeCard[] = [
  {
    slug: "cq9-casino",
    category: "casino",
    title: "CQ9 카지노",
    subtitle: "팝업 · 로비",
    icon: "🎴",
    gradient: "from-teal-900/45 to-zinc-950",
    vendor: "cq9_casino",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
  {
    slug: "tomhorn-vivo",
    category: "casino",
    title: "비보 카지노",
    subtitle: "팝업 · 로비",
    icon: "🃏",
    gradient: "from-slate-800/50 to-zinc-950",
    vendor: "TOMHORN_VIVO",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
  {
    slug: "tomhorn-absolutelive",
    category: "casino",
    title: "탐혼 앱솔루트라이브",
    subtitle: "팝업 · 로비",
    icon: "📡",
    gradient: "from-cyan-900/35 to-zinc-950",
    vendor: "TOMHORN_AbsoluteLive",
    game: "lobby",
    method: "transfer",
    surface: "casino-window",
  },
];

/** 게임 ID를 알게 되면 카드 한 줄을 이 형태로 추가하면 됨 (game에 심볼/ID). */
export type SlotLaunchOverride = Pick<
  VinusHomeCard,
  "title" | "vendor" | "game" | "method" | "surface" | "category"
>;
