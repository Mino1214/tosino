/**
 * 매출·알값 집계(`platforms` sales)는 metaJson.vertical 소문자
 * `casino` | `sports` | `slot` | `minigame` 를 기준으로 한다.
 * 총판 SQL(`agent`)은 LIVE_CASINO 등 대문자 키를 쓰므로, 조회 측에서 동의어를 매핑한다.
 */
export type LedgerGameVertical = 'casino' | 'sports' | 'slot' | 'minigame';

export function resolveLedgerVerticalFromVinus(args: {
  command: string;
  /** casinoVinusTx.kind — 스포츠 단폴은 SPORTS_BET */
  casinoTxKind?: string;
  gameSort?: string | undefined;
  gameType?: string | undefined;
}): LedgerGameVertical {
  const cmd = String(args.command ?? '').toLowerCase();
  if (cmd === 'sports-bet' || cmd.startsWith('sports-')) {
    return 'sports';
  }
  if (args.casinoTxKind === 'SPORTS_BET') {
    return 'sports';
  }

  const sort = String(args.gameSort ?? '').toLowerCase();
  const typ = String(args.gameType ?? '').toLowerCase();
  const blob = `${sort} ${typ}`;

  if (/\bslot\b|_slot\b|slotgame|슬롯/.test(blob)) {
    return 'slot';
  }
  if (
    /\bmini\b|minigame|미니|arcade|crash|graph|이벤트게임/.test(blob) ||
    sort === 'minigame'
  ) {
    return 'minigame';
  }

  return 'casino';
}

/** metaJson에 vertical / subVertical(원본 game_sort 등)을 넣는다 */
export function withLedgerVerticalMeta(
  vertical: LedgerGameVertical,
  base: Record<string, unknown>,
): Record<string, unknown> {
  const subRaw =
    (typeof base.game_sort === 'string' && base.game_sort.trim()) ||
    (typeof base.game_type === 'string' && base.game_type.trim()) ||
    '';
  const subVertical = subRaw.slice(0, 160);
  return {
    ...base,
    vertical,
    ...(subVertical ? { subVertical } : {}),
  };
}
