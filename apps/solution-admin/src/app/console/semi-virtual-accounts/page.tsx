import { redirect } from "next/navigation";

/** 예전 메뉴 경로 호환 — 반가상 내역으로 통합됨 */
export default function SemiVirtualAccountsRedirectPage() {
  redirect("/console/semi/usdt-deposits");
}
