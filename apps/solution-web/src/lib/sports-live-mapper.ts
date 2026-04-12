import type { LeagueGroupData, MatchData } from "@/components/SportsDomesticCard";

/** OddsHost 라이브 목록 / sports-live 스냅샷과 호환되는 최소 필드 */
export type SportsLiveGameInput = {
  game_id: string;
  status: string;
  start_ts: string;
  competition_id: string;
  competition_name: string;
  competition_name_kor: string;
  competition_cc_name_kor?: string;
  team: [
    {
      team1_name: string;
      team1_name_kor: string;
      team1_img?: string;
    },
    {
      team2_name: string;
      team2_name_kor: string;
      team2_img?: string;
    },
  ];
  timer?: { time_mark_kor?: string };
  score: string;
};

function statusToMatchStatus(s: string): "LIVE" | "UPCOMING" {
  return s === "1" ? "LIVE" : "UPCOMING";
}

function parseStartTs(startTs: string): string {
  const normalized = startTs.replace(" ", "T");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

/** 라이브 목록을 로비 카드용 리그 그룹으로 묶음 (배당 없음 → 플레이스홀더 마켓) */
export function liveGamesToLeagueGroups(games: SportsLiveGameInput[]): LeagueGroupData[] {
  const byComp = new Map<string, SportsLiveGameInput[]>();
  for (const g of games) {
    const key = g.competition_id || g.competition_name_kor;
    const arr = byComp.get(key) ?? [];
    arr.push(g);
    byComp.set(key, arr);
  }

  const placeholderMarket = {
    name: "배당",
    center: "—",
    home: { label: "안내", odds: "—" },
    away: { label: "상세", odds: "—" },
  };

  const out: LeagueGroupData[] = [];
  for (const [, rows] of byComp) {
    rows.sort((a, b) => a.start_ts.localeCompare(b.start_ts));
    const first = rows[0]!;
    const matches: MatchData[] = rows.map((g) => {
      const t1 = g.team[0];
      const t2 = g.team[1];
      const timerNote = g.timer?.time_mark_kor ? ` · ${g.timer.time_mark_kor}` : "";
      return {
        eventId: g.game_id,
        status: statusToMatchStatus(g.status),
        eventAt: parseStartTs(g.start_ts),
        homeTeam: {
          name: t1.team1_name_kor || t1.team1_name,
          imgSrc: t1.team1_img,
        },
        awayTeam: {
          name: t2.team2_name_kor || t2.team2_name,
          imgSrc: t2.team2_img,
        },
        markets: [
          {
            name: "스코어",
            center: `${g.score}${timerNote}`,
            home: { label: "game_id", odds: g.game_id },
            away: { label: "status", odds: g.status },
          },
          {
            ...placeholderMarket,
            center: "라이브 게임 API",
            home: {
              label: "배당",
              odds: "목록에 없음",
            },
            away: { label: "조회", odds: "상세 탭" },
          },
        ],
      };
    });

    const cc = first.competition_cc_name_kor?.trim();
    const leagueTitle =
      first.competition_name_kor || first.competition_name || "리그";
    out.push({
      leagueName: cc ? `[${cc}] ${leagueTitle}` : leagueTitle,
      eventAt: first.start_ts.slice(5, 16).replace("T", " "),
      matches,
    });
  }
  return out;
}
