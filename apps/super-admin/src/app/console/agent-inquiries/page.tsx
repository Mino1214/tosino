"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

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
  agent: {
    id: string;
    email: string;
    displayName: string | null;
    referralCode: string | null;
  };
  repliedBy: { id: string; email: string } | null;
};

type Summary = {
  total: number;
  groups: Array<{
    agentUserId: string;
    label: string;
    email: string;
    referralCode: string | null;
    count: number;
  }>;
};

type FilterKey = "all" | string;

function statusLabel(s: InquiryStatus) {
  switch (s) {
    case "OPEN":
      return "미답변";
    case "ANSWERED":
      return "답변완료";
    case "CLOSED":
      return "종료";
    default:
      return s;
  }
}

export default function ConsoleAgentInquiriesPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [statusScope, setStatusScope] = useState<"open_only" | "all">(
    "open_only",
  );
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedPlatformId) return;
    setErr(null);
    try {
      const [list, sum] = await Promise.all([
        apiFetch<Row[]>(
          `/platforms/${selectedPlatformId}/agent-inquiries?status=all`,
        ),
        apiFetch<Summary>(
          `/platforms/${selectedPlatformId}/agent-inquiries/pending/summary`,
        ),
      ]);
      setRows(list);
      setSummary(sum);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setRows(null);
      setSummary(null);
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) {
      setRows(null);
      setSummary(null);
      return;
    }
    void load();
  }, [load, selectedPlatformId, platformLoading]);

  const openRows = useMemo(
    () => (rows ?? []).filter((r) => r.status === "OPEN"),
    [rows],
  );

  const filterTabs = useMemo(() => {
    if (!openRows.length) {
      return [{ key: "all" as FilterKey, label: "전체", count: 0 }];
    }
    const tabs: { key: FilterKey; label: string; count: number }[] = [
      { key: "all", label: "전체", count: openRows.length },
    ];
    if (summary?.groups?.length) {
      for (const g of summary.groups) {
        tabs.push({
          key: g.agentUserId,
          label: g.referralCode
            ? `${g.referralCode} · ${g.label}`
            : g.label,
          count: g.count,
        });
      }
    }
    return tabs;
  }, [openRows.length, summary?.groups]);

  const filteredOpen = useMemo(() => {
    if (filterKey === "all") return openRows;
    return openRows.filter((r) => r.agent.id === filterKey);
  }, [openRows, filterKey]);

  const historyRows = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.status !== "OPEN")
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
        ),
    [rows],
  );

  async function sendReply(id: string) {
    if (!selectedPlatformId) return;
    const text = (replyDraft[id] ?? "").trim();
    if (!text) {
      setErr("답변 내용을 입력하세요.");
      return;
    }
    setBusy(id);
    setErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/agent-inquiries/${id}/reply`,
        {
          method: "PATCH",
          body: JSON.stringify({ reply: text }),
        },
      );
      setReplyDraft((d) => ({ ...d, [id]: "" }));
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "답변 실패");
    } finally {
      setBusy(null);
    }
  }

  async function closeInquiry(id: string) {
    if (!selectedPlatformId) return;
    setBusy(`close:${id}`);
    setErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/agent-inquiries/${id}/close`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "종료 실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">총판 문의</h1>
        <p className="mt-1 text-sm text-zinc-500">
          총판 계정이 보낸 1:1 문의를 플랫폼 단위로 모아 확인·답변합니다. 미답변
          건은 사이드 메뉴에 가입 승인과 동일한 배지로 표시됩니다.
        </p>
      </div>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}

      {!selectedPlatformId || platformLoading ? (
        <p className="text-zinc-500">플랫폼을 선택하세요.</p>
      ) : !rows ? (
        <p className="text-zinc-500">불러오는 중…</p>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-sm font-medium text-amber-200/90">
                미답변 문의
              </h2>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusScope("open_only")}
                  className={`rounded-lg px-3 py-1.5 ${
                    statusScope === "open_only"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-800/60"
                  }`}
                >
                  미답변만 표시
                </button>
                <button
                  type="button"
                  onClick={() => setStatusScope("all")}
                  className={`rounded-lg px-3 py-1.5 ${
                    statusScope === "all"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-800/60"
                  }`}
                >
                  전체 상태 보기
                </button>
              </div>
            </div>

            {statusScope === "open_only" && (
              <>
                <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
                  {filterTabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setFilterKey(t.key)}
                      className={`rounded-t px-3 py-1.5 text-sm ${
                        filterKey === t.key
                          ? "bg-zinc-800 text-violet-200"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {t.label}{" "}
                      <span className="font-mono text-zinc-500">
                        ({t.count})
                      </span>
                    </button>
                  ))}
                </div>

                {filteredOpen.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    미답변 문의가 없습니다.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {filteredOpen.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">
                              {r.subject}
                            </p>
                            <p className="mt-1 font-mono text-xs text-zinc-500">
                              {r.agent.email}
                              {r.agent.displayName
                                ? ` · ${r.agent.displayName}`
                                : ""}
                              {r.agent.referralCode
                                ? ` · ${r.agent.referralCode}`
                                : ""}
                            </p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {new Date(r.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="rounded bg-amber-900/30 px-2 py-0.5 text-xs text-amber-200">
                            {statusLabel(r.status)}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                          {r.body}
                        </p>
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyDraft[r.id] ?? ""}
                            onChange={(e) =>
                              setReplyDraft((d) => ({
                                ...d,
                                [r.id]: e.target.value,
                              }))
                            }
                            placeholder="답변 내용을 입력하세요"
                            rows={4}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy === r.id}
                              onClick={() => void sendReply(r.id)}
                              className="rounded-lg bg-amber-700/80 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                              {busy === r.id ? "전송 중…" : "답변 전송"}
                            </button>
                            <button
                              type="button"
                              disabled={busy === `close:${r.id}`}
                              onClick={() => void closeInquiry(r.id)}
                              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                            >
                              종료만 처리
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {statusScope === "all" && (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
                    <tr>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">제목</th>
                      <th className="px-3 py-2">총판</th>
                      <th className="px-3 py-2">등록</th>
                      <th className="px-3 py-2">보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime(),
                      )
                      .map((r) => (
                      <Fragment key={r.id}>
                        <tr
                          className="border-b border-zinc-800/70 hover:bg-zinc-900/30"
                        >
                          <td className="px-3 py-2 text-xs">
                            {statusLabel(r.status)}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2">
                            {r.subject}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                            {r.agent.email}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId((id) =>
                                  id === r.id ? null : r.id,
                                )
                              }
                              className="text-xs text-violet-400 hover:underline"
                            >
                              {expandedId === r.id ? "접기" : "펼치기"}
                            </button>
                          </td>
                        </tr>
                        {expandedId === r.id && (
                          <tr>
                            <td colSpan={5} className="bg-zinc-950/50 px-3 py-3">
                              <p className="text-xs text-zinc-500">본문</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
                                {r.body}
                              </p>
                              {r.adminReply && (
                                <>
                                  <p className="mt-3 text-xs text-teal-600/90">
                                    답변
                                    {r.repliedAt &&
                                      ` · ${new Date(r.repliedAt).toLocaleString()}`}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-teal-200/90">
                                    {r.adminReply}
                                  </p>
                                </>
                              )}
                              {r.status === "OPEN" && (
                                <div className="mt-3 space-y-2">
                                  <textarea
                                    value={replyDraft[r.id] ?? ""}
                                    onChange={(e) =>
                                      setReplyDraft((d) => ({
                                        ...d,
                                        [r.id]: e.target.value,
                                      }))
                                    }
                                    rows={3}
                                    className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={busy === r.id}
                                      onClick={() => void sendReply(r.id)}
                                      className="rounded bg-amber-700/80 px-3 py-1 text-xs text-white disabled:opacity-50"
                                    >
                                      답변
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy === `close:${r.id}`}
                                      onClick={() => void closeInquiry(r.id)}
                                      className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-400 disabled:opacity-50"
                                    >
                                      종료
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {statusScope === "open_only" && historyRows.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">
                최근 답변·종료 ({historyRows.length}건)
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">제목</th>
                      <th className="px-3 py-2">총판</th>
                      <th className="px-3 py-2">갱신</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.slice(0, 30).map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-zinc-800/60 text-zinc-400"
                      >
                        <td className="px-3 py-2 text-xs">
                          {statusLabel(r.status)}
                        </td>
                        <td className="px-3 py-2 text-zinc-300">{r.subject}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {r.agent.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          {new Date(r.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
