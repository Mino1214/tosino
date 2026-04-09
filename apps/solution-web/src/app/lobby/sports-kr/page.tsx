/*
  스포츠 크로스 / 스페셜 / 실시간 로비
  · 배팅카트 활성화 (AppShell이 /lobby/sports-kr prefix 감지)
  · 광고 배너 + 종목 Nav + 폴더보너스 + 매치리스트
*/
import { SportsLobbyLayout } from "@/components/SportsLobbyLayout";
import { SAMPLE_LEAGUES }    from "@/components/SportsDomesticCard";

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
      leagues={SAMPLE_LEAGUES}
      bannerText="스포츠 이벤트 진행 중 — 첫충/매충 보너스 혜택을 받아가세요!"
    />
  );
}
