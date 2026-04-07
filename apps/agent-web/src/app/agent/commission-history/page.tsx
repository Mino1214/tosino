import { redirect } from "next/navigation";

/** 예전 메뉴 URL 호환 — 총판 화면에서는 요율 이력을 제공하지 않습니다 */
export default function CommissionHistoryRedirectPage() {
  redirect("/agent/members");
}
