"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { SemiVirtualForm } from "@/components/SemiVirtualForm";

export default function SemiVirtualSettingsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "SUPER_ADMIN") {
      router.replace("/console/sales");
    }
  }, [router]);

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">반가상 설정</h1>
        <p className="mt-1 text-sm text-zinc-500">
          솔루션 페이지 입출금란에 표시될 계좌·지갑 정보와 SMS 자동 확인 앱
          설정을 관리합니다.
        </p>
      </div>

      <SemiVirtualForm platformId={selectedPlatformId} />

      <Link
        href="/console/semi/sms-log"
        className="inline-block text-sm text-violet-400 hover:text-violet-300"
      >
        SMS 처리 로그 →
      </Link>
    </div>
  );
}
