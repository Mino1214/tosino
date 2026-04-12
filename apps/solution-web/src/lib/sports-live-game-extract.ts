import type { SportsLiveGameDto } from "@/lib/api";

export function extractSportsLiveGamesFromPayload(
  payload: unknown,
): SportsLiveGameDto[] {
  if (
    payload &&
    typeof payload === "object" &&
    "game" in payload &&
    Array.isArray((payload as { game: unknown }).game)
  ) {
    return (payload as { game: SportsLiveGameDto[] }).game;
  }
  return [];
}
