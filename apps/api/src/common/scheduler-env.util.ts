/**
 * ODDS 주기 동기화·기동 ingest·크롤 매처 기동 등 “개발 편의 스케줄” 기본값 분기.
 *
 * - 운영(pm2): NODE_ENV=production, TOSINO_LOCAL_SCHEDULERS 미설정 → 기존과 동일(주기 없음·기동 잡 기본 off).
 * - 로컬에서 운영과 동일하게 NODE_ENV=production 을 쓰는 경우: .env 에만
 *   TOSINO_LOCAL_SCHEDULERS=1 을 두면 비프로덕션과 같은 스케줄 기본이 적용됨(서버에는 두지 말 것).
 */
export function nodeEnvTrimmed(): string {
  return (process.env.NODE_ENV || 'development').trim().toLowerCase();
}

export function schedulerUsesDevDefaults(): boolean {
  if (nodeEnvTrimmed() !== 'production') {
    return true;
  }
  const raw = (process.env.TOSINO_LOCAL_SCHEDULERS ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
}
