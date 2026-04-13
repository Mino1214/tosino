import type { SportsLiveGameDto } from "@/lib/api";

const MAX_DEPTH = 8;
const MAX_ARRAYS = 40;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v.trim() || fallback;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function hasGenericGameContext(r: Record<string, unknown>): boolean {
  return (
    r.start_ts != null ||
    r.start_time != null ||
    r.kickoff != null ||
    r.match_time != null ||
    r.event_date != null ||
    Array.isArray(r.team) ||
    r.competition_id != null ||
    r.competition_name != null ||
    r.league_id != null ||
    r.league_name != null ||
    r.tournament_id != null ||
    r.tournament_name != null ||
    r.score != null
  );
}

/**
 * OddsHost·스냅샷 JSON에서 “경기 행”으로 볼 만한 객체인지.
 * `team` 배열의 팀 슬롯(team1만 있는 객체 등)이나 배당 줄의 `{ id }` 만으로는 true 가 되지 않게 함.
 */
export function looksLikeGameRow(x: unknown): boolean {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  if (
    r.game_id != null ||
    r.match_id != null ||
    r.event_id != null ||
    r.fixture_id != null
  ) {
    return true;
  }
  /** 베팅/마켓 줄만 `id` 로 오인하지 않도록, 맥락 필드와 함께일 때만 허용 */
  if (r.id != null && hasGenericGameContext(r)) return true;
  if (Array.isArray(r.team) && r.team.length >= 2) return true;
  if (typeof r.home_team === "string" && typeof r.away_team === "string")
    return true;
  if (r.home != null && r.away != null) return true;
  if (typeof r.team1_name === "string" && typeof r.team2_name === "string")
    return true;
  return false;
}

function collectArraysOfObjects(
  node: unknown,
  depth: number,
  out: unknown[][],
  seen: Set<unknown>,
): void {
  if (out.length >= MAX_ARRAYS || depth > MAX_DEPTH || node == null) return;
  if (typeof node !== "object") return;
  if (seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    if (
      node.length > 0 &&
      node.every((x) => x != null && typeof x === "object" && !Array.isArray(x))
    ) {
      if (looksLikeGameRow(node[0])) {
        out.push(node);
        return;
      }
    }
    for (const el of node) {
      if (el != null && typeof el === "object") {
        collectArraysOfObjects(el, depth + 1, out, seen);
      }
    }
    return;
  }

  const o = node as Record<string, unknown>;
  for (const v of Object.values(o)) {
    if (v != null && typeof v === "object") {
      collectArraysOfObjects(v, depth + 1, out, seen);
    }
  }
}

function readSide(
  slot: unknown,
  fallbackId: string,
): { id: string; name: string; nameKor: string; img?: string } | null {
  if (slot == null) return null;
  if (typeof slot === "string") {
    const n = slot.trim();
    if (!n) return null;
    return { id: fallbackId, name: n, nameKor: n };
  }
  if (typeof slot !== "object" || Array.isArray(slot)) return null;
  const s = slot as Record<string, unknown>;
  const name =
    str(s.team1_name) ||
    str(s.team2_name) ||
    str(s.name) ||
    str(s.title) ||
    str(s.team_name) ||
    str(s.team_name_kor);
  const nameKor =
    str(s.team1_name_kor) ||
    str(s.team2_name_kor) ||
    str(s.name_kor) ||
    name;
  const id =
    str(s.team1_id) ||
    str(s.team2_id) ||
    str(s.id) ||
    str(s.team_id) ||
    fallbackId;
  const img = str(s.team1_img) || str(s.team2_img) || str(s.img) || undefined;
  if (!name) return null;
  return { id, name, nameKor: nameKor || name, img };
}

/**
 * 다양한 벤더/중첩 구조에서 경기 배열을 모은 뒤, 카드 매퍼에 맞게 정규화합니다.
 * @param syntheticId 행에 ID가 없을 때만(팀 등 다른 필드는 있을 때) 임시 식별자로 사용
 */
export function normalizeSportsLiveGameRow(
  raw: unknown,
  syntheticId?: string,
): SportsLiveGameDto | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  let game_id =
    str(r.game_id) ||
    str(r.id) ||
    str(r.match_id) ||
    str(r.event_id) ||
    str(r.fixture_id);

  const status = str(r.status, str(r.state, "0")) || "0";
  const start_ts =
    str(r.start_ts) ||
    str(r.start_time) ||
    str(r.kickoff) ||
    str(r.match_time) ||
    str(r.date) ||
    str(r.event_date) ||
    "2099-01-01 00:00:00";

  const competition_id =
    str(r.competition_id) ||
    str(r.league_id) ||
    str(r.tournament_id) ||
    "unknown";
  const competition_name =
    str(r.competition_name) ||
    str(r.league_name) ||
    str(r.tournament_name) ||
    "League";
  const competition_name_kor =
    str(r.competition_name_kor) ||
    str(r.league_name_kor) ||
    competition_name;
  const competition_cc_name = str(r.competition_cc_name, "");
  const competition_cc_name_kor = str(r.competition_cc_name_kor, "");

  let team: SportsLiveGameDto["team"] | null = null;

  if (Array.isArray(r.team) && r.team.length >= 2) {
    const a = readSide(r.team[0], "t1");
    const b = readSide(r.team[1], "t2");
    if (a && b) {
      team = [
        {
          team1_id: a.id,
          team1_name: a.name,
          team1_name_kor: a.nameKor,
          team1_img: a.img,
        },
        {
          team2_id: b.id,
          team2_name: b.name,
          team2_name_kor: b.nameKor,
          team2_img: b.img,
        },
      ];
    }
  }

  if (!team && (r.home_team != null || r.away_team != null)) {
    const a = readSide(r.home_team, "home");
    const b = readSide(r.away_team, "away");
    if (a && b) {
      team = [
        {
          team1_id: a.id,
          team1_name: a.name,
          team1_name_kor: a.nameKor,
          team1_img: a.img,
        },
        {
          team2_id: b.id,
          team2_name: b.name,
          team2_name_kor: b.nameKor,
          team2_img: b.img,
        },
      ];
    }
  }

  if (!team && r.home != null && r.away != null) {
    const a = readSide(r.home, "home");
    const b = readSide(r.away, "away");
    if (a && b) {
      team = [
        {
          team1_id: a.id,
          team1_name: a.name,
          team1_name_kor: a.nameKor,
          team1_img: a.img,
        },
        {
          team2_id: b.id,
          team2_name: b.name,
          team2_name_kor: b.nameKor,
          team2_img: b.img,
        },
      ];
    }
  }

  if (!team) {
    const n1 =
      str(r.team1_name) ||
      str(r.home_name) ||
      str(r.team_home) ||
      str(r.player1);
    const n2 =
      str(r.team2_name) ||
      str(r.away_name) ||
      str(r.team_away) ||
      str(r.player2);
    if (n1 && n2) {
      const k1 = str(r.team1_name_kor, n1);
      const k2 = str(r.team2_name_kor, n2);
      team = [
        {
          team1_id: str(r.team1_id, "1"),
          team1_name: n1,
          team1_name_kor: k1,
          team1_img: str(r.team1_img) || undefined,
        },
        {
          team2_id: str(r.team2_id, "2"),
          team2_name: n2,
          team2_name_kor: k2,
          team2_img: str(r.team2_img) || undefined,
        },
      ];
    }
  }

  if (!team) return null;

  if (!game_id) {
    if (syntheticId?.trim()) game_id = syntheticId.trim();
    else return null;
  }

  const score = str(r.score, str(r.score_str, status === "1" ? "0:0" : "-"));
  const update_time =
    str(r.update_time) ||
    str(r.updated_at) ||
    str(r.last_update) ||
    new Date().toISOString();
  const location = str(r.location, "");
  const round = str(r.round, "");
  const series = str(r.series, "");

  const timer =
    r.timer != null && typeof r.timer === "object" && !Array.isArray(r.timer)
      ? {
          time_mark: str((r.timer as Record<string, unknown>).time_mark, ""),
          time_mark_kor: str(
            (r.timer as Record<string, unknown>).time_mark_kor,
            "",
          ),
        }
      : undefined;

  const odds_1x2Raw = r.odds_1x2;
  let odds_1x2: SportsLiveGameDto["odds_1x2"] | undefined;
  if (odds_1x2Raw != null && typeof odds_1x2Raw === "object" && !Array.isArray(odds_1x2Raw)) {
    const ox = odds_1x2Raw as Record<string, unknown>;
    const home = str(ox.home);
    const away = str(ox.away);
    if (home || away) {
      odds_1x2 = {
        home: home || "—",
        draw: str(ox.draw) || undefined,
        away: away || "—",
      };
    }
  }

  const live_ui_url =
    str(r.live_ui_url) || str(r.detail_url) || str(r.url) || undefined;

  return {
    game_id,
    status,
    start_ts,
    competition_id,
    competition_name,
    competition_name_kor,
    competition_cc_name,
    competition_cc_name_kor,
    team,
    location,
    round,
    series,
    timer,
    score,
    update_time,
    live_ui_url,
    odds_1x2,
  };
}

function mergeUniqueByGameId(rows: SportsLiveGameDto[]): SportsLiveGameDto[] {
  const byId = new Map<string, SportsLiveGameDto>();
  for (const row of rows) {
    if (row.game_id) byId.set(row.game_id, row);
  }
  return [...byId.values()];
}

/**
 * 스냅샷·OddsHost 등 임의 JSON에서 경기 목록을 최대한 꺼내 카드용 DTO로 맞춥니다.
 * (루트 `game`/`games` + 중첩 객체 안의 경기 배열 탐색)
 */
export function extractSportsLiveGamesFromPayload(
  payload: unknown,
): SportsLiveGameDto[] {
  if (!payload || typeof payload !== "object") return [];

  const candidates: unknown[][] = [];
  const seenArrays = new Set<unknown[]>();
  const pushUnique = (arr: unknown[]) => {
    if (!arr.length || seenArrays.has(arr)) return;
    seenArrays.add(arr);
    candidates.push(arr);
  };

  const o = payload as { game?: unknown; games?: unknown };
  if (Array.isArray(o.game) && o.game.length) pushUnique(o.game);
  if (Array.isArray(o.games) && o.games.length) pushUnique(o.games);

  const fromWalk: unknown[][] = [];
  collectArraysOfObjects(payload, 0, fromWalk, new Set());
  for (const arr of fromWalk) pushUnique(arr);

  const normalized: SportsLiveGameDto[] = [];
  let rowIdx = 0;
  for (const arr of candidates) {
    for (const raw of arr) {
      rowIdx += 1;
      const n = normalizeSportsLiveGameRow(raw, `row-${rowIdx}`);
      if (n) normalized.push(n);
    }
  }

  const merged = mergeUniqueByGameId(normalized);
  if (merged.length > 0) return merged;

  /** 정규화가 전부 실패해도 API/DB가 준 game·games 는 그대로 카드 매퍼에 맡김 */
  const rawGames = Array.isArray(o.games)
    ? o.games
    : Array.isArray(o.game)
      ? o.game
      : [];
  if (rawGames.length === 0) return [];
  return rawGames.filter(
    (x) => x != null && typeof x === "object",
  ) as SportsLiveGameDto[];
}
