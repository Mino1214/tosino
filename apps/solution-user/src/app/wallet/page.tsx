"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppModals } from "@/contexts/AppModalsContext";
import type { WalletModalOptions } from "@/contexts/AppModalsContext";

function parseWalletQuery(search: string): WalletModalOptions {
  const q = new URLSearchParams(search);
  const t = q.get("tab");
  if (t === "withdraw") return { fiatTab: "WITHDRAWAL", mainTab: "fiat" };
  if (t === "deposit") return { fiatTab: "DEPOSIT", mainTab: "fiat" };
  return { mainTab: "fiat" };
}

/** 직접 URL 접근 시 홈으로 돌리고 입출금 모달만 연다 */
export default function WalletPage() {
  const router = useRouter();
  const { openWallet } = useAppModals();

  useEffect(() => {
    if (typeof window === "undefined") return;
    openWallet(parseWalletQuery(window.location.search));
    router.replace("/");
  }, [openWallet, router]);

  return null;
}
