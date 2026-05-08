import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

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

  if (address !== null && (typeof address !== "string" || !ADDRESS_RE.test(address))) {
    return NextResponse.json(
      { error: "유효한 지갑 주소가 아닙니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    saved: false,
    walletAddress: address as string | null,
  });
}
