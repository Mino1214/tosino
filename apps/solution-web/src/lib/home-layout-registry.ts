/**
 * 홈 화면 **큰 구성** — 추후 솔루션 빌더에서 섹션 순서·노출을 섞을 때 이 키를 기준으로 매핑하면 됨.
 * (실제 데이터/배너 URL은 관리자·API로 주입 예정)
 */

/** 최상위 홈 채널(배너 줄 / 블록 단위) */
export type HomeChannel =
  | "hero_banner"
  | "casino"
  | "sports"
  | "slots"
  | "minigame"
  | "events";

/** 채널 안에서 다시 쪼갤 수 있는 UI 역할(카드·위젯 슬롯) */
export type HomeSlotRole =
  | "main_banner"
  | "sub_banner"
  | "casino_url_banner"
  | "casino_thumb"
  | "vendor_logo"
  | "sports_odds_board"
  | "sports_bet_cart"
  | "slot_vendor_grid"
  | "minigame_video"
  | "minigame_result"
  | "minigame_bet_panel"
  | "minigame_bet_cart"
  | "event_block";

/**
 * 기본 파이프라인 순서(셔플 시 이 배열 순서만 바꾸면 됨).
 * `children`: 해당 채널에서 채울 수 있는 슬롯 역할 힌트.
 */
export const HOME_LAYOUT_PIPELINE: {
  channel: HomeChannel;
  labelKo: string;
  children: HomeSlotRole[];
}[] = [
  {
    channel: "hero_banner",
    labelKo: "메인 배너",
    children: ["main_banner", "sub_banner"],
  },
  {
    channel: "casino",
    labelKo: "카지노",
    children: ["casino_url_banner", "casino_thumb", "vendor_logo"],
  },
  {
    channel: "sports",
    labelKo: "스포츠",
    children: ["sports_odds_board", "sports_bet_cart"],
  },
  {
    channel: "slots",
    labelKo: "슬롯",
    children: ["slot_vendor_grid"],
  },
  {
    channel: "minigame",
    labelKo: "미니게임",
    children: [
      "minigame_video",
      "minigame_result",
      "minigame_bet_panel",
      "minigame_bet_cart",
    ],
  },
  {
    channel: "events",
    labelKo: "이벤트",
    children: ["event_block"],
  },
];
