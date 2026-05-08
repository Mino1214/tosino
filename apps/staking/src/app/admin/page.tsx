import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentSession } from "@/lib/session";
import { isSuperAdminSession } from "@/lib/super-admin";
import { AdminStakingClient } from "./staking-client";

export const metadata: Metadata = {
  title: "Admin Staking",
  description: "스테이킹 요청과 관리자 수령 지갑을 관리합니다.",
};

export default async function AdminPage() {
  const host = (await headers()).get("host") ?? "";
  if (
    host === "localhost:3001" ||
    host === "127.0.0.1:3001" ||
    host === "localhost:3002"
  ) {
    redirect("http://admin.localhost:3002/admin");
  }

  const session = await getCurrentSession();
  if (!isSuperAdminSession(session)) {
    return (
      <AuthForm
        mode="login"
        redirectTo="/admin"
        defaultUsername="admin"
        hideModeSwitch
        title="관리자 로그인"
        description="슈퍼관리자 계정으로 로그인하세요."
        submitLabel="관리자 로그인"
      />
    );
  }

  return <AdminStakingClient />;
}
