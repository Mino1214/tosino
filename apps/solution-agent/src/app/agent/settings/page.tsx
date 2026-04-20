"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

export default function AgentSettingsPage() {
  const router = useRouter();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) { router.replace("/login"); return; }
    if (getStoredUser()?.role !== "MASTER_AGENT") { router.replace("/login"); return; }
  }, [router]);

  if (!getAccessToken()) return null;

  const user = getStoredUser();

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwOk(false);
    if (newPw.length < 6) { setPwErr("새 비밀번호는 6자 이상이어야 합니다."); return; }
    if (newPw !== confirmPw) { setPwErr("새 비밀번호가 일치하지 않습니다."); return; }
    setSaving(true);
    try {
      await apiFetch("/me/agent/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setPwOk(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e2) {
      setPwErr(e2 instanceof Error ? e2.message : "변경 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">Settings</p>
        <h1 className="mt-0.5 text-[22px] font-bold text-black">기본설정</h1>
        <p className="mt-1 text-[14px] text-gray-500">계정 및 공통 설정</p>
      </div>

      {/* 계정 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-[15px] font-bold text-black">계정 정보</h2>
        <div className="space-y-2 text-[14px]">
          <div className="flex items-center gap-3">
            <span className="w-24 text-gray-500">아이디</span>
            <span className="font-mono font-semibold text-gray-900">{user?.loginId ?? user?.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-gray-500">권한</span>
            <span className="rounded bg-[#3182f6]/10 px-2 py-0.5 text-[12px] font-bold text-[#3182f6]">총판 (MASTER_AGENT)</span>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-[15px] font-bold text-black">비밀번호 변경</h2>
        <form onSubmit={handleChangePw} className="space-y-4 max-w-sm">
          <label className="block text-[13px] font-medium text-gray-700">
            현재 비밀번호
            <input
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[14px] text-gray-900"
            />
          </label>
          <label className="block text-[13px] font-medium text-gray-700">
            새 비밀번호 (6자 이상)
            <input
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[14px] text-gray-900"
            />
          </label>
          <label className="block text-[13px] font-medium text-gray-700">
            새 비밀번호 확인
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[14px] text-gray-900"
            />
          </label>
          {pwErr && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{pwErr}</p>
          )}
          {pwOk && (
            <p className="rounded-lg border border-[#3182f6]/30 bg-[#3182f6]/5 px-3 py-2 text-[13px] font-semibold text-[#3182f6]">
              비밀번호가 변경되었습니다.
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#3182f6] px-5 py-2 text-[14px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {saving ? "변경 중…" : "변경"}
          </button>
        </form>
      </div>

      {/* 바로가기 링크 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-[15px] font-bold text-black">바로가기</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/agent/inquiries"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] font-semibold text-gray-800 hover:bg-[#3182f6]/5 hover:border-[#3182f6]/30 transition"
          >
            <span className="text-[20px]">💬</span>
            <div>
              <p>1:1 문의</p>
              <p className="text-[12px] font-normal text-gray-400">운영팀에 문의하기</p>
            </div>
          </Link>
          <Link
            href="/agent/commission-history"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] font-semibold text-gray-800 hover:bg-[#3182f6]/5 hover:border-[#3182f6]/30 transition"
          >
            <span className="text-[20px]">💳</span>
            <div>
              <p>결제요청</p>
              <p className="text-[12px] font-normal text-gray-400">정산금 USDT 환전</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
