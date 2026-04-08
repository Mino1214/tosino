/**
 * `public/casinoGirl` · `public/logo` — 카지노 카드(slug) 매핑.
 * 썸네일(11~88)은 아래 배열을 **섞은 순서**로 slug에 할당 (고정 셔플).
 */
export type CasinoCardAsset = {
  thumb: string;
  logo: string;
};

export const CASINO_CARD_BG = "/casinoGirl/bg.png";

/** 11~88 썸네일을 slug 순서에 맞춰 한 번 섞어 배정 */
const SLUG_ORDER = [
  "evolution",
  "agin",
  "microgaming-casino",
  "pragmatic-casino",
  "dream",
  "wm",
  "betgame-tv",
  "skywind",
] as const;

const THUMBS_SHUFFLED: string[] = [
  "/casinoGirl/77.png",
  "/casinoGirl/33.png",
  "/casinoGirl/88.png",
  "/casinoGirl/11.png",
  "/casinoGirl/55.png",
  "/casinoGirl/44.png",
  "/casinoGirl/66.png",
  "/casinoGirl/22.png",
];

const LOGO_BY_SLUG: Record<string, string> = {
  evolution: "/logo/logo_Evolution.png",
  agin: "/logo/logo_Asia.png",
  "microgaming-casino": "/logo/logo_MicroGaming.png",
  "pragmatic-casino": "/logo/logo_Pragmatic.png",
  dream: "/logo/logo_Dreamgame.png",
  wm: "/logo/logo_Wm.png",
  "betgame-tv": "/logo/logo_Betgames.png",
  skywind: "/logo/logo_Skywind.png",
};

function buildAssets(): Record<string, CasinoCardAsset> {
  const out: Record<string, CasinoCardAsset> = {};
  SLUG_ORDER.forEach((slug, i) => {
    out[slug] = {
      thumb: THUMBS_SHUFFLED[i] ?? THUMBS_SHUFFLED[0]!,
      logo: LOGO_BY_SLUG[slug] ?? "",
    };
  });
  return out;
}

export const CASINO_CARD_ASSETS: Record<string, CasinoCardAsset> = buildAssets();

export function getCasinoCardAsset(slug: string): CasinoCardAsset | undefined {
  return CASINO_CARD_ASSETS[slug];
}
