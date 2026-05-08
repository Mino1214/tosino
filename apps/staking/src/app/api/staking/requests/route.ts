import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { DEFAULT_ADMIN_EVM_WALLET, LST_PRODUCTS } from "@/lib/staking-assets";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const requests = await prisma.stakeRequest.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        sourceSymbol?: unknown;
        sourceNetwork?: unknown;
        receiptSymbol?: unknown;
        amount?: unknown;
        walletAddress?: unknown;
        tronAddress?: unknown;
        allowanceRaw?: unknown;
        approveTxHash?: unknown;
      }
    | null;

  const sourceSymbol =
    typeof payload?.sourceSymbol === "string" ? payload.sourceSymbol.trim() : "";
  const sourceNetwork =
    typeof payload?.sourceNetwork === "string" ? payload.sourceNetwork.trim() : "";
  const receiptSymbol =
    typeof payload?.receiptSymbol === "string" ? payload.receiptSymbol.trim() : "";
  const amount = typeof payload?.amount === "string" ? payload.amount.trim() : "";
  const amountNumeric = Number(amount);

  const product = LST_PRODUCTS.find(
    (item) =>
      item.sourceSymbol === sourceSymbol &&
      item.receiptSymbol === receiptSymbol &&
      (!sourceNetwork || item.network === sourceNetwork),
  );

  if (!product) {
    return NextResponse.json({ error: "지원하지 않는 스테이킹 자산입니다." }, { status: 400 });
  }
  if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
    return NextResponse.json({ error: "수량을 올바르게 입력해주세요." }, { status: 400 });
  }

  const walletAddress =
    typeof payload?.walletAddress === "string" && isAddress(payload.walletAddress)
      ? payload.walletAddress
      : null;
  const tronAddress =
    typeof payload?.tronAddress === "string" ? payload.tronAddress.trim() : null;
  const allowanceRaw =
    typeof payload?.allowanceRaw === "string" ? payload.allowanceRaw : null;
  const approveTxHash =
    typeof payload?.approveTxHash === "string" ? payload.approveTxHash : null;

  const adminWallet = await prisma.adminWallet.upsert({
    where: { id: "default" },
    create: { id: "default", evmAddress: DEFAULT_ADMIN_EVM_WALLET },
    update: {},
  });
  const approvalSpender =
    product.approval?.chain === "tron"
      ? adminWallet.tronAddress
      : product.approval?.chain === "eip155"
        ? adminWallet.evmAddress
        : null;

  const stakeRequest = await prisma.stakeRequest.create({
    data: {
      userId: session.userId,
      sourceNetwork: product.network,
      sourceSymbol: product.sourceSymbol,
      sourceName: product.sourceName,
      receiptSymbol: product.receiptSymbol,
      platform: product.platform,
      platformUrl: product.href,
      category: product.category,
      amount,
      amountNumeric,
      walletAddress,
      tronAddress,
      spenderAddress: approvalSpender,
      tokenAddress: product.approval?.tokenAddress ?? null,
      tokenDecimals: product.approval?.decimals ?? null,
      approvalRequired: Boolean(product.approval),
      allowanceRaw,
      approveTxHash,
    },
  });

  return NextResponse.json({ request: stakeRequest }, { status: 201 });
}
