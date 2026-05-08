import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";

// Tron base58 addresses typically start with 'T' and are 34 chars total.
// Accept only base58 to keep UX simple (TronLink returns base58).
const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const address =
    payload && typeof payload === "object" && "address" in payload
      ? (payload as { address: unknown }).address
      : null;

  if (address !== null && (typeof address !== "string" || !TRON_RE.test(address))) {
    return NextResponse.json(
      { error: "유효한 TRON 주소가 아닙니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    saved: false,
    tronAddress: address as string | null,
  });
}
