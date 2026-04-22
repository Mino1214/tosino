/** BullMQ 큐 이름 — API 요청 경로에서는 매처를 직접 돌리지 않고 이 큐에만 넣는다. */
export const CRAWLER_MATCHER_QUEUE = 'crawler-matcher';

/** 주기적으로 소량씩 DB를 훑는 잡 */
export const MATCHER_JOB_PERIODIC = 'periodic-drain';

/** HQ 등에서 수동으로 넣는 잡 (우선순위 높음) */
export const MATCHER_JOB_MANUAL = 'manual-run';

export type CrawlerMatcherJobPayload = {
  sourceSite?: string;
  limit?: number;
  onlyStatuses?: Array<
    'pending' | 'rejected' | 'auto' | 'confirmed' | 'ignored'
  >;
  /**
   * true 이면 후보 JSON(candidatesJson)이 아직 없는 건만 스캔(주기 잡·기동 선작업용).
   * HQ 수동 실행은 기본 생략 → 전체(또는 onlyStatuses) 재검사.
   */
  onlyWithoutStoredCandidates?: boolean;
};
