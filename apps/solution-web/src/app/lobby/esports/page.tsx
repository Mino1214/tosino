import { SportsLobbyLayout } from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES }    from "@/data/sports-leagues";

const BET_TABS = [
  { id: "lol",      label: "리그오브레전드", count: 8 },
  { id: "cs",       label: "카운터스트라이크", count: 4 },
  { id: "valorant", label: "발로란트",        count: 2 },
  { id: "dota",     label: "도타2",           count: 2 },
];

export default function EsportsPage() {
  return (
    <SportsLobbyLayout
      title="E스포츠"
      betTabs={BET_TABS}
      leagues={SHARED_LEAGUES}
      bannerText="E스포츠 이벤트 — LCK · CS · Valorant 실시간 배팅!"
    />
  );
}
