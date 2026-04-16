/**
 * 스포츠 배팅 UI(배팅카트 dock·하단 탭 등)를 켤 경로.
 * `/lobby/live`(인플레이)는 `/lobby/live-casino`와 접두사가 겹치므로 `startsWith("/lobby/live")`만으로는 판별하면 안 됨.
 */
export function isSportsBettingPath(pathname: string): boolean {
  if (pathname.startsWith("/lobby/sportsbook")) return true;
  if (pathname.startsWith("/lobby/sports-kr")) return true;
  if (pathname.startsWith("/lobby/sports-eu")) return true;
  if (pathname === "/lobby/sports" || pathname.startsWith("/lobby/sports/")) {
    return true;
  }
  if (pathname.startsWith("/lobby/prematch")) return true;
  if (pathname.startsWith("/lobby/esports")) return true;
  if (pathname === "/lobby/live" || pathname.startsWith("/lobby/live/")) return true;
  return false;
}
