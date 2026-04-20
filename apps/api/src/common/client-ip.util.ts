import type { Request } from 'express';

/** IPv4/IPv6 최대 길이에 맞춰 잘라 저장 */
const MAX_LEN = 45;

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, MAX_LEN);
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    const first = String(forwarded[0]).split(',')[0]?.trim();
    if (first) return first.slice(0, MAX_LEN);
  }
  const raw = req.ip || req.socket?.remoteAddress;
  if (raw && typeof raw === 'string') {
    return raw.replace(/^::ffff:/, '').slice(0, MAX_LEN);
  }
  return null;
}
