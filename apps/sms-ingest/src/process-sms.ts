import { createHash } from 'crypto';
import {
  PrismaClient,
  BankSmsIngestStatus,
  WalletRequestType,
  WalletRequestStatus,
  LedgerEntryType,
  UserRole,
  RegistrationStatus,
  Prisma,
} from '@prisma/client';

/** API RollingObligationService 와 동일 조건 (sms-ingest 단독 실행용) */
async function maybeCreateRollingObligation(
  tx: Prisma.TransactionClient,
  userId: string,
  platformId: string,
  amount: Prisma.Decimal,
  sourceRef: string,
): Promise<void> {
  if (amount.lte(0)) return;
  const [platform, user] = await Promise.all([
    tx.platform.findUnique({
      where: { id: platformId },
      select: {
        rollingLockWithdrawals: true,
        rollingTurnoverMultiplier: true,
      },
    }),
    tx.user.findUnique({
      where: { id: userId },
      select: { rollingEnabled: true, role: true },
    }),
  ]);
  if (
    !platform?.rollingLockWithdrawals ||
    user?.role !== UserRole.USER ||
    !user?.rollingEnabled
  ) {
    return;
  }
  const mult =
    platform.rollingTurnoverMultiplier ?? new Prisma.Decimal(1);
  const required = amount.times(mult);
  if (required.lte(0)) return;
  await tx.rollingObligation.create({
    data: {
      platformId,
      userId,
      sourceRef: sourceRef.slice(0, 160),
      principalAmount: amount,
      requiredTurnover: required,
      appliedTurnover: new Prisma.Decimal(0),
    },
  });
}
import {
  parseWebBankSms,
  namesMatchSms,
  type ParsedWebBankSms,
} from './parse-web-sms';

function normalizeDevicePhone(input: string | undefined | null): string {
  if (!input?.trim()) return '';
  let d = input.replace(/\D/g, '');
  if (d.startsWith('82') && d.length >= 10) {
    d = `0${d.slice(2)}`;
  }
  return d;
}

/** 수신번호로 반가상 플랫폼이 하나뿐이면 로그·관리자 목록에 붙이기 (PARSE_ERROR / NO_PLATFORM) */
async function resolvePlatformIdByRecipientOnly(
  prisma: PrismaClient,
  recipientNorm: string,
): Promise<string | null> {
  if (!recipientNorm) return null;
  const platforms = await prisma.platform.findMany({
    where: { semiVirtualEnabled: true },
    select: { id: true, semiVirtualRecipientPhone: true },
  });
  const matched = platforms.filter(
    (p) =>
      p.semiVirtualRecipientPhone &&
      normalizeDevicePhone(p.semiVirtualRecipientPhone) === recipientNorm,
  );
  return matched.length === 1 ? matched[0]!.id : null;
}

function resolvePlatforms(
  platforms: {
    id: string;
    semiVirtualRecipientPhone: string | null;
    semiVirtualAccountHint: string | null;
  }[],
  recipientPhoneNorm: string,
  rawBody: string,
) {
  return platforms.filter((p) => {
    let ok = true;
    if (p.semiVirtualRecipientPhone) {
      ok =
        ok &&
        !!recipientPhoneNorm &&
        p.semiVirtualRecipientPhone === recipientPhoneNorm;
    }
    if (p.semiVirtualAccountHint) {
      ok = ok && rawBody.includes(p.semiVirtualAccountHint);
    }
    return ok;
  });
}

export type IngestBody = {
  secret?: unknown;
  body?: unknown;
  sender?: unknown;
  /** 앱에 설정한 이 단말의 수신 번호(숫자만 권장) */
  recipientPhone?: unknown;
};

function strTrim(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export async function processSmsIngest(
  prisma: PrismaClient,
  ingestSecret: string,
  payload: IngestBody,
): Promise<{
  ok: boolean;
  duplicate?: boolean;
  status?: BankSmsIngestStatus;
  platformId?: string | null;
  message?: string;
}> {
  const want = ingestSecret.trim();
  const got = strTrim(payload.secret);
  if (want && (!got || got !== want)) {
    return {
      ok: false,
      message: got
        ? 'invalid secret'
        : 'secret 누락: 서버 .env에 SMS_INGEST_SECRET이 있으면 앱에도 같은 값을 넣거나, 비밀 없이 쓰려면 .env에서 그 변수를 제거하세요',
    };
  }
  const rawBody = strTrim(payload.body);
  if (!rawBody) {
    return { ok: false, message: 'empty body' };
  }

  const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const existing = await prisma.bankSmsIngest.findUnique({
    where: { bodyHash },
  });
  if (existing) {
    return { ok: true, duplicate: true, status: BankSmsIngestStatus.DUPLICATE };
  }

  const parsed = parseWebBankSms(rawBody);
  const recipientNorm = normalizeDevicePhone(
    strTrim(payload.recipientPhone) || undefined,
  );

  const platforms = await prisma.platform.findMany({
    where: { semiVirtualEnabled: true },
    select: {
      id: true,
      semiVirtualRecipientPhone: true,
      semiVirtualAccountHint: true,
    },
  });

  const matchedPlats = resolvePlatforms(
    platforms,
    recipientNorm,
    rawBody,
  );

  if (!parsed) {
    const guessedPlatformId = await resolvePlatformIdByRecipientOnly(
      prisma,
      recipientNorm,
    );
    await prisma.bankSmsIngest.create({
      data: {
        platformId: guessedPlatformId,
        bodyHash,
        rawBody,
        sender: strTrim(payload.sender) || null,
        recipientPhoneSnapshot: recipientNorm || null,
        parsedJson: Prisma.JsonNull,
        status: BankSmsIngestStatus.PARSE_ERROR,
        failureReason: '웹발신([Web]/[Web발신] 등) 입금·출금 줄을 찾지 못함',
      },
    });
    return { ok: true, status: BankSmsIngestStatus.PARSE_ERROR };
  }

  if (matchedPlats.length === 0) {
    const guessedPlatformId = await resolvePlatformIdByRecipientOnly(
      prisma,
      recipientNorm,
    );
    await prisma.bankSmsIngest.create({
      data: {
        platformId: guessedPlatformId,
        bodyHash,
        rawBody,
        sender: strTrim(payload.sender) || null,
        recipientPhoneSnapshot: recipientNorm || null,
        parsedJson: parsed as object,
        status: BankSmsIngestStatus.NO_PLATFORM,
        failureReason: '반가상 설정과 번호/계좌힌트가 맞는 플랫폼 없음',
      },
    });
    return { ok: true, status: BankSmsIngestStatus.NO_PLATFORM };
  }

  const platform = matchedPlats[0]!;
  const ambiguous =
    matchedPlats.length > 1 ? matchedPlats.map((p) => p.id) : undefined;

  if (parsed.kind === 'withdrawal') {
    await prisma.bankSmsIngest.create({
      data: {
        platformId: platform.id,
        bodyHash,
        rawBody,
        sender: strTrim(payload.sender) || null,
        recipientPhoneSnapshot: recipientNorm || null,
        parsedJson: ambiguous
          ? { ...parsed, ambiguousPlatformIds: ambiguous }
          : (parsed as object),
        status: BankSmsIngestStatus.IGNORE_WITHDRAWAL,
        failureReason: ambiguous
          ? '복수 플랫폼 매칭 — 첫 플랫폼에만 기록'
          : null,
      },
    });
    return {
      ok: true,
      status: BankSmsIngestStatus.IGNORE_WITHDRAWAL,
      platformId: platform.id,
    };
  }

  const result = await tryAutoCreditDeposit(
    prisma,
    platform.id,
    parsed,
    {
      bodyHash,
      rawBody,
      sender: strTrim(payload.sender) || null,
      recipientPhoneSnapshot: recipientNorm || null,
      ambiguousPlatformIds: ambiguous,
    },
  );
  return result;
}

async function tryAutoCreditDeposit(
  prisma: PrismaClient,
  platformId: string,
  parsed: ParsedWebBankSms,
  meta: {
    bodyHash: string;
    rawBody: string;
    sender: string | null;
    recipientPhoneSnapshot: string | null;
    ambiguousPlatformIds?: string[];
  },
): Promise<{
  ok: boolean;
  status?: BankSmsIngestStatus;
  platformId?: string;
  message?: string;
}> {
  const amountDec = new Prisma.Decimal(parsed.amount);

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.walletRequest.findMany({
      where: {
        platformId,
        type: WalletRequestType.DEPOSIT,
        status: WalletRequestStatus.PENDING,
        amount: amountDec,
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            registrationStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const viable = candidates.filter(
      (r) =>
        r.user.role === UserRole.USER &&
        r.user.registrationStatus === RegistrationStatus.APPROVED &&
        namesMatchSms(parsed.counterpartyName, r.depositorName, r.note),
    );

    const parsedJson = {
      ...parsed,
      ...(meta.ambiguousPlatformIds?.length
        ? { ambiguousPlatformIds: meta.ambiguousPlatformIds }
        : {}),
    };

    if (viable.length === 0) {
      await tx.bankSmsIngest.create({
        data: {
          platformId,
          bodyHash: meta.bodyHash,
          rawBody: meta.rawBody,
          sender: meta.sender,
          recipientPhoneSnapshot: meta.recipientPhoneSnapshot,
          parsedJson,
          status: BankSmsIngestStatus.NO_MATCH,
          failureReason:
            '금액·입금자명이 일치하는 대기 충전 신청 없음 (depositorName/메모 확인)',
        },
      });
      return { ok: true, status: BankSmsIngestStatus.NO_MATCH, platformId };
    }

    const req = viable[0]!;
    const wallet = await tx.wallet.findUnique({
      where: { userId: req.userId },
    });
    if (!wallet) {
      await tx.bankSmsIngest.create({
        data: {
          platformId,
          bodyHash: meta.bodyHash,
          rawBody: meta.rawBody,
          sender: meta.sender,
          recipientPhoneSnapshot: meta.recipientPhoneSnapshot,
          parsedJson,
          status: BankSmsIngestStatus.NO_MATCH,
          failureReason: '회원 지갑 없음',
        },
      });
      return { ok: true, status: BankSmsIngestStatus.NO_MATCH, platformId };
    }

    const delta = amountDec;
    const newBal = wallet.balance.plus(delta);
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBal },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: req.userId,
        platformId,
        type: LedgerEntryType.ADJUSTMENT,
        amount: delta,
        balanceAfter: newBal,
        reference: `sms:${meta.bodyHash.slice(0, 16)}`,
        metaJson: {
          source: 'sms_bank_web',
          walletRequestId: req.id,
          counterpartyName: parsed.counterpartyName,
        },
      },
    });
    await tx.walletRequest.update({
      where: { id: req.id },
      data: {
        status: WalletRequestStatus.APPROVED,
        resolvedAt: new Date(),
        resolverNote: '반가상: 은행 문자 자동 매칭',
      },
    });
    await maybeCreateRollingObligation(
      tx,
      req.userId,
      platformId,
      delta,
      `sms-wr:${req.id}:principal`,
    );
    await tx.bankSmsIngest.create({
      data: {
        platformId,
        bodyHash: meta.bodyHash,
        rawBody: meta.rawBody,
        sender: meta.sender,
        recipientPhoneSnapshot: meta.recipientPhoneSnapshot,
        parsedJson,
        status: BankSmsIngestStatus.AUTO_CREDITED,
        matchedWalletRequestId: req.id,
      },
    });
    return { ok: true, status: BankSmsIngestStatus.AUTO_CREDITED, platformId };
  });
}
