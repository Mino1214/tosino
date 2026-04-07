/** 소문자·trim 후 검증. 기존 이메일 형태 마이그레이션을 위해 @ 허용 */
export const LOGIN_ID_PATTERN = /^[a-z0-9@._-]{3,64}$/;

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}
