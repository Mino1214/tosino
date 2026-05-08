import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { isSuperAdminSession } from "@/lib/super-admin";

const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export async function GET(request: Request) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get("tokenAddress")?.trim() ?? "";
  const owner = searchParams.get("owner")?.trim() ?? "";
  const spender = searchParams.get("spender")?.trim() ?? "";

  if (!TRON_RE.test(tokenAddress) || !TRON_RE.test(owner) || !TRON_RE.test(spender)) {
    return NextResponse.json({ error: "유효한 TRON 주소가 아닙니다." }, { status: 400 });
  }

  try {
    const [balance, allowance] = await Promise.all([
      callTronConstant({
        contractAddress: tokenAddress,
        ownerAddress: owner,
        functionSelector: "balanceOf(address)",
        parameter: tronAddressToAbiParam(owner),
      }),
      callTronConstant({
        contractAddress: tokenAddress,
        ownerAddress: owner,
        functionSelector: "allowance(address,address)",
        parameter: `${tronAddressToAbiParam(owner)}${tronAddressToAbiParam(spender)}`,
      }),
    ]);

    return NextResponse.json({
      balanceRaw: balance.toString(),
      allowanceRaw: allowance.toString(),
      recoverableRaw: (balance < allowance ? balance : allowance).toString(),
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "TRON 잔고/allowance 조회를 완료하지 못했습니다.",
      },
      { status: 502 },
    );
  }
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

async function callTronConstant({
  contractAddress,
  ownerAddress,
  functionSelector,
  parameter,
}: {
  contractAddress: string;
  ownerAddress: string;
  functionSelector: string;
  parameter: string;
}) {
  const res = await fetch("https://api.trongrid.io/wallet/triggerconstantcontract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.TRONGRID_API_KEY
        ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
        : {}),
    },
    cache: "no-store",
    body: JSON.stringify({
      owner_address: tronBase58ToHex41(ownerAddress),
      contract_address: tronBase58ToHex41(contractAddress),
      function_selector: functionSelector,
      parameter,
    }),
  });

  if (!res.ok) {
    throw new Error(`TronGrid 오류 (HTTP ${res.status})`);
  }

  const data = (await res.json()) as {
    result?: { result?: boolean; message?: string };
    constant_result?: string[];
  };

  if (data.result?.result === false) {
    throw new Error(data.result.message ?? "TRON 컨트랙트 조회 실패");
  }

  const hex = data.constant_result?.[0] ?? "0";
  return BigInt(`0x${hex.replace(/^0x/, "") || "0"}`);
}

function tronAddressToAbiParam(address: string) {
  const hex41 = tronBase58ToHex41(address);
  return hex41.slice(2).padStart(64, "0");
}

function tronBase58ToHex41(address: string) {
  const decoded = base58Decode(address);
  if (decoded.length !== 25) throw new Error("TRON 주소 길이가 올바르지 않습니다.");
  const payload = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21);
  const expected = sha256(sha256(payload)).subarray(0, 4);
  if (!checksum.equals(expected)) throw new Error("TRON 주소 checksum이 올바르지 않습니다.");
  if (payload[0] !== 0x41) throw new Error("TRON mainnet 주소가 아닙니다.");
  return payload.toString("hex");
}

function base58Decode(value: string) {
  const bytes = [0];
  for (const char of value) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit === -1) throw new Error("TRON 주소 base58 문자가 올바르지 않습니다.");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const char of value) {
    if (char !== "1") break;
    bytes.push(0);
  }

  return Buffer.from(bytes.reverse());
}

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest();
}
