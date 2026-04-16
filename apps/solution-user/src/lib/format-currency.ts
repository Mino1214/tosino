function toFiniteNumber(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

export function formatKrwNumber(
  value: string | number | null | undefined,
  fallback = "0",
) {
  const n = toFiniteNumber(value);
  if (n == null) return fallback;
  return n.toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  });
}

export function formatKrwWithSymbol(
  value: string | number | null | undefined,
  fallback = "₩ 0",
) {
  const n = toFiniteNumber(value);
  if (n == null) return fallback;
  return `₩ ${n.toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  })}`;
}
