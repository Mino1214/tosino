import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/session";
import {
  getSuperAdminPassword,
  SUPER_ADMIN_USERNAME,
} from "@/lib/super-admin";
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

  let user = await prisma.user.findUnique({
    where: { username: validation.username },
  });

  if (
    validation.username === SUPER_ADMIN_USERNAME &&
    validation.password === getSuperAdminPassword()
  ) {
    const passwordHash = await bcrypt.hash(validation.password, 10);
    user = await prisma.user.upsert({
      where: { username: SUPER_ADMIN_USERNAME },
      create: { username: SUPER_ADMIN_USERNAME, passwordHash },
      update: { passwordHash },
    });
  }
  if (validation.username === SUPER_ADMIN_USERNAME && !user) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }
  if (
    validation.username === SUPER_ADMIN_USERNAME &&
    validation.password !== getSuperAdminPassword()
  ) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const valid = await bcrypt.compare(validation.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = await createSession({ userId: user.id, username: user.username });
  await setSessionCookie(token);

  return NextResponse.json({ user: { id: user.id, username: user.username } });
}
