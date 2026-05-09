import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ADMIN_EVM_WALLET } from "@/lib/staking-assets";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "대시보드",
  description: "스테이킹과 트레이딩 봇 현황을 한 화면에서 확인합니다.",
};

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true },
  });
  if (!user) redirect("/login?next=/dashboard");

  const adminWallet = await prisma.adminWallet.upsert({
    where: { id: "default" },
    create: { id: "default", evmAddress: DEFAULT_ADMIN_EVM_WALLET },
    update: {},
  });

  return (
    <DashboardClient
      user={user}
      adminEvmWallet={adminWallet.evmAddress}
      adminTronWallet={adminWallet.tronAddress}
    />
  );
}
