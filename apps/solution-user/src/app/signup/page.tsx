"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppModals } from "@/contexts/AppModalsContext";

/** 직접 URL 접근 시 홈으로 돌리고 회원가입 모달만 연다 */
export default function SignupPage() {
  const router = useRouter();
  const { openSignup } = useAppModals();

  useEffect(() => {
    openSignup();
    router.replace("/");
  }, [openSignup, router]);

  return null;
}
