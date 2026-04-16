import type { LeagueGroupData, MatchData } from "@/components/SportsDomesticCard";

/** OddsHost 라이브 목록 / sports-live·sports-prematch 스냅샷과 호환 */
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
  odds_1x2?: { home: string; draw?: string; away: string };
  live_ui_url?: string;
};

function statusToMatchStatus(s: string): "LIVE" | "UPCOMING" {
  return s === "1" ? "LIVE" : "UPCOMING";
}

/** `YYYY-MM-DD HH:mm:ss` 등 타임존 없는 값은 K리그 일정처럼 Asia/Seoul 로 해석 */
export function parseStartTsToDate(startTs: string): Date {
  const t = startTs.trim();
  if (!t) return new Date();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(t)) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  const iso = t.includes("T") ? t : t.replace(" ", "T");
  const d = new Date(`${iso}+09:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function parseStartTs(startTs: string): string {
  return parseStartTsToDate(startTs).toISOString();
}

function formatLeagueChip(d: Date): string {
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function resolve1x2(g: SportsLiveGameInput): {
  home: string;
  draw: string;
  away: string;
} {
  if (g.odds_1x2) {
    return {
      home: g.odds_1x2.home ?? "2.10",
      draw: g.odds_1x2.draw ?? "3.30",
      away: g.odds_1x2.away ?? "2.95",
    };
  }
  return { home: "2.10", draw: "3.25", away: "2.95" };
}

type TeamSlot = Record<string, string | undefined>;

function pickHomeName(t: TeamSlot | undefined): string {
  if (!t) return "홈";
  return (
    t.team1_name_kor ||
    t.team1_name ||
    t.name_kor ||
    t.name ||
    t.team_name_kor ||
    t.team_name ||
    t.team2_name_kor ||
    t.team2_name ||
    "홈"
  );
}

function pickAwayName(t: TeamSlot | undefined): string {
  if (!t) return "원정";
  return (
    t.team2_name_kor ||
    t.team2_name ||
    t.name_kor ||
    t.name ||
    t.team_name_kor ||
    t.team_name ||
    t.team1_name_kor ||
    t.team1_name ||
    "원정"
  );
}

function pickHomeImg(t: TeamSlot | undefined): string | undefined {
  if (!t) return undefined;
  return t.team1_img || t.img || t.team2_img;
}

function pickAwayImg(t: TeamSlot | undefined): string | undefined {
  if (!t) return undefined;
  return t.team2_img || t.img || t.team1_img;
}

/** 라이브 목록을 로비 카드용 리그 그룹으로 묶음 (팀 슬롯 형식이 달라도 예외 없이 표시) */
export function liveGamesToLeagueGroups(
  games: SportsLiveGameInput[],
): LeagueGroupData[] {
  const byComp = new Map<string, SportsLiveGameInput[]>();
  for (const g of games) {
    if (!g?.game_id || !Array.isArray(g.team) || g.team.length < 2) continue;
    const key = g.competition_id || g.competition_name_kor || "_";
    const arr = byComp.get(key) ?? [];
    arr.push(g);
    byComp.set(key, arr);
  }

  const out: LeagueGroupData[] = [];
  for (const [, rows] of byComp) {
    rows.sort((a, b) =>
      (a.start_ts || "").localeCompare(b.start_ts || ""),
    );
    const first = rows[0];
    if (!first) continue;

    const matches: MatchData[] = [];
    for (const g of rows) {
      const t1 = g.team?.[0] as TeamSlot | undefined;
      const t2 = g.team?.[1] as TeamSlot | undefined;
      if (!t1 || !t2) continue;

      const { home: oh, draw: od, away: oa } = resolve1x2(g);
      const startTs = g.start_ts || "2099-01-01 00:00:00";
      const kick = formatLeagueChip(parseStartTsToDate(startTs));
      const scoreLine =
        g.status === "1"
          ? `${g.score ?? "-"}${g.timer?.time_mark_kor ? ` · ${g.timer.time_mark_kor}` : ""}`
          : `개막 ${kick}`;

      matches.push({
        eventId: g.game_id,
        status: statusToMatchStatus(g.status || "0"),
        eventAt: parseStartTs(startTs),
        scoreLine,
        detailHref: g.live_ui_url?.trim() || undefined,
        detailLabel:
          g.status === "1" ? "라이브·배당 (새 창)" : "경기·배당 (새 창)",
        homeTeam: {
          name: pickHomeName(t1),
          imgSrc: pickHomeImg(t1),
        },
        awayTeam: {
          name: pickAwayName(t2),
          imgSrc: pickAwayImg(t2),
        },
        markets: [
          {
            name: "승무패",
            center: "VS",
            home: { label: "홈", odds: oh },
            draw: { label: "무", odds: od },
            away: { label: "원정", odds: oa },
          },
        ],
      });
    }

    if (matches.length === 0) continue;

    const cc = first.competition_cc_name_kor?.trim();
    const leagueTitle =
      first.competition_name_kor || first.competition_name || "리그";
    out.push({
      leagueName: cc ? `[${cc}] ${leagueTitle}` : leagueTitle,
      eventAt: formatLeagueChip(
        parseStartTsToDate(first.start_ts || "2099-01-01 00:00:00"),
      ),
      matches,
    });
  }
  return out;
}
