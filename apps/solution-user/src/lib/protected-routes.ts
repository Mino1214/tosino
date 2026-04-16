const USER_ONLY_ROUTE_PREFIXES = [
  "/lobby/live-casino",
  "/lobby/slots",
  "/lobby/minigame",
  "/lobby/arcade",
  "/mypage",
] as const;

export function isUserOnlyRoute(pathname: string | null | undefined) {
  if (!pathname) return false;
  return USER_ONLY_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
