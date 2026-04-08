/**
 * Vinus play-game 연동 카드(에이전트별로 재검증 권장).
 * 갱신: `pnpm run vinus:vendor-matrix` (apps/api)
 *
 * surface
 * - casino-window: **앱 내부** 전체화면에 가까운 iframe(팝업 없음 · 허용 불필요)
 * - slot-iframe: 앱 내 모달 · PC는 16:9
 * - new-tab: 새 탭
 * - `paused`: 홈 카드만 표시용 — 입장 비활성(일시중지)
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
  method: "seamless";
  surface: LaunchSurface;
  category: "casino" | "slot";
  embedNote?: string;
  /** true면 카드만 보이고 입장 불가(미개통 등) */
  paused?: boolean;
};

/**
 * 홈 카지노 탭에 노출할 벤더(로비 `game=lobby`).
 * `betgames`·`skywind` 등은 에이전트 계약 문서의 vendor 문자열과 다를 수 있으니 필요 시 수정.
 */
export const VINUS_VERIFIED_HOME_CARDS: VinusHomeCard[] = [
  {
    slug: "evolution",
    category: "casino",
    title: "에볼루션",
    subtitle: "일시중지",
    icon: "🎰",
    gradient: "from-emerald-900/45 to-zinc-950",
    vendor: "evolution",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
    paused: true,
  },
  {
    slug: "agin",
    category: "casino",
    title: "아시아게이밍",
    subtitle: "",
    icon: "🀄",
    gradient: "from-red-900/35 to-zinc-950",
    vendor: "AGIN",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
  },
  {
    slug: "microgaming-casino",
    category: "casino",
    title: "마이크로게이밍",
    subtitle: "",
    icon: "🎲",
    gradient: "from-violet-900/40 to-zinc-950",
    vendor: "MICRO_Casino",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
  },
  {
    slug: "pragmatic-casino",
    category: "casino",
    title: "프라그마틱 플레이",
    subtitle: "",
    icon: "🃏",
    gradient: "from-amber-900/40 to-zinc-950",
    vendor: "pragmatic_casino",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
  },
  {
    slug: "dream",
    category: "casino",
    title: "드리밍게임",
    subtitle: "일시중지",
    icon: "💎",
    gradient: "from-sky-900/35 to-zinc-950",
    vendor: "dream",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
    paused: true,
  },
  {
    slug: "wm",
    category: "casino",
    title: "WM게이밍",
    subtitle: "",
    icon: "♠️",
    gradient: "from-zinc-700/50 to-zinc-950",
    vendor: "wm",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
  },
  {
    slug: "betgame-tv",
    category: "casino",
    title: "벳게임TV",
    subtitle: "",
    icon: "📺",
    gradient: "from-rose-900/35 to-zinc-950",
    vendor: "betgames",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
    embedNote: "Vinus vendor가 betgames가 아니면 계약서 vendor명으로 교체",
  },
  {
    slug: "skywind",
    category: "casino",
    title: "스카이윈드",
    subtitle: "",
    icon: "🌪️",
    gradient: "from-cyan-900/40 to-zinc-950",
    vendor: "skywind",
    game: "lobby",
    method: "seamless",
    surface: "casino-window",
  },
];

/** 게임 ID를 알게 되면 카드 한 줄을 이 형태로 추가하면 됨 (game에 심볼/ID). */
export type SlotLaunchOverride = Pick<
  VinusHomeCard,
  "title" | "vendor" | "game" | "method" | "surface" | "category"
>;
