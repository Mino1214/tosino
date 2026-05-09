import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;
  const rawNext = Array.isArray(params?.next) ? params.next[0] : params?.next;
  const redirectTo = sanitizeRedirect(rawNext);
  if (session) redirect(redirectTo);
  return <AuthForm mode="login" redirectTo={redirectTo} />;
}

function sanitizeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/a/me/my-assets";
  }
  return value;
}
