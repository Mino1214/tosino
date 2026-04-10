"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppModals } from "@/contexts/AppModalsContext";

/** 직접 URL 접근 시 홈으로 돌리고 로그인 모달만 연다 */
export default function LoginPage() {
  const router = useRouter();
  const { openLogin } = useAppModals();

  useEffect(() => {
    openLogin();
    router.replace("/");
  }, [openLogin, router]);

  return null;
}
