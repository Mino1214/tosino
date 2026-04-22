"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type MappingStatus = "pending" | "confirmed" | "ignored";

type LeagueMapping = {
  id: string;
  sourceSite: string;
  sourceSportSlug: string;
  sourceLeagueSlug: string;
  sourceLeagueLabel: string | null;
  sourceCountryLabel: string | null;
  internalSportSlug: string | null;
  providerName: string | null;
  providerSportSlug: string | null;
  providerLeagueSlug: string | null;
  providerLeagueLabel: string | null;
  status: MappingStatus;
  note: string | null;
  matchCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
};

type ListResponse = {
  items: LeagueMapping[];
  total: number;
  take: number;
  skip: number;
};

type StatsResponse = {
  total: number;
  pending: number;
  confirmed: number;
  ignored: number;
};

type Candidate = {
  slug: string;
  originalName: string;
  koreanName: string | null;
  country: string | null;
};

type SuggestResponse = {
  candidates: Candidate[];
  mapping: LeagueMapping;
};

const STATUS_LABELS: Record<MappingStatus | "all", string> = {
  all: "전체",
  pending: "대기",
  confirmed: "확정",
  ignored: "무시",
};

const STATUS_COLOR: Record<MappingStatus, string> = {
  pending: "#f0b400",
  confirmed: "#17a673",
  ignored: "#9aa0a6",
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("ko-KR");
  } catch {
    return String(v);
  }
}

export default function CrawlerLeaguesPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [items, setItems] = useState<LeagueMapping[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MappingStatus | "all">(
    "pending",
  );
  const [sportFilter, setSportFilter] = useState("");
  const [query, setQuery] = useState("");
  const [take] = useState(200);

  // 확정 모달 상태
  const [editing, setEditing] = useState<LeagueMapping | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candLoading, setCandLoading] = useState(false);
  const [draft, setDraft] = useState({
    providerLeagueSlug: "",
    providerLeagueLabel: "",
    providerName: "odds-api.io",
    providerSportSlug: "",
    note: "",
  });
  const [saveBusy, setSaveBusy] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const r = await apiFetch<StatsResponse>("/hq/crawler/leagues/stats");
      setStats(r);
    } catch (e) {
      console.warn("stats load fail", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      if (statusFilter !== "all") qp.set("status", statusFilter);
      if (sportFilter.trim()) qp.set("sportSlug", sportFilter.trim());
      if (query.trim()) qp.set("q", query.trim());
      qp.set("take", String(take));
      const r = await apiFetch<ListResponse>(
        `/hq/crawler/leagues?${qp.toString()}`,
      );
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sportFilter, query, take]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openConfirm = useCallback(async (row: LeagueMapping) => {
    setEditing(row);
    setDraft({
      providerLeagueSlug: row.providerLeagueSlug ?? "",
      providerLeagueLabel: row.providerLeagueLabel ?? "",
      providerName: row.providerName ?? "odds-api.io",
      providerSportSlug:
        row.providerSportSlug ?? row.internalSportSlug ?? "",
      note: row.note ?? "",
    });
    setCandidates([]);
    setCandLoading(true);
    try {
      const r = await apiFetch<SuggestResponse>(
        `/hq/crawler/leagues/${row.id}/suggest?limit=30`,
      );
      setCandidates(r.candidates);
    } catch (e) {
      console.warn("suggest fail", e);
    } finally {
      setCandLoading(false);
    }
  }, []);

  const closeConfirm = useCallback(() => {
    setEditing(null);
    setCandidates([]);
  }, []);

  const submitConfirm = useCallback(async () => {
    if (!editing) return;
    if (!draft.providerLeagueSlug.trim()) {
      setError("providerLeagueSlug 을 입력하거나 후보에서 선택하세요.");
      return;
    }
    setSaveBusy(true);
    try {
      await apiFetch(`/hq/crawler/leagues/${editing.id}/confirm`, {
        method: "PATCH",
        body: JSON.stringify({
          providerLeagueSlug: draft.providerLeagueSlug.trim(),
          providerLeagueLabel: draft.providerLeagueLabel.trim() || null,
          providerName: draft.providerName.trim() || null,
          providerSportSlug: draft.providerSportSlug.trim() || null,
          note: draft.note.trim() || null,
        }),
      });
      closeConfirm();
      await Promise.all([refresh(), refreshStats()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "확정 실패");
    } finally {
      setSaveBusy(false);
    }
  }, [editing, draft, refresh, refreshStats, closeConfirm]);

  const actionIgnore = useCallback(
    async (row: LeagueMapping) => {
      if (!confirm(`"${row.sourceLeagueLabel || row.sourceLeagueSlug}" 무시 처리?`))
        return;
      await apiFetch(`/hq/crawler/leagues/${row.id}/ignore`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await Promise.all([refresh(), refreshStats()]);
    },
    [refresh, refreshStats],
  );

  const actionReopen = useCallback(
    async (row: LeagueMapping) => {
      await apiFetch(`/hq/crawler/leagues/${row.id}/reopen`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await Promise.all([refresh(), refreshStats()]);
    },
    [refresh, refreshStats],
  );

  const counts = useMemo(
    () => ({
      pending: stats?.pending ?? 0,
      confirmed: stats?.confirmed ?? 0,
      ignored: stats?.ignored ?? 0,
      total: stats?.total ?? 0,
    }),
    [stats],
  );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>크롤러 리그 매핑</h1>
      <p style={{ color: "#666", marginBottom: 16, fontSize: 13 }}>
        스코어 크롤러(livesport 등)가 발견한 리그를 odds-api.io 의 리그 슬러그에
        수동으로 매핑합니다. 확정된 매핑은 매칭 엔진이 &quot;같은 리그&quot; 판정에
        활용합니다.
      </p>

      {/* 상태 카운터 */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {(["pending", "confirmed", "ignored"] as MappingStatus[]).map((s) => (
          <div
            key={s}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#f5f6f8",
              minWidth: 120,
              borderLeft: `4px solid ${STATUS_COLOR[s]}`,
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>
              {STATUS_LABELS[s]}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {counts[s].toLocaleString()}
            </div>
          </div>
        ))}
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#eef2ff",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>합계</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {counts.total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <label style={{ fontSize: 13 }}>상태</label>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as MappingStatus | "all")
          }
          style={{ padding: "4px 8px" }}
        >
          {(["pending", "confirmed", "ignored", "all"] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 13, marginLeft: 8 }}>sport</label>
        <input
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          placeholder="soccer / basketball …"
          style={{ padding: "4px 8px", minWidth: 140 }}
        />

        <label style={{ fontSize: 13, marginLeft: 8 }}>검색</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="slug / 이름"
          style={{ padding: "4px 8px", minWidth: 200 }}
        />

        <button
          type="button"
          onClick={() => {
            void refresh();
            void refreshStats();
          }}
          style={{ padding: "4px 12px" }}
        >
          새로고침
        </button>
        {loading && <span style={{ fontSize: 12, color: "#666" }}>loading…</span>}
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            background: "#fee",
            border: "1px solid #fbb",
            marginBottom: 12,
            borderRadius: 6,
            color: "#a00",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* 목록 */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={th}>상태</th>
              <th style={th}>sport</th>
              <th style={th}>source slug</th>
              <th style={th}>이름 / 국가</th>
              <th style={th}>matches</th>
              <th style={th}>provider</th>
              <th style={th}>최근 본 시각</th>
              <th style={th}>작업</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={8} style={{ ...td, textAlign: "center", color: "#999" }}>
                  데이터 없음
                </td>
              </tr>
            )}
            {items.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={td}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: STATUS_COLOR[r.status],
                      color: "#fff",
                      fontSize: 11,
                    }}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td style={td}>
                  <div>{r.sourceSportSlug}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {r.internalSportSlug || "-"}
                  </div>
                </td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>
                  {r.sourceLeagueSlug}
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>
                    {r.sourceLeagueLabel || "(라벨 없음)"}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {r.sourceCountryLabel || "-"}
                  </div>
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  {r.matchCount.toLocaleString()}
                </td>
                <td style={td}>
                  {r.providerLeagueSlug ? (
                    <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {r.providerLeagueSlug}
                    </div>
                  ) : (
                    <span style={{ color: "#bbb" }}>—</span>
                  )}
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {r.providerName || "-"}
                  </div>
                </td>
                <td style={{ ...td, fontSize: 12, color: "#555" }}>
                  {fmtDate(r.lastSeenAt)}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {r.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void openConfirm(r)}
                        style={btnPrimary}
                      >
                        확정
                      </button>
                      <button
                        type="button"
                        onClick={() => void actionIgnore(r)}
                        style={btnGhost}
                      >
                        무시
                      </button>
                    </>
                  )}
                  {r.status === "confirmed" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void openConfirm(r)}
                        style={btnGhost}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => void actionReopen(r)}
                        style={btnGhost}
                      >
                        대기로
                      </button>
                    </>
                  )}
                  {r.status === "ignored" && (
                    <button
                      type="button"
                      onClick={() => void actionReopen(r)}
                      style={btnGhost}
                    >
                      되돌리기
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        {items.length.toLocaleString()} / {total.toLocaleString()} 건
      </div>

      {/* 확정 모달 */}
      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={closeConfirm}
        >
          <div
            style={{
              width: "min(860px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 10,
              padding: 20,
              boxShadow: "0 10px 40px rgba(0,0,0,.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 4 }}>리그 매핑 확정</h3>
            <div
              style={{
                fontSize: 12,
                color: "#666",
                marginBottom: 12,
              }}
            >
              {editing.sourceSite} / {editing.sourceSportSlug} /{" "}
              <code>{editing.sourceLeagueSlug}</code>{" "}
              {editing.sourceLeagueLabel && `(${editing.sourceLeagueLabel})`}{" "}
              {editing.sourceCountryLabel && `· ${editing.sourceCountryLabel}`}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <Field label="providerName">
                <input
                  value={draft.providerName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, providerName: e.target.value }))
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="providerSportSlug">
                <input
                  value={draft.providerSportSlug}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      providerSportSlug: e.target.value,
                    }))
                  }
                  placeholder="football / basketball …"
                  style={inputStyle}
                />
              </Field>
              <Field label="providerLeagueSlug (필수)">
                <input
                  value={draft.providerLeagueSlug}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      providerLeagueSlug: e.target.value,
                    }))
                  }
                  placeholder="south-korea-k-league-1"
                  style={{ ...inputStyle, fontFamily: "monospace" }}
                />
              </Field>
              <Field label="providerLeagueLabel (표시명)">
                <input
                  value={draft.providerLeagueLabel}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      providerLeagueLabel: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="note (운영 메모)">
              <textarea
                value={draft.note}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, note: e.target.value }))
                }
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>

            {/* odds-api.io 후보 */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, marginBottom: 6, color: "#444" }}>
                odds-api.io 리그 후보 (sport ={" "}
                {editing.internalSportSlug || editing.providerSportSlug || "?"})
              </div>
              {candLoading && (
                <div style={{ fontSize: 12, color: "#888" }}>loading…</div>
              )}
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid #eee",
                  borderRadius: 6,
                }}
              >
                {candidates.length === 0 && !candLoading && (
                  <div
                    style={{
                      padding: 10,
                      fontSize: 12,
                      color: "#999",
                      textAlign: "center",
                    }}
                  >
                    후보 없음 — providerLeagueSlug 을 직접 입력해주세요.
                  </div>
                )}
                {candidates.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        providerLeagueSlug: c.slug,
                        providerLeagueLabel:
                          c.koreanName || c.originalName || d.providerLeagueLabel,
                      }))
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 10px",
                      borderBottom: "1px solid #f0f0f0",
                      background:
                        draft.providerLeagueSlug === c.slug
                          ? "#eef6ff"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontFamily: "monospace", color: "#366" }}>
                      {c.slug}
                    </div>
                    <div>
                      {c.originalName}
                      {c.koreanName && (
                        <span style={{ color: "#888", marginLeft: 6 }}>
                          ({c.koreanName})
                        </span>
                      )}
                      {c.country && (
                        <span style={{ color: "#aaa", marginLeft: 6 }}>
                          · {c.country}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={closeConfirm}
                style={btnGhost}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void submitConfirm()}
                disabled={saveBusy}
                style={btnPrimary}
              >
                {saveBusy ? "저장 중…" : "확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", fontSize: 12, color: "#444" }}>
      <span style={{ display: "block", marginBottom: 3 }}>{label}</span>
      {children}
    </label>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  fontSize: 12,
  color: "#444",
  borderBottom: "1px solid #e5e7eb",
};
const td: React.CSSProperties = {
  padding: "8px 10px",
  verticalAlign: "top",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  border: "1px solid #ddd",
  borderRadius: 6,
  fontSize: 13,
};
const btnPrimary: React.CSSProperties = {
  padding: "5px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  marginRight: 6,
};
const btnGhost: React.CSSProperties = {
  padding: "5px 12px",
  background: "#f3f4f6",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  marginRight: 6,
};
