/**
 * Vinus `play-game`용 게임 ID 목록 — **매트릭스에서 성공한 벤더만** 포함.
 * 원본: 대행사/Vinus 게임 목록 JSON (아이콘·다국어 제목).
 * 로비 실행은 보통 `game: "lobby"` — 개별 타이틀은 여기 `game` 값.
 * 원본은 Vinus 78벤더 전체 카탈로그 JSON에서, `vinus:vendor-matrix`로 성공한 10벤더만 필터해 생성.
 */

export type VinusVerifiedCatalogEntry = {
  /** `play-game`의 `game` 파라미터(카탈로그 키) */
  game: string;
  vendor: string;
  region?: string;
  titleEn: string;
  titleKo: string;
  icon: string;
};

/** 매트릭스(`pnpm run vinus:vendor-matrix`) 기준 연동 확인된 벤더 ID */
export const VINUS_MATRIX_VERIFIED_VENDORS = [
  "pragmatic_casino",
  "pragmatic_slot",
  "cq9_casino",
  "TOMHORN_VIVO",
  "TOMHORN_SLOT",
  "TOMHORN_7Mojos",
  "TOMHORN_AbsoluteLive",
  "habanero",
  "MICRO_Casino",
  "MICRO_Slot",
] as const;

export type VinusMatrixVerifiedVendor = (typeof VINUS_MATRIX_VERIFIED_VENDORS)[number];

/** 벤더별 게임 목록(확인된 벤더만). 총 1613개. */
export const VINUS_VERIFIED_GAMES_BY_VENDOR: Record<
  VinusMatrixVerifiedVendor,
  VinusVerifiedCatalogEntry[]
> = 
{
  "pragmatic_casino": [
    {
      "game": "2201",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "High Flyer",
      "titleKo": "하이 플라이어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/2201/2201_200x200_NB.png"
    },
    {
      "game": "1301",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Spaceman",
      "titleKo": "우주인",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1301/1301_200x200_NB.png"
    },
    {
      "game": "801",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Mega Wheel",
      "titleKo": "메가 휠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/801/801_200x200_NB.png"
    },
    {
      "game": "1101",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Sweet Bonanza CandyLand",
      "titleKo": "달콤한 보난자 캔디랜드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1101/1101_200x200_NB.png"
    },
    {
      "game": "402",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 1",
      "titleKo": "스피드 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/402/402_200x200_NB.png"
    },
    {
      "game": "403",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 2",
      "titleKo": "스피드 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/403/403_200x200_NB.png"
    },
    {
      "game": "441",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Speed Baccarat 1",
      "titleKo": "코리안 스피드 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/441/441_200x200_NB.png"
    },
    {
      "game": "701",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Mega Sic Bo",
      "titleKo": "메가 식보",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/701/701_200x200_NB.png"
    },
    {
      "game": "449",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Speed Baccarat 2",
      "titleKo": "코리안 스피드 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/449/449_200x200_NB.png"
    },
    {
      "game": "211",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Lucky 6 Roulette",
      "titleKo": "럭키 6 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/211/211_200x200_NB.png"
    },
    {
      "game": "401",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat 1",
      "titleKo": "바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/401/401_200x200_NB.png"
    },
    {
      "game": "459",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Speed Baccarat 3",
      "titleKo": "코리안 스피드 바카라 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/459/459_200x200_NB.png"
    },
    {
      "game": "204",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Mega Roulette",
      "titleKo": "메가 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/204/204_200x200_NB.png"
    },
    {
      "game": "450",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesia Speed Baccarat 1",
      "titleKo": "인도네시아 스피드 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/450/450_200x200_NB.png"
    },
    {
      "game": "442",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Mega Baccarat",
      "titleKo": "메가 바카라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/442/442_200x200_NB.png"
    },
    {
      "game": "206",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Roulette Macao",
      "titleKo": "룰렛 마카오",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/206/206_200x200_NB.png"
    },
    {
      "game": "1001",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Dragon Tiger",
      "titleKo": "용호",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1001/1001_200x200_NB.png"
    },
    {
      "game": "451",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Thai Speed Baccarat 1",
      "titleKo": "태국어 스피드 바카라1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/451/451_200x200_NB.png"
    },
    {
      "game": "227",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Roulette 1",
      "titleKo": "룰렛 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/227/227_200x200_NB.png"
    },
    {
      "game": "404",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat 2",
      "titleKo": "바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/404/404_200x200_NB.png"
    },
    {
      "game": "454",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat 1",
      "titleKo": "프라이빗 라운지 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/454/454_200x200_NB.png"
    },
    {
      "game": "2101",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Mega Sic Bac",
      "titleKo": "메가 시크 백",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/2101/2101_200x200_NB.png"
    },
    {
      "game": "488",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Japanese Speed Baccarat 1",
      "titleKo": "일본식 스피드 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/488/488_200x200_NB.png"
    },
    {
      "game": "481",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Chinese Speed Baccarat 1",
      "titleKo": "중국어 스피드 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/481/481_200x200_NB.png"
    },
    {
      "game": "460",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Baccarat 1",
      "titleKo": "코리안 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/460/460_200x200_NB.png"
    },
    {
      "game": "476",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Speed Baccarat 5",
      "titleKo": "코리안 스피드 바카라 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/476/476_200x200_NB.png"
    },
    {
      "game": "477",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Turbo Baccarat 1",
      "titleKo": "코리안 터보 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/477/477_200x200_NB.png"
    },
    {
      "game": "489",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Japanese Speed Baccarat 2",
      "titleKo": "일본식 스피드 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/489/489_200x200_NB.png"
    },
    {
      "game": "490",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Japanese Speed Baccarat 3",
      "titleKo": "일본 스피드 바카라 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/490/490_200x200_NB.png"
    },
    {
      "game": "482",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Chinese Speed Baccarat 2",
      "titleKo": "중국어 스피드 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/482/482_200x200_NB.png"
    },
    {
      "game": "483",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Chinese Speed Baccarat 3",
      "titleKo": "중국 스피드 바카라 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/483/483_200x200_NB.png"
    },
    {
      "game": "479",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Vietnamese Speed Baccarat 1",
      "titleKo": "비엣나미스 스피드 바커라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/479/479_200x200_NB.png"
    },
    {
      "game": "434",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Fortune 6 Baccarat",
      "titleKo": "포턴 6 바카라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/434/434_200x200_NB.png"
    },
    {
      "game": "433",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Super 8 Baccarat",
      "titleKo": "슈퍼 8 바카라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/433/433_200x200_NB.png"
    },
    {
      "game": "455",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat 2",
      "titleKo": "프라이빗 라운지 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/455/455_200x200_NB.png"
    },
    {
      "game": "456",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat 3",
      "titleKo": "프라이빗 라운지 바카라 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/456/456_200x200_NB.png"
    },
    {
      "game": "458",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat 5",
      "titleKo": "프라이빗 라운지 바카라 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/458/458_200x200_NB.png"
    },
    {
      "game": "466",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat 6",
      "titleKo": "프리브 라운지 바카라 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/466/466_200x200_NB.png"
    },
    {
      "game": "467",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat 7",
      "titleKo": "프리브 라운지 바카라 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/467/467_200x200_NB.png"
    },
    {
      "game": "468",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat 8",
      "titleKo": "프리브 라운지 바카라 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/468/468_200x200_NB.png"
    },
    {
      "game": "412",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 3",
      "titleKo": "스피드 바카라 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/412/412_200x200_NB.png"
    },
    {
      "game": "414",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 5",
      "titleKo": "스피드 바카라 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/414/414_200x200_NB.png"
    },
    {
      "game": "415",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 6",
      "titleKo": "스피드 바카라 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/415/415_200x200_NB.png"
    },
    {
      "game": "431",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 7",
      "titleKo": "스피드 바카라 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/431/431_200x200_NB.png"
    },
    {
      "game": "432",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 8",
      "titleKo": "스피드 바카라 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/432/432_200x200_NB.png"
    },
    {
      "game": "430",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 9",
      "titleKo": "스피드 바카라 9",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/430/430_200x200_NB.png"
    },
    {
      "game": "428",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 10",
      "titleKo": "스피드 바카라 10",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/428/428_200x200_NB.png"
    },
    {
      "game": "424f",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 11",
      "titleKo": "스피드 바카라 11",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/424f/424f_200x200_NB.png"
    },
    {
      "game": "421f",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 12",
      "titleKo": "스피드 바카라 12",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/421f/421f_200x200_NB.png"
    },
    {
      "game": "438f",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 13",
      "titleKo": "스피드 바카라 13",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/438f/438f_200x200_NB.png"
    },
    {
      "game": "405",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 18",
      "titleKo": "스피드 바카라 18",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/405/405_200x200_NB.png"
    },
    {
      "game": "427b",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 15",
      "titleKo": "스피드 바카라 15",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/427b/427b_200x200_NB.png"
    },
    {
      "game": "435",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 16",
      "titleKo": "스피드 바카라 16",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/435/435_200x200_NB.png"
    },
    {
      "game": "439",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Baccarat 17",
      "titleKo": "스피드 바카라 17",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/439/439_200x200_NB.png"
    },
    {
      "game": "422f",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat 3",
      "titleKo": "바카라 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/422f/422f_200x200_NB.png"
    },
    {
      "game": "411",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat 5",
      "titleKo": "바카라 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/411/411_200x200_NB.png"
    },
    {
      "game": "413",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat 6",
      "titleKo": "바카라 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/413/413_200x200_NB.png"
    },
    {
      "game": "425",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat 7",
      "titleKo": "바카라 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/425/425_200x200_NB.png"
    },
    {
      "game": "426b",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Turbo Baccarat",
      "titleKo": "터보 바카라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/426b/426b_200x200_NB.png"
    },
    {
      "game": "436",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat 9",
      "titleKo": "바카라 9 ",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/436/436_200x200_NB.png"
    },
    {
      "game": "545",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Roulette",
      "titleKo": "VIP 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/545/545_200x200_NB.png"
    },
    {
      "game": "230a20",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Roulette 3",
      "titleKo": "룰렛 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/230a20/230a20_200x200_NB.png"
    },
    {
      "game": "240",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "PowerUP Roulette",
      "titleKo": "파워 업 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/240/240_200x200_NB.png"
    },
    {
      "game": "203",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Roulette 1",
      "titleKo": "스피드 룰렛 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/203/203_200x200_NB.png"
    },
    {
      "game": "225",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Auto Roulette",
      "titleKo": "오토 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/225/225_200x200_NB.png"
    },
    {
      "game": "266",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Auto Roulette VIP",
      "titleKo": "블랙잭 114",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/266/266_200x200_NB.png"
    },
    {
      "game": "213",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Roulette",
      "titleKo": "코리안 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/213/213_200x200_NB.png"
    },
    {
      "game": "201",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Roulette 2 Extra Time",
      "titleKo": "룰렛 2 엑스트러 타임",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/201/201_200x200_NB.png"
    },
    {
      "game": "237",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Brazilian Roulette",
      "titleKo": "브라질리안 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/237/237_200x200_NB.png"
    },
    {
      "game": "222",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "German Roulette",
      "titleKo": "게르만 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/222/222_200x200_NB.png"
    },
    {
      "game": "224",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Turkish Roulette",
      "titleKo": "터키쉬 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/224/224_200x200_NB.png"
    },
    {
      "game": "221",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Russian Roulette",
      "titleKo": "러시안 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/221/221_200x200_NB.png"
    },
    {
      "game": "210",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Auto Mega Roulette",
      "titleKo": "오토 메가 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/210/210_200x200_NB.png"
    },
    {
      "game": "226",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Auto Roulette",
      "titleKo": "스피드 오토 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/226/226_200x200_NB.png"
    },
    {
      "game": "234",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Roulette Latina",
      "titleKo": "룰렛 라티나",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/234/234_200x200_NB.png"
    },
    {
      "game": "205",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Roulette 2",
      "titleKo": "스피드 룰렛 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/205/205_200x200_NB.png"
    },
    {
      "game": "223",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Italian Roulette",
      "titleKo": "이탈리안 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/223/223_200x200_NB.png"
    },
    {
      "game": "208",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Turkish Mega Roulette",
      "titleKo": "터키 메가 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/208/208_200x200_NB.png"
    },
    {
      "game": "287",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Mega Roulette - Brazilian",
      "titleKo": "메가 룰렛 - 브라질어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/287/287_200x200_NB.png"
    },
    {
      "game": "233",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Romanian Roulette",
      "titleKo": "루마니안 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/233/233_200x200_NB.png"
    },
    {
      "game": "1701",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Treasure Island",
      "titleKo": "보물섬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1701/1701_200x200_NB.png"
    },
    {
      "game": "1501",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "The Bingo Spot",
      "titleKo": "더 빙고 스팟",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1501/1501_200x200_NB.png"
    },
    {
      "game": "1601",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Snake & Ladders Live",
      "titleKo": "스네이크 & 래더 라이브",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1601/1601_200x200_NB.png"
    },
    {
      "game": "1401",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Dice City",
      "titleKo": "다이스 시티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1401/1401_200x200_NB.png"
    },
    {
      "game": "1901",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Power Ball (1 min)",
      "titleKo": "파워볼 (1분)",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1901/1901_200x200_NB.png"
    },
    {
      "game": "1902",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Power Ball (2 min)",
      "titleKo": "파워볼 (2분)",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1902/1902_200x200_NB.png"
    },
    {
      "game": "1903",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Power Ball (3 min)",
      "titleKo": "파워볼 (3분)",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1903/1903_200x200_NB.png"
    },
    {
      "game": "1904",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Power Ball (4 min)",
      "titleKo": "파워볼 (4분)",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1904/1904_200x200_NB.png"
    },
    {
      "game": "1905",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Power Ball (5 min)",
      "titleKo": "파워볼 (5분)",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1905/1905_200x200_NB.png"
    },
    {
      "game": "711a",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "SicBo",
      "titleKo": "식보",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/711a/711a_200x200_NB.png"
    },
    {
      "game": "4001",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Football Blitz",
      "titleKo": "풋볼 블리츠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/4001/4001_200x200_NB.png"
    },
    {
      "game": "901",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "ONE Blackjack 1",
      "titleKo": "ONE 블랙잭 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/901/901_200x200_NB.png"
    },
    {
      "game": "721",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge 1",
      "titleKo": "프라이빗 라운지1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/721/721_200x200_NB.png"
    },
    {
      "game": "546",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 1",
      "titleKo": "VIP 블랙잭 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/546/546_200x200_NB.png"
    },
    {
      "game": "912",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Bet Behind Pro Blackjack",
      "titleKo": "벳 비하인드 프로 블랙잭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/912/912_200x200_NB.png"
    },
    {
      "game": "902a9",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "ONE Blackjack 2",
      "titleKo": "원 블랙잭 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/902a9/902a9_200x200_NB.png"
    },
    {
      "game": "530",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 26",
      "titleKo": "블랙잭 26",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/530/530_200x200_NB.png"
    },
    {
      "game": "542",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 34",
      "titleKo": "블랙잭 34",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/542/542_200x200_NB.png"
    },
    {
      "game": "568",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 3",
      "titleKo": "스피드 블랙잭 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/568/568_200x200_NB.png"
    },
    {
      "game": "607",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 11",
      "titleKo": "스피드 블랙잭 11",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/607/607_200x200_NB.png"
    },
    {
      "game": "3003",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 3",
      "titleKo": "블랙잭 X 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3003/3003_200x200_NB.png"
    },
    {
      "game": "566",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 1",
      "titleKo": "스피드 블랙잭 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/566/566_200x200_NB.png"
    },
    {
      "game": "3001",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 1",
      "titleKo": "블랙잭 X 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3001/3001_200x200_NB.png"
    },
    {
      "game": "722",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge 2",
      "titleKo": "프라이빗 라운지2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/722/722_200x200_NB.png"
    },
    {
      "game": "3133",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean BlackjackX 1",
      "titleKo": "코리안 블랙잭X 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3133/3133_200x200_NB.png"
    },
    {
      "game": "3134",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean BlackjackX 2",
      "titleKo": "코리안 블랙잭X 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3134/3134_200x200_NB.png"
    },
    {
      "game": "3135",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean BlackjackX 3",
      "titleKo": "코리안 블랙잭X 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3135/3135_200x200_NB.png"
    },
    {
      "game": "663",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 7",
      "titleKo": "VIP 블랙잭 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/663/663_200x200_NB.png"
    },
    {
      "game": "543",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 35",
      "titleKo": "블랙잭 35",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/543/543_200x200_NB.png"
    },
    {
      "game": "517",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 10",
      "titleKo": "블랙잭 10",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/517/517_200x200_NB.png"
    },
    {
      "game": "541",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 33",
      "titleKo": "블랙잭 33",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/541/541_200x200_NB.png"
    },
    {
      "game": "305",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 16",
      "titleKo": "블랙잭 16",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/305/305_200x200_NB.png"
    },
    {
      "game": "552",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 49",
      "titleKo": "블랙잭 49",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/552/552_200x200_NB.png"
    },
    {
      "game": "647",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 30",
      "titleKo": "스피드 블랙잭 30",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/647/647_200x200_NB.png"
    },
    {
      "game": "551",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 48",
      "titleKo": "블랙잭 48",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/551/551_200x200_NB.png"
    },
    {
      "game": "523",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 19 - Azure",
      "titleKo": "블랙잭 19 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/523/523_200x200_NB.png"
    },
    {
      "game": "3005",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 5",
      "titleKo": "블랙잭 X 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3005/3005_200x200_NB.png"
    },
    {
      "game": "567",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 2",
      "titleKo": "스피드 블랙잭 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/567/567_200x200_NB.png"
    },
    {
      "game": "3006",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 6",
      "titleKo": "블랙잭 X 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3006/3006_200x200_NB.png"
    },
    {
      "game": "591",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 6",
      "titleKo": "스피드 블랙잭 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/591/591_200x200_NB.png"
    },
    {
      "game": "3002",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 2",
      "titleKo": "블랙잭 X 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3002/3002_200x200_NB.png"
    },
    {
      "game": "550",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 5",
      "titleKo": "VIP 블랙잭 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/550/550_200x200_NB.png"
    },
    {
      "game": "549",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 4",
      "titleKo": "VIP 블랙잭 4",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/549/549_200x200_NB.png"
    },
    {
      "game": "548",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 3",
      "titleKo": "VIP 블랙잭 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/548/548_200x200_NB.png"
    },
    {
      "game": "592",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 7",
      "titleKo": "스피드 블랙잭 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/592/592_200x200_NB.png"
    },
    {
      "game": "3004",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 4",
      "titleKo": "블랙잭 X 4",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3004/3004_200x200_NB.png"
    },
    {
      "game": "604",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 8",
      "titleKo": "스피드 블랙잭 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/604/604_200x200_NB.png"
    },
    {
      "game": "3008",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 8",
      "titleKo": "블랙잭 X 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3008/3008_200x200_NB.png"
    },
    {
      "game": "608",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 12",
      "titleKo": "스피드 블랙잭 12",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/608/608_200x200_NB.png"
    },
    {
      "game": "3007",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 7",
      "titleKo": "블랙잭 X 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3007/3007_200x200_NB.png"
    },
    {
      "game": "525",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 21 - Azure",
      "titleKo": "블랙잭 21 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/525/525_200x200_NB.png"
    },
    {
      "game": "3014",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 14",
      "titleKo": "블랙잭 X 14",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3014/3014_200x200_NB.png"
    },
    {
      "game": "560",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 46",
      "titleKo": "블랙잭 46",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/560/560_200x200_NB.png"
    },
    {
      "game": "3015",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 15",
      "titleKo": "블랙잭 X 15",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3015/3015_200x200_NB.png"
    },
    {
      "game": "609",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 14",
      "titleKo": "스피드 블랙잭 14",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/609/609_200x200_NB.png"
    },
    {
      "game": "554",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 51",
      "titleKo": "블랙잭 51",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/554/554_200x200_NB.png"
    },
    {
      "game": "528",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 24",
      "titleKo": "블랙잭 24",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/528/528_200x200_NB.png"
    },
    {
      "game": "553",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 50",
      "titleKo": "블랙잭 50",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/553/553_200x200_NB.png"
    },
    {
      "game": "516",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 9",
      "titleKo": "블랙잭 9",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/516/516_200x200_NB.png"
    },
    {
      "game": "569",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 77",
      "titleKo": "블랙잭 77",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/569/569_200x200_NB.png"
    },
    {
      "game": "529",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 25",
      "titleKo": "블랙잭 25",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/529/529_200x200_NB.png"
    },
    {
      "game": "536",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 30 - Azure",
      "titleKo": "블랙잭 30 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/536/536_200x200_NB.png"
    },
    {
      "game": "544",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 36",
      "titleKo": "블랙잭 36",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/544/544_200x200_NB.png"
    },
    {
      "game": "570",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 78",
      "titleKo": "블랙잭 78",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/570/570_200x200_NB.png"
    },
    {
      "game": "535",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 31 - Azure",
      "titleKo": "블랙잭 31 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/535/535_200x200_NB.png"
    },
    {
      "game": "540",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 32 - Azure",
      "titleKo": "블랙잭 32 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/540/540_200x200_NB.png"
    },
    {
      "game": "558",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 44",
      "titleKo": "블랙잭 44",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/558/558_200x200_NB.png"
    },
    {
      "game": "3016",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 16",
      "titleKo": "블랙잭 X 16",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3016/3016_200x200_NB.png"
    },
    {
      "game": "524",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 20 - Azure",
      "titleKo": "블랙잭 20 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/524/524_200x200_NB.png"
    },
    {
      "game": "3021",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 21",
      "titleKo": "블랙잭 X 21",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3021/3021_200x200_NB.png"
    },
    {
      "game": "539",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 27 - Azure",
      "titleKo": "블랙잭 27 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/539/539_200x200_NB.png"
    },
    {
      "game": "3009",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 9",
      "titleKo": "블랙잭 X 9",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3009/3009_200x200_NB.png"
    },
    {
      "game": "563",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 38",
      "titleKo": "블랙잭 38",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/563/563_200x200_NB.png"
    },
    {
      "game": "3010",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 10",
      "titleKo": "블랙잭 X 10",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3010/3010_200x200_NB.png"
    },
    {
      "game": "561",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 47",
      "titleKo": "블랙잭 47",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/561/561_200x200_NB.png"
    },
    {
      "game": "3024",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 24",
      "titleKo": "블랙잭 X 24",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3024/3024_200x200_NB.png"
    },
    {
      "game": "537",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 29 - Azure",
      "titleKo": "블랙잭 29 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/537/537_200x200_NB.png"
    },
    {
      "game": "3025",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 25",
      "titleKo": "블랙잭 X 25",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3025/3025_200x200_NB.png"
    },
    {
      "game": "527",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 23",
      "titleKo": "블랙잭 23",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/527/527_200x200_NB.png"
    },
    {
      "game": "304",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 15",
      "titleKo": "블랙잭 15",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/304/304_200x200_NB.png"
    },
    {
      "game": "303",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 14",
      "titleKo": "블랙잭 14",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/303/303_200x200_NB.png"
    },
    {
      "game": "605",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 9",
      "titleKo": "스피드 블랙잭 9",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/605/605_200x200_NB.png"
    },
    {
      "game": "3017",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 17",
      "titleKo": "블랙잭 X 17",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3017/3017_200x200_NB.png"
    },
    {
      "game": "564",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 39",
      "titleKo": "블랙잭 39",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/564/564_200x200_NB.png"
    },
    {
      "game": "3018",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 18",
      "titleKo": "블랙잭 X 18",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3018/3018_200x200_NB.png"
    },
    {
      "game": "606",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 10",
      "titleKo": "스피드 블랙잭 10",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/606/606_200x200_NB.png"
    },
    {
      "game": "3019",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 19",
      "titleKo": "블랙잭 X 19",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3019/3019_200x200_NB.png"
    },
    {
      "game": "565",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 40",
      "titleKo": "블랙잭 40",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/565/565_200x200_NB.png"
    },
    {
      "game": "3020",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 20",
      "titleKo": "블랙잭 X 20",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3020/3020_200x200_NB.png"
    },
    {
      "game": "594",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 52",
      "titleKo": "블랙잭 52",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/594/594_200x200_NB.png"
    },
    {
      "game": "3046",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 11",
      "titleKo": "블랙잭 X 11",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3046/3046_200x200_NB.png"
    },
    {
      "game": "595",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 53",
      "titleKo": "블랙잭 53",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/595/595_200x200_NB.png"
    },
    {
      "game": "3047",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 12",
      "titleKo": "블랙잭 X 12",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3047/3047_200x200_NB.png"
    },
    {
      "game": "596",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 54",
      "titleKo": "블랙잭 54",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/596/596_200x200_NB.png"
    },
    {
      "game": "3048",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 13",
      "titleKo": "블랙잭 X 13",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3048/3048_200x200_NB.png"
    },
    {
      "game": "597",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 55",
      "titleKo": "블랙잭 55",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/597/597_200x200_NB.png"
    },
    {
      "game": "3049",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 22",
      "titleKo": "블랙잭 X 22",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3049/3049_200x200_NB.png"
    },
    {
      "game": "593",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 56",
      "titleKo": "블랙잭 56",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/593/593_200x200_NB.png"
    },
    {
      "game": "559",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 45",
      "titleKo": "블랙잭 45",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/559/559_200x200_NB.png"
    },
    {
      "game": "3054",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 29",
      "titleKo": "블랙잭 X 29",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3054/3054_200x200_NB.png"
    },
    {
      "game": "555",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 41",
      "titleKo": "블랙잭 41",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/555/555_200x200_NB.png"
    },
    {
      "game": "3055",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 30",
      "titleKo": "블랙잭 X 30",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3055/3055_200x200_NB.png"
    },
    {
      "game": "556",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 42",
      "titleKo": "블랙잭 42",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/556/556_200x200_NB.png"
    },
    {
      "game": "557",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 43",
      "titleKo": "블랙잭 43",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/557/557_200x200_NB.png"
    },
    {
      "game": "3426",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "24D Spin",
      "titleKo": "24D 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3426/3426_200x200_NB.png"
    },
    {
      "game": "950",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "American Roulette",
      "titleKo": "아메리칸 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/950/950_200x200_NB.png"
    },
    {
      "game": "114",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Asian Games",
      "titleKo": "아시안 게임즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/114/114_200x200_NB.png"
    },
    {
      "game": "104",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Baccarat Lobby",
      "titleKo": "바카라 로비",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/104/104_200x200_NB.png"
    },
    {
      "game": "1320",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Big Bass Crash",
      "titleKo": "빅 배스 크래쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1320/1320_200x200_NB.png"
    },
    {
      "game": "650",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 109",
      "titleKo": "블랙잭 114",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/650/650_200x200_NB.png"
    },
    {
      "game": "651",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 110",
      "titleKo": "블랙잭 114",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/651/651_200x200_NB.png"
    },
    {
      "game": "652",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 111",
      "titleKo": "블랙잭 114",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/652/652_200x200_NB.png"
    },
    {
      "game": "325",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 112",
      "titleKo": "블랙잭 114",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/325/325_200x200_NB.png"
    },
    {
      "game": "326",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 113",
      "titleKo": "블랙잭 114",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/326/326_200x200_NB.png"
    },
    {
      "game": "327",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 114",
      "titleKo": "블랙잭 114",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/327/327_200x200_NB.png"
    },
    {
      "game": "667",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 115",
      "titleKo": "블랙잭 115",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/667/667_200x200_NB.png"
    },
    {
      "game": "668",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 116",
      "titleKo": "블랙잭 116",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/668/668_200x200_NB.png"
    },
    {
      "game": "669",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 117",
      "titleKo": "블랙잭 117",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/669/669_200x200_NB.png"
    },
    {
      "game": "670",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 118",
      "titleKo": "블랙잭 118",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/670/670_200x200_NB.png"
    },
    {
      "game": "726",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 119",
      "titleKo": "블랙잭 119",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/726/726_200x200_NB.png"
    },
    {
      "game": "346",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 120 - The Club",
      "titleKo": "블랙잭 120 - 더 클럽",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/346/346_200x200_NB.png"
    },
    {
      "game": "727",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 121",
      "titleKo": "블랙잭 121",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/727/727_200x200_NB.png"
    },
    {
      "game": "728",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 122",
      "titleKo": "블랙잭 122",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/728/728_200x200_NB.png"
    },
    {
      "game": "729",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 123",
      "titleKo": "블랙잭 123",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/729/729_200x200_NB.png"
    },
    {
      "game": "732",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 124",
      "titleKo": "블랙잭 124",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/732/732_200x200_NB.png"
    },
    {
      "game": "733",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 125",
      "titleKo": "블랙잭 125",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/733/733_200x200_NB.png"
    },
    {
      "game": "347",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 126",
      "titleKo": "블랙잭 126",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/347/347_200x200_NB.png"
    },
    {
      "game": "329",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 141",
      "titleKo": "블랙잭 141",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/329/329_200x200_NB.png"
    },
    {
      "game": "331",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 142",
      "titleKo": "블랙잭 142",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/331/331_200x200_NB.png"
    },
    {
      "game": "328",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 155",
      "titleKo": "블랙잭 155",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/328/328_200x200_NB.png"
    },
    {
      "game": "330",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 156",
      "titleKo": "블랙잭 156",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/330/330_200x200_NB.png"
    },
    {
      "game": "332",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 157",
      "titleKo": "블랙잭 157",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/332/332_200x200_NB.png"
    },
    {
      "game": "538",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 28 - Azure",
      "titleKo": "블랙잭 28 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/538/538_200x200_NB.png"
    },
    {
      "game": "103",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack Lobby",
      "titleKo": "블랙잭 로비",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/103/103_200x200_NB.png"
    },
    {
      "game": "3231",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 31",
      "titleKo": "블랙잭 X 31",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3231/3231_200x200_NB.png"
    },
    {
      "game": "3232",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 32",
      "titleKo": "블랙잭 X 32",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3232/3232_200x200_NB.png"
    },
    {
      "game": "3233",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 33",
      "titleKo": "블랙잭 X 33",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3233/3233_200x200_NB.png"
    },
    {
      "game": "3234",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 34",
      "titleKo": "블랙잭 X 34",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3234/3234_200x200_NB.png"
    },
    {
      "game": "3235",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 35",
      "titleKo": "블랙잭 X 35",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3235/3235_200x200_NB.png"
    },
    {
      "game": "3238",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 36",
      "titleKo": "블랙잭 X 36",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3238/3238_200x200_NB.png"
    },
    {
      "game": "3239",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 37",
      "titleKo": "블랙잭 X 37",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3239/3239_200x200_NB.png"
    },
    {
      "game": "3240",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 38",
      "titleKo": "블랙잭 X 38",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3240/3240_200x200_NB.png"
    },
    {
      "game": "3241",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 39",
      "titleKo": "블랙잭 X 39",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3241/3241_200x200_NB.png"
    },
    {
      "game": "3242",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 40",
      "titleKo": "블랙잭 X 40",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3242/3242_200x200_NB.png"
    },
    {
      "game": "2701",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Casino Hold’em",
      "titleKo": "카지노 홀덤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/2701/2701_200x200_NB.png"
    },
    {
      "game": "2501",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Crystal Roulette",
      "titleKo": "크리스탈 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/2501/2501_200x200_NB.png"
    },
    {
      "game": "110",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "D&W",
      "titleKo": "디&더블유",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/110/110_200x200_NB.png"
    },
    {
      "game": "108",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Dragon Tiger",
      "titleKo": "용호",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/108/108_200x200_NB.png"
    },
    {
      "game": "270",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Fortune Roulette",
      "titleKo": "포춘 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/270/270_200x200_NB.png"
    },
    {
      "game": "980",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Free Bet Blackjack 1",
      "titleKo": "프리 벳 블랙잭 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/980/980_200x200_NB.png"
    },
    {
      "game": "981",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Free Bet Blackjack 2",
      "titleKo": "프리 벳 블랙잭 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/981/981_200x200_NB.png"
    },
    {
      "game": "105",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Gameshows",
      "titleKo": "게임쇼",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/105/105_200x200_NB.png"
    },
    {
      "game": "292",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Immersive Roulette Deluxe",
      "titleKo": "이머시브 룰렛 디럭스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/292/292_200x200_NB.png"
    },
    {
      "game": "3252",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 1",
      "titleKo": "인도네시아 블랙잭 X 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3252/3252_200x200_NB.png"
    },
    {
      "game": "3314",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 10",
      "titleKo": "인도네시안 블랙잭X 10",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3314/3314_200x200_NB.png"
    },
    {
      "game": "3315",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 11",
      "titleKo": "인도네시안 블랙잭X 11",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3315/3315_200x200_NB.png"
    },
    {
      "game": "3316",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 12",
      "titleKo": "인도네시안 블랙잭X 12",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3316/3316_200x200_NB.png"
    },
    {
      "game": "3317",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 13",
      "titleKo": "인도네시안 블랙잭X 13",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3317/3317_200x200_NB.png"
    },
    {
      "game": "3318",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 14",
      "titleKo": "인도네시안 블랙잭X 14",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3318/3318_200x200_NB.png"
    },
    {
      "game": "3319",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 15",
      "titleKo": "인도네시안 블랙잭X 15",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3319/3319_200x200_NB.png"
    },
    {
      "game": "3340",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 16",
      "titleKo": "인도네시아 블랙잭 X 16",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3340/3340_200x200_NB.png"
    },
    {
      "game": "3341",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 17",
      "titleKo": "인도네시아 블랙잭 X 17",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3341/3341_200x200_NB.png"
    },
    {
      "game": "3342",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 18",
      "titleKo": "인도네시아 블랙잭 X 18",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3342/3342_200x200_NB.png"
    },
    {
      "game": "3343",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 19",
      "titleKo": "인도네시아 블랙잭 X 19",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3343/3343_200x200_NB.png"
    },
    {
      "game": "3253",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 2",
      "titleKo": "인도네시아 블랙잭 X 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3253/3253_200x200_NB.png"
    },
    {
      "game": "3344",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 20",
      "titleKo": "인도네시아 블랙잭 X 20",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3344/3344_200x200_NB.png"
    },
    {
      "game": "3254",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 3",
      "titleKo": "인도네시아 블랙잭 X 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3254/3254_200x200_NB.png"
    },
    {
      "game": "3255",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 4",
      "titleKo": "인도네시아 블랙잭 X 4",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3255/3255_200x200_NB.png"
    },
    {
      "game": "3256",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 5",
      "titleKo": "인도네시아 블랙잭 X 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3256/3256_200x200_NB.png"
    },
    {
      "game": "3310",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 6",
      "titleKo": "인도네시안 블랙잭X 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3310/3310_200x200_NB.png"
    },
    {
      "game": "3311",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 7",
      "titleKo": "인도네시안 블랙잭X 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3311/3311_200x200_NB.png"
    },
    {
      "game": "3312",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 8",
      "titleKo": "인도네시안 블랙잭X 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3312/3312_200x200_NB.png"
    },
    {
      "game": "3313",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian BlackjackX 9",
      "titleKo": "인도네시안 블랙잭X 9",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3313/3313_200x200_NB.png"
    },
    {
      "game": "1160",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Indonesian ONE Blackjack",
      "titleKo": "인도네시아 원 블랙잭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1160/1160_200x200_NB.png"
    },
    {
      "game": "2601",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Jacks or Better Draw Poker",
      "titleKo": "잭스 오어 베터 드로 포커",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/2601/2601_200x200_NB.png"
    },
    {
      "game": "499",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Baccarat 2",
      "titleKo": "코리안 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/499/499_200x200_NB.png"
    },
    {
      "game": "1141",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Blackjack 1",
      "titleKo": "코리안 블랙잭 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1141/1141_200x200_NB.png"
    },
    {
      "game": "703a1",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Mega Sic Bo",
      "titleKo": "코리안 메가 시크 보",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/703a1/703a1_200x200_NB.png"
    },
    {
      "game": "1159",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean ONE Blackjack",
      "titleKo": "코리안 원 블랙잭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1159/1159_200x200_NB.png"
    },
    {
      "game": "461",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Privé Lounge Baccarat 1",
      "titleKo": "코리안 프리베 라운지 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/461/461_200x200_NB.png"
    },
    {
      "game": "1140",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Korean Speed Blackjack 1",
      "titleKo": "코리안 스피드 블랙잭 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1140/1140_200x200_NB.png"
    },
    {
      "game": "101",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Live Casino Lobby",
      "titleKo": "라이브 카지노로비",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/101/101_200x200_NB.png"
    },
    {
      "game": "2901",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "MegaRoulette3000",
      "titleKo": "메가 룰렛 3000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/2901/2901_200x200_NB.png"
    },
    {
      "game": "2750",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Money Time",
      "titleKo": "머니 타임",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/2750/2750_200x200_NB.png"
    },
    {
      "game": "007",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "MultiTable Play",
      "titleKo": "멀티테이블 플레이",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/007/007_200x200_NB.png"
    },
    {
      "game": "111",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Other Promos",
      "titleKo": "기타 프로모션",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/111/111_200x200_NB.png"
    },
    {
      "game": "169",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Poker",
      "titleKo": "포커",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/169/169_200x200_NB.png"
    },
    {
      "game": "123",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Power Ball",
      "titleKo": "파워볼",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/123/123_200x200_NB.png"
    },
    {
      "game": "4511",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat Squeeze 1",
      "titleKo": "프리베 라운지 바카라 스퀴즈 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/4511/4511_200x200_NB.png"
    },
    {
      "game": "4512",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Baccarat Squeeze 2",
      "titleKo": "프리베 라운지 바카라 스퀴즈 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/4512/4512_200x200_NB.png"
    },
    {
      "game": "1146",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Blackjack 11",
      "titleKo": "프리베 라운지 블랙잭 11",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1146/1146_200x200_NB.png"
    },
    {
      "game": "1147",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Blackjack 12",
      "titleKo": "프리베 라운지 블랙잭 12",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/1147/1147_200x200_NB.png"
    },
    {
      "game": "28201",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Roulette",
      "titleKo": "프라이빗 라운지 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/28201/28201_200x200_NB.png"
    },
    {
      "game": "28301",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Roulette Deluxe",
      "titleKo": "프리브 라운지 룰렛 디럭스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/28301/28301_200x200_NB.png"
    },
    {
      "game": "102",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Roulette Lobby",
      "titleKo": "룰렛 로비",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/102/102_200x200_NB.png"
    },
    {
      "game": "107",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Sic Bo",
      "titleKo": "식보",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/107/107_200x200_NB.png"
    },
    {
      "game": "109",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Sic Bo & Dragon Tiger",
      "titleKo": "식보 & 드래곤 타이거",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/109/109_200x200_NB.png"
    },
    {
      "game": "711",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Sicbo",
      "titleKo": "식보",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/711/711_200x200_NB.png"
    },
    {
      "game": "851",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Squeeze Baccarat",
      "titleKo": "스퀴즈 바카라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/851/851_200x200_NB.png"
    },
    {
      "game": "453",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Thai Baccarat 1",
      "titleKo": "타이 바카라 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/453/453_200x200_NB.png"
    },
    {
      "game": "452",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Thai Speed Baccarat 2",
      "titleKo": "타이 스피드 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/452/452_200x200_NB.png"
    },
    {
      "game": "480",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Vietnamese Speed Baccarat 2",
      "titleKo": "베트남 스피드 바카라 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/480/480_200x200_NB.png"
    },
    {
      "game": "484",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Vietnamese Speed Baccarat 3",
      "titleKo": "베트남어 스피드 바카라 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/484/484_200x200_NB.png"
    },
    {
      "game": "526",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 22",
      "titleKo": "블랙잭 22",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/526/526_200x200_NB.png"
    },
    {
      "game": "513",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 7",
      "titleKo": "블랙잭 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/513/513_200x200_NB.png"
    },
    {
      "game": "520",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 8",
      "titleKo": "블랙잭 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/520/520_200x200_NB.png"
    },
    {
      "game": "512",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 6",
      "titleKo": "블랙잭 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/512/512_200x200_NB.png"
    },
    {
      "game": "618",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 73",
      "titleKo": "블랙잭 73",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/618/618_200x200_NB.png"
    },
    {
      "game": "619",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 74",
      "titleKo": "블랙잭 74",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/619/619_200x200_NB.png"
    },
    {
      "game": "3050",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 23",
      "titleKo": "블랙잭 X 23",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3050/3050_200x200_NB.png"
    },
    {
      "game": "612",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 148",
      "titleKo": "블랙잭 148",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/612/612_200x200_NB.png"
    },
    {
      "game": "3051",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 26",
      "titleKo": "블랙잭 X 26",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3051/3051_200x200_NB.png"
    },
    {
      "game": "598",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 57",
      "titleKo": "블랙잭 57",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/598/598_200x200_NB.png"
    },
    {
      "game": "3052",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 27",
      "titleKo": "블랙잭 X 27",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3052/3052_200x200_NB.png"
    },
    {
      "game": "599",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 58",
      "titleKo": "블랙잭 58",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/599/599_200x200_NB.png"
    },
    {
      "game": "3053",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "BlackjackX 28",
      "titleKo": "블랙잭 X 28",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/3053/3053_200x200_NB.png"
    },
    {
      "game": "613",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 149",
      "titleKo": "블랙잭 149",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/613/613_200x200_NB.png"
    },
    {
      "game": "600",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 59",
      "titleKo": "블랙잭 59",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/600/600_200x200_NB.png"
    },
    {
      "game": "620",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 64",
      "titleKo": "블랙잭 64",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/620/620_200x200_NB.png"
    },
    {
      "game": "521",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 17 - Azure",
      "titleKo": "블랙잭 17 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/521/521_200x200_NB.png"
    },
    {
      "game": "515",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 1",
      "titleKo": "블랙잭 1",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/515/515_200x200_NB.png"
    },
    {
      "game": "519",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 2",
      "titleKo": "블랙잭 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/519/519_200x200_NB.png"
    },
    {
      "game": "522",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 18 - Azure",
      "titleKo": "블랙잭 18 - 애저",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/522/522_200x200_NB.png"
    },
    {
      "game": "562",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 37",
      "titleKo": "블랙잭 37",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/562/562_200x200_NB.png"
    },
    {
      "game": "614",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 17",
      "titleKo": "스피드 블랙잭 17",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/614/614_200x200_NB.png"
    },
    {
      "game": "601",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 60",
      "titleKo": "블랙잭 60",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/601/601_200x200_NB.png"
    },
    {
      "game": "602",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 61",
      "titleKo": "블랙잭 61",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/602/602_200x200_NB.png"
    },
    {
      "game": "603",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 62",
      "titleKo": "블랙잭 62",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/603/603_200x200_NB.png"
    },
    {
      "game": "590",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 63",
      "titleKo": "블랙잭 63",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/590/590_200x200_NB.png"
    },
    {
      "game": "621",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 65",
      "titleKo": "블랙잭 65",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/621/621_200x200_NB.png"
    },
    {
      "game": "626",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 70",
      "titleKo": "블랙잭 70",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/626/626_200x200_NB.png"
    },
    {
      "game": "301",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 11",
      "titleKo": "블랙잭 11",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/301/301_200x200_NB.png"
    },
    {
      "game": "511",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 3",
      "titleKo": "블랙잭 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/511/511_200x200_NB.png"
    },
    {
      "game": "518",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 5",
      "titleKo": "블랙잭 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/518/518_200x200_NB.png"
    },
    {
      "game": "302",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 12",
      "titleKo": "블랙잭 12",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/302/302_200x200_NB.png"
    },
    {
      "game": "514",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 4",
      "titleKo": "블랙잭 4",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/514/514_200x200_NB.png"
    },
    {
      "game": "615",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 18",
      "titleKo": "스피드 블랙잭 18",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/615/615_200x200_NB.png"
    },
    {
      "game": "616",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 71",
      "titleKo": "블랙잭 71",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/616/616_200x200_NB.png"
    },
    {
      "game": "617",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 72",
      "titleKo": "블랙잭 72",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/617/617_200x200_NB.png"
    },
    {
      "game": "658",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 150",
      "titleKo": "블랙잭 150",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/658/658_200x200_NB.png"
    },
    {
      "game": "659",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 20",
      "titleKo": "스피드 블랙잭 20",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/659/659_200x200_NB.png"
    },
    {
      "game": "660",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 21",
      "titleKo": "스피드 블랙잭 21",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/660/660_200x200_NB.png"
    },
    {
      "game": "661",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 22",
      "titleKo": "스피드 블랙잭 22",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/661/661_200x200_NB.png"
    },
    {
      "game": "641",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 24",
      "titleKo": "스피드 블랙잭 24",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/641/641_200x200_NB.png"
    },
    {
      "game": "642",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 25",
      "titleKo": "스피드 블랙잭 25",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/642/642_200x200_NB.png"
    },
    {
      "game": "643",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 26",
      "titleKo": "스피드 블랙잭 26",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/643/643_200x200_NB.png"
    },
    {
      "game": "644",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 27",
      "titleKo": "스피드 블랙잭 27",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/644/644_200x200_NB.png"
    },
    {
      "game": "645",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 151",
      "titleKo": "블랙잭 151",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/645/645_200x200_NB.png"
    },
    {
      "game": "646",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 152",
      "titleKo": "블랙잭 152",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/646/646_200x200_NB.png"
    },
    {
      "game": "681",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 31",
      "titleKo": "스피드 블랙잭 31",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/681/681_200x200_NB.png"
    },
    {
      "game": "682",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 32",
      "titleKo": "스피드 블랙잭 32",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/682/682_200x200_NB.png"
    },
    {
      "game": "687",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 135",
      "titleKo": "블랙잭 135",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/687/687_200x200_NB.png"
    },
    {
      "game": "688",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 34",
      "titleKo": "스피드 블랙잭 34",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/688/688_200x200_NB.png"
    },
    {
      "game": "686",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 35",
      "titleKo": "스피드 블랙잭 35",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/686/686_200x200_NB.png"
    },
    {
      "game": "684",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 136",
      "titleKo": "블랙잭 136",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/684/684_200x200_NB.png"
    },
    {
      "game": "685",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 137",
      "titleKo": "블랙잭 137",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/685/685_200x200_NB.png"
    },
    {
      "game": "370",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 38",
      "titleKo": "스피드 블랙잭 38",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/370/370_200x200_NB.png"
    },
    {
      "game": "371",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 39",
      "titleKo": "스피드 블랙잭 39",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/371/371_200x200_NB.png"
    },
    {
      "game": "779",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 40",
      "titleKo": "스피드 블랙잭 40",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/779/779_200x200_NB.png"
    },
    {
      "game": "780",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 41",
      "titleKo": "스피드 블랙잭 41",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/780/780_200x200_NB.png"
    },
    {
      "game": "781",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 42",
      "titleKo": "스피드 블랙잭 42",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/781/781_200x200_NB.png"
    },
    {
      "game": "377",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 55",
      "titleKo": "스피드 블랙잭 55",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/377/377_200x200_NB.png"
    },
    {
      "game": "378",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 56",
      "titleKo": "스피드 블랙잭 56",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/378/378_200x200_NB.png"
    },
    {
      "game": "379",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 57",
      "titleKo": "스피드 블랙잭 57",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/379/379_200x200_NB.png"
    },
    {
      "game": "380",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 58",
      "titleKo": "스피드 블랙잭 58",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/380/380_200x200_NB.png"
    },
    {
      "game": "381",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 59 - Emerald",
      "titleKo": "스피드 블랙잭 59 - 에메랄드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/381/381_200x200_NB.png"
    },
    {
      "game": "690",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 153",
      "titleKo": "블랙잭 153",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/690/690_200x200_NB.png"
    },
    {
      "game": "695",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 154",
      "titleKo": "블랙잭 154",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/695/695_200x200_NB.png"
    },
    {
      "game": "770",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 43",
      "titleKo": "스피드 블랙잭 43",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/770/770_200x200_NB.png"
    },
    {
      "game": "772",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 44",
      "titleKo": "스피드 블랙잭 44",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/772/772_200x200_NB.png"
    },
    {
      "game": "773",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 45",
      "titleKo": "스피드 블랙잭 45",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/773/773_200x200_NB.png"
    },
    {
      "game": "774",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 46",
      "titleKo": "스피드 블랙잭 46",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/774/774_200x200_NB.png"
    },
    {
      "game": "775",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 47",
      "titleKo": "스피드 블랙잭 47",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/775/775_200x200_NB.png"
    },
    {
      "game": "906",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Brazilian ONE Blackjack",
      "titleKo": "브라질 ONE 블랙잭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/906/906_200x200_NB.png"
    },
    {
      "game": "904",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Turkish ONE Blackjack",
      "titleKo": "터키쉬 원 블랙잭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/904/904_200x200_NB.png"
    },
    {
      "game": "321",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Speed Blackjack 23 - Turkish",
      "titleKo": "스피드 블랙잭 23 - 터키어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/321/321_200x200_NB.png"
    },
    {
      "game": "322",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 75 - Turkish",
      "titleKo": "블랙잭75 - 터키어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/322/322_200x200_NB.png"
    },
    {
      "game": "323",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 14 - Turkish",
      "titleKo": "VIP 블랙잭 14 - 터키어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/323/323_200x200_NB.png"
    },
    {
      "game": "730",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 75",
      "titleKo": "블랙잭 75",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/730/730_200x200_NB.png"
    },
    {
      "game": "731",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 76",
      "titleKo": "블랙잭 76",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/731/731_200x200_NB.png"
    },
    {
      "game": "676",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 79",
      "titleKo": "블랙잭 79",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/676/676_200x200_NB.png"
    },
    {
      "game": "677",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 80",
      "titleKo": "블랙잭 80",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/677/677_200x200_NB.png"
    },
    {
      "game": "678",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 81",
      "titleKo": "블랙잭 81",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/678/678_200x200_NB.png"
    },
    {
      "game": "673",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 82",
      "titleKo": "블랙잭 82",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/673/673_200x200_NB.png"
    },
    {
      "game": "674",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 83",
      "titleKo": "블랙잭 83",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/674/674_200x200_NB.png"
    },
    {
      "game": "675",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 84",
      "titleKo": "블랙잭 84",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/675/675_200x200_NB.png"
    },
    {
      "game": "683",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 85",
      "titleKo": "블랙잭 85",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/683/683_200x200_NB.png"
    },
    {
      "game": "369",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 86",
      "titleKo": "블랙잭 86",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/369/369_200x200_NB.png"
    },
    {
      "game": "776",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 87",
      "titleKo": "블랙잭 87",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/776/776_200x200_NB.png"
    },
    {
      "game": "777",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 88",
      "titleKo": "블랙잭 88",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/777/777_200x200_NB.png"
    },
    {
      "game": "778",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 89",
      "titleKo": "블랙잭 89",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/778/778_200x200_NB.png"
    },
    {
      "game": "767",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 90",
      "titleKo": "블랙잭 90",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/767/767_200x200_NB.png"
    },
    {
      "game": "768",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 91",
      "titleKo": "블랙잭 91",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/768/768_200x200_NB.png"
    },
    {
      "game": "769",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 92",
      "titleKo": "블랙잭 92",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/769/769_200x200_NB.png"
    },
    {
      "game": "771",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 93",
      "titleKo": "블랙잭 93",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/771/771_200x200_NB.png"
    },
    {
      "game": "372",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 102",
      "titleKo": "블랙잭 102",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/372/372_200x200_NB.png"
    },
    {
      "game": "373",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 103",
      "titleKo": "블랙잭 103",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/373/373_200x200_NB.png"
    },
    {
      "game": "374",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 104",
      "titleKo": "블랙잭 104",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/374/374_200x200_NB.png"
    },
    {
      "game": "375",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 105",
      "titleKo": "블랙잭 105",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/375/375_200x200_NB.png"
    },
    {
      "game": "376",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 106",
      "titleKo": "블랙잭 106",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/376/376_200x200_NB.png"
    },
    {
      "game": "689",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 107",
      "titleKo": "블랙잭 107",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/689/689_200x200_NB.png"
    },
    {
      "game": "698",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Blackjack 108",
      "titleKo": "블랙잭 108",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/698/698_200x200_NB.png"
    },
    {
      "game": "662",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 6",
      "titleKo": "VIP 블랙잭 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/662/662_200x200_NB.png"
    },
    {
      "game": "547",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 2",
      "titleKo": "VIP 블랙잭 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/547/547_200x200_NB.png"
    },
    {
      "game": "664",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 8",
      "titleKo": "VIP 블랙잭 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/664/664_200x200_NB.png"
    },
    {
      "game": "622",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 9",
      "titleKo": "VIP 블랙잭 9",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/622/622_200x200_NB.png"
    },
    {
      "game": "623",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 10",
      "titleKo": "VIP 블랙잭 10",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/623/623_200x200_NB.png"
    },
    {
      "game": "624",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 11",
      "titleKo": "VIP 블랙잭 11",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/624/624_200x200_NB.png"
    },
    {
      "game": "625",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 12",
      "titleKo": "VIP 블랙잭 12",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/625/625_200x200_NB.png"
    },
    {
      "game": "671",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 13",
      "titleKo": "VIP 블랙잭 13",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/671/671_200x200_NB.png"
    },
    {
      "game": "672",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "VIP Blackjack 14",
      "titleKo": "VIP 블랙잭 14",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/672/672_200x200_NB.png"
    },
    {
      "game": "723",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge 3",
      "titleKo": "프라이빗 라운지3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/723/723_200x200_NB.png"
    },
    {
      "game": "724",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge 4",
      "titleKo": "프라이빗 라운지4",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/724/724_200x200_NB.png"
    },
    {
      "game": "725",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge 5",
      "titleKo": "프라이빗 라운지5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/725/725_200x200_NB.png"
    },
    {
      "game": "747",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Blackjack 6",
      "titleKo": "프리베 라운지 블랙잭 6",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/747/747_200x200_NB.png"
    },
    {
      "game": "748",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Blackjack 7",
      "titleKo": "프리베 라운지 블랙잭 7",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/748/748_200x200_NB.png"
    },
    {
      "game": "749",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Blackjack 8",
      "titleKo": "프리베 라운지 블랙잭 8",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/749/749_200x200_NB.png"
    },
    {
      "game": "750",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Blackjack 9",
      "titleKo": "프리베 라운지 블랙잭 9",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/750/750_200x200_NB.png"
    },
    {
      "game": "751",
      "vendor": "pragmatic_casino",
      "region": "Pragmatic",
      "titleEn": "Privé Lounge Blackjack 10",
      "titleKo": "프리베 라운지 블랙잭 10",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/751/751_200x200_NB.png"
    }
  ],
  "pragmatic_slot": [
    {
      "game": "vs20payanyvol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jelly Express",
      "titleKo": "젤리 익스프레스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20payanyvol/vs20payanyvol_200x200_NB.png"
    },
    {
      "game": "vs20sugarrushx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sugar Rush 1000",
      "titleKo": "슈가 러시 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sugarrushx/vs20sugarrushx_200x200_NB.png"
    },
    {
      "game": "vswayslions",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Lions Megaways",
      "titleKo": "5 라이언즈 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayslions/vswayslions_200x200_NB.png"
    },
    {
      "game": "vswayswbounty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Vampy Party",
      "titleKo": "뱀파이어 파티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswbounty/vswayswbounty_200x200_NB.png"
    },
    {
      "game": "vswayspompmr2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Zombie School Megaways",
      "titleKo": "좀비 스쿨 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayspompmr2/vswayspompmr2_200x200_NB.png"
    },
    {
      "game": "vs20olympgold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Olympus Super Scatter",
      "titleKo": "게이트 오브 올림푸스 슈퍼 스캐터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olympgold/vs20olympgold_200x200_NB.png"
    },
    {
      "game": "vswaysrabbits",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Rabbits Megaways",
      "titleKo": "5 래빗 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysrabbits/vswaysrabbits_200x200_NB.png"
    },
    {
      "game": "vs20sugrushss",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sugar Rush Super Scatter",
      "titleKo": "슈가 러시 슈퍼 스캐터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sugrushss/vs20sugrushss_200x200_NB.png"
    },
    {
      "game": "vsways5lions2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Lions Megaways 2",
      "titleKo": "5 라이언즈 메가웨이즈™ 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vsways5lions2/vsways5lions2_200x200_NB.png"
    },
    {
      "game": "vs20olympx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Olympus 1000",
      "titleKo": "게이트 오브 올림푸스 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olympx/vs20olympx_200x200_NB.png"
    },
    {
      "game": "vswayspowzeus",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Power of Merlin Megaways",
      "titleKo": "파워 오브 멀린 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayspowzeus/vswayspowzeus_200x200_NB.png"
    },
    {
      "game": "vs20dhousehm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Haunted Crypt",
      "titleKo": "저주받은 지하실",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20dhousehm/vs20dhousehm_200x200_NB.png"
    },
    {
      "game": "vs20starprss",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starlight Princess Super Scatter",
      "titleKo": "별빛 프린세스 슈퍼 스캐터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20starprss/vs20starprss_200x200_NB.png"
    },
    {
      "game": "vs25pandagold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Panda's Fortune",
      "titleKo": "팬더 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25pandagold/vs25pandagold_200x200_NB.png"
    },
    {
      "game": "vs20tweethouse",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Tweety House",
      "titleKo": "트위티 하우스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20tweethouse/vs20tweethouse_200x200_NB.png"
    },
    {
      "game": "vswaysdogs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dog House Megaways",
      "titleKo": "더 도그 하우스 메가웨이즈™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysdogs/vswaysdogs_200x200_NB.png"
    },
    {
      "game": "vs20sugarrush",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sugar Rush",
      "titleKo": "슈가 러쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sugarrush/vs20sugarrush_200x200_NB.png"
    },
    {
      "game": "vs20slightwdm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Idol Pop Fever",
      "titleKo": "아이돌 팝 피버",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20slightwdm/vs20slightwdm_200x200_NB.png"
    },
    {
      "game": "vs20olympgcl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortune of Olympus",
      "titleKo": "포천 오브 올림푸스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olympgcl/vs20olympgcl_200x200_NB.png"
    },
    {
      "game": "vswaystrpgug",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Triple Pot Diamond",
      "titleKo": "트리플 팟 다이아몬드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaystrpgug/vswaystrpgug_200x200_NB.png"
    },
    {
      "game": "vs20fruitswx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Bonanza 1000",
      "titleKo": "스윗보난자 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fruitswx/vs20fruitswx_200x200_NB.png"
    },
    {
      "game": "vs20starlightx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starlight Princess 1000",
      "titleKo": "스타라이트 프린세스 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20starlightx/vs20starlightx_200x200_NB.png"
    },
    {
      "game": "vs20olympgate",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Olympus",
      "titleKo": "게이트 오브 올림푸스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olympgate/vs20olympgate_200x200_NB.png"
    },
    {
      "game": "vs20fruitsw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Bonanza",
      "titleKo": "스위트 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fruitsw/vs20fruitsw_200x200_NB.png"
    },
    {
      "game": "vs20swrbon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Rush Bonanza",
      "titleKo": "스위트 러시 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20swrbon/vs20swrbon_200x200_NB.png"
    },
    {
      "game": "vs20gatotx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Gatot Kaca 1000",
      "titleKo": "게이트 오브 가토 카카 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gatotx/vs20gatotx_200x200_NB.png"
    },
    {
      "game": "vs20olgatssc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Gatot Kaca Super Scatter",
      "titleKo": "게잇스 오브 개텃 카커 수퍼 스캐터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olgatssc/vs20olgatssc_200x200_NB.png"
    },
    {
      "game": "vs20starlight",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starlight Princess",
      "titleKo": "스타라이트 프린세스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20starlight/vs20starlight_200x200_NB.png"
    },
    {
      "game": "vs20swbonsup",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Bonanza Super Scatter",
      "titleKo": "스위트 보난자 슈퍼 스캐터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20swbonsup/vs20swbonsup_200x200_NB.png"
    },
    {
      "game": "vs15godsofwar",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Zeus vs Hades - Gods of War",
      "titleKo": "제우스 vs 하데스 - 갓 오브 워",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15godsofwar/vs15godsofwar_200x200_NB.png"
    },
    {
      "game": "vswaysmegareel",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pompeii Megareels Megaways",
      "titleKo": "폼페이 메가릴스 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmegareel/vswaysmegareel_200x200_NB.png"
    },
    {
      "game": "vs40wildwest",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild West Gold",
      "titleKo": "와일드 웨스트 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40wildwest/vs40wildwest_200x200_NB.png"
    },
    {
      "game": "vs15zeushadseq",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Zeus vs Hades - Gods of War 250",
      "titleKo": "제우스 vs 하데스 – 갓 오브 워 250",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15zeushadseq/vs15zeushadseq_200x200_NB.png"
    },
    {
      "game": "vs20procountx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wisdom of Athena 1000",
      "titleKo": "위즈덤 오브 아테나 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20procountx/vs20procountx_200x200_NB.png"
    },
    {
      "game": "vs20swdicex",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Bonanza 1000 Dice",
      "titleKo": "스위트 보난자 1000 다이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20swdicex/vs20swdicex_200x200_NB.png"
    },
    {
      "game": "vs5joker",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker's Jewels",
      "titleKo": "조커스 쥬얼리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5joker/vs5joker_200x200_NB.png"
    },
    {
      "game": "vswaysbufking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Buffalo King Megaways",
      "titleKo": "버팔로 킹 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbufking/vswaysbufking_200x200_NB.png"
    },
    {
      "game": "vs20saiman",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Saiyan Mania",
      "titleKo": "사이어인 매니아",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20saiman/vs20saiman_200x200_NB.png"
    },
    {
      "game": "vs20pbonanza",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pyramid Bonanza",
      "titleKo": "피라미드 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20pbonanza/vs20pbonanza_200x200_NB.png"
    },
    {
      "game": "vs20rujakbnz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rujak Bonanza",
      "titleKo": "루작 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20rujakbnz/vs20rujakbnz_200x200_NB.png"
    },
    {
      "game": "vs20amuleteg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortune of Giza",
      "titleKo": "포춘 오브 기자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20amuleteg/vs20amuleteg_200x200_NB.png"
    },
    {
      "game": "vs20doghouse",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dog House",
      "titleKo": "도그 하우스™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20doghouse/vs20doghouse_200x200_NB.png"
    },
    {
      "game": "vs20rockvegas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rock Vegas",
      "titleKo": "록 베가스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20rockvegas/vs20rockvegas_200x200_NB.png"
    },
    {
      "game": "vswaysrhino",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Great Rhino Megaways",
      "titleKo": "그레이트 라이노 메가웨이즈™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysrhino/vswaysrhino_200x200_NB.png"
    },
    {
      "game": "vs20sbxmas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Bonanza Xmas",
      "titleKo": "스위트 보난자 크리스마스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sbxmas/vs20sbxmas_200x200_NB.png"
    },
    {
      "game": "vs20rnriches",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rolling in Treasures",
      "titleKo": "롤링 인 트레저스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20rnriches/vs20rnriches_200x200_NB.png"
    },
    {
      "game": "vs20xmascarol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Christmas Carol Megaways",
      "titleKo": "크리스마스 캐롤 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20xmascarol/vs20xmascarol_200x200_NB.png"
    },
    {
      "game": "vs12bbb",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bigger Bass Bonanza",
      "titleKo": "더 큰 베스 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs12bbb/vs12bbb_200x200_NB.png"
    },
    {
      "game": "vswayscyclop",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Skullz",
      "titleKo": "와일드 스컬즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscyclop/vswayscyclop_200x200_NB.png"
    },
    {
      "game": "vs20olympxmas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Olympus Xmas 1000",
      "titleKo": "게이트 오브 올림푸스 크리스마스 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olympxmas/vs20olympxmas_200x200_NB.png"
    },
    {
      "game": "vs20portals",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Portals",
      "titleKo": "파이어 포털",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20portals/vs20portals_200x200_NB.png"
    },
    {
      "game": "vs25scolymp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "CULT.",
      "titleKo": "컬트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25scolymp/vs25scolymp_200x200_NB.png"
    },
    {
      "game": "vs5aztecgems",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Gems",
      "titleKo": "아즈텍 젬™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5aztecgems/vs5aztecgems_200x200_NB.png"
    },
    {
      "game": "vs10txbigbass",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Splash",
      "titleKo": "빅 베이스 스플래쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10txbigbass/vs10txbigbass_200x200_NB.png"
    },
    {
      "game": "vs25pandatemple",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Panda Fortune 2",
      "titleKo": "판다의 행운 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25pandatemple/vs25pandatemple_200x200_NB.png"
    },
    {
      "game": "vs20bonzgold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bonanza Gold",
      "titleKo": "보난자 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bonzgold/vs20bonzgold_200x200_NB.png"
    },
    {
      "game": "vswaysanime",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Anime Mecha Megaways",
      "titleKo": "애니메이션 메카 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysanime/vswaysanime_200x200_NB.png"
    },
    {
      "game": "vswayswwriches",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Wild Riches Megaways",
      "titleKo": "와일드 와일드 리치 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswwriches/vswayswwriches_200x200_NB.png"
    },
    {
      "game": "vs25caishen2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chests of Cai Shen 2",
      "titleKo": "체스트스 오브 카이 셴  2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25caishen2/vs25caishen2_200x200_NB.png"
    },
    {
      "game": "vswaysasiatrzn",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Triple Pot Gold",
      "titleKo": "트리플 포트 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysasiatrzn/vswaysasiatrzn_200x200_NB.png"
    },
    {
      "game": "vswaysmjwl2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mummy's Jewels 100",
      "titleKo": "머미스 주얼스 100",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmjwl2/vswaysmjwl2_200x200_NB.png"
    },
    {
      "game": "vs20gtsofhades",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Hades",
      "titleKo": "게이츠 오브 하데스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gtsofhades/vs20gtsofhades_200x200_NB.png"
    },
    {
      "game": "vs20plantaliex",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Plants vs Aliens",
      "titleKo": "식물 대 외계인",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20plantaliex/vs20plantaliex_200x200_NB.png"
    },
    {
      "game": "vs20wwgcluster",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild West Gold Blazing Bounty",
      "titleKo": "와일드 웨스트 골드 블레이징 바운티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20wwgcluster/vs20wwgcluster_200x200_NB.png"
    },
    {
      "game": "vswaysmadame",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Madame Destiny Megaways",
      "titleKo": "마담 데스티니 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmadame/vswaysmadame_200x200_NB.png"
    },
    {
      "game": "vswaysfirest3",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Stampede Ultimate",
      "titleKo": "파이어 스탬피드 얼티밋",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfirest3/vswaysfirest3_200x200_NB.png"
    },
    {
      "game": "vs25goldparty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gold Party",
      "titleKo": "골드 파티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25goldparty/vs25goldparty_200x200_NB.png"
    },
    {
      "game": "vswayspizza",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "PIZZA PIZZA PIZZA",
      "titleKo": "피자 피자 피자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayspizza/vswayspizza_200x200_NB.png"
    },
    {
      "game": "vs20mustanggld2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Clover Gold",
      "titleKo": "클로버 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mustanggld2/vs20mustanggld2_200x200_NB.png"
    },
    {
      "game": "vsways5lionsr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Lions Reborn",
      "titleKo": "5 라이언즈 리본",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vsways5lionsr/vsways5lionsr_200x200_NB.png"
    },
    {
      "game": "vs10bbbnz1000",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Bonanza 1000",
      "titleKo": "빅 베스 보난자 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbbnz1000/vs10bbbnz1000_200x200_NB.png"
    },
    {
      "game": "vs15seoultrain",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Zombie Train",
      "titleKo": "좀비 기차",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15seoultrain/vs15seoultrain_200x200_NB.png"
    },
    {
      "game": "vswaysrockblst",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rocket Blast Megaways",
      "titleKo": "로켓 블라스트 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysrockblst/vswaysrockblst_200x200_NB.png"
    },
    {
      "game": "vswayshammthor",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Power of Thor Megaways",
      "titleKo": "토르의 힘 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayshammthor/vswayshammthor_200x200_NB.png"
    },
    {
      "game": "vs10bbrcdr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Raceday Repeat",
      "titleKo": "빅 배스 레이스데이 리피트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbrcdr/vs10bbrcdr_200x200_NB.png"
    },
    {
      "game": "vs20procountxm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wisdom of Athena 1000 Xmas",
      "titleKo": "아테나의 지혜 1000 Xmas",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20procountxm/vs20procountxm_200x200_NB.png"
    },
    {
      "game": "vs25holiday",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Holiday Ride",
      "titleKo": "홀리데이 라이드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25holiday/vs25holiday_200x200_NB.png"
    },
    {
      "game": "vs20shmnarise",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Pyroth",
      "titleKo": "게이트 오브 파이로스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20shmnarise/vs20shmnarise_200x200_NB.png"
    },
    {
      "game": "vswaysaztecking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec King Megaways",
      "titleKo": "아즈텍 왕 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysaztecking/vswaysaztecking_200x200_NB.png"
    },
    {
      "game": "vs12tropicana",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Club Tropicana",
      "titleKo": "클럽 트로피카나",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs12tropicana/vs12tropicana_200x200_NB.png"
    },
    {
      "game": "vs1024mjwinbns",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mahjong Wins Bonus",
      "titleKo": "마작 승리 보너스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024mjwinbns/vs1024mjwinbns_200x200_NB.png"
    },
    {
      "game": "vs20framazon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fruits of the Amazon",
      "titleKo": "후르츠 오브 더 아마존",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20framazon/vs20framazon_200x200_NB.png"
    },
    {
      "game": "vs20stararx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starlight Archer 1000",
      "titleKo": "별빛 궁수 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20stararx/vs20stararx_200x200_NB.png"
    },
    {
      "game": "vs12bbbxmas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bigger Bass Blizzard - Christmas Catch",
      "titleKo": "비거 베스 블리자드 - 크리스마스 캐치",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs12bbbxmas/vs12bbbxmas_200x200_NB.png"
    },
    {
      "game": "vs20sugarnudge",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sugar Supreme Powernudge",
      "titleKo": "슈가 슈프림 파워넛지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sugarnudge/vs20sugarnudge_200x200_NB.png"
    },
    {
      "game": "vs10floatdrg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Floating Dragon",
      "titleKo": "플로팅 드래곤 홀 앤 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10floatdrg/vs10floatdrg_200x200_NB.png"
    },
    {
      "game": "vs20candvil",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Candy Village",
      "titleKo": "캔디 빌리지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20candvil/vs20candvil_200x200_NB.png"
    },
    {
      "game": "vs10fisheye",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fish Eye",
      "titleKo": "피쉬 아이",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fisheye/vs10fisheye_200x200_NB.png"
    },
    {
      "game": "vs20muertos",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Muertos Multiplier Megaways",
      "titleKo": "뮤어토스 멀티플라이어 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20muertos/vs20muertos_200x200_NB.png"
    },
    {
      "game": "vs20procount",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wisdom of Athena",
      "titleKo": "위즈덤 오브 아테나",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20procount/vs20procount_200x200_NB.png"
    },
    {
      "game": "vs25hotfiesta",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot Fiesta",
      "titleKo": "핫 피에스타",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25hotfiesta/vs25hotfiesta_200x200_NB.png"
    },
    {
      "game": "vs20cleocatra",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cleocatra",
      "titleKo": "클레오카트라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20cleocatra/vs20cleocatra_200x200_NB.png"
    },
    {
      "game": "vs20thunder",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Inca Queen",
      "titleKo": "잉카 퀸",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20thunder/vs20thunder_200x200_NB.png"
    },
    {
      "game": "vs25luckpub",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky's Wild Pub 2",
      "titleKo": "럭키스 와일드 펍 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25luckpub/vs25luckpub_200x200_NB.png"
    },
    {
      "game": "vs4096bufking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Buffalo King",
      "titleKo": "버팔로 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs4096bufking/vs4096bufking_200x200_NB.png"
    },
    {
      "game": "vswayssamurai",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rise of Samurai Megaways",
      "titleKo": "사무라이 메가웨이즈의 등장",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayssamurai/vswayssamurai_200x200_NB.png"
    },
    {
      "game": "vs15samurai4",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rise of Samurai 4",
      "titleKo": "사무라이의 등장 4",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15samurai4/vs15samurai4_200x200_NB.png"
    },
    {
      "game": "vs20sugrux",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sugar Rush Xmas",
      "titleKo": "슈가 러쉬 크리스마스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sugrux/vs20sugrux_200x200_NB.png"
    },
    {
      "game": "vs25tripleps",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Treasures of Osiris",
      "titleKo": "오시리스의 보물",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25tripleps/vs25tripleps_200x200_NB.png"
    },
    {
      "game": "vs10bbhas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass - Hold & Spinner",
      "titleKo": "빅 베이스 - 홀드 & 스피너",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbhas/vs10bbhas_200x200_NB.png"
    },
    {
      "game": "vs20dicegatex",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Olympus 1000 Dice",
      "titleKo": "게이트 오브  올림푸스 1000 다이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20dicegatex/vs20dicegatex_200x200_NB.png"
    },
    {
      "game": "vswaysmwss",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mahjong Wins Super Scatter",
      "titleKo": "마작 승리 슈퍼 스캐터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmwss/vswaysmwss_200x200_NB.png"
    },
    {
      "game": "vs10bbrrp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Reel Repeat",
      "titleKo": "빅 베스 릴 리피트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbrrp/vs10bbrrp_200x200_NB.png"
    },
    {
      "game": "vs20farmfest",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Barn Festival",
      "titleKo": "농장 축제",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20farmfest/vs20farmfest_200x200_NB.png"
    },
    {
      "game": "vs20fruitparty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fruit Party",
      "titleKo": "후르츠 파티™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fruitparty/vs20fruitparty_200x200_NB.png"
    },
    {
      "game": "vs10fdrasbf",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Floating Dragon - Dragon Boat Festival",
      "titleKo": "플로팅 드래곤 - 드래곤 보트 축제 ",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fdrasbf/vs10fdrasbf_200x200_NB.png"
    },
    {
      "game": "vswaysfortsup",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortune Ace Super Scatter",
      "titleKo": "포춘 에이스 슈퍼 스캐터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfortsup/vswaysfortsup_200x200_NB.png"
    },
    {
      "game": "vs10bbfloats",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Floats my Boat",
      "titleKo": "빅 베스 플로트 마이 보트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbfloats/vs10bbfloats_200x200_NB.png"
    },
    {
      "game": "vs25checaishen",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chests of Cai Shen",
      "titleKo": "카이셴의 상자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25checaishen/vs25checaishen_200x200_NB.png"
    },
    {
      "game": "vs20gatotgates",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Gatot Kaca",
      "titleKo": "게이트 오브 가토 카카",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gatotgates/vs20gatotgates_200x200_NB.png"
    },
    {
      "game": "vs10bbbonanza",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Bonanza",
      "titleKo": "빅 베스 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbbonanza/vs10bbbonanza_200x200_NB.png"
    },
    {
      "game": "vs40samurai3",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rise of Samurai 3",
      "titleKo": "라이즈 오브 사무라이3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40samurai3/vs40samurai3_200x200_NB.png"
    },
    {
      "game": "vswayswildwest",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild West Gold Megaways",
      "titleKo": "와일드 웨스트 골드 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswildwest/vswayswildwest_200x200_NB.png"
    },
    {
      "game": "vswaysrsm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Celebrity Bus Megaways",
      "titleKo": "와일드 셀레브리티 버스 메가웨이",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysrsm/vswaysrsm_200x200_NB.png"
    },
    {
      "game": "vs10returndead",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Return of the Dead",
      "titleKo": "죽은 자의 귀환",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10returndead/vs10returndead_200x200_NB.png"
    },
    {
      "game": "vswayscyhecity",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cyberheist City",
      "titleKo": "사이버하이스트 시티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscyhecity/vswayscyhecity_200x200_NB.png"
    },
    {
      "game": "vs10bhallbnza",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Halloween",
      "titleKo": "빅 베스 할로윈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bhallbnza/vs10bhallbnza_200x200_NB.png"
    },
    {
      "game": "vs20mammoth",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mammoth Gold Megaways",
      "titleKo": "맘모스 골드 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mammoth/vs20mammoth_200x200_NB.png"
    },
    {
      "game": "vs243lionsgold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Lions Gold",
      "titleKo": "5 라이언즈 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243lionsgold/vs243lionsgold_200x200_NB.png"
    },
    {
      "game": "vswaystonypzz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Peppe's Pepperoni Pizza Plaza",
      "titleKo": "페피즈 페퍼로우니 피자 플라자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaystonypzz/vswaystonypzz_200x200_NB.png"
    },
    {
      "game": "vs20bnnzdice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Bonanza Dice",
      "titleKo": "스위트 보난자 다이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bnnzdice/vs20bnnzdice_200x200_NB.png"
    },
    {
      "game": "vs10bbsplashx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Splash 1000",
      "titleKo": "빅 베이스 스플래시 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbsplashx/vs10bbsplashx_200x200_NB.png"
    },
    {
      "game": "vs12scode",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Samurai Code",
      "titleKo": "사무라이 코드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs12scode/vs12scode_200x200_NB.png"
    },
    {
      "game": "vs20ninjapower",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Power of Ninja",
      "titleKo": "파워 오브 닌자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20ninjapower/vs20ninjapower_200x200_NB.png"
    },
    {
      "game": "vs10bbbbrnd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Boxing Bonus Round",
      "titleKo": "빅 베스 복싱 보너스 라운드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbbbrnd/vs10bbbbrnd_200x200_NB.png"
    },
    {
      "game": "vswaysluckyfish",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Fishing Megaways",
      "titleKo": "럭키 피싱 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysluckyfish/vswaysluckyfish_200x200_NB.png"
    },
    {
      "game": "vs10bxmasbnza",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Christmas Big Bass Bonanza",
      "titleKo": "크리스마스 빅 베이스 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bxmasbnza/vs10bxmasbnza_200x200_NB.png"
    },
    {
      "game": "vs1024mahjwins",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mahjong Wins",
      "titleKo": "마종 윈즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024mahjwins/vs1024mahjwins_200x200_NB.png"
    },
    {
      "game": "vswaysreelbtl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Zeus vs Typhon",
      "titleKo": "제우스 vs 타이폰",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysreelbtl/vswaysreelbtl_200x200_NB.png"
    },
    {
      "game": "vs25copsrobbers",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cash Patrol",
      "titleKo": "캐쉬 패트롤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25copsrobbers/vs25copsrobbers_200x200_NB.png"
    },
    {
      "game": "vswayswildb",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bloody Dawn",
      "titleKo": "피의 새벽",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswildb/vswayswildb_200x200_NB.png"
    },
    {
      "game": "vs10fdwhorses",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Floating Dragon Wild Horses",
      "titleKo": "플로팅 드래곤 와일드 호스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fdwhorses/vs10fdwhorses_200x200_NB.png"
    },
    {
      "game": "vs5tikistrike",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Super Tiki Strike",
      "titleKo": "슈퍼 티키 스트라이크",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5tikistrike/vs5tikistrike_200x200_NB.png"
    },
    {
      "game": "vswaysbooboo",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Furry Bonanza Megaways",
      "titleKo": "퍼리 보난자 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbooboo/vswaysbooboo_200x200_NB.png"
    },
    {
      "game": "vswaysstampede",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Stampede",
      "titleKo": "파이어 스탬피드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysstampede/vswaysstampede_200x200_NB.png"
    },
    {
      "game": "vs20olympdice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Olympus Dice",
      "titleKo": "게이트 오브 올림푸스 다이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olympdice/vs20olympdice_200x200_NB.png"
    },
    {
      "game": "vswaysfirest2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Stampede 2",
      "titleKo": "파이어 스탬피드 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfirest2/vswaysfirest2_200x200_NB.png"
    },
    {
      "game": "vswayszombcarn",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Zombie Carnival",
      "titleKo": "좀비 카니발",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayszombcarn/vswayszombcarn_200x200_NB.png"
    },
    {
      "game": "vs20wildparty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "3 Buzzing Wilds",
      "titleKo": "3 버징 와일드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20wildparty/vs20wildparty_200x200_NB.png"
    },
    {
      "game": "vswaysresurich",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Resurrecting Riches",
      "titleKo": "부의 부활",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysresurich/vswaysresurich_200x200_NB.png"
    },
    {
      "game": "vs20doghouse2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dog House - Dog or Alive",
      "titleKo": "도그 하우스 - 도그 오어 얼라이브",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20doghouse2/vs20doghouse2_200x200_NB.png"
    },
    {
      "game": "vs10stmreels",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Steamin' Reels",
      "titleKo": "스티민 릴즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10stmreels/vs10stmreels_200x200_NB.png"
    },
    {
      "game": "vswaysbandit",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bandit Megaways",
      "titleKo": "밴딧 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbandit/vswaysbandit_200x200_NB.png"
    },
    {
      "game": "vs20asgard",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Kingdom of Asgard",
      "titleKo": "킹덤 오브 아스가르드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20asgard/vs20asgard_200x200_NB.png"
    },
    {
      "game": "vs5supergummy",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Super Gummy Strike",
      "titleKo": "슈퍼 구미 스트라이크",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5supergummy/vs5supergummy_200x200_NB.png"
    },
    {
      "game": "vs20mochimon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mochimon",
      "titleKo": "모치몬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mochimon/vs20mochimon_200x200_NB.png"
    },
    {
      "game": "vswayscheist",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Casino Heist Megaways",
      "titleKo": "카지노 강도 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscheist/vswayscheist_200x200_NB.png"
    },
    {
      "game": "vs10bblotgl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass - Secrets of the Golden Lake",
      "titleKo": "빅 베이스 - 황금 호수의 비밀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bblotgl/vs10bblotgl_200x200_NB.png"
    },
    {
      "game": "vs20doghousemh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dog House Multihold",
      "titleKo": "도그 하우스 멀티홀드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20doghousemh/vs20doghousemh_200x200_NB.png"
    },
    {
      "game": "vs7776aztec",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Bonanza",
      "titleKo": "아즈텍 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs7776aztec/vs7776aztec_200x200_NB.png"
    },
    {
      "game": "vs243mwarrior",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Monkey Warrior",
      "titleKo": "몽키 워리어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243mwarrior/vs243mwarrior_200x200_NB.png"
    },
    {
      "game": "vs40pirate",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pirate Gold",
      "titleKo": "파이럿 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40pirate/vs40pirate_200x200_NB.png"
    },
    {
      "game": "vs20goldclust",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rabbit Garden",
      "titleKo": "래빗 가든",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20goldclust/vs20goldclust_200x200_NB.png"
    },
    {
      "game": "vs10fruity2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Extra Juicy",
      "titleKo": "엑스트라 주시",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fruity2/vs10fruity2_200x200_NB.png"
    },
    {
      "game": "vs10egyptcls",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ancient Egypt Classic",
      "titleKo": "에인션트 이집트 클래식",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10egyptcls/vs10egyptcls_200x200_NB.png"
    },
    {
      "game": "vs20dhsuper",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dog House - Royal Hunt",
      "titleKo": "더 도그 하우스 - 로열 헌트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20dhsuper/vs20dhsuper_200x200_NB.png"
    },
    {
      "game": "vs20fortbon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fruity Treats",
      "titleKo": "과일 간식",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fortbon/vs20fortbon_200x200_NB.png"
    },
    {
      "game": "vs20candybltz2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Candy Blitz Bombs",
      "titleKo": "캔디 블리츠 폭탄",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20candybltz2/vs20candybltz2_200x200_NB.png"
    },
    {
      "game": "vs20dhcluster2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dog House - Muttley Crew",
      "titleKo": "더 도그 하우스 - 멀티 크루",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20dhcluster2/vs20dhcluster2_200x200_NB.png"
    },
    {
      "game": "vswaysgoldcol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mustang Gold Megaways",
      "titleKo": "머스탱 골드 메가웨이",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysgoldcol/vswaysgoldcol_200x200_NB.png"
    },
    {
      "game": "vs10bbdoubled",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Vegas Double Down Deluxe",
      "titleKo": "빅 배스 베가스 더블 다운 디럭스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbdoubled/vs10bbdoubled_200x200_NB.png"
    },
    {
      "game": "vs10spellmastr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Spellmaster",
      "titleKo": "스펠마스터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10spellmastr/vs10spellmastr_200x200_NB.png"
    },
    {
      "game": "vs20minerush",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mining Rush",
      "titleKo": "마이닝 러시",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20minerush/vs20minerush_200x200_NB.png"
    },
    {
      "game": "vs25wolfgmm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "3 Magic Eggs",
      "titleKo": "3개의 마법의 알",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25wolfgmm/vs25wolfgmm_200x200_NB.png"
    },
    {
      "game": "vswaysmonkey",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "3 Dancing Monkeys",
      "titleKo": "3 댄싱 몽키즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmonkey/vswaysmonkey_200x200_NB.png"
    },
    {
      "game": "vs20dugems",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot Pepper",
      "titleKo": "핫 페퍼",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20dugems/vs20dugems_200x200_NB.png"
    },
    {
      "game": "vs12trpcnhour",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Club Tropicana - Happy Hour",
      "titleKo": "클럽 트로피카나 - 해피 아워",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs12trpcnhour/vs12trpcnhour_200x200_NB.png"
    },
    {
      "game": "vs20chestcol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Craze",
      "titleKo": "달콤한 열기",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20chestcol/vs20chestcol_200x200_NB.png"
    },
    {
      "game": "vs15fghtmultlv",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Angel vs Sinner",
      "titleKo": "엔젤 대 시너",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15fghtmultlv/vs15fghtmultlv_200x200_NB.png"
    },
    {
      "game": "vs10eyestorm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Eye of the Storm",
      "titleKo": "아이 오브 더 스톰",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10eyestorm/vs10eyestorm_200x200_NB.png"
    },
    {
      "game": "vs5luckytwr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Tut's Treasure Tower",
      "titleKo": "투츠 트레저 타워",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckytwr/vs5luckytwr_200x200_NB.png"
    },
    {
      "game": "vs20olympgrace",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Grace of Ebisu",
      "titleKo": "그레이스 오브 에비스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20olympgrace/vs20olympgrace_200x200_NB.png"
    },
    {
      "game": "vswaysfrywld",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Spin & Score Megaways",
      "titleKo": "스핀 & 스코어 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfrywld/vswaysfrywld_200x200_NB.png"
    },
    {
      "game": "vs20clustwild",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sticky Bees",
      "titleKo": "스티키 비",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20clustwild/vs20clustwild_200x200_NB.png"
    },
    {
      "game": "vs20schristmas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starlight Christmas",
      "titleKo": "스타라이트 크리스마스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20schristmas/vs20schristmas_200x200_NB.png"
    },
    {
      "game": "vs20goldfever",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gems Bonanza",
      "titleKo": "보석 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20goldfever/vs20goldfever_200x200_NB.png"
    },
    {
      "game": "vswayslight",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Lightning",
      "titleKo": "럭키 라이트닝",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayslight/vswayslight_200x200_NB.png"
    },
    {
      "game": "vs20sugarcoins",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Viking Forge",
      "titleKo": "바이킹의 대장간",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sugarcoins/vs20sugarcoins_200x200_NB.png"
    },
    {
      "game": "vs20stickywild",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Bison Charge",
      "titleKo": "와일드 바이손 차지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20stickywild/vs20stickywild_200x200_NB.png"
    },
    {
      "game": "vs10bhallbnza3",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Halloween 3",
      "titleKo": "빅 배스 할로윈 3",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bhallbnza3/vs10bhallbnza3_200x200_NB.png"
    },
    {
      "game": "vs10fingerlfs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Finger Lick'n Free Spins",
      "titleKo": "핑거 리킹 프리스핀즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fingerlfs/vs10fingerlfs_200x200_NB.png"
    },
    {
      "game": "vswaysxjuicy",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Extra Juicy Megaways",
      "titleKo": "엑스트라 쥬시 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysxjuicy/vswaysxjuicy_200x200_NB.png"
    },
    {
      "game": "vs20pistols",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild West Duels",
      "titleKo": "와일드 웨스트 듀얼스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20pistols/vs20pistols_200x200_NB.png"
    },
    {
      "game": "vswaysolwfp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Olympus Wins",
      "titleKo": "올림푸스 승리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysolwfp/vswaysolwfp_200x200_NB.png"
    },
    {
      "game": "vs10tictac",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Tic Tac Take",
      "titleKo": "틱 택 테이크",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10tictac/vs10tictac_200x200_NB.png"
    },
    {
      "game": "vswaysbbarnh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bigger Barn House Bonanza",
      "titleKo": "빅터 반 하우스 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbbarnh/vswaysbbarnh_200x200_NB.png"
    },
    {
      "game": "vs20slmpop",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Slime Pop",
      "titleKo": "슬라임 팝",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20slmpop/vs20slmpop_200x200_NB.png"
    },
    {
      "game": "vs243lions",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Lions",
      "titleKo": "5라이온스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243lions/vs243lions_200x200_NB.png"
    },
    {
      "game": "vs10bbkir",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Bonanza - Keeping it Reel",
      "titleKo": "빅 배스 보난자 - 키핑 잇 릴",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbkir/vs10bbkir_200x200_NB.png"
    },
    {
      "game": "vswayswildbrst",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Witch Heart Megaways",
      "titleKo": "마녀 심장 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswildbrst/vswayswildbrst_200x200_NB.png"
    },
    {
      "game": "vs20mkrush",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wukong Rush",
      "titleKo": "우콩 러쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mkrush/vs20mkrush_200x200_NB.png"
    },
    {
      "game": "vs10bbglxmas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Christmas - Frozen Lake",
      "titleKo": "빅 배스 크리스마스 - 프로즌 레이크",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbglxmas/vs10bbglxmas_200x200_NB.png"
    },
    {
      "game": "vs20rhinoluxe",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Great Rhino Deluxe",
      "titleKo": "그레이트 라이노 디럭스™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20rhinoluxe/vs20rhinoluxe_200x200_NB.png"
    },
    {
      "game": "vs20dhdice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dog House Dice Show",
      "titleKo": "더 도그 하우스 다이스 쇼우",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20dhdice/vs20dhdice_200x200_NB.png"
    },
    {
      "game": "vs10bookfallen",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book of Fallen",
      "titleKo": "북 오브 팔런",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bookfallen/vs10bookfallen_200x200_NB.png"
    },
    {
      "game": "vs40cosmiccash",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cosmic Cash",
      "titleKo": "코스믹 캐시",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40cosmiccash/vs40cosmiccash_200x200_NB.png"
    },
    {
      "game": "vs40hmrstrm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hammerstorm",
      "titleKo": "해머스톰",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40hmrstrm/vs40hmrstrm_200x200_NB.png"
    },
    {
      "game": "vswaysbattlegz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Battle Ground Zero Megaways",
      "titleKo": "배틀 그라운드 제로 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbattlegz/vswaysbattlegz_200x200_NB.png"
    },
    {
      "game": "vs10beekeep",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bee Keeper",
      "titleKo": "비 키퍼",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10beekeep/vs10beekeep_200x200_NB.png"
    },
    {
      "game": "vs20mmdtres",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mermaid's Treasure Trove",
      "titleKo": "머메이즈 트레저 트로우브",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mmdtres/vs20mmdtres_200x200_NB.png"
    },
    {
      "game": "vs5magicdoor",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "6 Jokers",
      "titleKo": "식스 조우커즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5magicdoor/vs5magicdoor_200x200_NB.png"
    },
    {
      "game": "vs20santawonder",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Santa's Wonderland",
      "titleKo": "산타의 원더랜드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20santawonder/vs20santawonder_200x200_NB.png"
    },
    {
      "game": "vswayswildgang",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Wild Gang",
      "titleKo": "더 와일드 갱",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswildgang/vswayswildgang_200x200_NB.png"
    },
    {
      "game": "vs10firestrike",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Strike",
      "titleKo": "파이어 스트라이크",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10firestrike/vs10firestrike_200x200_NB.png"
    },
    {
      "game": "vs12bgrbspl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bigger Bass Splash",
      "titleKo": "비거 베스 스플래시",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs12bgrbspl/vs12bgrbspl_200x200_NB.png"
    },
    {
      "game": "vs20phoenixf",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Phoenix Forge",
      "titleKo": "피닉스 포지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20phoenixf/vs20phoenixf_200x200_NB.png"
    },
    {
      "game": "vs20terrorv",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cash Elevator",
      "titleKo": "캐시 엘리베이터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20terrorv/vs20terrorv_200x200_NB.png"
    },
    {
      "game": "vs10hottuna",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot Tuna",
      "titleKo": "핫 튜나",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10hottuna/vs10hottuna_200x200_NB.png"
    },
    {
      "game": "vswaysbkingasc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Buffalo King Untamed Megaways",
      "titleKo": "길들여지지 않은 메가웨이즈 버팔로 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbkingasc/vswaysbkingasc_200x200_NB.png"
    },
    {
      "game": "vswayssw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starlight Wins",
      "titleKo": "스타라이트 윈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayssw/vswayssw_200x200_NB.png"
    },
    {
      "game": "vs20aztecgates",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Aztec",
      "titleKo": "게이츠 오브 아즈텍",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20aztecgates/vs20aztecgates_200x200_NB.png"
    },
    {
      "game": "vs20midas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Hand of Midas",
      "titleKo": "마이다스의 손",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20midas/vs20midas_200x200_NB.png"
    },
    {
      "game": "vs20hburnhs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot to Burn Hold and Spin",
      "titleKo": "핫 투 번 홀드 앤 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20hburnhs/vs20hburnhs_200x200_NB.png"
    },
    {
      "game": "vswaysaztec",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Gems Megaways",
      "titleKo": "아즈텍 젬 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysaztec/vswaysaztec_200x200_NB.png"
    },
    {
      "game": "vs10spiritadv",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Spirit of Adventure",
      "titleKo": "모험 정신",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10spiritadv/vs10spiritadv_200x200_NB.png"
    },
    {
      "game": "vs20candyblitz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Candy Blitz",
      "titleKo": "캔디 블리츠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20candyblitz/vs20candyblitz_200x200_NB.png"
    },
    {
      "game": "vswayscharms",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Frozen Charms Megaways",
      "titleKo": "5 프로즌 참즈 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscharms/vswayscharms_200x200_NB.png"
    },
    {
      "game": "vswayssevenc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "7 Clovers of Fortune",
      "titleKo": "7 클로버 오브 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayssevenc/vswayssevenc_200x200_NB.png"
    },
    {
      "game": "vs10bhallbnza2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Halloween 2",
      "titleKo": "빅 배스 할로윈 24",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bhallbnza2/vs10bhallbnza2_200x200_NB.png"
    },
    {
      "game": "vswayslofhero",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Legend of Heroes Megaways",
      "titleKo": "레전드 오브 히어로즈 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayslofhero/vswayslofhero_200x200_NB.png"
    },
    {
      "game": "vs9aztecgemsdx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Gems Deluxe",
      "titleKo": "아즈텍 보석 디럭스™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9aztecgemsdx/vs9aztecgemsdx_200x200_NB.png"
    },
    {
      "game": "vs20gembondx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bow of Artemis",
      "titleKo": "아르테미스의 활",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gembondx/vs20gembondx_200x200_NB.png"
    },
    {
      "game": "vs4096magician",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Magician's Secrets",
      "titleKo": "마법사의 비밀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs4096magician/vs4096magician_200x200_NB.png"
    },
    {
      "game": "vswaysyumyum",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Yum Yum Powerways",
      "titleKo": "냠냠 파워웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysyumyum/vswaysyumyum_200x200_NB.png"
    },
    {
      "game": "vs10cowgold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cowboys Gold",
      "titleKo": "카우보이 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10cowgold/vs10cowgold_200x200_NB.png"
    },
    {
      "game": "vs50fatfrogs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Tiny Toads",
      "titleKo": "타이니 토드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50fatfrogs/vs50fatfrogs_200x200_NB.png"
    },
    {
      "game": "vs10bbsplxmas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Christmas Bash",
      "titleKo": "빅 베스 크리스마스 배쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbsplxmas/vs10bbsplxmas_200x200_NB.png"
    },
    {
      "game": "vs20fparty2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fruit Party 2",
      "titleKo": "후르츠 파티 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fparty2/vs20fparty2_200x200_NB.png"
    },
    {
      "game": "vs243goldfor",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "888 Bonanza",
      "titleKo": "888 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243goldfor/vs243goldfor_200x200_NB.png"
    },
    {
      "game": "vswayscryscav",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Crystal Caverns Megaways",
      "titleKo": "크리스탈 캐번 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscryscav/vswayscryscav_200x200_NB.png"
    },
    {
      "game": "vs20octobeer",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Octobeer Fortunes",
      "titleKo": "악토비어 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20octobeer/vs20octobeer_200x200_NB.png"
    },
    {
      "game": "vs25sleepdrag",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sleeping Dragon",
      "titleKo": "슬리핑 드래곤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25sleepdrag/vs25sleepdrag_200x200_NB.png"
    },
    {
      "game": "vswaysfuryodin",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fury of Odin Megaways",
      "titleKo": "퓨리 오브 오딘 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfuryodin/vswaysfuryodin_200x200_NB.png"
    },
    {
      "game": "vs1024gmayhem",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gorilla Mayhem",
      "titleKo": "고릴라 메이햄",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024gmayhem/vs1024gmayhem_200x200_NB.png"
    },
    {
      "game": "vs5bb3reeler",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Bonanza 3 Reeler",
      "titleKo": "빅 베이스 보난자 3 릴러",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5bb3reeler/vs5bb3reeler_200x200_NB.png"
    },
    {
      "game": "vswayswildeq",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wheel of Happiness",
      "titleKo": "행복의 룰렛",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswildeq/vswayswildeq_200x200_NB.png"
    },
    {
      "game": "vs10bbextreme",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Amazon Xtreme",
      "titleKo": "빅 베스 아마존 익스트림",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbextreme/vs10bbextreme_200x200_NB.png"
    },
    {
      "game": "vs25scarabqueen",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "John Hunter and the Tomb of the Scarab Queen",
      "titleKo": "존 헌터와 스카라브 퀸의 무덤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25scarabqueen/vs25scarabqueen_200x200_NB.png"
    },
    {
      "game": "vs25goldpartya",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gold Party 2 - After Hours",
      "titleKo": "골드 파티 2 - 애프터 아워즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25goldpartya/vs25goldpartya_200x200_NB.png"
    },
    {
      "game": "vswaysstrlght",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortunes of Aztec",
      "titleKo": "포춘 오브 아즈텍",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysstrlght/vswaysstrlght_200x200_NB.png"
    },
    {
      "game": "vs5ultrab",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ultra Burn",
      "titleKo": "울트라 번",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5ultrab/vs5ultrab_200x200_NB.png"
    },
    {
      "game": "vs20drgbless",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dragon Hero",
      "titleKo": "드래곤 히어로",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20drgbless/vs20drgbless_200x200_NB.png"
    },
    {
      "game": "vs10gbseries",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fiesta Fortune",
      "titleKo": "피에스타 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10gbseries/vs10gbseries_200x200_NB.png"
    },
    {
      "game": "vswaysfltdrg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Floating Dragon Hold & Spin Megaways",
      "titleKo": "플로팅 드래곤 홀드 & 스핀 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfltdrg/vswaysfltdrg_200x200_NB.png"
    },
    {
      "game": "vs20midas2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hand of Midas 2",
      "titleKo": "마이다스의 손 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20midas2/vs20midas2_200x200_NB.png"
    },
    {
      "game": "vs10powerlines",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Peak Power",
      "titleKo": "픽 파워",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10powerlines/vs10powerlines_200x200_NB.png"
    },
    {
      "game": "vs10bbfmission",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Mission Fishin'",
      "titleKo": "빅 베이스 미션 피신",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbfmission/vs10bbfmission_200x200_NB.png"
    },
    {
      "game": "vs20forge",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Forge of Olympus",
      "titleKo": "포그 오브 올림푸스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20forge/vs20forge_200x200_NB.png"
    },
    {
      "game": "vs5jokerjc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker's Jewels Cash",
      "titleKo": "조커스 주얼즈 캐쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5jokerjc/vs5jokerjc_200x200_NB.png"
    },
    {
      "game": "vs20excalibur",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Excalibur Unleashed",
      "titleKo": "엑스칼리버 언리쉬드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20excalibur/vs20excalibur_200x200_NB.png"
    },
    {
      "game": "vs20speark",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "King of Spear",
      "titleKo": "창의 왕",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20speark/vs20speark_200x200_NB.png"
    },
    {
      "game": "vs20heartcleo",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Heart of Cleopatra",
      "titleKo": "하트 오브 클레오파트라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20heartcleo/vs20heartcleo_200x200_NB.png"
    },
    {
      "game": "vs20dhcluster",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Twilight Princess",
      "titleKo": "트와일라잇 프린세스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20dhcluster/vs20dhcluster_200x200_NB.png"
    },
    {
      "game": "vs4096robber",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Robber Strike",
      "titleKo": "라버 스트라익",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs4096robber/vs4096robber_200x200_NB.png"
    },
    {
      "game": "vs20laughluck",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Happy Fortune",
      "titleKo": "해피 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20laughluck/vs20laughluck_200x200_NB.png"
    },
    {
      "game": "vs10dublin",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Emerald King - Wheel of Wealth",
      "titleKo": "에메랄드 킹 - 휠 오브 웰스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10dublin/vs10dublin_200x200_NB.png"
    },
    {
      "game": "vswayshuffpbh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dragon Tiger Fortunes",
      "titleKo": "드래곤 타이거 포춘스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayshuffpbh/vswayshuffpbh_200x200_NB.png"
    },
    {
      "game": "vs20mahjxbnz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mahjong X",
      "titleKo": "마작 X",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mahjxbnz/vs20mahjxbnz_200x200_NB.png"
    },
    {
      "game": "vs1tigers",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Triple Tigers",
      "titleKo": "트리플 타이거스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1tigers/vs1tigers_200x200_NB.png"
    },
    {
      "game": "vs20cbrhst",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cyber Heist",
      "titleKo": "사이버 하이스트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20cbrhst/vs20cbrhst_200x200_NB.png"
    },
    {
      "game": "ar1chickrush",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chicken+",
      "titleKo": "치킨 플러스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/ar1chickrush/ar1chickrush_200x200_NB.png"
    },
    {
      "game": "vswaysbbb",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Bonanza Megaways",
      "titleKo": "빅 배스 보난자 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbbb/vswaysbbb_200x200_NB.png"
    },
    {
      "game": "vs20rhino",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Great Rhino",
      "titleKo": "그레이트 라이노™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20rhino/vs20rhino_200x200_NB.png"
    },
    {
      "game": "vs20eightdragons",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "8 Dragons",
      "titleKo": "8드래곤즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20eightdragons/vs20eightdragons_200x200_NB.png"
    },
    {
      "game": "vs25wildspells",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Spells",
      "titleKo": "와일드 스펠즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25wildspells/vs25wildspells_200x200_NB.png"
    },
    {
      "game": "vs576treasures",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Wild Riches",
      "titleKo": "와일드 와일드 리치즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs576treasures/vs576treasures_200x200_NB.png"
    },
    {
      "game": "vs20bigdawgs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Big Dawgs",
      "titleKo": "더 빅 도그스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bigdawgs/vs20bigdawgs_200x200_NB.png"
    },
    {
      "game": "vswayswwrichr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Wild Riches Returns",
      "titleKo": "와일드 와일드 리치즈 리턴즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswwrichr/vswayswwrichr_200x200_NB.png"
    },
    {
      "game": "vs20bchprty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Beach Party",
      "titleKo": "와일드 비치 파티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bchprty/vs20bchprty_200x200_NB.png"
    },
    {
      "game": "vswaysacnd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Anaconda Gold",
      "titleKo": "아나콘다 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysacnd/vswaysacnd_200x200_NB.png"
    },
    {
      "game": "vswayskrakenmw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Release the Kraken Megaways",
      "titleKo": "릴리스 크라켄 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayskrakenmw/vswayskrakenmw_200x200_NB.png"
    },
    {
      "game": "vs432congocash",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Congo Cash",
      "titleKo": "콩고 캐시",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs432congocash/vs432congocash_200x200_NB.png"
    },
    {
      "game": "vs10bbbrlact",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Bonanza - Reel Action",
      "titleKo": "빅베이스 보난자 - 릴 액션",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbbrlact/vs10bbbrlact_200x200_NB.png"
    },
    {
      "game": "ar10plinko",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Plinko+",
      "titleKo": "플린코+",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/ar10plinko/ar10plinko_200x200_NB.png"
    },
    {
      "game": "vs5super7",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Super 7s ",
      "titleKo": "Super 7s ",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5super7/vs5super7_200x200_NB.png"
    },
    {
      "game": "vswaysmjwl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mummy's Jewels",
      "titleKo": "미라의 보석",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmjwl/vswaysmjwl_200x200_NB.png"
    },
    {
      "game": "vs20porbs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Santa's Great Gifts",
      "titleKo": "산타 그레이트 키프트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20porbs/vs20porbs_200x200_NB.png"
    },
    {
      "game": "vs25aztecking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec King",
      "titleKo": "아즈텍 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25aztecking/vs25aztecking_200x200_NB.png"
    },
    {
      "game": "vs5luckycol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Fortune Tree",
      "titleKo": "럭키 포천 트리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckycol/vs5luckycol_200x200_NB.png"
    },
    {
      "game": "vs40infwild",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Infective Wild",
      "titleKo": "인펙티브 와일드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40infwild/vs40infwild_200x200_NB.png"
    },
    {
      "game": "vs20trswild2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Black Bull",
      "titleKo": "블랙 불",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20trswild2/vs20trswild2_200x200_NB.png"
    },
    {
      "game": "vs20trsbox",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Treasure Wild",
      "titleKo": "트래저 와일드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20trsbox/vs20trsbox_200x200_NB.png"
    },
    {
      "game": "vs10bbrttr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Return to the Races",
      "titleKo": "빅 베스 리턴 투 더 레이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbrttr/vs10bbrttr_200x200_NB.png"
    },
    {
      "game": "vs20oragold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Oracle of Gold",
      "titleKo": "오어러컬 오브 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20oragold/vs20oragold_200x200_NB.png"
    },
    {
      "game": "vs10jpblaze",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jackpot Blaze",
      "titleKo": "잭팟 블레이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10jpblaze/vs10jpblaze_200x200_NB.png"
    },
    {
      "game": "vswayschilhtwo",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Captain Kraken Megaways",
      "titleKo": "크라켄 선장 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayschilhtwo/vswayschilhtwo_200x200_NB.png"
    },
    {
      "game": "vs20supermania",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Supermania",
      "titleKo": "슈퍼마니아",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20supermania/vs20supermania_200x200_NB.png"
    },
    {
      "game": "vswaysultrcoin",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cowboy Coins",
      "titleKo": "카우보이 코인스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysultrcoin/vswaysultrcoin_200x200_NB.png"
    },
    {
      "game": "vs25rlbank",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Reel Banks",
      "titleKo": "릴 뱅크스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25rlbank/vs25rlbank_200x200_NB.png"
    },
    {
      "game": "vs5ultra",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ultra Hold and Spin",
      "titleKo": "울트라 홀드 앤 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5ultra/vs5ultra_200x200_NB.png"
    },
    {
      "game": "vs20superlanche",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Monster Superlanche",
      "titleKo": "몬스터 수퍼렌치",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20superlanche/vs20superlanche_200x200_NB.png"
    },
    {
      "game": "vs40pdmrsg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pandemic Rising",
      "titleKo": "팬데믹 라이징",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40pdmrsg/vs40pdmrsg_200x200_NB.png"
    },
    {
      "game": "vs5luckyt1kly",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Tiger 1000",
      "titleKo": "럭키 타이거 1000",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckyt1kly/vs5luckyt1kly_200x200_NB.png"
    },
    {
      "game": "vs20bhunter",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bounty Hunter",
      "titleKo": "바운티 헌터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bhunter/vs20bhunter_200x200_NB.png"
    },
    {
      "game": "vs20cjcluster",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Candy Jar Clusters",
      "titleKo": "캔디 자아 클러스터즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20cjcluster/vs20cjcluster_200x200_NB.png"
    },
    {
      "game": "vs25mustang",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mustang Gold",
      "titleKo": "머스탱 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25mustang/vs25mustang_200x200_NB.png"
    },
    {
      "game": "vswaysbbhas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Hold & Spinner Megaways",
      "titleKo": "빅 베스 홀드 & 스핀 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbbhas/vswaysbbhas_200x200_NB.png"
    },
    {
      "game": "vs30bingomania",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bingo Mania",
      "titleKo": "빙고 마니아",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs30bingomania/vs30bingomania_200x200_NB.png"
    },
    {
      "game": "vs25rio",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Heart of Rio",
      "titleKo": "하트 오브 리오",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25rio/vs25rio_200x200_NB.png"
    },
    {
      "game": "vs10chillihmr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chilli Heat Spicy Spins",
      "titleKo": "칠리 히트 스파이시 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10chillihmr/vs10chillihmr_200x200_NB.png"
    },
    {
      "game": "vs10gizagods",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gods of Giza",
      "titleKo": "갓 오브 기자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10gizagods/vs10gizagods_200x200_NB.png"
    },
    {
      "game": "vswaysbrickhos",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Brick House Bonanza",
      "titleKo": "브릭 하우스 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbrickhos/vswaysbrickhos_200x200_NB.png"
    },
    {
      "game": "ar1minehnt",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mines+",
      "titleKo": "마인즈+",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/ar1minehnt/ar1minehnt_200x200_NB.png"
    },
    {
      "game": "vswaysmegwghts",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sumo Supreme Megaways",
      "titleKo": "스모 슈프림 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmegwghts/vswaysmegwghts_200x200_NB.png"
    },
    {
      "game": "vs10dgold88",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dragon Gold 88",
      "titleKo": "드래곤 골드 88",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10dgold88/vs10dgold88_200x200_NB.png"
    },
    {
      "game": "vs25chilli",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chilli Heat",
      "titleKo": "칠리 히트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25chilli/vs25chilli_200x200_NB.png"
    },
    {
      "game": "vs20bigmass",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Waves of Poseidon",
      "titleKo": "웨이브 오브 포세이돈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bigmass/vs20bigmass_200x200_NB.png"
    },
    {
      "game": "vs25luckwildpb",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky's Wild Pub",
      "titleKo": "럭키스  와일드 펍",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25luckwildpb/vs25luckwildpb_200x200_NB.png"
    },
    {
      "game": "vs1024fortune",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortune Ace",
      "titleKo": "포춘 에이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024fortune/vs1024fortune_200x200_NB.png"
    },
    {
      "game": "vs10cenrlgdevl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Knights vs Barbarians",
      "titleKo": "나이츠 vs 바바리안즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10cenrlgdevl/vs10cenrlgdevl_200x200_NB.png"
    },
    {
      "game": "vswaysconcoll",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Firebird Spirit - Connect & Collect",
      "titleKo": "파이어버드 스피릿 - 커넥트 & 콜렉트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysconcoll/vswaysconcoll_200x200_NB.png"
    },
    {
      "game": "vs40spartaking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Spartan King",
      "titleKo": "스파르탄 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40spartaking/vs40spartaking_200x200_NB.png"
    },
    {
      "game": "vswayselements",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Elemental Gems Megaways",
      "titleKo": "엘리멘탈 보석 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayselements/vswayselements_200x200_NB.png"
    },
    {
      "game": "vs20frankie",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Frightening Frankie",
      "titleKo": "프라이터닝 프랭키",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20frankie/vs20frankie_200x200_NB.png"
    },
    {
      "game": "vs40bigjuan",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Juan",
      "titleKo": "빅 후안",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40bigjuan/vs40bigjuan_200x200_NB.png"
    },
    {
      "game": "vswaysloki",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Revenge of Loki Megaways",
      "titleKo": "로키 메가웨이즈의 복수",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysloki/vswaysloki_200x200_NB.png"
    },
    {
      "game": "vs25btygold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bounty Gold",
      "titleKo": "바운티 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25btygold/vs25btygold_200x200_NB.png"
    },
    {
      "game": "vs40wanderw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Depths",
      "titleKo": "와일드 뎁스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40wanderw/vs40wanderw_200x200_NB.png"
    },
    {
      "game": "vs20bermuda",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bermuda Riches",
      "titleKo": "버뮤다 리치",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bermuda/vs20bermuda_200x200_NB.png"
    },
    {
      "game": "vswaysfltdrgny",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Floating Dragon New Year Festival Ultra Megaways Hold & Spin",
      "titleKo": "플로팅 드래곤 뉴 이어 페스티발 울트라 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfltdrgny/vswaysfltdrgny_200x200_NB.png"
    },
    {
      "game": "vs20kraken",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Release the Kraken",
      "titleKo": "릴리스 더 크라켄",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20kraken/vs20kraken_200x200_NB.png"
    },
    {
      "game": "vs20lbstrhouse",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lobster House",
      "titleKo": "랍스터 하우스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20lbstrhouse/vs20lbstrhouse_200x200_NB.png"
    },
    {
      "game": "vswayslmm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Meow Megaways",
      "titleKo": "미야우 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayslmm/vswayslmm_200x200_NB.png"
    },
    {
      "game": "vs25tigerwar",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Tiger Warrior",
      "titleKo": "더 타이거 워리어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25tigerwar/vs25tigerwar_200x200_NB.png"
    },
    {
      "game": "vs10bbxext",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Xmas Xtreme",
      "titleKo": "빅 베스 크리스마스 익스트림",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbxext/vs10bbxext_200x200_NB.png"
    },
    {
      "game": "vs10fdsnake",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Floating Dragon - Year of the Snake",
      "titleKo": "플로팅 드래곤 - 뱀의 해",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fdsnake/vs10fdsnake_200x200_NB.png"
    },
    {
      "game": "vs20fatbook",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book of Monsters",
      "titleKo": "북 오브 몬스터즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fatbook/vs20fatbook_200x200_NB.png"
    },
    {
      "game": "vswaysyinyang",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Duel of Night & Day",
      "titleKo": "밤과 낮의 결투",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysyinyang/vswaysyinyang_200x200_NB.png"
    },
    {
      "game": "vs243queenie",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Queenie",
      "titleKo": "퀴니",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243queenie/vs243queenie_200x200_NB.png"
    },
    {
      "game": "vs15eyeofspart",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Eye of Spartacus",
      "titleKo": "아이 오브 스파르타쿠스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15eyeofspart/vs15eyeofspart_200x200_NB.png"
    },
    {
      "game": "vswaysfirewmw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Blazing Wilds Megaways",
      "titleKo": "블레이징 와일드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfirewmw/vswaysfirewmw_200x200_NB.png"
    },
    {
      "game": "vs5wfrog",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wealthy Frog",
      "titleKo": "부유한 개구리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5wfrog/vs5wfrog_200x200_NB.png"
    },
    {
      "game": "vs10trail",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mustang Trail",
      "titleKo": "머스탱 트레일",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10trail/vs10trail_200x200_NB.png"
    },
    {
      "game": "vs1fortunetree",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Tree of Riches",
      "titleKo": "트리 오브 리치스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1fortunetree/vs1fortunetree_200x200_NB.png"
    },
    {
      "game": "vswayschilheat",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chilli Heat Megaways",
      "titleKo": "칠리 히트 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayschilheat/vswayschilheat_200x200_NB.png"
    },
    {
      "game": "vs10firestrike2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Strike 2",
      "titleKo": "파이어 스트라이크2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10firestrike2/vs10firestrike2_200x200_NB.png"
    },
    {
      "game": "vs10bbbnz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Day at the Races",
      "titleKo": "빅 베이스 데이 앳 더 레이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbbnz/vs10bbbnz_200x200_NB.png"
    },
    {
      "game": "vs10luckybnz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Burst",
      "titleKo": "스위트 버스트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10luckybnz/vs10luckybnz_200x200_NB.png"
    },
    {
      "game": "vs5t8goldfp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "777 Rush",
      "titleKo": "777 러쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5t8goldfp/vs5t8goldfp_200x200_NB.png"
    },
    {
      "game": "vs10tut",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book Of Tut Respin",
      "titleKo": "북 어브 텃 레스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10tut/vs10tut_200x200_NB.png"
    },
    {
      "game": "vs25pyramid",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pyramid King",
      "titleKo": "피라미드 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25pyramid/vs25pyramid_200x200_NB.png"
    },
    {
      "game": "vs10madame",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Madame Destiny",
      "titleKo": "마담 데스티니",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10madame/vs10madame_200x200_NB.png"
    },
    {
      "game": "vs1024mahjpanda",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mahjong Panda",
      "titleKo": "마작 팬더",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024mahjpanda/vs1024mahjpanda_200x200_NB.png"
    },
    {
      "game": "vs25mmouse",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Money Mouse",
      "titleKo": "머니 마우스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25mmouse/vs25mmouse_200x200_NB.png"
    },
    {
      "game": "vs50jucier",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sky Bounty",
      "titleKo": "스카이 바운티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50jucier/vs50jucier_200x200_NB.png"
    },
    {
      "game": "vs50safariking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Safari King",
      "titleKo": "사파리 킹™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50safariking/vs50safariking_200x200_NB.png"
    },
    {
      "game": "vs243empcaishen",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Emperor Caishen",
      "titleKo": "재물신 황제",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243empcaishen/vs243empcaishen_200x200_NB.png"
    },
    {
      "game": "vs5luckytru",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Tiger Gold",
      "titleKo": "럭키 타이거 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckytru/vs5luckytru_200x200_NB.png"
    },
    {
      "game": "vs20emptybank",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Empty the Bank",
      "titleKo": "엠프티 더 뱅크",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20emptybank/vs20emptybank_200x200_NB.png"
    },
    {
      "game": "vswayswerewolf",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Curse of the Werewolf Megaways",
      "titleKo": "커스 오브 더 웨어울프 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswerewolf/vswayswerewolf_200x200_NB.png"
    },
    {
      "game": "vswaysbufstamp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Wildebeest Wins",
      "titleKo": "와일드 윌더비스트 윈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbufstamp/vswaysbufstamp_200x200_NB.png"
    },
    {
      "game": "vs20bison",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Release the Bison",
      "titleKo": "릴리스 더 바이손",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bison/vs20bison_200x200_NB.png"
    },
    {
      "game": "vs1masterjoker",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Master Joker",
      "titleKo": "마스터 조커",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1masterjoker/vs1masterjoker_200x200_NB.png"
    },
    {
      "game": "vs1024lionsd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "5 Lions Dance",
      "titleKo": "5 라이온스 댄스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024lionsd/vs1024lionsd_200x200_NB.png"
    },
    {
      "game": "vs243dancingpar",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dance Party",
      "titleKo": "댄스 파티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243dancingpar/vs243dancingpar_200x200_NB.png"
    },
    {
      "game": "vswayswest",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mystic Chief",
      "titleKo": "미스틱 치프",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswest/vswayswest_200x200_NB.png"
    },
    {
      "game": "vs20gatotfury",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gatot Kaca's Fury",
      "titleKo": "가토 카카 퓨리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gatotfury/vs20gatotfury_200x200_NB.png"
    },
    {
      "game": "vs243chargebull",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Raging Bull",
      "titleKo": "레이징 불",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243chargebull/vs243chargebull_200x200_NB.png"
    },
    {
      "game": "vswaysmegahays",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Barnyard Megahays Megaways",
      "titleKo": "배니야드 메가하이즈 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmegahays/vswaysmegahays_200x200_NB.png"
    },
    {
      "game": "vs5himalaw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Himalayan Wild",
      "titleKo": "히말라야 와일드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5himalaw/vs5himalaw_200x200_NB.png"
    },
    {
      "game": "vswaysvlcgds",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Volcano Goddess",
      "titleKo": "화산 여신",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysvlcgds/vswaysvlcgds_200x200_NB.png"
    },
    {
      "game": "vs50aladdin",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "3 Genie Wishes",
      "titleKo": "지니의 소원 3가지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50aladdin/vs50aladdin_200x200_NB.png"
    },
    {
      "game": "vs20drtgold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Drill That Gold",
      "titleKo": "드릴 댓 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20drtgold/vs20drtgold_200x200_NB.png"
    },
    {
      "game": "vs20splmystery",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Spellbinding Mystery",
      "titleKo": "스펠빈딩 미스테리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20splmystery/vs20splmystery_200x200_NB.png"
    },
    {
      "game": "vs20popbottles",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ice Mints",
      "titleKo": "아이스 민트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20popbottles/vs20popbottles_200x200_NB.png"
    },
    {
      "game": "vs5jjwild",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker's Jewels Wild",
      "titleKo": "조커의 주얼스 와일드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5jjwild/vs5jjwild_200x200_NB.png"
    },
    {
      "game": "vs10luckcharm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky, Grace & Charm",
      "titleKo": "럭키, 그레이스 & 참",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10luckcharm/vs10luckcharm_200x200_NB.png"
    },
    {
      "game": "vs20mesmult",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Yeti Quest",
      "titleKo": "예티 퀘스트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mesmult/vs20mesmult_200x200_NB.png"
    },
    {
      "game": "vs15diamond",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Diamond Strike",
      "titleKo": "다이아몬드 스트라이크",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15diamond/vs15diamond_200x200_NB.png"
    },
    {
      "game": "vswaysmoneyman",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Money Men Megaways",
      "titleKo": "더 머니 맨 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmoneyman/vswaysmoneyman_200x200_NB.png"
    },
    {
      "game": "vs100hsandks",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hundreds and Thousands",
      "titleKo": "수백수천의 행운",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs100hsandks/vs100hsandks_200x200_NB.png"
    },
    {
      "game": "vs243fortune",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Caishen's Gold",
      "titleKo": "카이센즈 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243fortune/vs243fortune_200x200_NB.png"
    },
    {
      "game": "vswaystut",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book of Tut Megaways",
      "titleKo": "북 오브 툿 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaystut/vswaystut_200x200_NB.png"
    },
    {
      "game": "vs5drhs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dragon Hot Hold & Spin",
      "titleKo": "드래곤 핫 홀드 앤 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5drhs/vs5drhs_200x200_NB.png"
    },
    {
      "game": "vs20magicpot",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Magic Cauldron",
      "titleKo": "더 매직 콜드런",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20magicpot/vs20magicpot_200x200_NB.png"
    },
    {
      "game": "vs243caishien",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Caishen's Cash",
      "titleKo": "카이셴의 캐쉬™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243caishien/vs243caishien_200x200_NB.png"
    },
    {
      "game": "vs243fdragon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortune Dragon",
      "titleKo": "포춘 드래곤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243fdragon/vs243fdragon_200x200_NB.png"
    },
    {
      "game": "vs25bkofkngdm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book Of Kingdoms",
      "titleKo": "북 오브 킹덤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25bkofkngdm/vs25bkofkngdm_200x200_NB.png"
    },
    {
      "game": "vs20kraken2",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Release the Kraken 2",
      "titleKo": "릴리즈 더 크라켄 2",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20kraken2/vs20kraken2_200x200_NB.png"
    },
    {
      "game": "vs20jewelparty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jewel Rush",
      "titleKo": "쥬얼 러쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20jewelparty/vs20jewelparty_200x200_NB.png"
    },
    {
      "game": "vs50mightra",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Might of Ra",
      "titleKo": "마이트 오브 라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50mightra/vs50mightra_200x200_NB.png"
    },
    {
      "game": "vs50juicyfr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Juicy Fruits",
      "titleKo": "쥬시 프룻즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50juicyfr/vs50juicyfr_200x200_NB.png"
    },
    {
      "game": "vs20chickdrop",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chicken Drop",
      "titleKo": "치킨 드롭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20chickdrop/vs20chickdrop_200x200_NB.png"
    },
    {
      "game": "vs10nudgeit",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rise of Giza PowerNudge",
      "titleKo": "라이즈 오브 기자 파워넛지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10nudgeit/vs10nudgeit_200x200_NB.png"
    },
    {
      "game": "vs20gravity",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gravity Bonanza",
      "titleKo": "그래비티 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gravity/vs20gravity_200x200_NB.png"
    },
    {
      "game": "vs20mergedwndw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Blade & Fangs",
      "titleKo": "블래이드 앤 팽스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mergedwndw/vs20mergedwndw_200x200_NB.png"
    },
    {
      "game": "vs40rainbowr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rainbow Reels",
      "titleKo": "레인보우 릴즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40rainbowr/vs40rainbowr_200x200_NB.png"
    },
    {
      "game": "vs20clspwrndg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Powernudge",
      "titleKo": "스위트 파워너지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20clspwrndg/vs20clspwrndg_200x200_NB.png"
    },
    {
      "game": "vs20gengembnz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Genie's Gem Bonanza",
      "titleKo": "지니의 보석 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gengembnz/vs20gengembnz_200x200_NB.png"
    },
    {
      "game": "vs576hokkwolf",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hokkaido Wolf",
      "titleKo": "홋카이도 울프",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs576hokkwolf/vs576hokkwolf_200x200_NB.png"
    },
    {
      "game": "vs5lckpnd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Panda",
      "titleKo": "럭키 팬더",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5lckpnd/vs5lckpnd_200x200_NB.png"
    },
    {
      "game": "vs25goldrexp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Majestic Express - Gold Run",
      "titleKo": "마제스틱 익스프레스 - 골드 런",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25goldrexp/vs25goldrexp_200x200_NB.png"
    },
    {
      "game": "vs10jokerhot",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker's Jewels Hot",
      "titleKo": "조커의 보석 핫",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10jokerhot/vs10jokerhot_200x200_NB.png"
    },
    {
      "game": "vs20wolfie",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Greedy Wolf",
      "titleKo": "그리디 울프",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20wolfie/vs20wolfie_200x200_NB.png"
    },
    {
      "game": "vs25archer",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Archer",
      "titleKo": "파이어 아처",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25archer/vs25archer_200x200_NB.png"
    },
    {
      "game": "vs20multiup",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wheel O'Gold",
      "titleKo": "휠오골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20multiup/vs20multiup_200x200_NB.png"
    },
    {
      "game": "vs5luckytigly",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Tiger",
      "titleKo": "럭키 타이거",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckytigly/vs5luckytigly_200x200_NB.png"
    },
    {
      "game": "vs7fire88",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire 88",
      "titleKo": "파이어 88™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs7fire88/vs7fire88_200x200_NB.png"
    },
    {
      "game": "vswayslavabls",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lava Balls",
      "titleKo": "라바 볼",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayslavabls/vswayslavabls_200x200_NB.png"
    },
    {
      "game": "vs1money",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Money Money Money",
      "titleKo": "머니 머니 머니",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1money/vs1money_200x200_NB.png"
    },
    {
      "game": "vs20stickysymbol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Great Stick-up",
      "titleKo": "더 그레이트 스틱업",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20stickysymbol/vs20stickysymbol_200x200_NB.png"
    },
    {
      "game": "vs20superx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Super X",
      "titleKo": "슈퍼 X",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20superx/vs20superx_200x200_NB.png"
    },
    {
      "game": "vs20rainbowrsh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Santa's Xmas Rush",
      "titleKo": "산타의 크리스마스 러쉬 ",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20rainbowrsh/vs20rainbowrsh_200x200_NB.png"
    },
    {
      "game": "vs1fufufu",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fu Fu Fu",
      "titleKo": "푸 푸 푸",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1fufufu/vs1fufufu_200x200_NB.png"
    },
    {
      "game": "vs20lvlup",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pub Kings",
      "titleKo": "펍 킹스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20lvlup/vs20lvlup_200x200_NB.png"
    },
    {
      "game": "vs1600drago",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Drago - Jewels of Fortune",
      "titleKo": "드라고 쥬얼스 오브 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1600drago/vs1600drago_200x200_NB.png"
    },
    {
      "game": "vs20clustcol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sweet Kingdom",
      "titleKo": "스위트 킹덤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20clustcol/vs20clustcol_200x200_NB.png"
    },
    {
      "game": "vs20sparta",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Shield Of Sparta",
      "titleKo": "쉴드 오브 스파르타",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sparta/vs20sparta_200x200_NB.png"
    },
    {
      "game": "vs25kfruit",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Blaze",
      "titleKo": "아즈텍 블레이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25kfruit/vs25kfruit_200x200_NB.png"
    },
    {
      "game": "vswayscashconv",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Running Sushi",
      "titleKo": "런닝 스시",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscashconv/vswayscashconv_200x200_NB.png"
    },
    {
      "game": "vs1024moonsh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Moonshot",
      "titleKo": "문샷",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024moonsh/vs1024moonsh_200x200_NB.png"
    },
    {
      "game": "vs10amm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Amazing Money Machine",
      "titleKo": "어메이징 머니 머신",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10amm/vs10amm_200x200_NB.png"
    },
    {
      "game": "vs10fangfree",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fangtastic Freespins",
      "titleKo": "판타스틱 프리스핀스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fangfree/vs10fangfree_200x200_NB.png"
    },
    {
      "game": "vs5jokerdice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker's Jewel Dice",
      "titleKo": "조커의 보석 주사위",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5jokerdice/vs5jokerdice_200x200_NB.png"
    },
    {
      "game": "vswayswwjoker",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Wild Joker",
      "titleKo": "와일드 와일드 조커",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswwjoker/vswayswwjoker_200x200_NB.png"
    },
    {
      "game": "vswayssavlgnd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Savannah Legend",
      "titleKo": "사바나 레전드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayssavlgnd/vswayssavlgnd_200x200_NB.png"
    },
    {
      "game": "vs10dmreels",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Happy Dragon",
      "titleKo": "해피 드래곤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10dmreels/vs10dmreels_200x200_NB.png"
    },
    {
      "game": "vs10bblpop",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bubble Pop",
      "titleKo": "버블팝",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bblpop/vs10bblpop_200x200_NB.png"
    },
    {
      "game": "vs25wildies",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wildies",
      "titleKo": "와일디즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25wildies/vs25wildies_200x200_NB.png"
    },
    {
      "game": "vswaysbook",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book of Golden Sands",
      "titleKo": "북 오브 골든 샌즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbook/vswaysbook_200x200_NB.png"
    },
    {
      "game": "vs10frontrun",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Odds On Winner",
      "titleKo": "확률 온 위너",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10frontrun/vs10frontrun_200x200_NB.png"
    },
    {
      "game": "vs9outlaw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pirates Pub",
      "titleKo": "파이럿츠 펍",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9outlaw/vs9outlaw_200x200_NB.png"
    },
    {
      "game": "vs5hotburn",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot to Burn",
      "titleKo": "핫 투 번",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5hotburn/vs5hotburn_200x200_NB.png"
    },
    {
      "game": "vswayshive",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Star Bounty",
      "titleKo": "스타 바운티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayshive/vswayshive_200x200_NB.png"
    },
    {
      "game": "vs20ultim5",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Ultimate 5",
      "titleKo": "더 얼티미트 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20ultim5/vs20ultim5_200x200_NB.png"
    },
    {
      "game": "vs10fortnhsly",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Ox",
      "titleKo": "럭키 Ox",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fortnhsly/vs10fortnhsly_200x200_NB.png"
    },
    {
      "game": "vs25peking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Peking Luck",
      "titleKo": "페킹 럭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25peking/vs25peking_200x200_NB.png"
    },
    {
      "game": "vswaysfreezet",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Eternal Empress - Freeze Time",
      "titleKo": "영원한 황후 - 프리즈 타임",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfreezet/vswaysfreezet_200x200_NB.png"
    },
    {
      "game": "vs20trswild3",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Treasure Hunt",
      "titleKo": "아즈텍 트레저 헌트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20trswild3/vs20trswild3_200x200_NB.png"
    },
    {
      "game": "vs5luckyphnly",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Phoenix",
      "titleKo": "럭키 피닉스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckyphnly/vs5luckyphnly_200x200_NB.png"
    },
    {
      "game": "vs5ultradice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ultra Burn Dice",
      "titleKo": "울트라 번 다이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5ultradice/vs5ultradice_200x200_NB.png"
    },
    {
      "game": "vs40cleoeye",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Eye of Cleopatra",
      "titleKo": "클레오파트라의 눈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40cleoeye/vs40cleoeye_200x200_NB.png"
    },
    {
      "game": "vswaysexpandng",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Castle of Fire",
      "titleKo": "불의 성",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysexpandng/vswaysexpandng_200x200_NB.png"
    },
    {
      "game": "vs20swordofares",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sword of Ares",
      "titleKo": "소드 오브 아레스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20swordofares/vs20swordofares_200x200_NB.png"
    },
    {
      "game": "vs10bookazteck",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book of Aztec King",
      "titleKo": "북 오브 아즈텍 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bookazteck/vs10bookazteck_200x200_NB.png"
    },
    {
      "game": "vs25gldox",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Golden Ox",
      "titleKo": "골든 옥스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25gldox/vs25gldox_200x200_NB.png"
    },
    {
      "game": "vs10coffee",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Coffee Wild",
      "titleKo": "커피 와일드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10coffee/vs10coffee_200x200_NB.png"
    },
    {
      "game": "vs20gemfirefor",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gem Fire Fortune",
      "titleKo": "잼 파이어 포츈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gemfirefor/vs20gemfirefor_200x200_NB.png"
    },
    {
      "game": "vswaysmltchmgw",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Raging Waterfall Megaways",
      "titleKo": "레이징 워터폴 메거웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmltchmgw/vswaysmltchmgw_200x200_NB.png"
    },
    {
      "game": "vs10fortnpig",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Greedy Fortune Pig",
      "titleKo": "그리디 포어천 피그",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fortnpig/vs10fortnpig_200x200_NB.png"
    },
    {
      "game": "vs25kingdoms",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "3 Kingdoms - Battle of Red Cliffs",
      "titleKo": "3 킹덤즈 - 배틀 오브 레드 클리프스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25kingdoms/vs25kingdoms_200x200_NB.png"
    },
    {
      "game": "vswaysmfreya",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Might of Freya Megaways",
      "titleKo": "마이트 오브 프레야 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmfreya/vswaysmfreya_200x200_NB.png"
    },
    {
      "game": "vs10crownfire",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Crown of Fire",
      "titleKo": "크라운 오브 파이어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10crownfire/vs10crownfire_200x200_NB.png"
    },
    {
      "game": "vswaysaztecgm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortune of Aztec",
      "titleKo": "아즈텍의 행운",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysaztecgm/vswaysaztecgm_200x200_NB.png"
    },
    {
      "game": "vs9piggybank",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Piggy Bank Bills",
      "titleKo": "피기 뱅크 빌즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9piggybank/vs9piggybank_200x200_NB.png"
    },
    {
      "game": "vswaysmorient",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mystery of the Orient",
      "titleKo": "미스터리 어브 디 오어리엔트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmorient/vswaysmorient_200x200_NB.png"
    },
    {
      "game": "vs20alieninv",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Alien Invaders",
      "titleKo": "에일리언 인베더스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20alieninv/vs20alieninv_200x200_NB.png"
    },
    {
      "game": "vs10gdchalleng",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "8 Golden Dragon Challenge",
      "titleKo": "8 골든 드래곤 챌린지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10gdchalleng/vs10gdchalleng_200x200_NB.png"
    },
    {
      "game": "vs25wolfgold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wolf Gold",
      "titleKo": "울프 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25wolfgold/vs25wolfgold_200x200_NB.png"
    },
    {
      "game": "vs5jokjewhs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker's Jewels Hold & Spin",
      "titleKo": "조커즈 주얼즈 홀드 & 스핀 ",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5jokjewhs/vs5jokjewhs_200x200_NB.png"
    },
    {
      "game": "vs10threestar",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Three Star Fortune",
      "titleKo": "쓰리 스타 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10threestar/vs10threestar_200x200_NB.png"
    },
    {
      "game": "vs10bookoftut",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Book of Tut",
      "titleKo": "북 오브 텃",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bookoftut/vs10bookoftut_200x200_NB.png"
    },
    {
      "game": "vs10noodles",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Oodles of Noodles",
      "titleKo": "국수의 우들",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10noodles/vs10noodles_200x200_NB.png"
    },
    {
      "game": "vswaysbewaretd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Beware The Deep Megaways",
      "titleKo": "깊은 메가웨이를 조심하세요",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbewaretd/vswaysbewaretd_200x200_NB.png"
    },
    {
      "game": "vs20mparty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Hop & Drop",
      "titleKo": "와일드 호프 & 드롭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mparty/vs20mparty_200x200_NB.png"
    },
    {
      "game": "vs243fortseren",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Greek Gods",
      "titleKo": "그리스 신들",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243fortseren/vs243fortseren_200x200_NB.png"
    },
    {
      "game": "vs20bblitz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Money Stacks",
      "titleKo": "머니 스택",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bblitz/vs20bblitz_200x200_NB.png"
    },
    {
      "game": "vs25tigeryear",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky New Year - Tiger Treasures",
      "titleKo": "럭키 뉴 이어 - 타이거 트래져스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25tigeryear/vs25tigeryear_200x200_NB.png"
    },
    {
      "game": "vs10emotiwins",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Emotiwins",
      "titleKo": "이모티윈스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10emotiwins/vs10emotiwins_200x200_NB.png"
    },
    {
      "game": "vs9hotroll",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot Chilli",
      "titleKo": "핫 칠리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9hotroll/vs9hotroll_200x200_NB.png"
    },
    {
      "game": "vs10runes",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gates of Valhalla",
      "titleKo": "발할라의 문",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10runes/vs10runes_200x200_NB.png"
    },
    {
      "game": "vs9chen",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Master Chen's Fortune",
      "titleKo": "재물신의 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9chen/vs9chen_200x200_NB.png"
    },
    {
      "game": "vs20crankit",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Crank it Up",
      "titleKo": "크랭크 잇 업",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20crankit/vs20crankit_200x200_NB.png"
    },
    {
      "game": "vs20clustext",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gears of Horus",
      "titleKo": "기어스 오브 호루스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20clustext/vs20clustext_200x200_NB.png"
    },
    {
      "game": "vs20daydead",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Day of Dead",
      "titleKo": "데이 오브 데드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20daydead/vs20daydead_200x200_NB.png"
    },
    {
      "game": "vs20nilefort",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Nile Fortune",
      "titleKo": "나일강의 행운",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20nilefort/vs20nilefort_200x200_NB.png"
    },
    {
      "game": "vs20gobnudge",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Goblin Heist Powernudge",
      "titleKo": "고블린 하이스트 파워너지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gobnudge/vs20gobnudge_200x200_NB.png"
    },
    {
      "game": "vs25goldrush",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gold Rush",
      "titleKo": "골드 러쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25goldrush/vs25goldrush_200x200_NB.png"
    },
    {
      "game": "vs40wildrun",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fortune Hit'n Roll",
      "titleKo": "포춘 히트 앤 롤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40wildrun/vs40wildrun_200x200_NB.png"
    },
    {
      "game": "vs5spjoker",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Super Joker",
      "titleKo": "슈퍼 조커",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5spjoker/vs5spjoker_200x200_NB.png"
    },
    {
      "game": "vs20fourmc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Candy Corner",
      "titleKo": "캔디 코너",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fourmc/vs20fourmc_200x200_NB.png"
    },
    {
      "game": "vswaysbblitz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Money Stacks Megaways",
      "titleKo": "머니 스택스 메가웨이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbblitz/vswaysbblitz_200x200_NB.png"
    },
    {
      "game": "vs20honey",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Honey Honey Honey",
      "titleKo": "허니 허니 허니",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20honey/vs20honey_200x200_NB.png"
    },
    {
      "game": "vs20egypttrs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Egyptian Fortunes",
      "titleKo": "파라오의 비밀™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20egypttrs/vs20egypttrs_200x200_NB.png"
    },
    {
      "game": "vs20underground",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Down the Rails",
      "titleKo": "다운 더 레일즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20underground/vs20underground_200x200_NB.png"
    },
    {
      "game": "vs1024temuj",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Temujin Treasures",
      "titleKo": "테무진의 보물",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024temuj/vs1024temuj_200x200_NB.png"
    },
    {
      "game": "vs20plsmcannon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Smash",
      "titleKo": "아즈텍 스매쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20plsmcannon/vs20plsmcannon_200x200_NB.png"
    },
    {
      "game": "vs9madmonkey",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Monkey Madness",
      "titleKo": "원숭이의 광란",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9madmonkey/vs9madmonkey_200x200_NB.png"
    },
    {
      "game": "vswaysmodfr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ancient Island Megaways",
      "titleKo": "에이션트 아일랜드 메가웨이즈™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysmodfr/vswaysmodfr_200x200_NB.png"
    },
    {
      "game": "vs10bburger",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Burger Load it up with Xtra Cheese",
      "titleKo": "빅 버거 엑스트라 치즈로 가득 담기",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bburger/vs10bburger_200x200_NB.png"
    },
    {
      "game": "vs25asgard",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Asgard",
      "titleKo": "아스가르드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25asgard/vs25asgard_200x200_NB.png"
    },
    {
      "game": "vswaysstrwild",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Candy Stars",
      "titleKo": "캔디 스타즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysstrwild/vswaysstrwild_200x200_NB.png"
    },
    {
      "game": "vswaysargonts",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Argonauts",
      "titleKo": "아르고노츠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysargonts/vswaysargonts_200x200_NB.png"
    },
    {
      "game": "vs1ball",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Dragon Ball",
      "titleKo": "럭키 드래곤볼",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1ball/vs1ball_200x200_NB.png"
    },
    {
      "game": "vs20lampinf",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lamp Of Infinity",
      "titleKo": "램프 오브 인피니티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20lampinf/vs20lampinf_200x200_NB.png"
    },
    {
      "game": "vs20mtreasure",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pirate Golden Age",
      "titleKo": "파이렛 골든 에이지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mtreasure/vs20mtreasure_200x200_NB.png"
    },
    {
      "game": "vs5littlegem",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Little Gem Hold and Spin",
      "titleKo": "리틀 젬 홀드 앤드 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5littlegem/vs5littlegem_200x200_NB.png"
    },
    {
      "game": "vs10djneko",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "DJ Neko",
      "titleKo": "DJ 네코",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10djneko/vs10djneko_200x200_NB.png"
    },
    {
      "game": "vs20vegasmagic",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Vegas Magic",
      "titleKo": "베가스 매직",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20vegasmagic/vs20vegasmagic_200x200_NB.png"
    },
    {
      "game": "vs25quadwolf",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wolf Gold 4 Pack",
      "titleKo": "울프 골드 4 팩",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25quadwolf/vs25quadwolf_200x200_NB.png"
    },
    {
      "game": "vs10mayangods",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "John Hunter And The Mayan Gods",
      "titleKo": "존 헌터 앤드 더 마야 갓즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10mayangods/vs10mayangods_200x200_NB.png"
    },
    {
      "game": "vs20colcashzone",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Colossal Cash Zone",
      "titleKo": "컬라설 캐시 존",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20colcashzone/vs20colcashzone_200x200_NB.png"
    },
    {
      "game": "vs20yotdk",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Year Of The Dragon King",
      "titleKo": "이어 오브 더 드래곤 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20yotdk/vs20yotdk_200x200_NB.png"
    },
    {
      "game": "vs25bomb",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bomb Bonanza",
      "titleKo": "붐 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25bomb/vs25bomb_200x200_NB.png"
    },
    {
      "game": "vs10strawberry",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Strawberry Cocktail",
      "titleKo": "딸기 칵테일",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10strawberry/vs10strawberry_200x200_NB.png"
    },
    {
      "game": "vs25vegas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Vegas Nights",
      "titleKo": "베가스의 밤™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25vegas/vs25vegas_200x200_NB.png"
    },
    {
      "game": "vs20powerwild",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mystery Mice",
      "titleKo": "미스터리 마우스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20powerwild/vs20powerwild_200x200_NB.png"
    },
    {
      "game": "vs10piggybank",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "You Can Piggy Bank On It",
      "titleKo": "유 캔 피기 뱅크 온 잇",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10piggybank/vs10piggybank_200x200_NB.png"
    },
    {
      "game": "vs1dragon888",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Plushie Wins",
      "titleKo": "플러시 원스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1dragon888/vs1dragon888_200x200_NB.png"
    },
    {
      "game": "vswayscongcash",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Congo Cash XL",
      "titleKo": "콩고 캐시 XL",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscongcash/vswayscongcash_200x200_NB.png"
    },
    {
      "game": "vs25goldpig",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Golden Pig",
      "titleKo": "골든 피그",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25goldpig/vs25goldpig_200x200_NB.png"
    },
    {
      "game": "vs40stckwldlvl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ripe Rewards",
      "titleKo": "무르익은 보상",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40stckwldlvl/vs40stckwldlvl_200x200_NB.png"
    },
    {
      "game": "vs20ltng",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pinup Girls",
      "titleKo": "핀업 걸즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20ltng/vs20ltng_200x200_NB.png"
    },
    {
      "game": "vswayspearls",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Wild Pearls",
      "titleKo": "와일드 와일드 펄스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayspearls/vswayspearls_200x200_NB.png"
    },
    {
      "game": "vs25jokrace",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker Race",
      "titleKo": "조커 레이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25jokrace/vs25jokrace_200x200_NB.png"
    },
    {
      "game": "vs25ultwolgol",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wolf Gold Ultimate",
      "titleKo": "울프 골드 얼티밋",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25ultwolgol/vs25ultwolgol_200x200_NB.png"
    },
    {
      "game": "vs5luckymly",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Monkey",
      "titleKo": "럭키 몽키",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckymly/vs5luckymly_200x200_NB.png"
    },
    {
      "game": "vs20leprexmas",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Leprechaun Carol",
      "titleKo": "머스탱 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20leprexmas/vs20leprexmas_200x200_NB.png"
    },
    {
      "game": "ar1spire",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Spire+",
      "titleKo": "첨탑+",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/ar1spire/ar1spire_200x200_NB.png"
    },
    {
      "game": "vs20cashmachine",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cash Box",
      "titleKo": "캐시박스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20cashmachine/vs20cashmachine_200x200_NB.png"
    },
    {
      "game": "vs20sbpnudge",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Powernudge",
      "titleKo": "아즈텍 파워넛지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sbpnudge/vs20sbpnudge_200x200_NB.png"
    },
    {
      "game": "vs88hockattack",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hockey Attack",
      "titleKo": "하키 공격",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs88hockattack/vs88hockattack_200x200_NB.png"
    },
    {
      "game": "vs117649starz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starz Megaways",
      "titleKo": "스타즈 메가웨이즈™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs117649starz/vs117649starz_200x200_NB.png"
    },
    {
      "game": "vs25badge",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Badge Blitz",
      "titleKo": "배지 블리츠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25badge/vs25badge_200x200_NB.png"
    },
    {
      "game": "vs20medusast",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Medusa's Stone",
      "titleKo": "메두사의 돌",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20medusast/vs20medusast_200x200_NB.png"
    },
    {
      "game": "vs20theights",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Towering Fortunes",
      "titleKo": "타워링 포춘스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20theights/vs20theights_200x200_NB.png"
    },
    {
      "game": "vs10mmm",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Magic Money Maze",
      "titleKo": "매직 머니 메이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10mmm/vs10mmm_200x200_NB.png"
    },
    {
      "game": "vs20lightblitz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Blitz Super Wheel",
      "titleKo": "블리츠 슈퍼 휠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20lightblitz/vs20lightblitz_200x200_NB.png"
    },
    {
      "game": "vs20earthquake",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cyclops Smash",
      "titleKo": "사이클롭스 스매쉬",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20earthquake/vs20earthquake_200x200_NB.png"
    },
    {
      "game": "vs20rainbowg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rainbow Gold",
      "titleKo": "레인보우 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20rainbowg/vs20rainbowg_200x200_NB.png"
    },
    {
      "game": "vs40pirgold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pirate Gold Deluxe",
      "titleKo": "파이럿 골드 디럭스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40pirgold/vs40pirgold_200x200_NB.png"
    },
    {
      "game": "vs1024dtiger",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Dragon Tiger",
      "titleKo": "더 그레이건 타이거",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1024dtiger/vs1024dtiger_200x200_NB.png"
    },
    {
      "game": "vs25bullfiesta",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bull Fiesta",
      "titleKo": "불 피에스타",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25bullfiesta/vs25bullfiesta_200x200_NB.png"
    },
    {
      "game": "vs20maskgame",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cash Chips",
      "titleKo": "캐시 칩스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20maskgame/vs20maskgame_200x200_NB.png"
    },
    {
      "game": "vs10forwildly",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Mouse",
      "titleKo": "럭키 마우스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10forwildly/vs10forwildly_200x200_NB.png"
    },
    {
      "game": "vs20beefed",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fat Panda",
      "titleKo": "팻 판다",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20beefed/vs20beefed_200x200_NB.png"
    },
    {
      "game": "vswaysjapan",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Starlight Princess Pachi",
      "titleKo": "별빛공주 파치",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysjapan/vswaysjapan_200x200_NB.png"
    },
    {
      "game": "vs20fishptrn",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Happy Nets",
      "titleKo": "해피 넷",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fishptrn/vs20fishptrn_200x200_NB.png"
    },
    {
      "game": "vs9gemtrio",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gem Trio",
      "titleKo": "잼 트리오",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9gemtrio/vs9gemtrio_200x200_NB.png"
    },
    {
      "game": "vs20hstgldngt",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Heist for the Golden Nuggets",
      "titleKo": "하이스트 폴 더 골든 너겟츠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20hstgldngt/vs20hstgldngt_200x200_NB.png"
    },
    {
      "game": "vswaysftropics",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Frozen Tropics",
      "titleKo": "프로즌 트로픽스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysftropics/vswaysftropics_200x200_NB.png"
    },
    {
      "game": "vs10goldfish",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fishin Reels",
      "titleKo": "피싱 릴",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10goldfish/vs10goldfish_200x200_NB.png"
    },
    {
      "game": "vs25lagoon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Great Lagoon",
      "titleKo": "그레이트 라군",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25lagoon/vs25lagoon_200x200_NB.png"
    },
    {
      "game": "vswaysjkrdrop",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Tropical Tiki",
      "titleKo": "트로피컬 티키",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysjkrdrop/vswaysjkrdrop_200x200_NB.png"
    },
    {
      "game": "vswaysalterego",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Alter Ego",
      "titleKo": "더 알터 에고",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysalterego/vswaysalterego_200x200_NB.png"
    },
    {
      "game": "vs20mmmelon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mighty Munching Melons",
      "titleKo": "마이티 먼칭 멜론스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mmmelon/vs20mmmelon_200x200_NB.png"
    },
    {
      "game": "vs20treesot",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Trees of Treasure",
      "titleKo": "보물의 나무",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20treesot/vs20treesot_200x200_NB.png"
    },
    {
      "game": "vs25newyear",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky New Year",
      "titleKo": "럭키 뉴 이어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25newyear/vs25newyear_200x200_NB.png"
    },
    {
      "game": "vs10wildtut",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mysterious Egypt",
      "titleKo": "미스테리우스 이집트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10wildtut/vs10wildtut_200x200_NB.png"
    },
    {
      "game": "vs50jfmulthold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Juicy Fruits Multihold",
      "titleKo": "쥬시 후르츠 멀티홀드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50jfmulthold/vs50jfmulthold_200x200_NB.png"
    },
    {
      "game": "vs243nudge4gold",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hellvis Wild",
      "titleKo": "헬비스 와이들",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243nudge4gold/vs243nudge4gold_200x200_NB.png"
    },
    {
      "game": "vs8magicjourn",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Magic Journey",
      "titleKo": "매직 져니",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs8magicjourn/vs8magicjourn_200x200_NB.png"
    },
    {
      "game": "vswayseternity",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Diamonds of Egypt",
      "titleKo": "다이아몬드 오브 이집트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayseternity/vswayseternity_200x200_NB.png"
    },
    {
      "game": "vs10diamondrgh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Temple Guardians",
      "titleKo": "템플 가디언즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10diamondrgh/vs10diamondrgh_200x200_NB.png"
    },
    {
      "game": "vs7pigs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "7 Piggies",
      "titleKo": "7 피기",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs7pigs/vs7pigs_200x200_NB.png"
    },
    {
      "game": "vs243discolady",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Disco Lady",
      "titleKo": "디스코 레이디",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243discolady/vs243discolady_200x200_NB.png"
    },
    {
      "game": "vs20shootstars",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Heroic Spins",
      "titleKo": "히어로 스핀스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20shootstars/vs20shootstars_200x200_NB.png"
    },
    {
      "game": "vs20jjjack",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jumbo Safari",
      "titleKo": "점보 사파리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20jjjack/vs20jjjack_200x200_NB.png"
    },
    {
      "game": "vs5jellyc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jelly Candy",
      "titleKo": "젤리 캔디",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5jellyc/vs5jellyc_200x200_NB.png"
    },
    {
      "game": "vs10santasl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Santa's Slay",
      "titleKo": "산타 슬레이",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10santasl/vs10santasl_200x200_NB.png"
    },
    {
      "game": "vs5gemstone",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gemstone",
      "titleKo": "잼스톤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5gemstone/vs5gemstone_200x200_NB.png"
    },
    {
      "game": "vs10dkinghp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dragon King Hot Pots",
      "titleKo": "드래곤 킹 핫 포트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10dkinghp/vs10dkinghp_200x200_NB.png"
    },
    {
      "game": "vs18mashang",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Treasure Horse",
      "titleKo": "대박 기원™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs18mashang/vs18mashang_200x200_NB.png"
    },
    {
      "game": "vswaysfrbugs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Frogs & Bugs",
      "titleKo": "프라그즈 & 버그즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysfrbugs/vswaysfrbugs_200x200_NB.png"
    },
    {
      "game": "vs20hercpeg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hercules and Pegasus",
      "titleKo": "헤라클레스와 페가수스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20hercpeg/vs20hercpeg_200x200_NB.png"
    },
    {
      "game": "vs5hotbmult",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot To Burn Multiplier",
      "titleKo": "핫 투 번 멀터플라여 ",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5hotbmult/vs5hotbmult_200x200_NB.png"
    },
    {
      "game": "vs20stickypos",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ice Lobster",
      "titleKo": "아이스 랍스터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20stickypos/vs20stickypos_200x200_NB.png"
    },
    {
      "game": "vs20chicken",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Great Chicken Escape",
      "titleKo": "더 그레이트 치킨 이스케이프",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20chicken/vs20chicken_200x200_NB.png"
    },
    {
      "game": "vs5drmystery",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dragon Kingdom - Eyes of Fire",
      "titleKo": "드래곤 킹덤 아이즈 오브 파이러",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5drmystery/vs5drmystery_200x200_NB.png"
    },
    {
      "game": "vs20smugcove",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Smugglers Cove",
      "titleKo": "스머글러 코브",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20smugcove/vs20smugcove_200x200_NB.png"
    },
    {
      "game": "vs25spotz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Knight Hot Spotz",
      "titleKo": "나이트 핫 스팟",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25spotz/vs25spotz_200x200_NB.png"
    },
    {
      "game": "vs20wildboost",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Booster",
      "titleKo": "와일드 부스터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20wildboost/vs20wildboost_200x200_NB.png"
    },
    {
      "game": "vs10vampwolf",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Vampires vs Wolves",
      "titleKo": "뱀파이어 vs 울프",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10vampwolf/vs10vampwolf_200x200_NB.png"
    },
    {
      "game": "vs25samurai",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rise of Samurai",
      "titleKo": "라이즈 오브 사무라이",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25samurai/vs25samurai_200x200_NB.png"
    },
    {
      "game": "vs25spgldways",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Secret City Gold",
      "titleKo": "시크릿 시티 골드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25spgldways/vs25spgldways_200x200_NB.png"
    },
    {
      "game": "vs25journey",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Journey to the West",
      "titleKo": "서유기",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25journey/vs25journey_200x200_NB.png"
    },
    {
      "game": "vs25pfarmfp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pig Farm",
      "titleKo": "피그 팜",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25pfarmfp/vs25pfarmfp_200x200_NB.png"
    },
    {
      "game": "vs10jnmntzma",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jane Hunter and the Mask of Montezuma",
      "titleKo": "제인 헌터 앤드 더 마스크 오브 몬테즈마",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10jnmntzma/vs10jnmntzma_200x200_NB.png"
    },
    {
      "game": "vs3train",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gold Train",
      "titleKo": "골드 트레인",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs3train/vs3train_200x200_NB.png"
    },
    {
      "game": "vs20stckwldsc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pot of Fortune",
      "titleKo": "행운의 항아리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20stckwldsc/vs20stckwldsc_200x200_NB.png"
    },
    {
      "game": "vs25walker",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Walker",
      "titleKo": "와일드 워커",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25walker/vs25walker_200x200_NB.png"
    },
    {
      "game": "vs9ridelightng",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ride the Lightning",
      "titleKo": "라이드 더 라이트닝",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs9ridelightng/vs9ridelightng_200x200_NB.png"
    },
    {
      "game": "vs40madwheel",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Wild Machine",
      "titleKo": "더 와일드 머신",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40madwheel/vs40madwheel_200x200_NB.png"
    },
    {
      "game": "vswayshexhaus",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Rise of Pyramids",
      "titleKo": "피라미드의 상승",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayshexhaus/vswayshexhaus_200x200_NB.png"
    },
    {
      "game": "vs10egypt",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ancient Egypt",
      "titleKo": "에인션트 이집트™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10egypt/vs10egypt_200x200_NB.png"
    },
    {
      "game": "ar1limboplus",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Limbo+",
      "titleKo": "림보+",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/ar1limboplus/ar1limboplus_200x200_NB.png"
    },
    {
      "game": "vs10egrich",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Queen of Gods",
      "titleKo": "퀸 오브 갓",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10egrich/vs10egrich_200x200_NB.png"
    },
    {
      "game": "vs4096mystery",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mysterious",
      "titleKo": "미스테리어스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs4096mystery/vs4096mystery_200x200_NB.png"
    },
    {
      "game": "vswaysraghex",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Tundra's Fortune",
      "titleKo": "툰드라 포춘",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysraghex/vswaysraghex_200x200_NB.png"
    },
    {
      "game": "vs25davinci",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Da Vinci's Treasure",
      "titleKo": "다빈치의 보물",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25davinci/vs25davinci_200x200_NB.png"
    },
    {
      "game": "vswayswwhex",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Wild Bananas",
      "titleKo": "와일드 와일드 바나나스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayswwhex/vswayswwhex_200x200_NB.png"
    },
    {
      "game": "vswayscashsurg",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cash Surge",
      "titleKo": "캐쉬 서지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscashsurg/vswayscashsurg_200x200_NB.png"
    },
    {
      "game": "vs243ckemp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cheeky Emperor",
      "titleKo": "치키 엠퍼러",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243ckemp/vs243ckemp_200x200_NB.png"
    },
    {
      "game": "vs5balidragon",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Bali Dragon",
      "titleKo": "발리 드래곤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5balidragon/vs5balidragon_200x200_NB.png"
    },
    {
      "game": "vs7776secrets",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aztec Treasure",
      "titleKo": "아즈텍 트레져",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs7776secrets/vs7776secrets_200x200_NB.png"
    },
    {
      "game": "vs10fonzofff",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fonzo's Feline Fortunes",
      "titleKo": "폰조스 펠린 포춘스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fonzofff/vs10fonzofff_200x200_NB.png"
    },
    {
      "game": "vs40voodoo",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Voodoo Magic",
      "titleKo": "부두 매직",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40voodoo/vs40voodoo_200x200_NB.png"
    },
    {
      "game": "vs20sh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Shining Hot 20",
      "titleKo": "샤이닝 핫 20",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sh/vs20sh_200x200_NB.png"
    },
    {
      "game": "vswaysseastory",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sea Fantasy",
      "titleKo": "시 판타지",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysseastory/vswaysseastory_200x200_NB.png"
    },
    {
      "game": "vs20wildpix",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Pixies",
      "titleKo": "신나는 요정들",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20wildpix/vs20wildpix_200x200_NB.png"
    },
    {
      "game": "vswaysspltsym",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dwarf & Dragon",
      "titleKo": "난쟁이 & 드래곤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysspltsym/vswaysspltsym_200x200_NB.png"
    },
    {
      "game": "vs20devilic",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Devilicious",
      "titleKo": "데빌리어스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20devilic/vs20devilic_200x200_NB.png"
    },
    {
      "game": "vs15fairytale",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fairytale Fortune",
      "titleKo": "페어리테일 포춘™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs15fairytale/vs15fairytale_200x200_NB.png"
    },
    {
      "game": "vs100sh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Shining Hot 100",
      "titleKo": "샤이닝 핫 100",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs100sh/vs100sh_200x200_NB.png"
    },
    {
      "game": "vs25dragonkingdom",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dragon Kingdom",
      "titleKo": "드래곤 킹덤",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25dragonkingdom/vs25dragonkingdom_200x200_NB.png"
    },
    {
      "game": "vswaysincwnd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gold Oasis",
      "titleKo": "골드 오아시스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysincwnd/vswaysincwnd_200x200_NB.png"
    },
    {
      "game": "vs20sknights",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Knight King",
      "titleKo": "더 나이트 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sknights/vs20sknights_200x200_NB.png"
    },
    {
      "game": "vs20eking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Emerald King",
      "titleKo": "에메랄드 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20eking/vs20eking_200x200_NB.png"
    },
    {
      "game": "vs10snakeladd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Snakes and Ladders Megadice",
      "titleKo": "뱀과 사다리 메가다이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10snakeladd/vs10snakeladd_200x200_NB.png"
    },
    {
      "game": "vs7fire88fp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mystic Wishes",
      "titleKo": "신비로운 소원",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs7fire88fp/vs7fire88fp_200x200_NB.png"
    },
    {
      "game": "vs20bl",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Busy Bees",
      "titleKo": "바쁜 꿀벌",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20bl/vs20bl_200x200_NB.png"
    },
    {
      "game": "vs10fireice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Escape the Pyramid - Fire & Ice",
      "titleKo": "피라미드 탈출 - 불과 얼음",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10fireice/vs10fireice_200x200_NB.png"
    },
    {
      "game": "vs10ddcbells",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Ding Dong Christmas Bells",
      "titleKo": "딩동 크리스머스 벨즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10ddcbells/vs10ddcbells_200x200_NB.png"
    },
    {
      "game": "vs20ekingrr",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Emerald King Rainbow Road",
      "titleKo": "에메랄드 킹 레인보우 로드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20ekingrr/vs20ekingrr_200x200_NB.png"
    },
    {
      "game": "vs50kingkong",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Mighty Kong",
      "titleKo": "마이티 콩",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50kingkong/vs50kingkong_200x200_NB.png"
    },
    {
      "game": "vs20piggybank",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Piggy Bankers",
      "titleKo": "피기 뱅커스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20piggybank/vs20piggybank_200x200_NB.png"
    },
    {
      "game": "vs50pixie",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Pixie Wings",
      "titleKo": "픽시 윙",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50pixie/vs50pixie_200x200_NB.png"
    },
    {
      "game": "vs25sea",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Great Reef",
      "titleKo": "위대한 산호초",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25sea/vs25sea_200x200_NB.png"
    },
    {
      "game": "vs10dyndigd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dynamite Diggin Doug",
      "titleKo": "다이너마이트 디긴 더그",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10dyndigd/vs10dyndigd_200x200_NB.png"
    },
    {
      "game": "vs5spjokfp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Code of Cairo",
      "titleKo": "코드 오브 카이로",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5spjokfp/vs5spjokfp_200x200_NB.png"
    },
    {
      "game": "vs20clreacts",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Moleionaire",
      "titleKo": "몰리오네어",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20clreacts/vs20clreacts_200x200_NB.png"
    },
    {
      "game": "vs10hottb7fs",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot to Burn 7 Deadly Free Spins",
      "titleKo": "핫투번 7 - 데들리 프리 스핀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10hottb7fs/vs10hottb7fs_200x200_NB.png"
    },
    {
      "game": "vs20irishcrown",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Irish Crown",
      "titleKo": "아이리시 크라운",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20irishcrown/vs20irishcrown_200x200_NB.png"
    },
    {
      "game": "vs25jokerking",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Joker King",
      "titleKo": "조커 킹",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25jokerking/vs25jokerking_200x200_NB.png"
    },
    {
      "game": "vs20godiva",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lady Godiva",
      "titleKo": "레이디 고디바",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20godiva/vs20godiva_200x200_NB.png"
    },
    {
      "game": "vs50dmdcascade",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Diamond Cascade",
      "titleKo": "다이아몬드 폭포",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50dmdcascade/vs50dmdcascade_200x200_NB.png"
    },
    {
      "game": "vs10chkchase",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chicken Chase",
      "titleKo": "치킨 체이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10chkchase/vs10chkchase_200x200_NB.png"
    },
    {
      "game": "vs5strh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Striking Hot 5",
      "titleKo": "스트라이킹 핫 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5strh/vs5strh_200x200_NB.png"
    },
    {
      "game": "vs10booklight",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "John Hunter and Galileo's Secrets",
      "titleKo": "존 헌터와 갈릴레오의 비밀",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10booklight/vs10booklight_200x200_NB.png"
    },
    {
      "game": "vs20loksriches",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Loki's Riches",
      "titleKo": "로키의 재물",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20loksriches/vs20loksriches_200x200_NB.png"
    },
    {
      "game": "vs40streetracer",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Street Racer",
      "titleKo": "스트리트 레이서",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40streetracer/vs40streetracer_200x200_NB.png"
    },
    {
      "game": "vswaysredqueen",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "The Red Queen",
      "titleKo": "더 레드 퀸",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysredqueen/vswaysredqueen_200x200_NB.png"
    },
    {
      "game": "vs50northgard",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "North Guardians",
      "titleKo": "노스 가디언즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50northgard/vs50northgard_200x200_NB.png"
    },
    {
      "game": "vs20aladdinsorc",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Aladdin and the Sorcerer",
      "titleKo": "알라딘 앤 더 소서러",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20aladdinsorc/vs20aladdinsorc_200x200_NB.png"
    },
    {
      "game": "vs10snakeeyes",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Snakes & Ladders - Snake Eyes",
      "titleKo": "스네이크 & 래더스 - 스네이크 아이즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10snakeeyes/vs10snakeeyes_200x200_NB.png"
    },
    {
      "game": "vs100firehot",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Hot 100",
      "titleKo": "파이어 핫 100",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs100firehot/vs100firehot_200x200_NB.png"
    },
    {
      "game": "vs10kingofdth",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Kingdom of the Dead",
      "titleKo": "킹덤 오브 더 데드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10kingofdth/vs10kingofdth_200x200_NB.png"
    },
    {
      "game": "vs20lcount",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gems of Serengeti",
      "titleKo": "젬스 오브 세렝게티",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20lcount/vs20lcount_200x200_NB.png"
    },
    {
      "game": "vs25xmasparty",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Penguins Christmas Party Time",
      "titleKo": "펭귄스  크리스마스 파티 시간",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25xmasparty/vs25xmasparty_200x200_NB.png"
    },
    {
      "game": "vs50chinesecharms",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Dragons",
      "titleKo": "럭키 드래곤즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50chinesecharms/vs50chinesecharms_200x200_NB.png"
    },
    {
      "game": "vs40sh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Shining Hot 40",
      "titleKo": "샤이닝 핫 40",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40sh/vs40sh_200x200_NB.png"
    },
    {
      "game": "vswaysbankbonz",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Cash Bonanza",
      "titleKo": "캐시 보난자",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaysbankbonz/vswaysbankbonz_200x200_NB.png"
    },
    {
      "game": "vs10starpirate",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Star Pirates Code",
      "titleKo": "스타 파이러츠 코드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10starpirate/vs10starpirate_200x200_NB.png"
    },
    {
      "game": "vs20santa",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Santa",
      "titleKo": "산타",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20santa/vs20santa_200x200_NB.png"
    },
    {
      "game": "vs20elevclust",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Gem Elevator",
      "titleKo": "젬 엘리베이터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20elevclust/vs20elevclust_200x200_NB.png"
    },
    {
      "game": "vs5trdragons",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Triple Dragons",
      "titleKo": "트리플 드래곤즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5trdragons/vs5trdragons_200x200_NB.png"
    },
    {
      "game": "vs20leprechaun",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Leprechaun Song",
      "titleKo": "레프리콘의 노래",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20leprechaun/vs20leprechaun_200x200_NB.png"
    },
    {
      "game": "vs20mvwild",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jasmine Dreams",
      "titleKo": "자스민 드림즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20mvwild/vs20mvwild_200x200_NB.png"
    },
    {
      "game": "vs7monkeys",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "7 Monkeys",
      "titleKo": "7 멍키",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs7monkeys/vs7monkeys_200x200_NB.png"
    },
    {
      "game": "vs40hotburnx",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot To Burn Extreme",
      "titleKo": "핫 투 번 익스트림",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40hotburnx/vs40hotburnx_200x200_NB.png"
    },
    {
      "game": "vs20forgewilds",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Forging Wilds",
      "titleKo": "포어징 와일즈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20forgewilds/vs20forgewilds_200x200_NB.png"
    },
    {
      "game": "vs243koipond",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Koi Pond",
      "titleKo": "코이 펀드",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs243koipond/vs243koipond_200x200_NB.png"
    },
    {
      "game": "vs40demonpots",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Demon Pots",
      "titleKo": "데몬 팟츠",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40demonpots/vs40demonpots_200x200_NB.png"
    },
    {
      "game": "vs40frrainbow",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fruit Rainbow",
      "titleKo": "후르츠 레인보우",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40frrainbow/vs40frrainbow_200x200_NB.png"
    },
    {
      "game": "vs25safari",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hot Safari",
      "titleKo": "핫 사파리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25safari/vs25safari_200x200_NB.png"
    },
    {
      "game": "vs20jhunter",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jackpot Hunter",
      "titleKo": "잭팟 헌터",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20jhunter/vs20jhunter_200x200_NB.png"
    },
    {
      "game": "vs50hercules",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Hercules Son of Zeus",
      "titleKo": "헤라클레스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs50hercules/vs50hercules_200x200_NB.png"
    },
    {
      "game": "vs5firehot",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Hot 5",
      "titleKo": "파이어 핫 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5firehot/vs5firehot_200x200_NB.png"
    },
    {
      "game": "vswayscfglory",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Chase For Glory",
      "titleKo": "체이스 포 글로리",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswayscfglory/vswayscfglory_200x200_NB.png"
    },
    {
      "game": "vs5luckydogly",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Dog",
      "titleKo": "럭키 독",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckydogly/vs5luckydogly_200x200_NB.png"
    },
    {
      "game": "vs20fh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Hot 20",
      "titleKo": "파이어 핫 20",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fh/vs20fh_200x200_NB.png"
    },
    {
      "game": "vs5luckdce88",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lucky Dice",
      "titleKo": "행운의 주사위",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5luckdce88/vs5luckdce88_200x200_NB.png"
    },
    {
      "game": "vs20hotzone",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "African Elephant",
      "titleKo": "아프리칸 엘리펀트",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20hotzone/vs20hotzone_200x200_NB.png"
    },
    {
      "game": "vswaystimber",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Timber Stacks",
      "titleKo": "팀버 스택스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vswaystimber/vswaystimber_200x200_NB.png"
    },
    {
      "game": "vs20lobcrab",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lobster Bob's Crazy Crab Shack",
      "titleKo": "랍스터 밥 크레이지 크랩 하우스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20lobcrab/vs20lobcrab_200x200_NB.png"
    },
    {
      "game": "vs20gorilla",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Jungle Gorilla",
      "titleKo": "정글 고릴라",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20gorilla/vs20gorilla_200x200_NB.png"
    },
    {
      "game": "vs10luckfort",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Good Luck & Good Fortune",
      "titleKo": "굿럭 앤 굿포츈",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10luckfort/vs10luckfort_200x200_NB.png"
    },
    {
      "game": "vs13g",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Devil's 13",
      "titleKo": "악마의 13",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs13g/vs13g_200x200_NB.png"
    },
    {
      "game": "vs1mjokfp",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Master Gems",
      "titleKo": "마스터 잼스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs1mjokfp/vs1mjokfp_200x200_NB.png"
    },
    {
      "game": "vs5tdragresk",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dino Drop",
      "titleKo": "디노 드롭",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5tdragresk/vs5tdragresk_200x200_NB.png"
    },
    {
      "game": "vs25dwarves_new",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Dwarven Gold Deluxe",
      "titleKo": "드워프 골드 디럭스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25dwarves_new/vs25dwarves_new_200x200_NB.png"
    },
    {
      "game": "vs20lobseafd",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Lobster Bob's Sea Food and Win It",
      "titleKo": "랍스터 밥의 바다 음식과 ",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20lobseafd/vs20lobseafd_200x200_NB.png"
    },
    {
      "game": "vs40firehot",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fire Hot 40",
      "titleKo": "파이어 핫 40",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs40firehot/vs40firehot_200x200_NB.png"
    },
    {
      "game": "vs5sh",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Shining Hot 5",
      "titleKo": "샤이닝 핫 5",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs5sh/vs5sh_200x200_NB.png"
    },
    {
      "game": "vs25gladiator",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wild Gladiator",
      "titleKo": "상남자 검투사™",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25gladiator/vs25gladiator_200x200_NB.png"
    },
    {
      "game": "vs10bbdice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Big Bass Dice",
      "titleKo": "빅 베이스 주사위",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs10bbdice/vs10bbdice_200x200_NB.png"
    },
    {
      "game": "vs20fpartydice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Fruit Party Dice",
      "titleKo": "과일 파티 다이스",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20fpartydice/vs20fpartydice_200x200_NB.png"
    },
    {
      "game": "vs20msdice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Money Stacks Dice",
      "titleKo": "머니 스택스 주사위",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20msdice/vs20msdice_200x200_NB.png"
    },
    {
      "game": "vs20sugardice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Sugar Rush Dice",
      "titleKo": "슈가 러쉬 주사위",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs20sugardice/vs20sugardice_200x200_NB.png"
    },
    {
      "game": "vs25wgdice",
      "vendor": "pragmatic_slot",
      "region": "Pragmatic",
      "titleEn": "Wolf Gold Dice",
      "titleKo": "울프 골드 주사위",
      "icon": "https://common-static.ppgames.net/gs2c/common/lobby/v1/apps/slots-lobby-assets/vs25wgdice/vs25wgdice_200x200_NB.png"
    }
  ],
  "cq9_casino": [
    {
      "game": "GINKGO03",
      "vendor": "cq9_casino",
      "region": "Cq9",
      "titleEn": "GINKGO03",
      "titleKo": "깅커고우 03",
      "icon": "https://icon.vinus-gaming.com/cq9_casino/GINKGO03.png"
    }
  ],
  "TOMHORN_VIVO": [
    {
      "game": "VG_410",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Africa Auto Roulette",
      "titleKo": "비보 라이브 딜러 - 아프리카 오토 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_410.png"
    },
    {
      "game": "VG_355",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Royale Baccarat",
      "titleKo": "비보 라이브 딜러 - 로얄 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_355.png"
    },
    {
      "game": "VG_354",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Platinum Hall Baccarat",
      "titleKo": "비보 라이브 딜러 - 플래티넘 홀 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_354.png"
    },
    {
      "game": "VG_353",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Blue Crystal Baccarat",
      "titleKo": "비보 라이브 딜러 - 블루 크리스탈 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_353.png"
    },
    {
      "game": "VG_352",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Monaco Baccarat",
      "titleKo": "비보 라이브 딜러 - 모나코 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_352.png"
    },
    {
      "game": "VG_351",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Prestige Baccarat",
      "titleKo": "비보 라이브 딜러 - 프레스티지 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_351.png"
    },
    {
      "game": "VG_215",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Blackjack Diamonds",
      "titleKo": "비보 라이브 딜러 - 블랙잭 다이아몬드",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_215.png"
    },
    {
      "game": "VG_27",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Golden Hall Baccarat",
      "titleKo": "비보 라이브 딜러 - 골든 홀 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VG_27.png"
    },
    {
      "game": "VGRoulette228_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Spanish Roulette",
      "titleKo": "비보 라이브 딜러 - 스페인 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette228_TNP.png"
    },
    {
      "game": "VGRoulette168_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - American Auto Roulette",
      "titleKo": "비보 라이브 딜러 - 아메리칸 오토 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette168_TNP.png"
    },
    {
      "game": "VGBlackjack1_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Bulgaria Blackjack",
      "titleKo": "비보 라이브 딜러 - 불가리아 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBlackjack1_TNP.png"
    },
    {
      "game": "VGRoulette21_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Francais Belle Roulette",
      "titleKo": "비보 라이브 딜러 - 프랑세 벨 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette21_TNP.png"
    },
    {
      "game": "VGRO344_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Fountain Roulette",
      "titleKo": "비보 라이브 딜러 - 파운틴 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRO344_TNP.png"
    },
    {
      "game": "VGRoulette2_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - La Espanola Roulette",
      "titleKo": "비보 라이브 딜러 - 라 에스파놀라 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette2_TNP.png"
    },
    {
      "game": "VGBJ16_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Oceania VIP Blackjack",
      "titleKo": "비보 라이브 딜러 - 오세아니아 VIP 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBJ16_TNP.png"
    },
    {
      "game": "VGLimitlessBJ_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Limitless Blackjack",
      "titleKo": "비보 라이브 딜러 - 리미트리스 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGLimitlessBJ_TNP.png"
    },
    {
      "game": "VGBaccaratMC2_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Dancing Baccarat",
      "titleKo": "비보 라이브 딜러스 - 댄싱 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratMC2_TNP.png"
    },
    {
      "game": "VGBaccaratLV1_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Caribbean Baccarat",
      "titleKo": "비보 라이브 딜러 - 캐리비안 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratLV1_TNP.png"
    },
    {
      "game": "VGBaccaratLV2_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Miami Beach Baccarat",
      "titleKo": "비보 라이브 딜러 - 마이애미 비치 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratLV2_TNP.png"
    },
    {
      "game": "VGBaccaratLV3_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Copa Cabana Baccarat",
      "titleKo": "비보 라이브 딜러 - 코파 카바나 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratLV3_TNP.png"
    },
    {
      "game": "VGBaccaratMC1_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Red Dragon Baccarat",
      "titleKo": "비보 라이브 딜러스 - 레드 드래곤 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratMC1_TNP.png"
    },
    {
      "game": "VGBaccaratSG1_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Marina Bay Baccarat",
      "titleKo": "비보 라이브 딜러 - 마리나 베이 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratSG1_TNP.png"
    },
    {
      "game": "VGBaccaratSG2_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Singapore Baccarat",
      "titleKo": "비보 라이브 딜러 - 싱가포르 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratSG2_TNP.png"
    },
    {
      "game": "VGBaccaratSG3_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Baccarat Dance",
      "titleKo": "비보 라이브 딜러 - 바카라 댄스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccaratSG3_TNP.png"
    },
    {
      "game": "VGMacauBaccarat_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Macau Baccarat",
      "titleKo": "비보 라이브 딜러 - 마카오 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGMacauBaccarat_TNP.png"
    },
    {
      "game": "VGHatTrickRoulette_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Las Vegas Roulette",
      "titleKo": "비보 라이브 딜러 - 라스베이거스 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGHatTrickRoulette_TNP.png"
    },
    {
      "game": "VGBlackjackES_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Las Vegas Blackjack",
      "titleKo": "비보 라이브 딜러 - 라스베이거스 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBlackjackES_TNP.png"
    },
    {
      "game": "VGHoldem_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Infinite Casino Holdem",
      "titleKo": "비보 라이브 딜러 - 인피니트 카지노 홀덤",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGHoldem_TNP.png"
    },
    {
      "game": "VGLobby_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Lobby",
      "titleKo": "비보 라이브 딜러 - 로비",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGLobby_TNP.png"
    },
    {
      "game": "VGBaccarat22_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Oriental Baccarat",
      "titleKo": "비보 라이브 딜러 - 오리엔탈 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccarat22_TNP.png"
    },
    {
      "game": "VGBaccarat20_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Imperial Baccarat",
      "titleKo": "비보 라이브 딜러 - 임페리얼 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGBaccarat20_TNP.png"
    },
    {
      "game": "VGRoulette12_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Rapid-Auto Roulette",
      "titleKo": "비보 라이브 딜러 - 래피드 오토 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette12_TNP.png"
    },
    {
      "game": "VGRoulette10_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Oracle Twister Roulette",
      "titleKo": "비보 라이브 딜러 - 오라클 트위스터 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette10_TNP.png"
    },
    {
      "game": "VGRoulette9_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Majestic Roulette",
      "titleKo": "비보 라이브 딜러 - 마제스틱 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette9_TNP.png"
    },
    {
      "game": "VGRoulette5_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Portomaso Roulette",
      "titleKo": "비보 라이브 딜러 - 포르토마소 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette5_TNP.png"
    },
    {
      "game": "VGRoulette4_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Blaze Roulette",
      "titleKo": "비보 라이브 딜러 - 블레이즈 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette4_TNP.png"
    },
    {
      "game": "VGRoulette1_TNP",
      "vendor": "TOMHORN_VIVO",
      "region": "Tomhorn",
      "titleEn": "Vivo Live Dealers - Galactic VIP",
      "titleKo": "비보 라이브 딜러 - 갤럭시 VIP",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_VIVO/VGRoulette1_TNP.png"
    }
  ],
  "TOMHORN_SLOT": [
    {
      "game": "VSBookCF_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Book of Crystal Fruits",
      "titleKo": "북 오브 크리스탈 프루츠",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBookCF_TNP.png"
    },
    {
      "game": "VSCandyCoinz_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Candy Coins",
      "titleKo": "캔디 코인즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSCandyCoinz_TNP.png"
    },
    {
      "game": "VSDragEggStrm_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Dragon Egg FeatureStorm",
      "titleKo": "드래곤 에그 피처스톰",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSDragEggStrm_TNP.png"
    },
    {
      "game": "VSTriplUp_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Triple Up",
      "titleKo": "트리플 업",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSTriplUp_TNP.png"
    },
    {
      "game": "VSWildTribeW_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Wild Tribe Wall",
      "titleKo": "와일드 트라이브 월",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSWildTribeW_TNP.png"
    },
    {
      "game": "VS243CloverF_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "243 Clover Fruits",
      "titleKo": "243 클로버 과일",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS243CloverF_TNP.png"
    },
    {
      "game": "VSSantaYetti_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Santa Yetti",
      "titleKo": "산타 예티",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSSantaYetti_TNP.png"
    },
    {
      "game": "VS3RibbonP_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "3 Ribbon Pots",
      "titleKo": "3 리본 포트",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS3RibbonP_TNP.png"
    },
    {
      "game": "VS243Chili_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "243 Chili",
      "titleKo": "243 칠리",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS243Chili_TNP.png"
    },
    {
      "game": "VS243ZeusF_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "243 Zeus Fruits",
      "titleKo": "243 제우스 프루트",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS243ZeusF_TNP.png"
    },
    {
      "game": "VSTaoTree_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Tao Tree Coins",
      "titleKo": "토 트리 코인즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSTaoTree_TNP.png"
    },
    {
      "game": "VSBookAzure_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Book of Azure",
      "titleKo": "북 오브 애저",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBookAzure_TNP.png"
    },
    {
      "game": "VSPandaR_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Panda Rica",
      "titleKo": "판다 리카",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSPandaR_TNP.png"
    },
    {
      "game": "VSCatchLuck_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Catch the Luck",
      "titleKo": "캐치 더 럭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSCatchLuck_TNP.png"
    },
    {
      "game": "VSAliensTurtles_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Alien Turtles vs Humans",
      "titleKo": "에일리언 터털즈vs휴먼즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSAliensTurtles_TNP.png"
    },
    {
      "game": "VSRedHead_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Red Head Bounty",
      "titleKo": "레드 헤드 바운티",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSRedHead_TNP.png"
    },
    {
      "game": "VSBeastCoinz_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Beast Coinz",
      "titleKo": "비스트 코인즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBeastCoinz_TNP.png"
    },
    {
      "game": "VS81CreepyCircus_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "81 Creepy Circus",
      "titleKo": "81 크리피 서커스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS81CreepyCircus_TNP.png"
    },
    {
      "game": "VSCoin_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Pirate Coins",
      "titleKo": "파이럿 코인즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSCoin_TNP.png"
    },
    {
      "game": "VSJapanF_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Wild Skyfire",
      "titleKo": "와일드 스카이파이어",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSJapanF_TNP.png"
    },
    {
      "game": "VSMajesticCoin_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Majestic Coins",
      "titleKo": "마제스틱 코인스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSMajesticCoin_TNP.png"
    },
    {
      "game": "VSDarius_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Book of Darius",
      "titleKo": "다리우스의 책",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSDarius_TNP.png"
    },
    {
      "game": "VSMBS_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Money Bunny Show",
      "titleKo": "머니 버니 쇼",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSMBS_TNP.png"
    },
    {
      "game": "VSPantherR_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Pantera Rica",
      "titleKo": "판테라 리카",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSPantherR_TNP.png"
    },
    {
      "game": "VSBlizzard_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Hot Blizzard Deluxe",
      "titleKo": "핫 블리자드 디럭스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBlizzard_TNP.png"
    },
    {
      "game": "VSAkneye_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Akne Fruits",
      "titleKo": "아크네 과일스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSAkneye_TNP.png"
    },
    {
      "game": "VSSnowflakes_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Wild Snowflakes",
      "titleKo": "야생 눈송이",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSSnowflakes_TNP.png"
    },
    {
      "game": "VSMaxGold_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Max Gold",
      "titleKo": "맥스 골드",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSMaxGold_TNP.png"
    },
    {
      "game": "VSRome_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Roman Spins",
      "titleKo": "로만 스핀",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSRome_TNP.png"
    },
    {
      "game": "VS27Crystal_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "27 Crystal Fruits",
      "titleKo": "27 크리스탈 과일",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS27Crystal_TNP.png"
    },
    {
      "game": "VS256FrutasGrandes_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "256 Frutas Grandes",
      "titleKo": "256 프루타스 그란데스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS256FrutasGrandes_TNP.png"
    },
    {
      "game": "VSHookF_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Hook the Fortune",
      "titleKo": "행운의 고리",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSHookF_TNP.png"
    },
    {
      "game": "VSScarab_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Lucky Scarab",
      "titleKo": "럭키 스카랩",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSScarab_TNP.png"
    },
    {
      "game": "VSCrown_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Crown's Legacy",
      "titleKo": "크라운즈 레거시",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSCrown_TNP.png"
    },
    {
      "game": "VSWWH_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Bank Wagon Heist",
      "titleKo": "뱅크 왜건 하이스트",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSWWH_TNP.png"
    },
    {
      "game": "VSZeusDivine_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Zeus Divine Multipliers",
      "titleKo": "주스 디바인 멀터플라여즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSZeusDivine_TNP.png"
    },
    {
      "game": "VSTheRichGuy_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Biggy Winnie feat. The Rich Guy",
      "titleKo": "빅기 위니의 위업. 더 리치 가이",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSTheRichGuy_TNP.png"
    },
    {
      "game": "VSBisBuf_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Bison vs Buffalo",
      "titleKo": "바이슨 대 버팔로",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBisBuf_TNP.png"
    },
    {
      "game": "VSCFBonanza_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Crystal Fruits Bonanza",
      "titleKo": "크리스털 프루츠 보난자",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSCFBonanza_TNP.png"
    },
    {
      "game": "VSWildMirage95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Wild Mirage",
      "titleKo": "와일드 미라지",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSWildMirage95_TNP.png"
    },
    {
      "game": "VSAarupolis95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Aarupolis",
      "titleKo": "아루폴리스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSAarupolis95_TNP.png"
    },
    {
      "game": "VS243CFDeluxe95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "243 Crystal Fruits Deluxe - 95RTP",
      "titleKo": "243 크리스탈후르츠 디럭스 - 95RTP",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS243CFDeluxe95_TNP.png"
    },
    {
      "game": "VS243FND95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "243 Fire'n'Diamonds",
      "titleKo": "243 파이어 앤 다이아몬드",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS243FND95_TNP.png"
    },
    {
      "game": "VS81Joker95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "81 JokerX",
      "titleKo": "81 조커 X",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS81Joker95_TNP.png"
    },
    {
      "game": "VSCleopatra95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Book of Cleo - 95RTP",
      "titleKo": "Cleo의 서",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSCleopatra95_TNP.png"
    },
    {
      "game": "VS27FW95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Flaming Wild 27",
      "titleKo": "플레이밍 와일드 27",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS27FW95_TNP.png"
    },
    {
      "game": "VSFFD95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Flaming Fruit Deluxe",
      "titleKo": "플레이밍 후르츠 디럭스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSFFD95_TNP.png"
    },
    {
      "game": "VSMidas95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Midas Dynasty - 95RTP",
      "titleKo": "마이다스 왕조",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSMidas95_TNP.png"
    },
    {
      "game": "VS81Crystal95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "81 Crystal Fruits - 95RTP",
      "titleKo": "81 크리스탈 후르츠 - 95RTP",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS81Crystal95_TNP.png"
    },
    {
      "game": "VS5Frenzy95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Fire 'n' Frenzy 5 - 95RTP",
      "titleKo": "파이어 앤 프렌지 5 - 95RTP",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS5Frenzy95_TNP.png"
    },
    {
      "game": "VSAladdin96_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Book Of Aladdin",
      "titleKo": "북 오브 알라딘",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSAladdin96_TNP.png"
    },
    {
      "game": "VSWDF95_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Wild Dragon's Fortune - 95RTP",
      "titleKo": "와일드 드래곤 포춘 - 95RTP",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSWDF95_TNP.png"
    },
    {
      "game": "VSBoB94_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Book of Ba - 94RTP",
      "titleKo": "북 오브 바",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBoB94_TNP.png"
    },
    {
      "game": "VSFluxberry_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Fluxberry",
      "titleKo": "플럭스베리",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSFluxberry_TNP.png"
    },
    {
      "game": "VSDragFenix_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Dragon VS Phoenix",
      "titleKo": "드래곤 VS 피닉스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSDragFenix_TNP.png"
    },
    {
      "game": "VSPengwins_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "PengWins",
      "titleKo": "펭윈즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSPengwins_TNP.png"
    },
    {
      "game": "VSLine_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Frutopia",
      "titleKo": "프루토피아",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSLine_TNP.png"
    },
    {
      "game": "VSCricket_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Cricket Mania",
      "titleKo": "크리켓 마니아",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSCricket_TNP.png"
    },
    {
      "game": "VSBlocks_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Mine Mine Quest",
      "titleKo": "마인 마인 퀘스트",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBlocks_TNP.png"
    },
    {
      "game": "VSSpaceJ_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Space Jammers",
      "titleKo": "스페이스 잼머스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSSpaceJ_TNP.png"
    },
    {
      "game": "VSFFC_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Fruits Go Pop",
      "titleKo": "후르츠 고 팝",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSFFC_TNP.png"
    },
    {
      "game": "VSBelarus_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Beastie Bux",
      "titleKo": "비스티 벅스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBelarus_TNP.png"
    },
    {
      "game": "VSTomatina_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "La Tomatina",
      "titleKo": "라 토마티나",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSTomatina_TNP.png"
    },
    {
      "game": "VSLuckyst_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "81 Frutas Grandes",
      "titleKo": "81 프루타스 그란데스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSLuckyst_TNP.png"
    },
    {
      "game": "VSWheel_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Wheel Of Luck",
      "titleKo": "휠 오브 럭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSWheel_TNP.png"
    },
    {
      "game": "VSSweets_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Sweet Crush",
      "titleKo": "스위트 크러시",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSSweets_TNP.png"
    },
    {
      "game": "VSGold_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "GoldX",
      "titleKo": "골드X",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSGold_TNP.png"
    },
    {
      "game": "VS243Reverse_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "243 Crystal Fruits Reversed",
      "titleKo": "243 크리스탈 후르츠 리저브",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS243Reverse_TNP.png"
    },
    {
      "game": "VSJoker_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Joker Reelz",
      "titleKo": "조커 릴즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSJoker_TNP.png"
    },
    {
      "game": "VSBoB_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "The Secret of Ba",
      "titleKo": "더 시크릿 오브 바",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSBoB_TNP.png"
    },
    {
      "game": "VSPinball_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Spinball",
      "titleKo": "스핀볼",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSPinball_TNP.png"
    },
    {
      "game": "VS9x9_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Diamond Hill",
      "titleKo": "다이아몬드 힐",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VS9x9_TNP.png"
    },
    {
      "game": "VSFireF_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Hot'n'Fruity",
      "titleKo": "핫 앤 후르티",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSFireF_TNP.png"
    },
    {
      "game": "VSMongo_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Kongo Bongo",
      "titleKo": "콩고 봉고",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSMongo_TNP.png"
    },
    {
      "game": "VSIncas_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Incas's Treasure",
      "titleKo": "잉카 트레저",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSIncas_TNP.png"
    },
    {
      "game": "VSSherlock_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Sherlock",
      "titleKo": "셜록",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSSherlock_TNP.png"
    },
    {
      "game": "VSFrozenQ_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Frozen Queen",
      "titleKo": "프로즌 퀸",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSFrozenQ_TNP.png"
    },
    {
      "game": "VSminiBBQ_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Blackbeard's Quest Mini",
      "titleKo": "블랙버즈 퀘스트 미니",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSminiBBQ_TNP.png"
    },
    {
      "game": "VSWildWeath_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Wild Weather",
      "titleKo": "와일드 웨더",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSWildWeath_TNP.png"
    },
    {
      "game": "VSDragRich2_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Dragon Riches",
      "titleKo": "드래곤 리치",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSDragRich2_TNP.png"
    },
    {
      "game": "VSRedLights_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Red Lights",
      "titleKo": "레드 라이트",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSRedLights_TNP.png"
    },
    {
      "game": "VSMonsterM2_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Monster Madness",
      "titleKo": "몬스터 매드니스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSMonsterM2_TNP.png"
    },
    {
      "game": "VSPanda_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Panda's Run",
      "titleKo": "판다 런",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSPanda_TNP.png"
    },
    {
      "game": "VSlotFH_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Fire 'n' Hot",
      "titleKo": "파이어 앤 핫",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotFH_TNP.png"
    },
    {
      "game": "VSShaolin_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Shaolin's Tiger",
      "titleKo": "샤오린 타이거",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSShaolin_TNP.png"
    },
    {
      "game": "VSGeisha_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Geisha's Fan",
      "titleKo": "게이샤 팬",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSGeisha_TNP.png"
    },
    {
      "game": "VSThronesOfP_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Thrones Of Persia",
      "titleKo": "페르시아의 왕좌",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSThronesOfP_TNP.png"
    },
    {
      "game": "VSDonJuan_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Don Juan's Peppers",
      "titleKo": "돈 주앙 페퍼",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSDonJuan_TNP.png"
    },
    {
      "game": "VSlotMY_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Monkey 27",
      "titleKo": "몽키 27",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotMY_TNP.png"
    },
    {
      "game": "VSlotBOS_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Book Of Spells",
      "titleKo": "북 오프 스펠스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotBOS_TNP.png"
    },
    {
      "game": "VSlotBBQ_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Blackbeard's Quest",
      "titleKo": "블랙버즈 퀘스트",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotBBQ_TNP.png"
    },
    {
      "game": "VSlotHB_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Hot Blizzard",
      "titleKo": "핫 블리자드",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotHB_TNP.png"
    },
    {
      "game": "VSlotSL_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Sizable Win",
      "titleKo": "사이저블 윈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotSL_TNP.png"
    },
    {
      "game": "VSlotBM_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Black Mummy",
      "titleKo": "검은 미라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotBM_TNP.png"
    },
    {
      "game": "VSlotTJ_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Triple Joker",
      "titleKo": "트리플 조커",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotTJ_TNP.png"
    },
    {
      "game": "VSlotFF_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Flaming Fruit",
      "titleKo": "플레이밍 후르츠",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotFF_TNP.png"
    },
    {
      "game": "VSlotTC_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "The Cup",
      "titleKo": "더 컵",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotTC_TNP.png"
    },
    {
      "game": "VSlotSB_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Sky Barons",
      "titleKo": "스카이 바론",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotSB_TNP.png"
    },
    {
      "game": "VSlotSK_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Savannah King",
      "titleKo": "사바나 킹",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotSK_TNP.png"
    },
    {
      "game": "VSlotFengFu_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Feng Fu",
      "titleKo": "펭 푸",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotFengFu_TNP.png"
    },
    {
      "game": "VSlotDE_TNP",
      "vendor": "TOMHORN_SLOT",
      "region": "Tomhorn",
      "titleEn": "Dragon Egg",
      "titleKo": "드레곤 에그",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_SLOT/VSlotDE_TNP.png"
    }
  ],
  "TOMHORN_7Mojos": [
    {
      "game": "AB_1095",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Gold Club Auto Roulette",
      "titleKo": "7모조스 - 골드 클럽 오토 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1095.png"
    },
    {
      "game": "AB_1039",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - No Commission Baccarat",
      "titleKo": "7모조스 - 노 커미션 바카라",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1039.png"
    },
    {
      "game": "AB_1084",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Lucky 7",
      "titleKo": "7모조 - 럭키 7",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1084.png"
    },
    {
      "game": "AB_1091",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Auto Roulette Solaris",
      "titleKo": "7모조 - 오토 룰렛 솔라리스",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1091.png"
    },
    {
      "game": "AB_1089",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Opal Auto Roulette",
      "titleKo": "7모조 - 오팔 오토 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1089.png"
    },
    {
      "game": "AB_1088",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 500x Royal India Auto Roulette",
      "titleKo": "7모조 - 500x 로얄 인도 오토 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1088.png"
    },
    {
      "game": "AB_1077",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 500x Marble Auto RoulettÐµ",
      "titleKo": "7모조스 - 500x 마블 오토 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1077.png"
    },
    {
      "game": "AB_1075",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 500x Cyber Auto Roulette",
      "titleKo": "7모조스 - 500x 사이버 자동 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1075.png"
    },
    {
      "game": "AB_1073",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Baccarat E",
      "titleKo": "7모조스 - 바카라 E",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1073.png"
    },
    {
      "game": "AB_1072",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Baccarat D",
      "titleKo": "7모조스 - 바카라 D",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1072.png"
    },
    {
      "game": "AB_1071",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Baccarat C",
      "titleKo": "7모조스 - 바카라 C",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1071.png"
    },
    {
      "game": "AB_1070",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Baccarat B",
      "titleKo": "7모조스 - 바카라 B",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1070.png"
    },
    {
      "game": "AB_1068",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Dragon Tiger RNG",
      "titleKo": "7모조스 - 드래곤 타이거 RNG",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1068.png"
    },
    {
      "game": "AB_1032",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Galaxy Blackjack",
      "titleKo": "7모조스 - 갤럭시 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1032.png"
    },
    {
      "game": "AB_1065",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 3-Card Poker RNG",
      "titleKo": "7모조스-3 카드 포커 RNG",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1065.png"
    },
    {
      "game": "AB_1064",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Teen Patti Face Off RNG",
      "titleKo": "7모조스-틴 패티 페이스 오프 RNG",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1064.png"
    },
    {
      "game": "AB_1063",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Teen Patti RNG",
      "titleKo": "7모조스-틴 패티 RNG",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1063.png"
    },
    {
      "game": "AB_1062",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Andar Bahar RNG",
      "titleKo": "7모조스-안다르 바하르 RNG",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1062.png"
    },
    {
      "game": "AB_1061",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 500x Auto Roulette Imperial",
      "titleKo": "7모조스- 500배 오토 룰렛 임페리얼",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1061.png"
    },
    {
      "game": "AB_1060",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 500x Auto Roulette Noir",
      "titleKo": "7모조스- 500배 자동 룰렛 누아르",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1060.png"
    },
    {
      "game": "AB_1058",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Auto Roulette Royal",
      "titleKo": "7모조스- 오토 룰렛 로얄",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1058.png"
    },
    {
      "game": "AB_1057",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 777x Galaxy Roulette",
      "titleKo": "7모조스- 777x 갤럭시 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1057.png"
    },
    {
      "game": "AB_1056",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - 500x Turkish Roulette",
      "titleKo": "7모조스 - 500배 터키 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1056.png"
    },
    {
      "game": "AB_1054",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Auto Roulette Noir",
      "titleKo": "7모조스 - 오토룰렛 느와르",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1054.png"
    },
    {
      "game": "AB_1053",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Auto Roulette Imperial",
      "titleKo": "7모조스 - 오토룰렛 임페리얼",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1053.png"
    },
    {
      "game": "AB_1045",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Diamond VIP Roulette",
      "titleKo": "7모조스 - 다이아몬드 VIP 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1045.png"
    },
    {
      "game": "AB_1040",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - No Commission Baccarat (Baccarat A)",
      "titleKo": "7모조스 - 노 커미션 바카라 (바카라 A)",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1040.png"
    },
    {
      "game": "AB_1030",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Baccarat A",
      "titleKo": "7모조스 - 바카라 A",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1030.png"
    },
    {
      "game": "AB_1024",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Galaxy Roulette",
      "titleKo": "7모조스 - 갤럭시 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1024.png"
    },
    {
      "game": "AB_1033",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Neon Roulette",
      "titleKo": "7모조스 - 네온 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1033.png"
    },
    {
      "game": "AB_1034",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Turkish Roulette",
      "titleKo": "7모조스 - 터키 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1034.png"
    },
    {
      "game": "AB_1000",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Lobby",
      "titleKo": "7모조스 - 로비",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1000.png"
    },
    {
      "game": "AB_1038",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Dragon Tiger",
      "titleKo": "7모조스 - 드래곤 타이거",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1038.png"
    },
    {
      "game": "AB_1027",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Andar Bahar",
      "titleKo": "7모조스 - 안다르 바하르",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1027.png"
    },
    {
      "game": "AB_1029",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Teen Patti Face Off",
      "titleKo": "7모조스 - 틴 패티 페이스 오프",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1029.png"
    },
    {
      "game": "AB_1025",
      "vendor": "TOMHORN_7Mojos",
      "region": "Tomhorn",
      "titleEn": "7Mojos - Turkish Blackjack",
      "titleKo": "7모조 - 터키 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_7Mojos/AB_1025.png"
    }
  ],
  "TOMHORN_AbsoluteLive": [
    {
      "game": "AB_811",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Portal Roulette",
      "titleKo": "앱솔루트라이브 포털 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_811.png"
    },
    {
      "game": "AB_85",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Desert Roulette",
      "titleKo": "앱솔루트라이브 사막 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_85.png"
    },
    {
      "game": "AB_415",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Endless BlackJack",
      "titleKo": "앱솔루트라이브 - 엔드리스 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_415.png"
    },
    {
      "game": "AB_39",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Bond La Partage",
      "titleKo": "앱솔루트 라이브 - 본드 라 파티지",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_39.png"
    },
    {
      "game": "AB_99",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Roulette Prague",
      "titleKo": "앱솔루트 라이브 - 룰렛 프라하",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_99.png"
    },
    {
      "game": "AB_410",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Endless Blackjack",
      "titleKo": "앱솔루트 라이브 - 엔드리스 블랙잭",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_410.png"
    },
    {
      "game": "AB_55",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Genies Prize Roulette",
      "titleKo": "앱솔루트라이브 - 지니상 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_55.png"
    },
    {
      "game": "AB_56",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Roulette CZ",
      "titleKo": "앱솔루트라이브 - 룰렛 CZ",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_56.png"
    },
    {
      "game": "AB_180",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Baccarat No Commission Super 6 B",
      "titleKo": "앱솔루트 라이브 - 노 커미션 바카라 슈퍼 6 B",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_180.png"
    },
    {
      "game": "AB_179",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Baccarat B",
      "titleKo": "앱솔루트 라이브 - 바카라 B",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_179.png"
    },
    {
      "game": "AB_7",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Absolute Casino",
      "titleKo": "앱솔루트 라이브 - 앱솔루트 카지노",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_7.png"
    },
    {
      "game": "AB_35",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Oracle Roulette",
      "titleKo": "앱솔루트 라이브 - 오라클 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_35.png"
    },
    {
      "game": "AB_25",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - X-Mass DoubleWin Roulette",
      "titleKo": "앱솔루트 라이브 - X-매스 더블윈 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_25.png"
    },
    {
      "game": "AB_101",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Baccarat1",
      "titleKo": "앱솔루트 라이브 - 바카라1",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_101.png"
    },
    {
      "game": "AB_14",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Absolute RNG",
      "titleKo": "앱솔루트 라이브 - 앱솔루트 RNG",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_14.png"
    },
    {
      "game": "AB_81",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Prism Roulette",
      "titleKo": "앱솔루트 라이브 - 프리즘 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_81.png"
    },
    {
      "game": "AB_0",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Lobby",
      "titleKo": "앱솔루트 라이브 - 로비",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_0.png"
    },
    {
      "game": "AB_37",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Roulette 360",
      "titleKo": "앱솔루트 라이브 - 룰렛 360",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_37.png"
    },
    {
      "game": "AB_31",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Las Vegas Roulette",
      "titleKo": "앱솔루트 라이브 - 라스베이거스 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_31.png"
    },
    {
      "game": "AB_30",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - American Roulette",
      "titleKo": "앱솔루트 라이브 - 아메리칸 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_30.png"
    },
    {
      "game": "AB_18",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Absolute Bright",
      "titleKo": "앱솔루트 라이브 - 앱솔루트 브라이트",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_18.png"
    },
    {
      "game": "AB_15",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - MSC Casino",
      "titleKo": "앱솔루트 라이브 - MSC 카지노",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_15.png"
    },
    {
      "game": "AB_1",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Real Casino Roulette",
      "titleKo": "앱솔루트 라이브 - 리얼 카지노 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_1.png"
    },
    {
      "game": "AB_4",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - VIP Roulette",
      "titleKo": "앱솔루트 라이브 - VIP 룰렛",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_4.png"
    },
    {
      "game": "AB_3",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Oracle Blaze",
      "titleKo": "앱솔루트 라이브 - 오라클 블레이즈",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_3.png"
    },
    {
      "game": "AB_5",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Absolute Brown",
      "titleKo": "앱솔루트 라이브 - 앱솔루트 브라운",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_5.png"
    },
    {
      "game": "AB_2",
      "vendor": "TOMHORN_AbsoluteLive",
      "region": "Tomhorn",
      "titleEn": "AbsoluteLive - Absolute Black",
      "titleKo": "앱솔루트 라이브 - 앱솔루트 블랙",
      "icon": "https://icon.vinus-gaming.com/TOMHORN_AbsoluteLive/AB_2.png"
    }
  ],
  "habanero": [
    {
      "game": "SGFortuneDragonJoy",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fortune Dragon Joy",
      "titleKo": "포춘 드래곤 조이",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFortuneDragonJoy.png"
    },
    {
      "game": "SGRacingRoyalty",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Racing Royalty",
      "titleKo": "레이싱 로열티",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGRacingRoyalty.png"
    },
    {
      "game": "SGIsibayaQueens",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Isibaya Queens",
      "titleKo": "이시바야 퀸즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGIsibayaQueens.png"
    },
    {
      "game": "SGInfernalFury",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Infernal Fury",
      "titleKo": "인퍼널 퓨리",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGInfernalFury.png"
    },
    {
      "game": "SGGoldKoiFortune",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Gold Koi Fortune",
      "titleKo": "골드 코이 포춘",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGoldKoiFortune.png"
    },
    {
      "game": "SGGeniesShowtime",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Genie's Showtime",
      "titleKo": "지니의 쇼타임",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGeniesShowtime.png"
    },
    {
      "game": "SGShiveringStrings",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Shivering Strings",
      "titleKo": "쉐이빙 스트링스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGShiveringStrings.png"
    },
    {
      "game": "SGIndianaWolf",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Indiana Wolf",
      "titleKo": "인디아나 울프",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGIndianaWolf.png"
    },
    {
      "game": "SGMysticShaman",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mystic Shaman",
      "titleKo": "미스틱 샤먼",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMysticShaman.png"
    },
    {
      "game": "SGSafariRumble",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Safari Rumble",
      "titleKo": "사파리 럼블",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSafariRumble.png"
    },
    {
      "game": "SGGladiatorRoyal",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Gladiator Royal",
      "titleKo": "글래디에이터 로얄",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGladiatorRoyal.png"
    },
    {
      "game": "SGMummyHunter",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mummy Hunter",
      "titleKo": "머미 헌터",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMummyHunter.png"
    },
    {
      "game": "SGMysticRings",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mystic Rings",
      "titleKo": "미스틱 링스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMysticRings.png"
    },
    {
      "game": "SGDarumaImpact",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Daruma Impact",
      "titleKo": "다루마 임팩트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDarumaImpact.png"
    },
    {
      "game": "SGMXMania",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "MX Mania",
      "titleKo": "MX 매니아",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMXMania.png"
    },
    {
      "game": "SGLoveAndRichesEldorado",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Love And Riches: Eldorado",
      "titleKo": "사랑과 부: 엘도라도",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLoveAndRichesEldorado.png"
    },
    {
      "game": "SGSuperFruitBlast",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Super Fruit Blast",
      "titleKo": "수퍼 프루트 블라스트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSuperFruitBlast.png"
    },
    {
      "game": "SGShamrockQuest",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Shamrock Quest",
      "titleKo": "샴록 퀘스트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGShamrockQuest.png"
    },
    {
      "game": "SGJapaneseMask",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Japanese Mask",
      "titleKo": "재퍼니즈 매스크",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGJapaneseMask.png"
    },
    {
      "game": "SGHyperHues",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Hyper Hues",
      "titleKo": "하이퍼 휴즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHyperHues.png"
    },
    {
      "game": "SGCarnivalCove",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Carnival Cove",
      "titleKo": "카니발 코브",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCarnivalCove.png"
    },
    {
      "game": "SGBabaYaga",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Baba Yaga",
      "titleKo": "바바 야가",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBabaYaga.png"
    },
    {
      "game": "SGPoseidon",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Poseidon",
      "titleKo": "포세이돈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPoseidon.png"
    },
    {
      "game": "SGJump2",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Jump! 2",
      "titleKo": "점프! 2",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGJump2.png"
    },
    {
      "game": "SGHauntedHarbor",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Haunted Harbor",
      "titleKo": "유령의 항구",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHauntedHarbor.png"
    },
    {
      "game": "SGGloryOfRome",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Glory Of Rome",
      "titleKo": "로마의 영광",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGloryOfRome.png"
    },
    {
      "game": "SGKoiKoiTreasure",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Koi Koi Treasure",
      "titleKo": "코이 코이 보물",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGKoiKoiTreasure.png"
    },
    {
      "game": "SGWaltzBeauty",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Waltz Beauty",
      "titleKo": "왈츠 뷰티",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWaltzBeauty.png"
    },
    {
      "game": "SGTotemWarrior",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Totem Warrior",
      "titleKo": "토템전사",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTotemWarrior.png"
    },
    {
      "game": "SGArcticHunt",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Arctic Hunt",
      "titleKo": "아아크틱 헌트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGArcticHunt.png"
    },
    {
      "game": "SGMooMooCow",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Moo Moo Cow",
      "titleKo": "무무코우",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMooMooCow.png"
    },
    {
      "game": "SGGoldenTajMahal",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Golden Taj Mahal",
      "titleKo": "골든 타지마할",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGoldenTajMahal.png"
    },
    {
      "game": "SGWildFlow",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Wild Flow",
      "titleKo": "와일드 플로우",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWildFlow.png"
    },
    {
      "game": "SGVampiresFate",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Vampire's Fate",
      "titleKo": "'뱀파이어'",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGVampiresFate.png"
    },
    {
      "game": "SGHotHotSummer",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Hot Hot Summer",
      "titleKo": "뜨거운 여름",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHotHotSummer.png"
    },
    {
      "game": "SGValentineMonchy",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Valentine Monchy",
      "titleKo": "발렌타인 몽시",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGValentineMonchy.png"
    },
    {
      "game": "SGFruityMayan",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fruity Mayan",
      "titleKo": "프루티 마야",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFruityMayan.png"
    },
    {
      "game": "SGSantasInn",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Santa's Inn",
      "titleKo": "산타의 여인숙",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSantasInn.png"
    },
    {
      "game": "SGZeusDeluxe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Zeus Deluxe",
      "titleKo": "제우스 디럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGZeusDeluxe.png"
    },
    {
      "game": "SGFruityHalloween",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fruity Halloween",
      "titleKo": "프루티 할로윈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFruityHalloween.png"
    },
    {
      "game": "SGSlimeParty",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Slime Party",
      "titleKo": "스마일 파티",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSlimeParty.png"
    },
    {
      "game": "SGMeowJanken",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Meow Janken",
      "titleKo": "야옹이 얀켄",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMeowJanken.png"
    },
    {
      "game": "SGBikiniIslandDeluxe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Bikini Island Deluxe",
      "titleKo": "비키니 아일랜드 디럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBikiniIslandDeluxe.png"
    },
    {
      "game": "SGAtomicKittens",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Atomic Kittens",
      "titleKo": "아토믹 캣츠",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGAtomicKittens.png"
    },
    {
      "game": "SGWitchesTome",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Witches Tome",
      "titleKo": "위치스 톰",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWitchesTome.png"
    },
    {
      "game": "SGLegendOfNezha",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Legend Of Nezha",
      "titleKo": "네자의 전설",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLegendOfNezha.png"
    },
    {
      "game": "SGTootyFruityFruits",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Tooty Fruity Fruits",
      "titleKo": "투티 프루티 과일",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTootyFruityFruits.png"
    },
    {
      "game": "SGSirensSpell",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Siren's Spell",
      "titleKo": "사이렌의 주문",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSirensSpell.png"
    },
    {
      "game": "SGCrystopia",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Crystopia",
      "titleKo": "크리스토피아",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCrystopia.png"
    },
    {
      "game": "SGTheBigDealDeluxe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "The Big Deal Deluxe",
      "titleKo": "더 빅 디얼 디럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTheBigDealDeluxe.png"
    },
    {
      "game": "SGNaughtyWukong",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Naughty Wukong",
      "titleKo": "너티 우콩",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGNaughtyWukong.png"
    },
    {
      "game": "SGLegendaryBeasts",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Legendary Beasts",
      "titleKo": "레전더리 비스츠",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLegendaryBeasts.png"
    },
    {
      "game": "SGSojuBomb",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Soju Bomb",
      "titleKo": "소주 범브",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSojuBomb.png"
    },
    {
      "game": "SGDragonTigerGate",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Dragon Tiger Gate",
      "titleKo": "드래곤 타이거 게이트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDragonTigerGate.png"
    },
    {
      "game": "SGRainbowmania",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Rainbowmania",
      "titleKo": "레인보우매니아",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGRainbowmania.png"
    },
    {
      "game": "SGLaughingBuddha",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Laughing Buddha",
      "titleKo": "레핑 부다",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLaughingBuddha.png"
    },
    {
      "game": "SGTaikoBeats",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Taiko Beats",
      "titleKo": "타이코 비츠",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTaikoBeats.png"
    },
    {
      "game": "SGTukTukThailand",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Tuk Tuk Thailand",
      "titleKo": "턱 턱 타일랜드",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTukTukThailand.png"
    },
    {
      "game": "SGBombRunner",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Bomb Runner",
      "titleKo": "봄브 러너",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBombRunner.png"
    },
    {
      "game": "SGGoldenUnicornDeluxe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Golden Unicorn Deluxe",
      "titleKo": "골든 유니콘 딜럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGoldenUnicornDeluxe.png"
    },
    {
      "game": "SGSpaceGoonz",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Space Goonz",
      "titleKo": "스페이스 군즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSpaceGoonz.png"
    },
    {
      "game": "SGMightyMedusa",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mighty Medusa",
      "titleKo": "마이티 메두사",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMightyMedusa.png"
    },
    {
      "game": "SGLanternLuck",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Lantern Luck",
      "titleKo": "랜턴 럭",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLanternLuck.png"
    },
    {
      "game": "SGDiscoBeats",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Disco Beats",
      "titleKo": "디스코 비스츠",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDiscoBeats.png"
    },
    {
      "game": "SGProst",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Prost!",
      "titleKo": "프로스트!",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGProst.png"
    },
    {
      "game": "SGNewYearsBash",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "New Years Bash",
      "titleKo": "뉴 이어즈 배쉬",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGNewYearsBash.png"
    },
    {
      "game": "SGLuckyDurian",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Lucky Durian",
      "titleKo": "럭키 두리안",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLuckyDurian.png"
    },
    {
      "game": "SGMarvelousFurlongs",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Marvelous Furlongs",
      "titleKo": "마벨러스 퍼롱스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMarvelousFurlongs.png"
    },
    {
      "game": "SGMysticFortuneDeluxe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mystic Fortune Deluxe",
      "titleKo": "미스틱 포츈 딜럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMysticFortuneDeluxe.png"
    },
    {
      "game": "SGFly",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fly!",
      "titleKo": "플라이!",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFly.png"
    },
    {
      "game": "SGNineTails",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Nine Tails",
      "titleKo": "나인 테일즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGNineTails.png"
    },
    {
      "game": "SGCandyTower",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Candy Tower",
      "titleKo": "캔디 타워",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCandyTower.png"
    },
    {
      "game": "SGReturnToTheFeature",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Return To The Feature",
      "titleKo": "리턴 투 더 피쳐",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGReturnToTheFeature.png"
    },
    {
      "game": "SGCalaverasExplosivas",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Calaveras Explosivas",
      "titleKo": "캘러베라스 익스클로시바스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCalaverasExplosivas.png"
    },
    {
      "game": "SGChristmasGiftRush",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Christmas Gift Rush",
      "titleKo": "크리스마스 기프트 러쉬",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGChristmasGiftRush.png"
    },
    {
      "game": "SGOrbsOfAtlantis",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Orbs of Atlantis",
      "titleKo": "오브즈 오브 아틀란티스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGOrbsOfAtlantis.png"
    },
    {
      "game": "SGBeforeTimeRunsOut",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Before Time Runs Out",
      "titleKo": "비포 타임 런즈 아웃",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBeforeTimeRunsOut.png"
    },
    {
      "game": "SGTabernaDeLosMuertos",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Taberna De Los Muertos",
      "titleKo": "타벌나 데 로스 뮤얼토스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTabernaDeLosMuertos.png"
    },
    {
      "game": "SGTabernaDeLosMuertosUltra",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Taberna De Los Muertos Ultra",
      "titleKo": "타벌나 데 로스 뮤얼토스 울트라",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTabernaDeLosMuertosUltra.png"
    },
    {
      "game": "SGTotemTowers",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Totem Towers",
      "titleKo": "토템 타워즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTotemTowers.png"
    },
    {
      "game": "SGHappyApe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Happy Ape",
      "titleKo": "해피 애입",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHappyApe.png"
    },
    {
      "game": "SGJellyfishFlow",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Jellyfish Flow",
      "titleKo": "젤리피시 플로우",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGJellyfishFlow.png"
    },
    {
      "game": "SGJellyfishFlowUltra",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Jellyfish Flow Ultra",
      "titleKo": "젤리피시 플로우 울트라",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGJellyfishFlowUltra.png"
    },
    {
      "game": "SGLoonyBlox",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Loony Blox",
      "titleKo": "루니 블록스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLoonyBlox.png"
    },
    {
      "game": "SGKnockoutFootballRush",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Knockout Football Rush",
      "titleKo": "넉아웃 풋볼 러쉬",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGKnockoutFootballRush.png"
    },
    {
      "game": "SGTechnoTumble",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Techno Tumble",
      "titleKo": "테크노 텀블",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTechnoTumble.png"
    },
    {
      "game": "SGWealthInn",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Wealth Inn",
      "titleKo": "웰스 인",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWealthInn.png"
    },
    {
      "game": "SGNaughtySanta",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Naughty Santa",
      "titleKo": "너티 산타",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGNaughtySanta.png"
    },
    {
      "game": "SGFaCaiShenDeluxe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fa Cai Shen Deluxe",
      "titleKo": "파 카이 쉔 딜럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFaCaiShenDeluxe.png"
    },
    {
      "game": "SGHeySushi",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Hey Sushi",
      "titleKo": "헤이 스시",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHeySushi.png"
    },
    {
      "game": "SGWizardsWantWar",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Wizards Want War!",
      "titleKo": "위자드 원트 월!",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWizardsWantWar.png"
    },
    {
      "game": "SGLuckyFortuneCat",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Lucky Fortune Cat",
      "titleKo": "럭키 포츈 캣",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLuckyFortuneCat.png"
    },
    {
      "game": "SGScopa",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Scopa",
      "titleKo": "스코파",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGScopa.png"
    },
    {
      "game": "SGLuckyLucky",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Lucky Lucky",
      "titleKo": "럭키 럭키",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLuckyLucky.png"
    },
    {
      "game": "SGColossalGems",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Colossal Gems",
      "titleKo": "콜로살 젬즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGColossalGems.png"
    },
    {
      "game": "SGHotHotHalloween",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Hot Hot Halloween",
      "titleKo": "핫 핫 할로윈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHotHotHalloween.png"
    },
    {
      "game": "SG5LuckyLions",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "5 Lucky Lions",
      "titleKo": "5 럭키 라이언즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SG5LuckyLions.png"
    },
    {
      "game": "SGMountMazuma",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mount Mazuma",
      "titleKo": "마운트 마주마",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMountMazuma.png"
    },
    {
      "game": "SGWildTrucks",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Wild Trucks",
      "titleKo": "와일드 트럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWildTrucks.png"
    },
    {
      "game": "SGPumpkinPatch",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Pumpkin Patch",
      "titleKo": "펌킨 패치",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPumpkinPatch.png"
    },
    {
      "game": "SGHappiestChristmasTree",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Happiest Christmas Tree",
      "titleKo": "해피에스트 크리스마스 트리",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHappiestChristmasTree.png"
    },
    {
      "game": "SGHotHotFruit",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Hot Hot Fruit",
      "titleKo": "핫 핫 프룻",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHotHotFruit.png"
    },
    {
      "game": "SGKnockoutFootball",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Knockout Football",
      "titleKo": "나카우트 풋볼",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGKnockoutFootball.png"
    },
    {
      "game": "SGEgyptianDreamsDeluxe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Egyptian Dreams Deluxe",
      "titleKo": "이집션 드림즈 디럭스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGEgyptianDreamsDeluxe.png"
    },
    {
      "game": "SGJump",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Jump!",
      "titleKo": "점프!",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGJump.png"
    },
    {
      "game": "SGPresto",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Presto!",
      "titleKo": "프레스토우!",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPresto.png"
    },
    {
      "game": "SGWaysOfFortune",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Ways Of Fortune",
      "titleKo": "웨이 오브 포춘",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWaysOfFortune.png"
    },
    {
      "game": "SGFortuneDogs",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fortune Dogs",
      "titleKo": "포춘 도그",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFortuneDogs.png"
    },
    {
      "game": "SGRollingRoger",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Rolling Roger",
      "titleKo": "롤링 로저",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGRollingRoger.png"
    },
    {
      "game": "SGMagicOak",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Magic Oak",
      "titleKo": "매직 오크",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMagicOak.png"
    },
    {
      "game": "SGSantasVillage",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Santa's Village",
      "titleKo": "산타 빌리지",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSantasVillage.png"
    },
    {
      "game": "SGLondonHunter",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "London Hunter",
      "titleKo": "런던 헌터",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLondonHunter.png"
    },
    {
      "game": "SGFourDivineBeasts",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Four Divine Beasts",
      "titleKo": "4 성수",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFourDivineBeasts.png"
    },
    {
      "game": "SGCakeValley",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Cake Valley",
      "titleKo": "케이크 벨리",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCakeValley.png"
    },
    {
      "game": "SGNuwa",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Nuwa",
      "titleKo": "누와",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGNuwa.png"
    },
    {
      "game": "SGTheKoiGate",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Koi Gate",
      "titleKo": "코이 게이트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTheKoiGate.png"
    },
    {
      "game": "SG5Mariachis",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "5 Mariachis",
      "titleKo": "5 마리치스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SG5Mariachis.png"
    },
    {
      "game": "SGPandaPanda",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Panda Panda",
      "titleKo": "판다 판다",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPandaPanda.png"
    },
    {
      "game": "SGOceansCall",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Ocean's Call",
      "titleKo": "오션스 콜",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGOceansCall.png"
    },
    {
      "game": "SGScruffyScallywags",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Scruffy Scallywags",
      "titleKo": "스크러프 스컬웨이즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGScruffyScallywags.png"
    },
    {
      "game": "SGBirdOfThunder",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Bird of Thunder",
      "titleKo": "버드 오브 썬더",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBirdOfThunder.png"
    },
    {
      "game": "SGTheDeadEscape",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "The Dead Escape",
      "titleKo": "더 데드 이스케이프",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTheDeadEscape.png"
    },
    {
      "game": "SG12Zodiacs",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "12 Zodiacs",
      "titleKo": "12 성좌",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SG12Zodiacs.png"
    },
    {
      "game": "SGFireRooster",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fire Rooster",
      "titleKo": "파이어 로스터",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFireRooster.png"
    },
    {
      "game": "SGFenghuang",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fenghuang",
      "titleKo": "펑 후앙",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFenghuang.png"
    },
    {
      "game": "SGGangsters",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Gangsters",
      "titleKo": "갱스터",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGangsters.png"
    },
    {
      "game": "SGRuffledUp",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Ruffled Up",
      "titleKo": "러플드 업",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGRuffledUp.png"
    },
    {
      "game": "SGFaCaiShen",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Fa Cai Shen",
      "titleKo": "하 카이 쉔",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFaCaiShen.png"
    },
    {
      "game": "SGDragonsThrone",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Dragon's Throne",
      "titleKo": "드래곤즈 쓰론",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDragonsThrone.png"
    },
    {
      "game": "SGBombsAway",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Bombs Away",
      "titleKo": "범즈 어웨이",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBombsAway.png"
    },
    {
      "game": "SGGoldRush",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Gold Rush",
      "titleKo": "골드 러쉬",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGoldRush.png"
    },
    {
      "game": "SGSparta",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Sparta",
      "titleKo": "스파르타",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSparta.png"
    },
    {
      "game": "SGCoyoteCrash",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Coyote Crash",
      "titleKo": "코요테 크래시",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCoyoteCrash.png"
    },
    {
      "game": "SGWickedWitch",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Wicked Witch",
      "titleKo": "윅드 위치",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWickedWitch.png"
    },
    {
      "game": "SGSuperTwister",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Super Twister",
      "titleKo": "슈퍼 트위스터",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSuperTwister.png"
    },
    {
      "game": "SGRomanEmpire",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Roman Empire",
      "titleKo": "로만 엠파이어",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGRomanEmpire.png"
    },
    {
      "game": "SGZeus2",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Zeus 2",
      "titleKo": "제우스 2",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGZeus2.png"
    },
    {
      "game": "SGBuggyBonus",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Buggy Bonus",
      "titleKo": "버기 보너스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBuggyBonus.png"
    },
    {
      "game": "SGGlamRock",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Glam Rock",
      "titleKo": "글렘 롹",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGlamRock.png"
    },
    {
      "game": "SGArcaneElements",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Arcane Elements",
      "titleKo": "아케인 엘리멘츠",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGArcaneElements.png"
    },
    {
      "game": "SGJugglenaut",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Jugglenaut",
      "titleKo": "저거너트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGJugglenaut.png"
    },
    {
      "game": "SGGalacticCash",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Galactic Cash",
      "titleKo": "갤럭틱 캐시",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGalacticCash.png"
    },
    {
      "game": "SGTreasureDiver",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Treasure Diver",
      "titleKo": "트레져 드라이버",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTreasureDiver.png"
    },
    {
      "game": "SGKanesInferno",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Kane's Inferno",
      "titleKo": "케인즈 인페르노",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGKanesInferno.png"
    },
    {
      "game": "SGTreasureTomb",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Treasure Tomb",
      "titleKo": "트레져 톰브",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTreasureTomb.png"
    },
    {
      "game": "SGTheDragonCastle",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Dragon Castle",
      "titleKo": "드래곤 캐슬",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTheDragonCastle.png"
    },
    {
      "game": "SGKingTutsTomb",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "King Tut's Tomb",
      "titleKo": "킹 텃즈 톰브",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGKingTutsTomb.png"
    },
    {
      "game": "SGCarnivalCash",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Carnival Cash",
      "titleKo": "카니발 크래시",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCarnivalCash.png"
    },
    {
      "game": "SGMonsterMashCash",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Monster Mash Cash",
      "titleKo": "몬스터 매시 캐시",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMonsterMashCash.png"
    },
    {
      "game": "SGShaolinFortunes100",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Shaolin Fortunes 100",
      "titleKo": "샤오린 포츈 100",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGShaolinFortunes100.png"
    },
    {
      "game": "SGShaolinFortunes243",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Shaolin Fortunes",
      "titleKo": "샤오린 포츈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGShaolinFortunes243.png"
    },
    {
      "game": "SGVikingsPlunder",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Viking's Plunder",
      "titleKo": "바이킹즈 플런더",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGVikingsPlunder.png"
    },
    {
      "game": "SGDoubleODollars",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Double O Dollars",
      "titleKo": "더블 오 달러즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDoubleODollars.png"
    },
    {
      "game": "SGLittleGreenMoney",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Little Green Money",
      "titleKo": "리틀 그린 머니",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGLittleGreenMoney.png"
    },
    {
      "game": "SGWeirdScience",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Weird Science",
      "titleKo": "위어드 사이언스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGWeirdScience.png"
    },
    {
      "game": "SGBlackbeardsBounty",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Blackbeard's Bounty",
      "titleKo": "블랙버즈 바운티",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBlackbeardsBounty.png"
    },
    {
      "game": "SGDrFeelgood",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Dr Feelgood",
      "titleKo": "닥터 필굿",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDrFeelgood.png"
    },
    {
      "game": "SGZeus",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Zeus",
      "titleKo": "제우스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGZeus.png"
    },
    {
      "game": "SGSOS",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "S.O.S!",
      "titleKo": "에스.오.에스!",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSOS.png"
    },
    {
      "game": "SGPoolShark",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Pool Shark",
      "titleKo": "풀 샤크",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPoolShark.png"
    },
    {
      "game": "SGJungleRumble",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Jungle Rumble",
      "titleKo": "정글 럼블",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGJungleRumble.png"
    },
    {
      "game": "SGSpaceFortune",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Space Fortune",
      "titleKo": "스페이스 포츈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSpaceFortune.png"
    },
    {
      "game": "SGPamperMe",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Pamper Me",
      "titleKo": "팜퍼 미",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPamperMe.png"
    },
    {
      "game": "SGEgyptianDreams",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Egyptian Dreams",
      "titleKo": "이집샨 드립즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGEgyptianDreams.png"
    },
    {
      "game": "SGBarnstormerBucks",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Barnstormer Bucks",
      "titleKo": "반스토머 벅스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBarnstormerBucks.png"
    },
    {
      "game": "SGSuperStrike",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Super Strike",
      "titleKo": "슈퍼 스트라이크",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSuperStrike.png"
    },
    {
      "game": "SGTowerOfPizza",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Tower Of Pizza",
      "titleKo": "타워 오브 피자",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTowerOfPizza.png"
    },
    {
      "game": "SGMummyMoney",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mummy Money",
      "titleKo": "머미 머니",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMummyMoney.png"
    },
    {
      "game": "SGBikiniIsland",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Bikini Island",
      "titleKo": "비키니 아일랜드",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGBikiniIsland.png"
    },
    {
      "game": "SGMrBling",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mr Bling",
      "titleKo": "미스터 블링",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMrBling.png"
    },
    {
      "game": "SGMysticFortune",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Mystic Fortune",
      "titleKo": "미스틱 포츈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGMysticFortune.png"
    },
    {
      "game": "SGArcticWonders",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Arctic Wonders",
      "titleKo": "악틱 원더즈",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGArcticWonders.png"
    },
    {
      "game": "SGDragonsRealm",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Dragon's Realm",
      "titleKo": "드래곤즈 리암",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDragonsRealm.png"
    },
    {
      "game": "SGAllForOne",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "All For One",
      "titleKo": "올 포 원",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGAllForOne.png"
    },
    {
      "game": "SGFlyingHigh",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Flying High",
      "titleKo": "플라잉 하이",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFlyingHigh.png"
    },
    {
      "game": "SGCashReef",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Cash Reef",
      "titleKo": "캐시 리프",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCashReef.png"
    },
    {
      "game": "SGQueenOfQueens243",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Queen of Queens",
      "titleKo": "퀸 오브 퀸",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGQueenOfQueens243.png"
    },
    {
      "game": "SGQueenOfQueens1024",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Queen of Queens II",
      "titleKo": "퀸오브 퀸 2 II",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGQueenOfQueens1024.png"
    },
    {
      "game": "SGPiratesPlunder",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Pirate's Plunder",
      "titleKo": "파이렛 플런더",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPiratesPlunder.png"
    },
    {
      "game": "SGPuckerUpPrince",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Pucker Up Prince",
      "titleKo": "퍼커 업 프린세스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGPuckerUpPrince.png"
    },
    {
      "game": "SGSirBlingalot",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Sir Blingalot",
      "titleKo": "설 빌링가롯",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSirBlingalot.png"
    },
    {
      "game": "SGRideEmCowboy",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Ride 'em Cowboy",
      "titleKo": "라이드 엠 카우보이",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGRideEmCowboy.png"
    },
    {
      "game": "SGGoldenUnicorn",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Golden Unicorn",
      "titleKo": "골든 유니콘",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGoldenUnicorn.png"
    },
    {
      "game": "SGFrontierFortunes",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Frontier Fortunes",
      "titleKo": "프론티어 포춘",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGFrontierFortunes.png"
    },
    {
      "game": "SGIndianCashCatcher",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Indian Cash Catcher",
      "titleKo": "인디언 캐쉬캐처",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGIndianCashCatcher.png"
    },
    {
      "game": "SGAzlandsGold",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Aztlan's Gold",
      "titleKo": "아즈틀란의 금",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGAzlandsGold.png"
    },
    {
      "game": "SGRodeoDrive",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Rodeo Drive",
      "titleKo": "로데오 드라이브",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGRodeoDrive.png"
    },
    {
      "game": "SGSkysTheLimit",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Sky's the Limit",
      "titleKo": "스카이즈 더 리미트",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGSkysTheLimit.png"
    },
    {
      "game": "SGTheBigDeal",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "The Big Deal",
      "titleKo": "더 빅 딜",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGTheBigDeal.png"
    },
    {
      "game": "SGDiscoFunk",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Disco Funk",
      "titleKo": "디스코 펑크",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGDiscoFunk.png"
    },
    {
      "game": "SGHauntedHouse",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Haunted House",
      "titleKo": "유령의 집",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGHauntedHouse.png"
    },
    {
      "game": "SGCashosaurus",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Cashosaurus",
      "titleKo": "카쇼사우루스",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGCashosaurus.png"
    },
    {
      "game": "SGGrapeEscape",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "The Grape Escape",
      "titleKo": "더 그레입 이스케입",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGGrapeEscape.png"
    },
    {
      "game": "SGShogunsLand",
      "vendor": "habanero",
      "region": "Habanero",
      "titleEn": "Shogun's Land",
      "titleKo": "쇼우건즈 랜드",
      "icon": "https://app-a.hbsecure.com/img/rectangle/200/SGShogunsLand.png"
    }
  ],
  "MICRO_Casino": [
    {
      "game": "P1_PlayboyVIPBlackjack",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Playboy VIP Blackjack",
      "titleKo": "플레이보이 VIP 블랙잭",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_PlayboyVIPBlackjack.png"
    },
    {
      "game": "P1_MaxSpeedBaccarat",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Max Speed Baccarat",
      "titleKo": "맥스 스피드 바카라",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_MaxSpeedBaccarat.png"
    },
    {
      "game": "P1_BlackjackPorto",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Porto",
      "titleKo": "블랙잭 포르투",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_BlackjackPorto.png"
    },
    {
      "game": "P1_KoreanAllinBaccarat1",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Korean All-In Baccarat 1",
      "titleKo": "코리안 올인 바카라 1",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_KoreanAllinBaccarat1.png"
    },
    {
      "game": "P1_KoreanAllinBaccarat2",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Korean All-In Baccarat 2",
      "titleKo": "코리안 올인 바카라 2",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_KoreanAllinBaccarat2.png"
    },
    {
      "game": "P1_KoreanAllinSpeedBaccarat1",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Korean All-In Speed Baccarat 1",
      "titleKo": "코리안 올인 스피드 바카라 1",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_KoreanAllinSpeedBaccarat1.png"
    },
    {
      "game": "P1_PlayboyBlackjack",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Playboy Blackjack",
      "titleKo": "플레이보이 블랙잭",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_PlayboyBlackjack.png"
    },
    {
      "game": "P1_PlayboyRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Playboy Roulette",
      "titleKo": "플레이보이 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_PlayboyRoulette.png"
    },
    {
      "game": "P1_DanceDJRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Dance DJ Roulette",
      "titleKo": "댄스 DJ 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P1_DanceDJRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_BaccaratAfterDark",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat After Dark",
      "titleKo": "바카라 애프터 다크",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BaccaratAfterDark.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat10",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 10",
      "titleKo": "바카라 10",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat10.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat8",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 8",
      "titleKo": "바카라 8",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat8.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat9",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 9",
      "titleKo": "바카라 9 ",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat9.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackNiagaraFalls",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Niagara Falls",
      "titleKo": "블랙잭 나이아가라 폭포",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackNiagaraFalls.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackOttawa",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Ottawa",
      "titleKo": "블랙잭 오타와",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackOttawa.png"
    },
    {
      "game": "SMG_MGLiveGrand_FashiontvXpulseBlackjack",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "FashionTV Blackjack",
      "titleKo": "패션TV 블랙잭",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_FashiontvXpulseBlackjack.png"
    },
    {
      "game": "SMG_MGLiveGrand_FashiontvXbeatRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "FashionTV Roulette",
      "titleKo": "패션TV 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_FashiontvXbeatRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackCalgary",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Calgary",
      "titleKo": "블랙잭 캘거리",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackCalgary.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat4",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 4",
      "titleKo": "바카라 4",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat4.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat5",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 5",
      "titleKo": "바카라 5",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat5.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat6",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 6",
      "titleKo": "바카라 6",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat6.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat7",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 7",
      "titleKo": "바카라 7",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat7.png"
    },
    {
      "game": "SMG_MGLiveGrand_PlayboySpeedBaccarat1",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Playboy Speed Baccarat 1",
      "titleKo": "플레이보이 스피드 바카라 1",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_PlayboySpeedBaccarat1.png"
    },
    {
      "game": "SMG_MGLiveGrand_PlayboySpeedBaccarat2",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Playboy Speed Baccarat 2",
      "titleKo": "플레이보이 스피드 바카라 2",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_PlayboySpeedBaccarat2.png"
    },
    {
      "game": "SMG_MGLiveGrand_PlayboySpeedBaccarat3",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Playboy Speed Baccarat 3",
      "titleKo": "플레이보이 스피드 바카라 3",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_PlayboySpeedBaccarat3.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat1",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 1",
      "titleKo": "바카라 1",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat1.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat2",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 2",
      "titleKo": "바카라 2",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat2.png"
    },
    {
      "game": "SMG_MGLiveGrand_Baccarat3",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Baccarat 3",
      "titleKo": "바카라 3",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_Baccarat3.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackMontreal",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Montreal",
      "titleKo": "블랙잭 몬트리올",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackMontreal.png"
    },
    {
      "game": "SMG_MGLiveGrand_CashWheelCarnival",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Cash Wheel Carnival",
      "titleKo": "캐시 휠 카니발",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_CashWheelCarnival.png"
    },
    {
      "game": "SMG_MGLiveGrand_TurkishRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Turkish Roulette",
      "titleKo": "터키쉬 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_TurkishRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_CasinoHoldem",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Casino Holdem",
      "titleKo": "카지노 홀덤",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_CasinoHoldem.png"
    },
    {
      "game": "SMG_MGLiveGrand_DiamondRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Diamond Roulette",
      "titleKo": "다이아몬드 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_DiamondRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_IstanbulRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Istanbul Roulette",
      "titleKo": "이스탄불 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_IstanbulRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_HoloRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Holo Roulette",
      "titleKo": "홀로 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_HoloRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_SpeedBaccarat2",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Speed Baccarat 2",
      "titleKo": "스피드 바카라 2",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_SpeedBaccarat2.png"
    },
    {
      "game": "SMG_MGLiveGrand_SpeedBaccarat3",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Speed Baccarat 3",
      "titleKo": "스피드 바카라 3",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_SpeedBaccarat3.png"
    },
    {
      "game": "SMG_MGLiveGrand_SpeedBaccarat4",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Speed Baccarat 4",
      "titleKo": "스피드 바카라 4",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_SpeedBaccarat4.png"
    },
    {
      "game": "SMG_MGLiveGrand_SpeedBlackjack1",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Speed Blackjack 1",
      "titleKo": "스피드 블랙잭 1",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_SpeedBlackjack1.png"
    },
    {
      "game": "SMG_MGLiveGrand_SpeedBlackjack2",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Speed Blackjack 2",
      "titleKo": "스피드 블랙잭 2",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_SpeedBlackjack2.png"
    },
    {
      "game": "SMG_MGLiveGrand_AirwaveRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Airwave Roulette",
      "titleKo": "에어웨이브 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_AirwaveRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_AmstelRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Amstel Roulette",
      "titleKo": "암스텔 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_AmstelRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_AutoRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Auto Roulette",
      "titleKo": "오토 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_AutoRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackAmsterdam",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Amsterdam",
      "titleKo": "블랙잭 암스테르담",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackAmsterdam.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackBerlin",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Berlin",
      "titleKo": "블랙잭 베를린",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackBerlin.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackLondon",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack London",
      "titleKo": "블랙잭 런던",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackLondon.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackMadrid",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Madrid",
      "titleKo": "블랙잭 마드리드",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackMadrid.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackManchester",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Manchester",
      "titleKo": "블랙잭 맨체스터",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackManchester.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackMonteCarlo",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Monte Carlo",
      "titleKo": "블랙잭 몬테카를로",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackMonteCarlo.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackRiga",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Riga",
      "titleKo": "블랙잭 리가",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackRiga.png"
    },
    {
      "game": "SMG_MGLiveGrand_BlackjackToronto",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Blackjack Toronto",
      "titleKo": "블랙잭 토론토",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_BlackjackToronto.png"
    },
    {
      "game": "SMG_MGLiveGrand_CardsChampion",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Cards Champion",
      "titleKo": "카드 챔피언",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_CardsChampion.png"
    },
    {
      "game": "SMG_MGLiveGrand_ClubhouseRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Clubhouse Roulette",
      "titleKo": "클럽하우스 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_ClubhouseRoulette.png"
    },
    {
      "game": "SMG_MGLiveGrand_DragonTiger",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Dragon Tiger",
      "titleKo": "용호",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_DragonTiger.png"
    },
    {
      "game": "SMG_MGLiveGrand_EverplayBlackjack",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Everplay Blackjack",
      "titleKo": "에버플레이 블랙잭",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_EverplayBlackjack.png"
    },
    {
      "game": "SMG_MGLiveGrand_SpeedBaccarat1",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Speed Baccarat 1",
      "titleKo": "스피드 바카라 1",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_SpeedBaccarat1.png"
    },
    {
      "game": "SMG_MGLiveGrand_SpeedRoulette",
      "vendor": "MICRO_Casino",
      "region": "Micro",
      "titleEn": "Speed Roulette",
      "titleKo": "스피드 룰렛",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_MGLiveGrand_SpeedRoulette.png"
    }
  ],
  "MICRO_Slot": [
    {
      "game": "SMG_adventurePalaceVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Adventure Palace",
      "titleKo": "어드벤쳐 팰리스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_adventurePalaceVT.png"
    },
    {
      "game": "SMG_sugarMania8000VT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Sugar Mania 8000",
      "titleKo": "슈가 매니아 8000",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_sugarMania8000VT.png"
    },
    {
      "game": "SMG_playboyVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Playboy",
      "titleKo": "플레이보이",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_playboyVT.png"
    },
    {
      "game": "SMG_curseOfMedusaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Curse of Medusa",
      "titleKo": "메두사의 저주",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_curseOfMedusaVT.png"
    },
    {
      "game": "SMG_merlinsSecretMaxwaysVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Merlin's Secret Maxways",
      "titleKo": "멀린스 시크릿 맥스웨이즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_merlinsSecretMaxwaysVT.png"
    },
    {
      "game": "SMG_3BlazingVolcanoesPowerComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "3 Blazing Volcanoes Power Combo",
      "titleKo": "3 블레이징 발케이노우즈 파워 캄보우",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_3BlazingVolcanoesPowerComboVT.png"
    },
    {
      "game": "SMG_moneyOnReelsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Money On Reels",
      "titleKo": "머니 온 릴즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_moneyOnReelsVT.png"
    },
    {
      "game": "SMG_dragonsLootVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Dragon’s Loot Link&Win 4Tune",
      "titleKo": "드래곤의 전리품 링크 & 윈 4툰",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_dragonsLootVT.png"
    },
    {
      "game": "SMG_thunderstruckIIVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Thunderstruck II",
      "titleKo": "썬더스트라이크 2",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_thunderstruck2.png"
    },
    {
      "game": "SMG_moonlightRomanceTheAwakeningVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Moonlight Romance - The Awakening",
      "titleKo": "달빛 로맨스 - 각성",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_moonlightRomanceTheAwakeningVT.png"
    },
    {
      "game": "SMG_springBreakVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Spring Break",
      "titleKo": "스프링 브레이크",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_springBreakVT.png"
    },
    {
      "game": "SMG_thunderstruckVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Thunderstruck",
      "titleKo": "썬더스트라이크",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_thunderstruckVT.png"
    },
    {
      "game": "SMG_ladiesNiteVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Ladies Nite",
      "titleKo": "레이디스 나이트",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_ladiesNiteVT.png"
    },
    {
      "game": "SMG_sweetJarComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Sweet Jar Combo",
      "titleKo": "스위트 자아 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_sweetJarComboVT.png"
    },
    {
      "game": "SMG_bountifulBirdsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Bountiful Birds",
      "titleKo": "바운티펄 버즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_bountifulBirdsVT.png"
    },
    {
      "game": "SMG_goldBlitzExtremeVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Gold Blitz Extreme",
      "titleKo": "골드 블리츠 익스트림",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_goldBlitzExtremeVT.png"
    },
    {
      "game": "SMG_ancientTreasurePoseidonVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Ancient Treasure : Poseidon",
      "titleKo": "고대 보물: 포세이돈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_ancientTreasurePoseidonVT.png"
    },
    {
      "game": "SMG_breakAwayDeluxeVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Break Away Deluxe",
      "titleKo": "브레이크 어웨이 디럭스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_breakAwayDeluxeVT.png"
    },
    {
      "game": "SMG_andvariTheGoldenFishVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Andvari The Golden Fish",
      "titleKo": "앤드바아리 더 골드 피쉬",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_andvariTheGoldenFishVT.png"
    },
    {
      "game": "SMG_mammothTripleRichesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Mammoth Triple Riches",
      "titleKo": "매머드 트리플 리치스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_mammothTripleRichesVT.png"
    },
    {
      "game": "SMG_bigTopVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Big Top",
      "titleKo": "빅탑",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_bigTopVT.png"
    },
    {
      "game": "SMG_footballStarDeluxeVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Football Star Deluxe",
      "titleKo": "풋볼 스타 디럭스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_footballStarDeluxeVT.png"
    },
    {
      "game": "SMG_burningDesireVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Burning Desire",
      "titleKo": "버닝 디자어",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_burningDesireVT.png"
    },
    {
      "game": "SMG_10000WishesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "10000 Wishes",
      "titleKo": "10000 위시스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_10000WishesVT.png"
    },
    {
      "game": "SMG_5ReelDriveVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "5 Reel Drive",
      "titleKo": "5 릴 드라이브",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_5ReelDriveVT.png"
    },
    {
      "game": "SMG_massiveGoldVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Massive Gold",
      "titleKo": "매시브 골드",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_massiveGoldVT.png"
    },
    {
      "game": "SMG_candyRushWilds2VT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Candy Rush Wilds 2",
      "titleKo": "캔디 러쉬 와일드 2",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_candyRushWilds2VT.png"
    },
    {
      "game": "SMG_gatesOfAsgardPowerComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Gates of Asgard Power Combo",
      "titleKo": "게이츠 오브 아스가르드 파워 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_gatesOfAsgardPowerComboVT.png"
    },
    {
      "game": "SMG_bearsMakeBankPowerComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Bears Make Bank! Power Combo",
      "titleKo": "베어즈 메익 뱅크! 파워 캄보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_bearsMakeBankPowerComboVT.png"
    },
    {
      "game": "SMG_fishEmUpVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Fish Em Up",
      "titleKo": "피쉬 엠 업",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_fishEmUpVT.png"
    },
    {
      "game": "SMG_geniesMagicWishesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Genie's Magic Wishes",
      "titleKo": "지니의 마법 소원",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_geniesMagicWishesVT.png"
    },
    {
      "game": "SMG_carnavalVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Carnaval",
      "titleKo": "카르나발",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_carnavalVT.png"
    },
    {
      "game": "SMG_breakAwayGoldVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Break Away Gold",
      "titleKo": "브레익 어웨이 골드",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_breakAwayGoldVT.png"
    },
    {
      "game": "SMG_theEternalWidowVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "The Eternal Widow",
      "titleKo": "더 이터널 위도우",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_theEternalWidowVT.png"
    },
    {
      "game": "SMG_3AngelsPowerComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "3 Angels Power Combo",
      "titleKo": "3 엔젤스 파워 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_3AngelsPowerComboVT.png"
    },
    {
      "game": "SMG_reignOfFireVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Reign of Fire",
      "titleKo": "레인 오브 파여",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_reignOfFireVT.png"
    },
    {
      "game": "SMG_hadesLostTreasuresVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Hades Lost Treasures",
      "titleKo": "헤이즈 로스트 보물",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_hadesLostTreasuresVT.png"
    },
    {
      "game": "SMG_moneyDragonVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Money Dragon",
      "titleKo": "머니 드래곤",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_moneyDragonVT.png"
    },
    {
      "game": "SMG_asgardianFireVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Asgardian Fire",
      "titleKo": "아스가르디안 불",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_asgardianFireVT.png"
    },
    {
      "game": "SMG_bonnysTreasuresVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Bonny's Treasures",
      "titleKo": "보니의 보물",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_bonnysTreasuresVT.png"
    },
    {
      "game": "SMG_queensOfRaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Queens of Ra POWER COMBO",
      "titleKo": "퀸즈 오브 라 파워 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_queensOfRaVT.png"
    },
    {
      "game": "SMG_almightyDionysusEmpireVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Almighty Dionysus Empire",
      "titleKo": "전능한 디오니소스 제국",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_almightyDionysusEmpireVT.png"
    },
    {
      "game": "SMG_siennaSteeleVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Sienna Steele",
      "titleKo": "시에나 스틸",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_siennaSteeleVT.png"
    },
    {
      "game": "SMG_goFishingReelinFortunesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Go! Fishing: Reelin' Fortunes",
      "titleKo": "고! 피슁:릴린 포천",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_goFishingReelinFortunesVT.png"
    },
    {
      "game": "SMG_godsPyramidsPowerComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Gods & Pyramids Power Combo",
      "titleKo": "신들 & 피라미드 파워 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_godsPyramidsPowerComboVT.png"
    },
    {
      "game": "SMG_heavenlyElephantFortuneVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Heavenly Elephant Fortune",
      "titleKo": "헤버늘리 엘러펀트 포천",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_heavenlyElephantFortuneVT.png"
    },
    {
      "game": "SMG_mightyPandaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Mighty Panda",
      "titleKo": "마이티 팬더",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_mightyPandaVT.png"
    },
    {
      "game": "SMG_hatchingGoldRoostersRichesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Hatching Gold! Rooster's Riches",
      "titleKo": "해칭 골드! 루스터즈 리처즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_hatchingGoldRoostersRichesVT.png"
    },
    {
      "game": "SMG_arcticWolfTripleRichesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Arctic Wolf Triple Riches",
      "titleKo": "아아크틱 월프 트리펄 리처즈 ",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_arcticWolfTripleRichesVT.png"
    },
    {
      "game": "P5_mahjongReelsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Mahjong Reels",
      "titleKo": "마작 릴스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/P5_mahjongReelsVT.png"
    },
    {
      "game": "SMG_luckyTwinsWildsJackpotsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Lucky Twins Wilds Jackpots",
      "titleKo": "럭키 트윈스 와일드 잭팟",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_luckyTwinsWildsJackpotsVT.png"
    },
    {
      "game": "SMG_diamondDivaOinkBonanzaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Diamond Diva Oink Bonanza",
      "titleKo": "다이아몬드 디바 오잉크 보난자",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_diamondDivaOinkBonanzaVT.png"
    },
    {
      "game": "SMG_starStashWild7SVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Star Stash Wild 7's",
      "titleKo": "스타 스태쉬 와일드 7's",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_starStashWild7SVT.png"
    },
    {
      "game": "SMG_mummyLockRichesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Mummy Lock Riches",
      "titleKo": "머미 락 리처즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_mummyLockRichesVT.png"
    },
    {
      "game": "SMG_almightyPoseidonEmpireVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Almighty Poseidon Empire",
      "titleKo": "전능한 포세이돈 제국",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_almightyPoseidonEmpireVT.png"
    },
    {
      "game": "SMG_luckyRumblePowerSurgeVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Lucky Rumble Power Surge",
      "titleKo": "럭키 럼블 파워 서지",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_luckyRumblePowerSurgeVT.png"
    },
    {
      "game": "SMG_3rdBaseVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "3rd Base",
      "titleKo": "3rd 베이스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_3rdBaseVT.png"
    },
    {
      "game": "SMG_treasureStacksWildsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Treasure Stacks Wilds",
      "titleKo": "트레저 스택스 와일즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_treasureStacksWildsVT.png"
    },
    {
      "game": "SMG_splashOfRichesVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Splash of Riches",
      "titleKo": "스플래쉬 오브 리처즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_splashOfRichesVT.png"
    },
    {
      "game": "SMG_kungPaoPandaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Kung Pao Panda",
      "titleKo": "쿵부 팬더",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_kungPaoPandaVT.png"
    },
    {
      "game": "SMG_royalThunderRidersVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Royal Thunder Riders",
      "titleKo": "로열 썬더 라이더",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_royalThunderRidersVT.png"
    },
    {
      "game": "SMG_cashBlitzVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Cash Blitz",
      "titleKo": "캐시 블리츠",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_cashBlitzVT.png"
    },
    {
      "game": "SMG_nashville777RetroRollerVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Nashville 777 Retro Roller",
      "titleKo": "내슈빌 777 레트로 롤러",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_nashville777RetroRollerVT.png"
    },
    {
      "game": "SMG_megaMagicSpellVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Mega Magic Spell",
      "titleKo": "메가 매직 스펠",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_megaMagicSpellVT.png"
    },
    {
      "game": "SMG_luckOfTheDevilVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Luck of the Devil: POWER COMBO",
      "titleKo": "악마의 행운: 파워 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_luckOfTheDevilVT.png"
    },
    {
      "game": "SMG_cherryRedRetroRollerVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Cherry Red Retro Roller",
      "titleKo": "체리 레드 레트로 롤러",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_cherryRedRetroRollerVT.png"
    },
    {
      "game": "SMG_frankensteinVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Frankenstein",
      "titleKo": "프랑캔슈타인",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_frankensteinVT.png"
    },
    {
      "game": "SMG_carnavalFiestaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Carnaval Fiesta",
      "titleKo": "카르나발 피에스타",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_carnavalFiestaVT.png"
    },
    {
      "game": "SMG_frootLoot5VT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Froot Loot 5",
      "titleKo": "프루트 전리품 5",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_frootLoot5VT.png"
    },
    {
      "game": "SMG_frootLootVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Froot Loot",
      "titleKo": "프루트 전리품",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_frootLootVT.png"
    },
    {
      "game": "SMG_spiesOperationFortunePowerComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "SPIES - Operation Fortune: Power Combo",
      "titleKo": "스파이즈 - 운세 작전: 파워 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_spiesOperationFortunePowerComboVT.png"
    },
    {
      "game": "SMG_pongPongMahjongJackpotsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Pong Pong Mahjong Jackpots",
      "titleKo": "퐁퐁 마작 잭팟스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_pongPongMahjongJackpotsVT.png"
    },
    {
      "game": "SMG_diamond777MultiplierRetroRollerVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Diamond 777 Multiplier Retro Roller",
      "titleKo": "다이아몬드 777 승수 레트로 롤러",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_diamond777MultiplierRetroRollerVT.png"
    },
    {
      "game": "SMG_luckyTwins5X4TuneReelsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Lucky Twins 5X 4Tune Reels",
      "titleKo": "럭키 트윈스 5X 4툰 릴즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_luckyTwins5X4TuneReelsVT.png"
    },
    {
      "game": "SMG_breakdaBankRetroRollerVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Break da Bank Retro Roller",
      "titleKo": "브레이크 다 뱅크 레트로 롤러",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_breakdaBankRetroRollerVT.png"
    },
    {
      "game": "SMG_luckyShotVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Lucky Shot",
      "titleKo": "럭키 샷",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_luckyShotVT.png"
    },
    {
      "game": "SMG_arkOfRaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Ark of Ra",
      "titleKo": "아크 오브 라",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_arkOfRaVT.png"
    },
    {
      "game": "SMG_knightsShieldLinkWin4TuneVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Knights Shield Link&Win 4Tune",
      "titleKo": "나이트 실드 링크 & 윈 4툰",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_knightsShieldLinkWin4TuneVT.png"
    },
    {
      "game": "SMG_jokerLokosMultiplierTrailVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Joker Loko's Multiplier Trail",
      "titleKo": "조커 로코의 승수 트레일",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_jokerLokosMultiplierTrailVT.png"
    },
    {
      "game": "SMG_aztecTripleRichesPowerComboVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Aztec Triple Riches Power Combo",
      "titleKo": "아즈텍 트리플 리치 파워 콤보",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_aztecTripleRichesPowerComboVT.png"
    },
    {
      "game": "SMG_goldInfinityVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Gold Infinity",
      "titleKo": "골드 인피니티",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_goldInfinityVT.png"
    },
    {
      "game": "SMG_treasureStacksVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Treasure Stacks",
      "titleKo": "트레저 스택스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_treasureStacksVT.png"
    },
    {
      "game": "SMG_pizzaFiestaVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Pizza Fiesta",
      "titleKo": "피자 피에스타",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_pizzaFiestaVT.png"
    },
    {
      "game": "SMG_galacticInvadersVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Galactic Invaders",
      "titleKo": "걸랙틱 인베이더즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_galacticInvadersVT.png"
    },
    {
      "game": "SMG_dogDaysVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Dog Days",
      "titleKo": "도그 데이즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_dogDaysVT.png"
    },
    {
      "game": "SMG_9EnchantedBeansVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "9 Enchanted Beans",
      "titleKo": "9 엔챈티드 빈즈",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_9EnchantedBeansVT.png"
    },
    {
      "game": "SMG_unusualSuspectsVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Unusual Suspects",
      "titleKo": "특이한 용의자들",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_unusualSuspectsVT.png"
    },
    {
      "game": "SMG_tikiTikiBoomVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Tiki Tiki Boom",
      "titleKo": "티키 티키 붐",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_tikiTikiBoomVT.png"
    },
    {
      "game": "SMG_gemFireFrenzyVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Gem Fire Frenzy",
      "titleKo": "젬 파이어 광란",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_gemFireFrenzyVT.png"
    },
    {
      "game": "SMG_miningPotsOfGoldVT",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Mining Pots of Gold",
      "titleKo": "마이닝 팟스 오브 골드",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_miningPotsOfGoldVT.png"
    },
    {
      "game": "SMG_immortalRomanceVF",
      "vendor": "MICRO_Slot",
      "region": "Micro",
      "titleEn": "Immortal Romance",
      "titleKo": "임모탈 로맨스",
      "icon": "https://eiIPIpzCKLl0RRY7z5mY7VWyOaFcWyvcinzP5dpMAyA.bithe.net/ImageBuilder/v1/images/en/square/SMG_immortalRomanceVF.png"
    }
  ]
} as const;
