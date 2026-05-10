import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { isSuperAdminSession } from "@/lib/super-admin";

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }
  if (!isSuperAdminSession(session)) {
    return NextResponse.json({ error: "슈퍼관리자 권한이 필요합니다." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "회원 ID가 필요합니다." }, { status: 400 });
  }

  if (session.userId === id) {
    return NextResponse.json(
      { error: "현재 로그인한 관리자 계정은 삭제할 수 없습니다." },
      { status: 400 },
    );
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "삭제할 회원을 찾지 못했습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
