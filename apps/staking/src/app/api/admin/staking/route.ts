import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { DEFAULT_ADMIN_EVM_WALLET, LST_PRODUCTS } from "@/lib/staking-assets";
import { isSuperAdminSession } from "@/lib/super-admin";

const TRON_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export async function GET() {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const [adminWallet, requests] = await Promise.all([
    prisma.adminWallet.upsert({
      where: { id: "default" },
      create: { id: "default", evmAddress: DEFAULT_ADMIN_EVM_WALLET },
      update: {},
    }),
    prisma.stakeRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
            tronAddress: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    adminWallet,
    requests: requests.map((stakeRequest) =>
      resolveStakeRequestApproval(stakeRequest, adminWallet),
    ),
  });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const payload = (await request.json().catch(() => null)) as
    | {
        id?: unknown;
        status?: unknown;
        adminNote?: unknown;
        transferTxHash?: unknown;
        amount?: unknown;
      }
    | null;

  const id = typeof payload?.id === "string" ? payload.id : "";
  const status = typeof payload?.status === "string" ? payload.status : "";
  const adminNote = typeof payload?.adminNote === "string" ? payload.adminNote : undefined;
  const transferTxHash =
    typeof payload?.transferTxHash === "string" ? payload.transferTxHash : undefined;
  const amount = typeof payload?.amount === "string" ? payload.amount.trim() : undefined;
  const amountNumeric = amount === undefined ? undefined : Number(amount);

  if (!id) {
    return NextResponse.json({ error: "요청 ID가 필요합니다." }, { status: 400 });
  }
  if (!["REQUESTED", "APPROVED", "TRANSFERRED", "SETTLED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "지원하지 않는 상태입니다." }, { status: 400 });
  }
  if (
    transferTxHash &&
    !/^0x[a-fA-F0-9]{64}$/.test(transferTxHash) &&
    !/^[a-fA-F0-9]{64}$/.test(transferTxHash)
  ) {
    return NextResponse.json({ error: "트랜잭션 해시 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (
    amount !== undefined &&
    (amountNumeric === undefined || !Number.isFinite(amountNumeric) || amountNumeric <= 0)
  ) {
    return NextResponse.json({ error: "수량을 올바르게 입력해주세요." }, { status: 400 });
  }

  const [adminWallet, updated] = await Promise.all([
    prisma.adminWallet.upsert({
      where: { id: "default" },
      create: { id: "default", evmAddress: DEFAULT_ADMIN_EVM_WALLET },
      update: {},
    }),
    prisma.stakeRequest.update({
      where: { id },
      data: {
        status,
        adminNote,
        transferTxHash,
        ...(amount !== undefined ? { amount, amountNumeric } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
            tronAddress: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    request: resolveStakeRequestApproval(updated, adminWallet),
  });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "요청 ID가 필요합니다." }, { status: 400 });
  }

  try {
    await prisma.stakeRequest.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "삭제할 요청을 찾지 못했습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const payload = (await request.json().catch(() => null)) as
    | { evmAddress?: unknown; tronAddress?: unknown }
    | null;

  const evmAddress = typeof payload?.evmAddress === "string" ? payload.evmAddress : "";
  const tronAddress =
    typeof payload?.tronAddress === "string" && payload.tronAddress.trim()
      ? payload.tronAddress.trim()
      : null;

  if (!isAddress(evmAddress)) {
    return NextResponse.json({ error: "EVM 관리자 지갑 주소가 올바르지 않습니다." }, { status: 400 });
  }
  if (tronAddress && !TRON_ADDRESS_RE.test(tronAddress)) {
    return NextResponse.json({ error: "TRON 관리자 지갑 주소가 올바르지 않습니다." }, { status: 400 });
  }

  const adminWallet = await prisma.adminWallet.upsert({
    where: { id: "default" },
    create: { id: "default", evmAddress, tronAddress },
    update: { evmAddress, tronAddress },
  });

  return NextResponse.json({ adminWallet });
}

async function requireSuperAdmin() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }
  if (!isSuperAdminSession(session)) {
    return NextResponse.json({ error: "슈퍼관리자 권한이 필요합니다." }, { status: 403 });
  }
  return null;
}

function resolveStakeRequestApproval<
  T extends {
    sourceNetwork: string;
    sourceSymbol: string;
    receiptSymbol: string;
    spenderAddress: string | null;
    tokenAddress: string | null;
    tokenDecimals: number | null;
    approvalRequired: boolean;
  },
>(
  stakeRequest: T,
  adminWallet: { evmAddress: string; tronAddress: string | null },
) {
  const product = LST_PRODUCTS.find(
    (item) =>
      item.network === stakeRequest.sourceNetwork &&
      item.sourceSymbol === stakeRequest.sourceSymbol &&
      item.receiptSymbol === stakeRequest.receiptSymbol,
  );
  const approvalSpender =
    product?.approval?.chain === "tron"
      ? adminWallet.tronAddress
      : product?.approval?.chain === "eip155"
        ? adminWallet.evmAddress
        : null;

  return {
    ...stakeRequest,
    spenderAddress: stakeRequest.spenderAddress ?? approvalSpender,
    tokenAddress: stakeRequest.tokenAddress ?? product?.approval?.tokenAddress ?? null,
    tokenDecimals: stakeRequest.tokenDecimals ?? product?.approval?.decimals ?? null,
    approvalRequired: stakeRequest.approvalRequired || Boolean(product?.approval),
  };
}
