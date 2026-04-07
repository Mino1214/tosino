import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomReferralSegment(len = 5): string {
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return s;
}
