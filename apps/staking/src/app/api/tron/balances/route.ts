import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const TRON_HEX_RE = /^41[a-fA-F0-9]{40}$/;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const USDT_TRON = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const USDT_TRON_HEX = tronBase58ToHex41(USDT_TRON);
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY?.trim() || "";
const TRON_FULL_HOST = (process.env.TRON_FULL_HOST?.trim() || "https://api.trongrid.io").replace(
  /\/+$/,
  "",
);

export async function GET(request: Request) {
  const rawAddress = getAddressParam(request.url);
  const address = normalizeTronAddress(rawAddress);

  if (!address) {
    return NextResponse.json({ error: "유효한 TRON 주소가 아닙니다." }, { status: 400 });
  }

  try {
    const account = await fetchAccountBalances(address.base58).catch(() => null);
    const [trxRaw, usdtRaw] = await Promise.all([
      account?.trxRaw !== undefined
        ? Promise.resolve(account.trxRaw)
        : fetchTrxBalance(address.hex41),
      fetchTrc20Balance(USDT_TRON_HEX, address.hex41).catch(
        () => account?.usdtRaw ?? 0,
      ),
    ]);

    return NextResponse.json({
      trxBalance: toTokenAmount(trxRaw) ?? 0,
      usdtBalance: toTokenAmount(usdtRaw) ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "TRON 잔액 조회를 완료하지 못했습니다.",
      },
      { status: 502 },
    );
  }
}

function getAddressParam(url: string) {
  const { searchParams } = new URL(url);
  const explicitAddress =
    searchParams.get("address") ??
    searchParams.get("wallet") ??
    searchParams.get("walletAddress");

  if (explicitAddress?.trim()) return explicitAddress.trim();

  for (const [key, value] of searchParams.entries()) {
    if (value) continue;
    const bareAddress = key.trim();
    if (TRON_RE.test(bareAddress) || TRON_HEX_RE.test(bareAddress)) {
      return bareAddress;
    }
  }

  return "";
}

async function fetchAccountBalances(address: string) {
  const res = await fetch(`${TRON_FULL_HOST}/v1/accounts/${address}`, {
    method: "GET",
    headers: tronHeaders(),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`TronGrid 계정 조회 오류 (HTTP ${res.status})`);
  const data = (await res.json()) as {
    data?: Array<{
      balance?: string | number;
      trc20?: Array<Record<string, string | number>>;
    }>;
  };
  const account = data.data?.[0];
  const usdtRaw = account?.trc20
    ?.map((item) => item[USDT_TRON])
    .find((value) => value !== undefined);

  return {
    trxRaw: account?.balance ?? 0,
    usdtRaw: usdtRaw ?? 0,
  };
}

async function fetchTrxBalance(hex41Address: string) {
  const res = await fetch(`${TRON_FULL_HOST}/wallet/getaccount`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...tronHeaders(),
    },
    cache: "no-store",
    body: JSON.stringify({ address: hex41Address }),
  });

  if (!res.ok) throw new Error(`TronGrid TRX 조회 오류 (HTTP ${res.status})`);
  const data = (await res.json()) as { balance?: string | number };
  return data.balance ?? 0;
}

async function fetchTrc20Balance(contractHex41Address: string, ownerHex41Address: string) {
  const res = await fetch(`${TRON_FULL_HOST}/wallet/triggerconstantcontract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...tronHeaders(),
    },
    cache: "no-store",
    body: JSON.stringify({
      owner_address: ownerHex41Address,
      contract_address: contractHex41Address,
      function_selector: "balanceOf(address)",
      parameter: tronHex41ToAbiParam(ownerHex41Address),
    }),
  });

  if (!res.ok) throw new Error(`TronGrid USDT 조회 오류 (HTTP ${res.status})`);
  const data = (await res.json()) as {
    result?: { result?: boolean; message?: string };
    constant_result?: string[];
  };

  if (data.result?.result === false) {
    throw new Error(data.result.message ?? "TRON USDT 컨트랙트 조회 실패");
  }

  const hex = data.constant_result?.[0] ?? "0";
  return BigInt(`0x${hex.replace(/^0x/, "") || "0"}`);
}

function tronHeaders() {
  return TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": TRONGRID_API_KEY } : undefined;
}

function toTokenAmount(raw: unknown) {
  if (raw === null || raw === undefined) return null;
  const value =
    typeof raw === "string" || typeof raw === "number" || typeof raw === "bigint"
      ? String(raw)
      : "";
  if (!value) return null;

  const amount = value.startsWith("0x")
    ? BigInt(value)
    : BigInt(value.replace(/[^\d]/g, "") || "0");

  return Number(amount) / 1_000_000;
}

function normalizeTronAddress(address: string) {
  if (TRON_RE.test(address)) {
    return {
      base58: address,
      hex41: tronBase58ToHex41(address),
    };
  }

  if (TRON_HEX_RE.test(address)) {
    const hex41 = address.toLowerCase();
    return {
      base58: tronHex41ToBase58(hex41),
      hex41,
    };
  }

  return null;
}

function tronHex41ToAbiParam(hex41: string) {
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

function tronHex41ToBase58(hex41: string) {
  const payload = Buffer.from(hex41, "hex");
  if (payload.length !== 21 || payload[0] !== 0x41) {
    throw new Error("TRON mainnet hex 주소가 아닙니다.");
  }

  const checksum = sha256(sha256(payload)).subarray(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}

function base58Encode(value: Buffer) {
  const digits = [0];
  for (const byte of value) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  for (const byte of value) {
    if (byte !== 0) break;
    digits.push(0);
  }

  return digits
    .reverse()
    .map((digit) => BASE58_ALPHABET[digit])
    .join("");
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
