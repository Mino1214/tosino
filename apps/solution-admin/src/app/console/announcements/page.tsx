"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiFetch,
  apiUploadAnnouncementAsset,
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
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showOnlyPublished, setShowOnlyPublished] = useState(false);
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
    if (!selectedPlatformId || platformLoading) return;
    loadAnnouncements();
    loadLibrary();
  }, [
    loadAnnouncements,
    loadLibrary,
    selectedPlatformId,
    platformLoading,
  ]);

  function applyAssetToSelectedSlot(asset: LibraryItem) {
    setRows((prev) => {
      const filled = prev.filter((r) => r.imageUrl.trim().length > 0).length;
      const targetIsEmpty = !prev[selectedSlot].imageUrl.trim();
      if (filled >= MAX && targetIsEmpty) {
        setErr(
          `공지 팝업은 최대 ${MAX}개까지만 등록할 수 있습니다. 기존 슬롯을 수정하거나 비워 주세요.`,
        );
        return prev;
      }
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

  async function uploadFile(file: File) {
    if (!selectedPlatformId) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setErr("JPEG / PNG / WebP / GIF 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("이미지 크기는 최대 8MB까지 업로드할 수 있습니다.");
      return;
    }
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

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadFile(file);
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  function onDragEvent(e: React.DragEvent<HTMLDivElement>, active: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    setDragActive(active);
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
      <p className="text-gray-500">불러오는 중…</p>
    ) : (
      <p className="rounded-lg border border-[#3182f6]/20 bg-[#3182f6]/5 px-4 py-3 text-sm text-gray-700">
        플랫폼 컨텍스트가 없습니다. 로그아웃 후 다시 로그인하거나 API 연결을
        확인하세요. 시드 데모 계정은{" "}
        <span className="font-mono text-[#3182f6]">platform@tosino.local</span>{" "}
        입니다.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-black">공지 팝업</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          모바일 권장 규격{" "}
          <strong className="text-gray-700">
            약 {SPEC_W}×{SPEC_H}px
          </strong>
          . 업로드 시 서버에 저장되며, 아래 라이브러리에서 슬롯으로 고를 수
          있습니다. 외부 URL도 슬롯에 직접 입력 가능합니다.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          솔루션에서는 부트스트랩으로 공지가 내려가며, 기본으로 팝업이 켜져
          있습니다. 끄려면 API 환경변수{" "}
          <code className="text-gray-500">ANNOUNCEMENT_MODAL_PUBLISH=false</code>
          . 상대 경로 이미지는{" "}
          <code className="text-gray-500">PUBLIC_API_URL</code>이 붙습니다.
          <strong className="text-gray-500"> 필수 읽기</strong>를 켜면 로그인
          회원은 확인 전 솔루션 이동이 제한됩니다.
        </p>
      </div>

      {err && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msg}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">업로드 · 라이브러리</h2>
            <p className="mt-1 text-xs text-gray-500">
              먼저 적용할 <strong className="text-gray-500">슬롯</strong>을 고른 뒤
              파일을 드래그하거나 클릭해 업로드하면 해당 슬롯에 바로 채워집니다.
              JPEG / PNG / WebP / GIF, 최대 8MB.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={showOnlyPublished}
              onChange={(e) => setShowOnlyPublished(e.target.checked)}
              className="rounded border-gray-300"
            />
            게시중만 보기
          </label>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onPickFile}
        />
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragEnter={(e) => onDragEvent(e, true)}
          onDragOver={(e) => onDragEvent(e, true)}
          onDragLeave={(e) => onDragEvent(e, false)}
          onDrop={onDrop}
          className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
            dragActive
              ? "border-[#3182f6] bg-[#3182f6]/5"
              : "border-gray-300 bg-gray-50 hover:border-[#3182f6]/50 hover:bg-gray-100"
          } ${uploading ? "cursor-not-allowed opacity-60" : ""}`}
          role="button"
          aria-label="이미지 업로드"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3182f6] shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-4.5-9L12 3m0 0L7.5 7.5M12 3v13.5"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">
            {uploading
              ? "업로드 중…"
              : dragActive
                ? "여기에 파일을 놓으세요"
                : "여기에 파일을 끌어다 놓거나 클릭해서 선택"}
          </p>
          <p className="text-[11px] text-gray-500">
            권장 규격 약 {SPEC_W}×{SPEC_H}px · JPEG/PNG/WebP/GIF · 최대 8MB
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {library.length === 0 ? (
            <p className="text-sm text-gray-400">아직 업로드된 파일이 없습니다.</p>
          ) : (
            library.map((a) => (
              <div
                key={a.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <div className="aspect-[367/451] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="space-y-1 p-2 text-xs text-gray-500">
                  <p className="font-mono text-[11px] text-[#3182f6]">
                    {a.width}×{a.height}px
                  </p>
                  <p className="truncate text-gray-500" title={a.originalName ?? ""}>
                    {a.originalName || "—"}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => applyAssetToSelectedSlot(a)}
                      className="rounded bg-amber-600/90 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-600"
                    >
                      슬롯 {selectedSlot + 1}에 적용
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAsset(a.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100"
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">
            공지 슬롯 (최대 {MAX}개)
          </h2>
          <p className="text-[11px] text-gray-500">
            채워진 슬롯 {rows.filter((r) => r.imageUrl.trim().length > 0).length} / {MAX} ·
            게시중{" "}
            {
              rows.filter(
                (r) => r.imageUrl.trim().length > 0 && r.active,
              ).length
            }
            개
          </p>
        </div>
        {showOnlyPublished &&
        rows.every((r) => !(r.imageUrl.trim().length > 0 && r.active)) ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500">
            현재 게시중인 공지가 없습니다. &ldquo;게시중만 보기&rdquo;를 꺼서 비활성 슬롯을
            확인하거나 새 이미지를 등록하세요.
          </p>
        ) : null}
        <div className="space-y-4">
          {rows.map((row, i) => {
            if (
              showOnlyPublished &&
              !(row.imageUrl.trim().length > 0 && row.active)
            ) {
              return null;
            }
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
                    ? "border-amber-500/70 bg-[#3182f6]/5 ring-1 ring-amber-500/40"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(i)}
                    className="text-left text-sm font-medium text-gray-700 hover:text-[#3182f6]"
                  >
                    슬롯 {i + 1}
                    {selectedSlot === i && (
                      <span className="ml-2 text-xs font-normal text-[#3182f6]">
                        선택됨
                      </span>
                    )}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], active: e.target.checked };
                        setRows(next);
                      }}
                      className="rounded border-gray-300"
                    />
                    활성
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#3182f6]/80">
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
                      className="rounded border-gray-300"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {row.imageWidth != null && row.imageHeight != null ? (
                    <span
                      className={
                        specOk ? "text-emerald-600/90" : "text-[#3182f6]/90"
                      }
                    >
                      {row.imageWidth}×{row.imageHeight}px
                      {!specOk && " · 권장 규격과 차이 있음"}
                    </span>
                  ) : (
                    <span className="text-gray-400">픽셀: URL만 있음 (미확인)</span>
                  )}
                </div>
                {preview ? (
                  <div
                    className="relative mt-3 overflow-hidden rounded-lg border border-gray-200 bg-black"
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
          className="rounded-lg bg-[#3182f6] px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            loadAnnouncements();
            loadLibrary();
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
        >
          다시 불러오기
        </button>
      </div>
    </div>
  );
}
