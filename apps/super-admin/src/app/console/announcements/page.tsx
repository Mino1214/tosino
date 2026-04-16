"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  apiUploadAnnouncementAsset,
  getAccessToken,
  getApiBase,
} from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

const MAX = 4;
const SPEC_W = 366.93;
const SPEC_H = 450.51;

type Row = {
  imageUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  active: boolean;
  mandatoryRead: boolean;
};

type ApiRow = {
  id: string;
  imageUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  sortOrder: number;
  active: boolean;
  mandatoryRead?: boolean;
  resolvedUrl: string;
};

type LibraryItem = {
  id: string;
  width: number;
  height: number;
  url: string;
  publicPath: string;
  originalName: string | null;
  createdAt: string;
};

function emptyRows(): Row[] {
  return Array.from({ length: MAX }, () => ({
    imageUrl: "",
    imageWidth: null,
    imageHeight: null,
    active: true,
    mandatoryRead: false,
  }));
}

function specDeltaOk(w: number | null, h: number | null): boolean {
  if (w == null || h == null) return true;
  const dw = Math.abs(w - SPEC_W);
  const dh = Math.abs(h - SPEC_H);
  return dw <= 24 && dh <= 30;
}

export default function ConsoleAnnouncementsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAnnouncements = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    setErr(null);
    return apiFetch<ApiRow[]>(
      `/platforms/${selectedPlatformId}/announcements`,
    )
      .then((list) => {
        const next = emptyRows();
        list.slice(0, MAX).forEach((r, i) => {
          next[i] = {
            imageUrl: r.imageUrl,
            imageWidth: r.imageWidth,
            imageHeight: r.imageHeight,
            active: r.active,
            mandatoryRead: r.mandatoryRead === true,
          };
        });
        setRows(next);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "불러오기 실패"));
  }, [selectedPlatformId]);

  const loadLibrary = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return apiFetch<LibraryItem[]>(
      `/platforms/${selectedPlatformId}/announcements/assets`,
    )
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) return;
    loadAnnouncements();
    loadLibrary();
  }, [
    loadAnnouncements,
    loadLibrary,
    router,
    selectedPlatformId,
    platformLoading,
  ]);

  function applyAssetToSelectedSlot(asset: LibraryItem) {
    setRows((prev) => {
      const next = [...prev];
      const i = selectedSlot;
      next[i] = {
        ...next[i],
        imageUrl: asset.publicPath,
        imageWidth: asset.width,
        imageHeight: asset.height,
        mandatoryRead: next[i].mandatoryRead,
      };
      return next;
    });
    setMsg(`슬롯 ${selectedSlot + 1}에 선택한 이미지를 넣었습니다. 저장을 눌러 반영하세요.`);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedPlatformId) return;
    setMsg(null);
    setErr(null);
    setUploading(true);
    try {
      const res = await apiUploadAnnouncementAsset(selectedPlatformId, file);
      await loadLibrary();
      applyAssetToSelectedSlot({
        id: res.id,
        width: res.width,
        height: res.height,
        url: res.url,
        publicPath: res.publicPath,
        originalName: res.originalName,
        createdAt: res.createdAt,
      });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(id: string) {
    if (!selectedPlatformId) return;
    if (!confirm("이 업로드 파일을 삭제할까요? 슬롯에 같은 경로가 있으면 깨질 수 있습니다."))
      return;
    setErr(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/announcements/assets/${id}`, {
        method: "DELETE",
      });
      await loadLibrary();
      setMsg("파일을 삭제했습니다.");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "삭제 실패");
    }
  }

  async function save() {
    if (!selectedPlatformId) return;
    setMsg(null);
    setErr(null);
    const items = rows
      .map((r) => ({
        imageUrl: r.imageUrl.trim(),
        active: r.active,
        mandatoryRead: r.mandatoryRead,
        imageWidth: r.imageWidth ?? undefined,
        imageHeight: r.imageHeight ?? undefined,
      }))
      .filter((r) => r.imageUrl.length > 0);
    setSaving(true);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/announcements`, {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
      setMsg("저장했습니다.");
      await loadAnnouncements();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">공지 팝업</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          모바일 권장 규격{" "}
          <strong className="text-zinc-300">
            약 {SPEC_W}×{SPEC_H}px
          </strong>
          . 업로드 시 서버에 저장되며, 아래 라이브러리에서 슬롯으로 고를 수
          있습니다. 외부 URL도 슬롯에 직접 입력 가능합니다.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          솔루션에서는 부트스트랩으로 공지가 내려가며, 기본으로 팝업이 켜져
          있습니다. 끄려면 API 환경변수{" "}
          <code className="text-zinc-400">ANNOUNCEMENT_MODAL_PUBLISH=false</code>
          . 상대 경로 이미지는{" "}
          <code className="text-zinc-400">PUBLIC_API_URL</code>이 붙습니다.
          <strong className="text-zinc-400"> 필수 읽기</strong>를 켜면 로그인
          회원은 확인 전 솔루션 이동이 제한됩니다.
        </p>
      </div>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </p>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">업로드 · 라이브러리</h2>
        <p className="mt-1 text-xs text-zinc-500">
          먼저 적용할 <strong className="text-zinc-400">슬롯</strong>을 고른 뒤
          파일을 올리면 해당 슬롯에 바로 채워집니다. JPEG / PNG / WebP / GIF,
          최대 8MB.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onPickFile}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="mt-3 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
        >
          {uploading ? "업로드 중…" : "이미지 파일 업로드"}
        </button>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {library.length === 0 ? (
            <p className="text-sm text-zinc-600">아직 업로드된 파일이 없습니다.</p>
          ) : (
            library.map((a) => (
              <div
                key={a.id}
                className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
              >
                <div className="aspect-[367/451] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="space-y-1 p-2 text-xs text-zinc-400">
                  <p className="font-mono text-[11px] text-amber-200/90">
                    {a.width}×{a.height}px
                  </p>
                  <p className="truncate text-zinc-500" title={a.originalName ?? ""}>
                    {a.originalName || "—"}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => applyAssetToSelectedSlot(a)}
                      className="rounded bg-amber-600/90 px-2 py-1 text-[11px] font-medium text-zinc-950 hover:bg-amber-500"
                    >
                      슬롯 {selectedSlot + 1}에 적용
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAsset(a.id)}
                      className="rounded border border-zinc-600 px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          공지 슬롯 (최대 {MAX}개)
        </h2>
        <div className="space-y-4">
          {rows.map((row, i) => {
            const preview =
              row.imageUrl.trim().startsWith("http") ||
              row.imageUrl.trim().startsWith("/")
                ? row.imageUrl.trim().startsWith("http")
                  ? row.imageUrl.trim()
                  : `${getApiBase()}${row.imageUrl.trim()}`
                : "";
            const specOk = specDeltaOk(row.imageWidth, row.imageHeight);
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 transition ${
                  selectedSlot === i
                    ? "border-amber-500/70 bg-amber-950/20 ring-1 ring-amber-500/40"
                    : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(i)}
                    className="text-left text-sm font-medium text-zinc-300 hover:text-amber-200/90"
                  >
                    슬롯 {i + 1}
                    {selectedSlot === i && (
                      <span className="ml-2 text-xs font-normal text-amber-400">
                        선택됨
                      </span>
                    )}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], active: e.target.checked };
                        setRows(next);
                      }}
                      className="rounded border-zinc-600"
                    />
                    활성
                  </label>
                  <label className="flex items-center gap-2 text-xs text-amber-200/80">
                    <input
                      type="checkbox"
                      checked={row.mandatoryRead}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = {
                          ...next[i],
                          mandatoryRead: e.target.checked,
                        };
                        setRows(next);
                      }}
                      className="rounded border-zinc-600"
                    />
                    필수 읽기
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="/uploads/… 또는 https://…"
                  value={row.imageUrl}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = {
                      ...next[i],
                      imageUrl: e.target.value,
                      imageWidth: null,
                      imageHeight: null,
                    };
                    setRows(next);
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {row.imageWidth != null && row.imageHeight != null ? (
                    <span
                      className={
                        specOk ? "text-emerald-400/90" : "text-amber-300/90"
                      }
                    >
                      {row.imageWidth}×{row.imageHeight}px
                      {!specOk && " · 권장 규격과 차이 있음"}
                    </span>
                  ) : (
                    <span className="text-zinc-600">픽셀: URL만 있음 (미확인)</span>
                  )}
                </div>
                {preview ? (
                  <div
                    className="relative mt-3 overflow-hidden rounded-lg border border-zinc-800 bg-black"
                    style={{
                      maxWidth: 367,
                      aspectRatio: `${SPEC_W} / ${SPEC_H}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt=""
                      className="h-full w-full object-contain object-center"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => save()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            loadAnnouncements();
            loadLibrary();
          }}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
        >
          다시 불러오기
        </button>
      </div>
    </div>
  );
}
