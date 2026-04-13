/**
 * 스포츠 로비 표시 모드
 *
 * - 운영(false): `SportsLobbyLayout` 카드만 — `sports-live` / `sports-prematch` 스냅샷을 주기적으로 불러와
 *   `liveGamesToLeagueGroups` 로 그립니다. 데모·API 테스트·OddsHost 진단 UI는 숨깁니다.
 * - 개발/스테이징(true): 기존 데모 + API 테스트 + 진단 패널.
 *
 * 미설정 시: `next dev` → true, `next build` 산출물 → false.
 */
export function sportsLobbyShowOperatorTools(): boolean {
  const raw = (process.env.NEXT_PUBLIC_SPORTS_OPERATOR_TOOLS ?? "")
    .trim()
    .toLowerCase();
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") {
    return true;
  }
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}
