import type {
  CasinoLobbyCatalog,
  CasinoLobbySampleGame,
  CasinoLobbyVendor,
  CasinoLobbyVendorCategory,
} from "@tosino/shared";
import type { LaunchSurface } from "@/lib/vinus-home-cards";
import {
  VINUS_VERIFIED_GAMES_BY_VENDOR,
  type VinusVerifiedCatalogEntry,
} from "@/lib/vinus-verified-game-catalog";

export type VendorGridItem = {
  key: string;
  game: string;
  title: string;
  group: string;
  icon?: string;
};

export const CASINO_LOBBY_CATEGORY_LABELS: Record<
  CasinoLobbyVendorCategory,
  string
> = {
  casino: "카지노",
  slot: "슬롯",
  arcade: "아케이드",
  other: "외",
  holdem: "홀덤",
};

const FALLBACK_SAMPLE_GAMES: Record<
  CasinoLobbyVendorCategory,
  CasinoLobbySampleGame[]
> = {
  casino: [
    { game: "lobby", title: "메인 바카라", group: "바카라" },
    { game: "lobby", title: "스피드 바카라", group: "바카라" },
    { game: "lobby", title: "라이브 룰렛", group: "룰렛" },
    { game: "lobby", title: "프리미엄 블랙잭", group: "블랙잭" },
    { game: "lobby", title: "드래곤 타이거", group: "드래곤타이거" },
    { game: "lobby", title: "라이브 식보", group: "식보" },
    { game: "lobby", title: "메가 휠", group: "게임쇼" },
    { game: "lobby", title: "메인 로비", group: "기타" },
  ],
  slot: [
    { game: "lobby", title: "메인 로비", group: "메인" },
    { game: "lobby", title: "대표 슬롯", group: "추천" },
    { game: "lobby", title: "인기 슬롯", group: "인기" },
    { game: "lobby", title: "메가웨이즈", group: "추천" },
    { game: "lobby", title: "홀드앤윈", group: "추천" },
    { game: "lobby", title: "클래식 슬롯", group: "클래식" },
    { game: "lobby", title: "신작 슬롯", group: "신작" },
    { game: "lobby", title: "보너스 게임", group: "보너스" },
  ],
  arcade: [
    { game: "lobby", title: "메인 로비", group: "메인" },
    { game: "lobby", title: "대표 아케이드", group: "추천" },
    { game: "lobby", title: "인기 아케이드", group: "인기" },
    { game: "lobby", title: "피싱 아케이드", group: "피싱" },
    { game: "lobby", title: "캐주얼 아케이드", group: "캐주얼" },
    { game: "lobby", title: "신작 아케이드", group: "신작" },
  ],
  other: [
    { game: "lobby", title: "메인 로비", group: "메인" },
    { game: "lobby", title: "대표 게임", group: "추천" },
    { game: "lobby", title: "라이브 입장", group: "라이브" },
    { game: "lobby", title: "특수 게임", group: "특수" },
  ],
  holdem: [
    { game: "lobby", title: "메인 로비", group: "메인" },
    { game: "lobby", title: "홀덤 테이블", group: "테이블" },
    { game: "lobby", title: "토너먼트", group: "토너먼트" },
    { game: "lobby", title: "VIP 룸", group: "VIP" },
  ],
};

export function getCatalogVendors(
  catalog: CasinoLobbyCatalog,
  category: CasinoLobbyVendorCategory,
): CasinoLobbyVendor[] {
  switch (category) {
    case "casino":
      return catalog.casino;
    case "slot":
      return catalog.slot;
    case "arcade":
      return catalog.arcade;
    case "other":
      return catalog.other;
    case "holdem":
      return catalog.holdem;
  }
}

export function getVendorRoute(vendor: CasinoLobbyVendor) {
  if (vendor.route) return vendor.route;

  const base =
    vendor.category === "casino"
      ? "/lobby/live-casino"
      : vendor.category === "slot"
        ? "/lobby/slots"
        : "/lobby/minigame";

  return `${base}?vendor=${encodeURIComponent(vendor.id)}`;
}

export function getVendorHeadline(vendor: CasinoLobbyVendor) {
  if (vendor.headline.trim()) return vendor.headline;
  return `${vendor.name} 메인 로비와 대표 라인업을 바로 테스트할 수 있는 ${CASINO_LOBBY_CATEGORY_LABELS[vendor.category]} 공급사`;
}

export function getVendorDescription(vendor: CasinoLobbyVendor) {
  if (vendor.description.trim()) return vendor.description;

  if (vendor.status === "paused") {
    return "현재는 미계약 또는 준비중 상태로 노출만 유지합니다. 입장 버튼은 잠시 비활성화됩니다.";
  }

  return "확인된 게임 ID가 있으면 우선 노출하고, 썸네일 또는 세부 목록이 비어 있으면 카드형 fallback으로 채워서 한 회사씩 바로 테스트할 수 있게 구성합니다.";
}

export function getVendorSampleGames(vendor: CasinoLobbyVendor) {
  if (vendor.sampleGames.length > 0) return vendor.sampleGames;
  return FALLBACK_SAMPLE_GAMES[vendor.category].map((item) => ({ ...item }));
}

export function getVendorFeaturedLabels(vendor: CasinoLobbyVendor) {
  if (vendor.featuredLabels.length > 0) return vendor.featuredLabels;
  return getVendorSampleGames(vendor)
    .slice(0, 4)
    .map((item) => item.title);
}

function getVerifiedGames(vendor: CasinoLobbyVendor): VinusVerifiedCatalogEntry[] {
  return (
    (VINUS_VERIFIED_GAMES_BY_VENDOR as Record<string, VinusVerifiedCatalogEntry[]>)[
      vendor.vendor
    ] ?? []
  );
}

export function getVendorGameCount(vendor: CasinoLobbyVendor) {
  if (vendor.gameCount != null) return vendor.gameCount;
  const verified = getVerifiedGames(vendor);
  if (verified.length > 0) return verified.length;
  return getVendorSampleGames(vendor).length;
}

export function getVendorLaunchMode(
  category: CasinoLobbyVendorCategory,
): LaunchSurface {
  return category === "slot" || category === "arcade"
    ? "slot-iframe"
    : "casino-window";
}

export function categorizeCasinoGame(title: string, fallback?: string) {
  const text = `${title} ${fallback ?? ""}`.toLowerCase();
  if (text.includes("baccarat") || text.includes("바카라")) return "바카라";
  if (text.includes("roulette") || text.includes("룰렛")) return "룰렛";
  if (text.includes("blackjack") || text.includes("블랙잭")) return "블랙잭";
  if (
    text.includes("dragon tiger") ||
    text.includes("dragon") ||
    text.includes("타이거") ||
    text.includes("용호")
  ) {
    return "드래곤타이거";
  }
  if (
    text.includes("sic bo") ||
    text.includes("식보") ||
    text.includes("dice")
  ) {
    return "식보";
  }
  if (text.includes("poker") || text.includes("포커")) return "포커";
  if (
    text.includes("wheel") ||
    text.includes("spaceman") ||
    text.includes("candyland") ||
    text.includes("flyer") ||
    text.includes("show")
  ) {
    return "게임쇼";
  }
  return "기타";
}

export function getVendorGridItems(
  vendor: CasinoLobbyVendor,
  limit = 36,
): VendorGridItem[] {
  const verified = getVerifiedGames(vendor);
  if (verified.length > 0) {
    return verified.slice(0, limit).map((entry) => ({
      key: `${vendor.id}:${entry.game}`,
      game: entry.game,
      title: entry.titleKo || entry.titleEn,
      group:
        vendor.category === "casino"
          ? categorizeCasinoGame(entry.titleKo || entry.titleEn, entry.region)
          : entry.region || CASINO_LOBBY_CATEGORY_LABELS[vendor.category],
      icon: entry.icon,
    }));
  }

  return getVendorSampleGames(vendor)
    .slice(0, limit)
    .map((entry, index) => ({
      key: `${vendor.id}:${entry.game}:${index}`,
      game: entry.game,
      title: entry.title,
      group:
        entry.group ||
        (vendor.category === "casino"
          ? categorizeCasinoGame(entry.title)
          : CASINO_LOBBY_CATEGORY_LABELS[vendor.category]),
      icon: entry.icon,
    }));
}
