import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/session";
import { SUPER_ADMIN_USERNAME } from "@/lib/super-admin";
import { validateCredentials } from "@/lib/validation";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const validation = validateCredentials(payload);
  if (!validation.ok || !validation.username || !validation.password) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (validation.username === SUPER_ADMIN_USERNAME) {
    return NextResponse.json(
      { error: "관리자 아이디는 회원가입으로 만들 수 없습니다." },
      { status: 403 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: validation.username },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 아이디입니다." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(validation.password, 10);
  const user = await prisma.user.create({
    data: {
      username: validation.username,
      passwordHash,
    },
    select: { id: true, username: true },
  });

  const token = await createSession({ userId: user.id, username: user.username });
  await setSessionCookie(token);

  return NextResponse.json({ user });
}
