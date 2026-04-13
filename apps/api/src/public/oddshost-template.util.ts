/**
 * OddsHost URL 템플릿 치환 (단위 테스트 대상).
 * 가이드: token={key}, sport={sport}, game_id=…, date={date}
 */

export function yyyymmddSeoul(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .replaceAll('-', '');
}

export function expandOddsHostUrlTemplate(
  template: string,
  vars: { key: string; sport: string; game_id: string },
  dateQueryOverride?: string,
): string {
  const date = (dateQueryOverride || '').trim() || yyyymmddSeoul();
  let out = template
    .replaceAll('{key}', encodeURIComponent(vars.key))
    .replaceAll('{sport}', encodeURIComponent(vars.sport))
    .replaceAll('{game_id}', encodeURIComponent(vars.game_id));
  if (out.includes('{date}')) {
    out = out.replaceAll('{date}', encodeURIComponent(date));
  }
  return out;
}
