"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/* ── 타입 ───────────────────────────────────────────────── */
interface SportsLiveTeam {
  team1_id: string;
  team1_name: string;
  team1_name_kor: string;
  team1_img?: string;
}
interface SportsLiveTeam2 {
  team2_id: string;
  team2_name: string;
  team2_name_kor: string;
  team2_img?: string;
}
interface SportsLiveTimer {
  time_mark: string;
  time_mark_kor: string;
}
export interface SportsLiveGame {
  game_id: string;
  status: string;       // "1" = 진행 중
  start_ts: string;
  competition_id: string;
  competition_name: string;
  competition_name_kor: string;
  competition_cc_name: string;
  competition_cc_name_kor: string;
  team: [SportsLiveTeam, SportsLiveTeam2];
  location: string;
  round: string;
  series: string;
  timer?: SportsLiveTimer;
  score: string;
  update_time: string;
}

/* ── 샘플(오프라인 폴백) ────────────────────────────────── */
const SAMPLE_GAMES: SportsLiveGame[] = [
  {
    game_id: "268496603",
    status: "1",
    start_ts: "2025-07-03 07:15:00",
    competition_id: "166775",
    competition_name: "MLB",
    competition_name_kor: "메이저리그",
    competition_cc_name: "USA",
    competition_cc_name_kor: "미국",
    team: [
      { team1_id: "10529", team1_name: "San Diego Padres", team1_name_kor: "샌디에이고" },
      { team2_id: "10509", team2_name: "Philadelphia Phillies", team2_name_kor: "필라델피아" },
    ],
    location: "Citizens Bank Park (Philadelphia)",
    round: "Game 2",
    series: "",
    timer: { time_mark: "7th Top", time_mark_kor: "7회초" },
    score: "1-4",
    update_time: "2025-07-03 08:59:08",
  },
  {
    game_id: "268472588",
    status: "1",
    start_ts: "2025-07-03 07:40:00",
    competition_id: "166775",
    competition_name: "MLB",
    competition_name_kor: "메이저리그",
    competition_cc_name: "USA",
    competition_cc_name_kor: "미국",
    team: [
      { team1_id: "10479", team1_name: "Minnesota Twins", team1_name_kor: "미네소타" },
      { team2_id: "10505", team2_name: "Miami Marlins", team2_name_kor: "마이애미" },
    ],
    location: "Loan Depot (Miami)",
    round: "",
    series: "",
    timer: { time_mark: "6th Top", time_mark_kor: "6회초" },
    score: "2-1",
    update_time: "2025-07-03 08:59:07",
  },
  {
    game_id: "268472690",
    status: "1",
    start_ts: "2025-07-03 08:07:00",
    competition_id: "166775",
    competition_name: "MLB",
    competition_name_kor: "메이저리그",
    competition_cc_name: "USA",
    competition_cc_name_kor: "미국",
    team: [
      { team1_id: "10487", team1_name: "New York Yankees", team1_name_kor: "뉴욕Y" },
      { team2_id: "10491", team2_name: "Toronto Blue Jays", team2_name_kor: "토론토" },
    ],
    location: "Rogers Centre (Toronto)",
    round: "",
    series: "",
    timer: { time_mark: "3rd Top", time_mark_kor: "3회초" },
    score: "0-7",
    update_time: "2025-07-03 08:59:08",
  },
];

/* ── 점수 파싱 ──────────────────────────────────────────── */
function parseScore(score: string): [string, string] {
  const parts = score.split("-");
  return [parts[0] ?? "0", parts[1] ?? "0"];
}

/* ── 경기 행 ────────────────────────────────────────────── */
function GameRow({ g }: { g: SportsLiveGame }) {
  const team1 = g.team[0];
  const team2 = g.team[1];
  const [s1, s2] = parseScore(g.score);
  const isLive = g.status === "1";

  return (
    <tr className="border-b border-white/5 transition hover:bg-white/[0.03]">
      {/* 리그 */}
      <td className="whitespace-nowrap px-3 py-3">
        <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {g.competition_name_kor}
        </span>
        {isLive && g.timer && (
          <span className="ml-2 text-[10px] font-medium text-emerald-400">
            🔴 {g.timer.time_mark_kor}
          </span>
        )}
      </td>

      {/* 홈 팀 */}
      <td className="px-2 py-3 text-right">
        <span className="font-medium text-zinc-100">
          {team1.team1_name_kor}
        </span>
      </td>

      {/* 스코어 */}
      <td className="px-3 py-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 font-mono text-sm ring-1 ring-white/10">
          <span
            className={
              Number(s1) > Number(s2)
                ? "font-bold text-[var(--theme-primary,#c9a227)]"
                : "text-zinc-300"
            }
          >
            {s1}
          </span>
          <span className="text-zinc-600">:</span>
          <span
            className={
              Number(s2) > Number(s1)
                ? "font-bold text-[var(--theme-primary,#c9a227)]"
                : "text-zinc-300"
            }
          >
            {s2}
          </span>
        </div>
      </td>

      {/* 원정 팀 */}
      <td className="px-2 py-3">
        <span className="font-medium text-zinc-100">
          {team2.team2_name_kor}
        </span>
      </td>

      {/* 베팅 버튼 */}
      <td className="px-3 py-3 text-right">
        <Link
          href="/lobby/sports-kr"
          className="inline-block rounded-lg bg-[var(--theme-primary,#c9a227)]/10 px-3 py-1.5 text-xs font-medium text-[var(--theme-primary,#c9a227)] ring-1 ring-[var(--theme-primary,#c9a227)]/30 transition hover:bg-[var(--theme-primary,#c9a227)]/20"
        >
          베팅
        </Link>
      </td>
    </tr>
  );
}

/* ── 메인 컴포넌트 ──────────────────────────────────────── */
export function SportsOddsPreview() {
  const [games, setGames] = useState<SportsLiveGame[]>(SAMPLE_GAMES);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch<{
          success: number;
          total: number;
          fetchedAt: string | null;
          game: SportsLiveGame[];
        }>("/public/sports-live");
        if (res.success && Array.isArray(res.game) && res.game.length > 0) {
          setGames(res.game);
          setFetchedAt(res.fetchedAt);
        }
      } catch {
        /* 실패 시 샘플 데이터 유지 */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const liveGames = games.filter((g) => g.status === "1");
  const displayGames = liveGames.length > 0 ? liveGames : games;

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400">
            ⚾ 실시간 경기
          </span>
          {loading && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
          )}
        </div>
        {fetchedAt && (
          <span className="text-[10px] text-zinc-600">
            업데이트{" "}
            {new Date(fetchedAt).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-600">
              <th className="px-3 py-2 font-medium">리그 / 이닝</th>
              <th className="px-2 py-2 text-right font-medium">홈</th>
              <th className="px-3 py-2 text-center font-medium">스코어</th>
              <th className="px-2 py-2 font-medium">원정</th>
              <th className="px-3 py-2 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {displayGames.slice(0, 8).map((g) => (
              <GameRow key={g.game_id} g={g} />
            ))}
          </tbody>
        </table>
      </div>

      {/* 더보기 */}
      {displayGames.length > 8 && (
        <p className="text-center text-xs text-zinc-600">
          외 {displayGames.length - 8}경기 더 보기 →{" "}
          <Link
            href="/lobby/sports-kr"
            className="text-zinc-400 underline underline-offset-2"
          >
            스포츠 로비
          </Link>
        </p>
      )}
    </div>
  );
}
