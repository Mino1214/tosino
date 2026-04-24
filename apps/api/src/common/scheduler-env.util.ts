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

/**
 * API(main) 프로세스 안에서 크롤 매처 Bull 스케줄+소비를 돌릴지.
 * - 기본 **켬**: 로컬에서 `pnpm dev:api` 만 켜도 매칭이 돌게 함.
 * - 끄기만 명시: `CRAWLER_MATCHER_IN_API=0` (ecosystem 의 api 가 운영에서 이렇게 둠 → worker 전용).
 * - 강제 켬: `CRAWLER_MATCHER_IN_API=1` (이미 기본이 켜짐이라 거의 동일).
 */
export function crawlerMatcherRunsInApiProcess(): boolean {
  const raw = (process.env.CRAWLER_MATCHER_IN_API ?? '').trim().toLowerCase();
  return !['0', 'false', 'off', 'no', 'disabled'].includes(raw);
}

/** SyncSchedulerService 와 SyncProcessor — RUN_ODDS_INGEST_ON_BOOT 해석(비어 있으면 dev 프로필만 기동 1회). */
export function runOddsIngestOnBootEnabled(): boolean {
  const raw = (process.env.RUN_ODDS_INGEST_ON_BOOT ?? '').trim().toLowerCase();
  if (['0', 'false', 'off', 'no', 'disabled'].includes(raw)) {
    return false;
  }
  if (['1', 'true', 'yes', 'on'].includes(raw)) {
    return true;
  }
  return schedulerUsesDevDefaults();
}

/**
 * true면 기동 1회 매처는 "기동 ODDS(boot-odds) 잡 완료 직후"에만 SyncProcessor가 큐잉(순서 보장).
 * false면 예전처럼 CrawlerMatcherScheduler 의 타이머로만(ODDS와 병렬) 큐잉.
 * 기본 1. 끄기: 0
 */
export function chainCrawlerMatcherAfterBootOddsEnabled(): boolean {
  const raw = (
    process.env.CRAWLER_MATCHER_BOOT_CHAIN_AFTER_FIRST_ODDS ?? '1'
  )
    .trim()
    .toLowerCase();
  if (['0', 'false', 'off', 'no', 'disabled'].includes(raw)) {
    return false;
  }
  return true;
}

/**
 * CrawlerMatcherScheduler 기동 1회 매처 (타이머 또는 체인) — sync 의 runCrawlerMatcherOnBootEnabled 와 동일.
 */
export function runCrawlerMatcherOnBootEnabled(): boolean {
  const raw = (process.env.RUN_CRAWLER_MATCHER_ON_BOOT ?? '')
    .trim()
    .toLowerCase();
  if (['0', 'false', 'off', 'no', 'disabled'].includes(raw)) {
    return false;
  }
  if (['1', 'true', 'yes', 'on'].includes(raw)) {
    return true;
  }
  return schedulerUsesDevDefaults();
}
