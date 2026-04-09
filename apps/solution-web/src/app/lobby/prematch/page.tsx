import { SportsLobbyLayout } from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES }    from "@/data/sports-leagues";

const BET_TABS = [
  { id: "upcoming", label: "예정경기", count: 134 },
  { id: "today",    label: "오늘",     count:  58 },
  { id: "tomorrow", label: "내일",     count:  76 },
];

export default function PrematchPage() {
  return (
    <SportsLobbyLayout
      title="프리매치"
      betTabs={BET_TABS}
      leagues={SHARED_LEAGUES}
      bannerText="프리매치 이벤트 — 경기 시작 전 미리 배팅하세요!"
    />
  );
}
