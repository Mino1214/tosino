/**
 * flagsJson.solutionRatePolicy 에서 플랫폼 청구율(%)을 일관되게 계산한다.
 * - 카지노·슬롯·미니 등 버킷: 상위 카지노 알값 + 자동 마진
 * - 스포츠: 상위 스포츠 알값만 (자동 마진 미가산)
 *
 * JSON에 저장된 platformCasinoPct / platformSportsPct 는 과거 버그로
 * 마진만 들어간 값이 있을 수 있어, 런타임·저장 시 이 함수 결과를 우선한다.
 */
export function normalizeSolutionPctString(value: unknown): string | null {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(100, num).toFixed(2);
}

export function derivePlatformBillingPctFromPolicy(
  policy: Record<string, unknown>,
  bucket: 'casino' | 'sports',
): string {
  const upstreamCasinoPct = normalizeSolutionPctString(policy.upstreamCasinoPct);
  const upstreamSportsPct = normalizeSolutionPctString(policy.upstreamSportsPct);
  const autoMarginPct =
    normalizeSolutionPctString(policy.autoMarginPct) ?? '1.00';
  const marginNum = Number(autoMarginPct);
  if (bucket === 'sports') {
    return Number(upstreamSportsPct ?? '0').toFixed(2);
  }
  return (Number(upstreamCasinoPct ?? '0') + marginNum).toFixed(2);
}
