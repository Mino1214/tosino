"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type MappingStatus = "pending" | "confirmed" | "ignored";

type TeamMapping = {
  id: string;
  sourceSite: string;
  sourceSportSlug: string;
  sourceTeamName: string;
  sourceTeamSlug: string | null;
  sourceTeamHref: string | null;
  sourceTeamLogo: string | null;
  sourceLeagueSlug: string | null;
  sourceLeagueLabel: string | null;
  sourceCountryLabel: string | null;
  internalSportSlug: string | null;
  providerName: string | null;
  providerSportSlug: string | null;
  providerTeamExternalId: string | null;
  providerTeamName: string | null;
  status: MappingStatus;
  note: string | null;
  matchCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
};

type ListResponse = {
  items: TeamMapping[];
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
  externalId: string;
  originalName: string;
  koreanName: string | null;
  country: string | null;
  logoUrl: string | null;
};

type SuggestResponse = {
  candidates: Candidate[];
  mapping: TeamMapping;
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

export default function CrawlerTeamsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [items, setItems] = useState<TeamMapping[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MappingStatus | "all">(
    "pending",
  );
  const [sportFilter, setSportFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [query, setQuery] = useState("");
  const [take] = useState(200);

  const [editing, setEditing] = useState<TeamMapping | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candLoading, setCandLoading] = useState(false);
  const [candQuery, setCandQuery] = useState("");
  const [draft, setDraft] = useState({
    providerTeamExternalId: "",
    providerTeamName: "",
    providerName: "odds-api.io",
    providerSportSlug: "",
    note: "",
    learnKoreanName: true,
    learnLogo: true,
  });
  const [saveBusy, setSaveBusy] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const r = await apiFetch<StatsResponse>("/hq/crawler/teams/stats");
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
      if (leagueFilter.trim()) qp.set("leagueSlug", leagueFilter.trim());
      if (query.trim()) qp.set("q", query.trim());
      qp.set("take", String(take));
      const r = await apiFetch<ListResponse>(
        `/hq/crawler/teams?${qp.toString()}`,
      );
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sportFilter, leagueFilter, query, take]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadCandidates = useCallback(
    async (id: string, q?: string) => {
      setCandLoading(true);
      try {
        const qp = new URLSearchParams();
        qp.set("limit", "50");
        if (q?.trim()) qp.set("q", q.trim());
        const r = await apiFetch<SuggestResponse>(
          `/hq/crawler/teams/${id}/suggest?${qp.toString()}`,
        );
        setCandidates(r.candidates);
      } catch (e) {
        console.warn("suggest fail", e);
      } finally {
        setCandLoading(false);
      }
    },
    [],
  );

  const openConfirm = useCallback(
    async (row: TeamMapping) => {
      setEditing(row);
      setDraft({
        providerTeamExternalId: row.providerTeamExternalId ?? "",
        providerTeamName: row.providerTeamName ?? "",
        providerName: row.providerName ?? "odds-api.io",
        providerSportSlug:
          row.providerSportSlug ?? row.internalSportSlug ?? "",
        note: row.note ?? "",
        learnKoreanName: true,
        learnLogo: true,
      });
      setCandQuery("");
      setCandidates([]);
      await loadCandidates(row.id, "");
    },
    [loadCandidates],
  );

  const closeConfirm = useCallback(() => {
    setEditing(null);
    setCandidates([]);
    setCandQuery("");
  }, []);

  const submitConfirm = useCallback(async () => {
    if (!editing) return;
    if (!draft.providerTeamExternalId.trim()) {
      setError(
        "providerTeamExternalId 를 입력하거나 후보에서 선택하세요.",
      );
      return;
    }
    setSaveBusy(true);
    try {
      await apiFetch(`/hq/crawler/teams/${editing.id}/confirm`, {
        method: "PATCH",
        body: JSON.stringify({
          providerTeamExternalId: draft.providerTeamExternalId.trim(),
          providerTeamName: draft.providerTeamName.trim() || null,
          providerName: draft.providerName.trim() || null,
          providerSportSlug: draft.providerSportSlug.trim() || null,
          note: draft.note.trim() || null,
          learnKoreanName: draft.learnKoreanName,
          learnLogo: draft.learnLogo,
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
    async (row: TeamMapping) => {
      if (!confirm(`"${row.sourceTeamName}" 무시 처리?`)) return;
      await apiFetch(`/hq/crawler/teams/${row.id}/ignore`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await Promise.all([refresh(), refreshStats()]);
    },
    [refresh, refreshStats],
  );

  const actionReopen = useCallback(
    async (row: TeamMapping) => {
      await apiFetch(`/hq/crawler/teams/${row.id}/reopen`, {
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
    <div style={{ padding: 24, maxWidth: 1500, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>크롤러 팀 매핑</h1>
      <p style={{ color: "#666", marginBottom: 16, fontSize: 13 }}>
        livesport 등 크롤러가 발견한 팀을 odds-api.io team externalId 로
        매핑합니다. 한글 팀명이 있으면 확정 시{" "}
        <code>OddsApiTeamAlias.koreanName</code> 에 역학습됩니다.
      </p>

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
            <div style={{ fontSize: 12, color: "#666" }}>{STATUS_LABELS[s]}</div>
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
          style={{ padding: "4px 8px", minWidth: 120 }}
        />

        <label style={{ fontSize: 13, marginLeft: 8 }}>league slug</label>
        <input
          value={leagueFilter}
          onChange={(e) => setLeagueFilter(e.target.value)}
          placeholder="south-korea/k-league-1"
          style={{ padding: "4px 8px", minWidth: 180 }}
        />

        <label style={{ fontSize: 13, marginLeft: 8 }}>검색</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="팀 이름 / externalId"
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
              <th style={th}>팀</th>
              <th style={th}>리그 컨텍스트</th>
              <th style={th}>matches</th>
              <th style={th}>provider</th>
              <th style={th}>최근</th>
              <th style={th}>작업</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={8}
                  style={{ ...td, textAlign: "center", color: "#999" }}
                >
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
                <td style={td}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {r.sourceTeamLogo && (
                      <img
                        src={r.sourceTeamLogo}
                        alt=""
                        width={20}
                        height={20}
                        style={{ borderRadius: 3 }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 500 }}>{r.sourceTeamName}</div>
                      {r.sourceTeamSlug && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            fontFamily: "monospace",
                          }}
                        >
                          {r.sourceTeamSlug}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={td}>
                  <div style={{ fontSize: 12 }}>
                    {r.sourceLeagueLabel || r.sourceLeagueSlug || "-"}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {r.sourceCountryLabel || "-"}
                  </div>
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  {r.matchCount.toLocaleString()}
                </td>
                <td style={td}>
                  {r.providerTeamExternalId ? (
                    <div>
                      <div
                        style={{ fontFamily: "monospace", fontSize: 12 }}
                      >
                        #{r.providerTeamExternalId}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {r.providerTeamName || "-"}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "#bbb" }}>—</span>
                  )}
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
              width: "min(900px, 100%)",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 10,
              padding: 20,
              boxShadow: "0 10px 40px rgba(0,0,0,.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 4 }}>팀 매핑 확정</h3>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
              {editing.sourceSite} / {editing.sourceSportSlug} /{" "}
              <strong>{editing.sourceTeamName}</strong>
              {editing.sourceLeagueLabel &&
                ` · (${editing.sourceLeagueLabel})`}
              {editing.sourceCountryLabel &&
                ` · ${editing.sourceCountryLabel}`}
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
              <Field label="providerTeamExternalId (필수)">
                <input
                  value={draft.providerTeamExternalId}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      providerTeamExternalId: e.target.value,
                    }))
                  }
                  placeholder="12345"
                  style={{ ...inputStyle, fontFamily: "monospace" }}
                />
              </Field>
              <Field label="providerTeamName (참고용)">
                <input
                  value={draft.providerTeamName}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      providerTeamName: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="note">
              <textarea
                value={draft.note}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, note: e.target.value }))
                }
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                fontSize: 12,
                color: "#444",
              }}
            >
              <input
                type="checkbox"
                checked={draft.learnKoreanName}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    learnKoreanName: e.target.checked,
                  }))
                }
              />
              소스 팀명이 한글이면 OddsApiTeamAlias.koreanName 에 역학습
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                fontSize: 12,
                color: "#444",
              }}
            >
              <input
                type="checkbox"
                checked={draft.learnLogo}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    learnLogo: e.target.checked,
                  }))
                }
              />
              소스 팀 로고가 있으면 OddsApiTeamAlias.logoUrl 에 역학습
            </label>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 13, color: "#444" }}>
                  odds-api.io 팀 후보 (sport ={" "}
                  {editing.internalSportSlug ||
                    editing.providerSportSlug ||
                    "?"}
                  )
                </div>
                <input
                  value={candQuery}
                  onChange={(e) => setCandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void loadCandidates(editing.id, candQuery);
                    }
                  }}
                  placeholder="키워드로 재검색…"
                  style={{ ...inputStyle, maxWidth: 260 }}
                />
                <button
                  type="button"
                  onClick={() => void loadCandidates(editing.id, candQuery)}
                  style={btnGhost}
                >
                  검색
                </button>
              </div>
              {candLoading && (
                <div style={{ fontSize: 12, color: "#888" }}>loading…</div>
              )}
              <div
                style={{
                  maxHeight: 260,
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
                    후보 없음 — externalId 를 직접 입력해주세요.
                  </div>
                )}
                {candidates.map((c) => (
                  <button
                    key={c.externalId}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        providerTeamExternalId: c.externalId,
                        providerTeamName: c.originalName,
                      }))
                    }
                    style={{
                      display: "flex",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 10px",
                      gap: 8,
                      alignItems: "center",
                      borderBottom: "1px solid #f0f0f0",
                      background:
                        draft.providerTeamExternalId === c.externalId
                          ? "#eef6ff"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {c.logoUrl && (
                      <img
                        src={c.logoUrl}
                        alt=""
                        width={22}
                        height={22}
                        style={{ borderRadius: 3 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "monospace", color: "#366" }}>
                        #{c.externalId}
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
              <button type="button" onClick={closeConfirm} style={btnGhost}>
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
