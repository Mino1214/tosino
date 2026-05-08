import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ADMIN_EVM_WALLET } from "@/lib/staking-assets";
import { MyAssetsClient } from "./my-assets-client";

export const metadata: Metadata = {
  title: "내 자산 리포트",
  description:
    "포트폴리오, 누적 보상, 지갑 연결 상태를 한눈에 확인하는 대시보드.",
};

export default async function MyAssetsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=/a/me/my-assets");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, walletAddress: true, tronAddress: true },
  });
  if (!user) redirect("/login");

  const adminWallet = await prisma.adminWallet.upsert({
    where: { id: "default" },
    create: { id: "default", evmAddress: DEFAULT_ADMIN_EVM_WALLET },
    update: {},
  });

  return (
    <MyAssetsClient
      user={user}
      adminEvmWallet={adminWallet.evmAddress}
      adminTronWallet={adminWallet.tronAddress}
    />
  );
}
