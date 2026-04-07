"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

type InquiryStatus = "OPEN" | "ANSWERED" | "CLOSED";

type Row = {
  id: string;
  subject: string;
  body: string;
  status: InquiryStatus;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function statusKo(s: InquiryStatus) {
  switch (s) {
    case "OPEN":
      return "접수";
    case "ANSWERED":
      return "답변 완료";
    case "CLOSED":
      return "종료";
    default:
      return s;
  }
}

export default function AgentInquiriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await apiFetch<Row[]>("/me/agent/inquiries");
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setRows(null);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "MASTER_AGENT") {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = subject.trim();
    const b = body.trim();
    if (s.length < 2) {
      setErr("제목을 2자 이상 입력하세요.");
      return;
    }
    if (!b) {
      setErr("내용을 입력하세요.");
      return;
    }
    setSending(true);
    setErr(null);
    try {
      await apiFetch("/me/agent/inquiries", {
        method: "POST",
        body: JSON.stringify({ subject: s, body: b }),
      });
      setSubject("");
      setBody("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "전송 실패");
    } finally {
      setSending(false);
    }
  }

  if (!getAccessToken()) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">문의</h1>
        <p className="mt-1 text-sm text-zinc-500">
          플랫폼 운영(마스터)에게 보내는 1:1 문의입니다. 접수 후 관리자 콘솔
          「총판 문의」에서 확인·답변합니다.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
      >
        <h2 className="text-sm font-medium text-zinc-300">새 문의 작성</h2>
        <label className="block text-sm text-zinc-400">
          제목
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          내용
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-amber-700/80 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {sending ? "전송 중…" : "보내기"}
        </button>
      </form>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}

      <div>
        <h2 className="text-sm font-medium text-zinc-400">내 문의 내역</h2>
        {!rows ? (
          <p className="mt-2 text-sm text-zinc-500">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">아직 문의가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-200">
                    {r.subject}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      r.status === "OPEN"
                        ? "bg-amber-900/35 text-amber-200"
                        : r.status === "ANSWERED"
                          ? "bg-teal-900/30 text-teal-200"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {statusKo(r.status)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-500">
                  {r.body}
                </p>
                <p className="mt-1 text-[11px] text-zinc-600">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
                {r.adminReply && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <p className="text-[11px] font-medium text-teal-600/90">
                      답변
                      {r.repliedAt &&
                        ` · ${new Date(r.repliedAt).toLocaleString()}`}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-teal-100/90">
                      {r.adminReply}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
