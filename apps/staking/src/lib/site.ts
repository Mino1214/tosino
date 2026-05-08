function trimUrl(url: string) {
  return url.replace(/\/$/, "");
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim()
    ? trimUrl(process.env.NEXT_PUBLIC_SITE_URL.trim())
    : "http://localhost:3016";

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "GramStake";

export function absoluteUrl(pathname: string) {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${p}`;
}
