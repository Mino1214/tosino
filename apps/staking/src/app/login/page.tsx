import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/a/me/my-assets");
  return <AuthForm mode="login" />;
}
