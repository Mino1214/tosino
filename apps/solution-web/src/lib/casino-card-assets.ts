/**
 * `public/casinoGirl` · `public/logo` 파일과 카지노 카드(slug) 매핑.
 * 파일명 바꿀 때 여기만 수정하면 됨.
 */
export type CasinoCardAsset = {
  /** public 기준 경로, 예: /casinoGirl/1.png */
  thumb: string;
  logo: string;
};

/** 썸네일은 `casinoGirl`의 11~88.png만 사용 (1~4 단일 자리 제외) */
export const CASINO_CARD_ASSETS: Record<string, CasinoCardAsset> = {
  evolution: {
    thumb: "/casinoGirl/11.png",
    logo: "/logo/logo_Evolution.png",
  },
  agin: {
    thumb: "/casinoGirl/22.png",
    logo: "/logo/logo_Asia.png",
  },
  "microgaming-casino": {
    thumb: "/casinoGirl/33.png",
    logo: "/logo/logo_MicroGaming.png",
  },
  "pragmatic-casino": {
    thumb: "/casinoGirl/44.png",
    logo: "/logo/logo_Pragmatic.png",
  },
  dream: {
    thumb: "/casinoGirl/55.png",
    logo: "/logo/logo_Dreamgame.png",
  },
  wm: {
    thumb: "/casinoGirl/66.png",
    logo: "/logo/logo_Wm.png",
  },
  "betgame-tv": {
    thumb: "/casinoGirl/77.png",
    logo: "/logo/logo_Betgames.png",
  },
  skywind: {
    thumb: "/casinoGirl/88.png",
    logo: "/logo/logo_Skywind.png",
  },
};

export function getCasinoCardAsset(slug: string): CasinoCardAsset | undefined {
  return CASINO_CARD_ASSETS[slug];
}
