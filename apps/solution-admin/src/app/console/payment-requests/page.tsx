"use client";

import { useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { useRouter } from "next/navigation";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "IN_REVIEW";
type RequestType = "RATE_CHANGE" | "USER_BLOCK" | "PAYOUT" | "SETTING_CHANGE" | "OTHER";

type PaymentRequest = {
  id: string;
  type: RequestType;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
};

const TYPE_LABELS: Record<RequestType, string> = {
  RATE_CHANGE: "요율 변경",
  USER_BLOCK: "유저 차단",
  PAYOUT: "지급 요청",
  SETTING_CHANGE: "설정 변경",
  OTHER: "기타",
};

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  PENDING: { label: "대기중", className: "bg-yellow-100 text-yellow-700" },
  IN_REVIEW: { label: "검토중", className: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "승인됨", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "반려됨", className: "bg-red-100 text-red-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentRequestsPage() {
  const router = useRouter();
  const { selectedPlatformId } = usePlatform();
  const [tab, setTab] = useState<"list" | "new">("list");
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 새 요청 폼 상태
  const [formType, setFormType] = useState<RequestType>("OTHER");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!selectedPlatformId || tab !== "list") return;
    setLoading(true);
    setError(null);
    apiFetch<PaymentRequest[]>(`/platforms/${selectedPlatformId}/payment-requests`)
      .then((data) => setRequests(data))
      .catch(() => {
        // API 미구현 시 빈 목록으로 처리
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [selectedPlatformId, tab]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatformId) return;
    if (!formTitle.trim() || !formDesc.trim()) {
      setSubmitError("제목과 내용을 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/payment-requests`, {
        method: "POST",
        body: JSON.stringify({ type: formType, title: formTitle, description: formDesc }),
      });
      setSubmitSuccess(true);
      setFormTitle("");
      setFormDesc("");
      setFormType("OTHER");
      setTimeout(() => {
        setSubmitSuccess(false);
        setTab("list");
      }, 1500);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "요청 제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">결제요청</h1>
          <p className="mt-1 text-sm text-gray-500">
            슈퍼어드민에 요율 변경, 설정 수정, 지급 등의 처리를 요청하고 내역을 확인합니다.
          </p>
        </div>
        {tab === "list" && (
          <button
            type="button"
            onClick={() => setTab("new")}
            className="shrink-0 rounded-xl bg-[#3182f6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            + 새 요청
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        {(["list", "new"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === t
                ? "bg-white text-[#3182f6] shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "list" ? "요청 내역" : "새 요청"}
          </button>
        ))}
      </div>

      {/* 요청 내역 */}
      {tab === "list" && (
        <div className="rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">불러오는 중…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          ) : requests.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[40px] mb-3">📋</p>
              <p className="text-sm font-semibold text-gray-600">요청 내역이 없습니다</p>
              <p className="mt-1 text-xs text-gray-400">
                슈퍼어드민에 처리를 요청하려면 새 요청을 작성해주세요.
              </p>
              <button
                type="button"
                onClick={() => setTab("new")}
                className="mt-4 rounded-xl bg-[#3182f6] px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition"
              >
                새 요청 작성
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <span>제목 / 내용</span>
                <span className="text-center">유형</span>
                <span className="text-center">상태</span>
                <span className="text-right">요청일시</span>
              </div>
              {requests.map((req) => {
                const status = STATUS_CONFIG[req.status];
                return (
                  <div
                    key={req.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{req.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{req.description}</p>
                      {req.adminNote && (
                        <p className="mt-1 text-xs text-[#3182f6]">
                          관리자 메모: {req.adminNote}
                        </p>
                      )}
                    </div>
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      {TYPE_LABELS[req.type]}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-right text-xs text-gray-400 tabular-nums">
                      {formatDate(req.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 새 요청 폼 */}
      {tab === "new" && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-800">새 요청 작성</h2>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">요청 유형</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TYPE_LABELS) as [RequestType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormType(key)}
                  className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition ${
                    formType === key
                      ? "bg-[#3182f6] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="요청 제목을 입력하세요"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#3182f6] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              상세 내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="처리 요청 내용을 구체적으로 작성해주세요"
              rows={5}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#3182f6] focus:bg-white focus:outline-none"
            />
          </div>

          {submitError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{submitError}</p>
          )}
          {submitSuccess && (
            <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-600 font-semibold">
              요청이 성공적으로 제출되었습니다.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTab("list")}
              className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#3182f6] px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
            >
              {submitting ? "제출 중…" : "요청 제출"}
            </button>
          </div>
        </form>
      )}

      {/* 안내 박스 */}
      <div className="rounded-2xl border border-[#3182f6]/20 bg-[#3182f6]/5 px-5 py-4">
        <p className="text-xs font-semibold text-[#3182f6] mb-1">결제요청 안내</p>
        <ul className="space-y-1 text-xs text-[#3182f6]/80 list-disc list-inside">
          <li>슈퍼어드민에서 검토 후 승인/반려 처리됩니다.</li>
          <li>요율 변경, 유저 차단, 특별 지급 등 직접 처리 불가한 사항을 요청하세요.</li>
          <li>요청 상태는 이 페이지에서 실시간으로 확인할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}
