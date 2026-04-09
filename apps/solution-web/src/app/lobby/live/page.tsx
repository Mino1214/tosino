import { SportsLobbyLayout } from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES }    from "@/data/sports-leagues";

const BET_TABS = [
  { id: "all",        label: "전체",    count: 34 },
  { id: "soccer",     label: "축구",    count: 12 },
  { id: "basketball", label: "농구",    count:  8 },
  { id: "esports",    label: "E스포츠", count:  6 },
];

export default function InplayPage() {
  return (
    <SportsLobbyLayout
      title="인플레이"
      betTabs={BET_TABS}
      leagues={SHARED_LEAGUES}
      bannerText="인플레이 이벤트 — 실시간으로 경기를 보며 배팅하세요!"
    />
  );
}
