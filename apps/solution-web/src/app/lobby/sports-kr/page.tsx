import { SportsLobbyLayout } from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES }    from "@/data/sports-leagues";

const BET_TABS = [
  { id: "cross",    label: "크로스",  count: 83 },
  { id: "special",  label: "스페셜",  count: 22 },
  { id: "realtime", label: "실시간",  count: 88 },
];

export default function SportsKrPage() {
  return (
    <SportsLobbyLayout
      title="스포츠"
      betTabs={BET_TABS}
      leagues={SHARED_LEAGUES}
      bannerText="스포츠 이벤트 진행 중 — 첫충/매충 보너스 혜택을 받아가세요!"
    />
  );
}
