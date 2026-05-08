import { NextResponse } from "next/server";

const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const USDT_TRON = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY?.trim() || "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";

  if (!TRON_RE.test(address)) {
    return NextResponse.json({ error: "유효한 TRON 주소가 아닙니다." }, { status: 400 });
  }

  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
    method: "GET",
    headers: TRONGRID_API_KEY
      ? {
          "TRON-PRO-API-KEY": TRONGRID_API_KEY,
        }
      : undefined,
    next: { revalidate: 15 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `TronGrid 오류 (HTTP ${res.status})` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    data?: Array<{
      balance?: string | number;
      trc20?: Array<Record<string, string | number>>;
    }>;
  };
  const account = data.data?.[0];
  const trxBalance = toTokenAmount(account?.balance) ?? 0;
  const usdtRaw = account?.trc20
    ?.map((item) => item[USDT_TRON])
    .find((value) => value !== undefined);
  const usdtBalance = toTokenAmount(usdtRaw) ?? 0;

  return NextResponse.json({ trxBalance, usdtBalance });
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
