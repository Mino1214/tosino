/**
 * [Web] / [Web발신] 등 웹발신 알림 문자 파싱 (줄 구성은 은행마다 약간 다를 수 있음)
 */
export type ParsedWebBankSms = {
  kind: 'deposit' | 'withdrawal';
  amount: number;
  counterpartyName: string;
  bankBalance: number | null;
};

/** 본문 어딘가에 `[Web` 으로 시작하는 태그가 있으면 웹발신으로 간주 ([Web], [Web발신] 등) */
function looksLikeWebBankSms(text: string): boolean {
  return /\[Web/i.test(text);
}

export function parseWebBankSms(raw: string): ParsedWebBankSms | null {
  const text = raw.trim();
  if (!text || !looksLikeWebBankSms(text)) return null;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let kind: 'deposit' | 'withdrawal' | null = null;
  let amount: number | null = null;
  let bankBalance: number | null = null;
  let amountLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const dep = line.match(/입금\s*([\d,]+)\s*원/);
    const wdr = line.match(/출금\s*([\d,]+)\s*원/);
    if (dep) {
      kind = 'deposit';
      amount = Number(dep[1]!.replace(/,/g, ''));
      amountLineIdx = i;
      continue;
    }
    if (wdr) {
      kind = 'withdrawal';
      amount = Number(wdr[1]!.replace(/,/g, ''));
      amountLineIdx = i;
      continue;
    }
    const bal = line.match(/잔액\s*([\d,]+)\s*원/);
    if (bal) {
      bankBalance = Number(bal[1]!.replace(/,/g, ''));
    }
  }

  if (!kind || amount == null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  let counterpartyName = '';
  if (amountLineIdx >= 0 && amountLineIdx + 1 < lines.length) {
    const next = lines[amountLineIdx + 1]!;
    if (
      !/잔액/.test(next) &&
      !/(입금|출금)/.test(next) &&
      !/^\[Web/i.test(next) &&
      next.length <= 80
    ) {
      counterpartyName = next.trim();
    }
  }

  return { kind, amount, counterpartyName, bankBalance };
}

export function normalizeNameKey(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

export function namesMatchSms(
  smsName: string,
  depositorName: string | null,
  note: string | null,
): boolean {
  const a = normalizeNameKey(smsName.trim());
  if (!a) return false;
  if (depositorName) {
    const b = normalizeNameKey(depositorName);
    if (b && b === a) return true;
  }
  if (note) {
    const n = normalizeNameKey(note);
    if (n && (n.includes(a) || a.includes(n))) return true;
  }
  return false;
}
