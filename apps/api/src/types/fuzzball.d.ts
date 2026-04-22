/** fuzzball 패키지에 번들 타입이 없을 때 빌드용 최소 선언 */
declare module 'fuzzball' {
  export function ratio(a: string, b: string): number;
  export function token_sort_ratio(a: string, b: string): number;
}
