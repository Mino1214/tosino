/**
 * OddsHost(또는 동일 계열) `sport` 쿼리 파라미터에 쓰는 **숫자 ID** → 한글 표기 참고.
 *
 * - 이 저장소는 **벤더 전체 종목 목록을 API로 자동 수집·저장하지 않습니다.**
 *   ODDS 동기화 시 인플레이 목록은 `ODDSHOST_INGEST_SPORT` **한 종목 ID**만 사용합니다.
 * - 아래 키는 운영에서 자주 붙는 예시이며, **계약 업체 문서의 ID·명칭이 우선**입니다. 다르면 이 맵만 고치면 됩니다.
 */
export const ODDSHOST_SPORT_ID_NAME_KR: Readonly<Record<string, string>> = {
  "1": "축구",
  "2": "농구",
  "3": "야구",
  "4": "아이스하키",
  "5": "테니스",
  "6": "배구",
  "7": "탁구",
  "11": "E스포츠 · 리그 오브 레전드",
  "12": "E스포츠 · 스타크래프트",
  "13": "E스포츠 · 카운터스트라이크",
  "301": "가상축구",
  "302": "가상농구",
  /** 스페셜·통합 등 벤더 정의 ID — 문서 확인 필요 */
  "400": "스페셜/통합(벤더 정의)",
} as const;

/** 알려진 ID 목록(맵에 정의된 것만). “전 종목”이 아님. */
export const ODDSHOST_SPORT_IDS_WITH_KO_LABEL: readonly string[] = Object.keys(
  ODDSHOST_SPORT_ID_NAME_KR,
);

export function oddshostSportNameKr(
  id: string | number | null | undefined,
): string | undefined {
  if (id === null || id === undefined) return undefined;
  const k = String(id).trim();
  if (!k) return undefined;
  return ODDSHOST_SPORT_ID_NAME_KR[k];
}
