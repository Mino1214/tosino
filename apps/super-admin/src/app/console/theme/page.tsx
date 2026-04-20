"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type PlatformDetail = {
  id: string;
  slug: string;
  name: string;
  previewPort: number | null;
  themeJson: Record<string, unknown>;
  flagsJson: Record<string, unknown>;
};

const UI_DEFAULTS = {
  headerStyle: "glass",
  homeLayout: "banner",
  cardRadius: "xl",
  density: "comfortable",
  background: "dark",
} as const;

type PostCreatePreviewHint = {
  platformId: string;
  slug: string;
  previewPort: number;
  at: number;
};

const PREVIEW_HINT_KEY = "tosinoPlatformPreviewHint";
const PREVIEW_HINT_MAX_AGE_MS = 60 * 60 * 1000;

export default function ConsoleThemePage() {
  const { selectedPlatformId, loading: ctxLoading } = usePlatform();
  const [detail, setDetail] = useState<PlatformDetail | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#c9a227");
  const [logoUrl, setLogoUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [bannerLines, setBannerLines] = useState("");
  const [headerStyle, setHeaderStyle] =
    useState<string>(UI_DEFAULTS.headerStyle);
  const [homeLayout, setHomeLayout] = useState<string>(UI_DEFAULTS.homeLayout);
  const [cardRadius, setCardRadius] = useState<string>(UI_DEFAULTS.cardRadius);
  const [density, setDensity] = useState<string>(UI_DEFAULTS.density);
  const [background, setBackground] = useState<string>(UI_DEFAULTS.background);
  const [postCreateHint, setPostCreateHint] =
    useState<PostCreatePreviewHint | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);


  useEffect(() => {
    if (!selectedPlatformId || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(PREVIEW_HINT_KEY);
      if (!raw) return;
      const h = JSON.parse(raw) as PostCreatePreviewHint;
      if (h.platformId !== selectedPlatformId) return;
      if (Date.now() - h.at > PREVIEW_HINT_MAX_AGE_MS) {
        sessionStorage.removeItem(PREVIEW_HINT_KEY);
        return;
      }
      setPostCreateHint(h);
    } catch {
      /* ignore */
    }
  }, [selectedPlatformId]);

  function dismissPostCreateHint() {
    sessionStorage.removeItem(PREVIEW_HINT_KEY);
    setPostCreateHint(null);
  }

  async function copyPreviewCommand(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopyMsg("복사했습니다.");
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg("복사에 실패했습니다. 직접 선택해 복사하세요.");
    }
  }

  useEffect(() => {
    if (!selectedPlatformId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadErr(null);
    apiFetch<PlatformDetail>(`/platforms/${selectedPlatformId}`)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        const t = d.themeJson || {};
        const ui =
          t.ui && typeof t.ui === "object" && !Array.isArray(t.ui)
            ? (t.ui as Record<string, unknown>)
            : {};
        setPrimaryColor(
          typeof t.primaryColor === "string" ? t.primaryColor : "#c9a227",
        );
        setLogoUrl(typeof t.logoUrl === "string" ? t.logoUrl : "");
        setSiteName(
          typeof t.siteName === "string" ? t.siteName : d.name || "",
        );
        const banners = Array.isArray(t.bannerUrls)
          ? (t.bannerUrls as string[])
          : [];
        setBannerLines(banners.join("\n"));
        setHeaderStyle(
          typeof ui.headerStyle === "string"
            ? ui.headerStyle
            : UI_DEFAULTS.headerStyle,
        );
        setHomeLayout(
          typeof ui.homeLayout === "string"
            ? ui.homeLayout
            : UI_DEFAULTS.homeLayout,
        );
        setCardRadius(
          typeof ui.cardRadius === "string"
            ? ui.cardRadius
            : UI_DEFAULTS.cardRadius,
        );
        setDensity(
          typeof ui.density === "string" ? ui.density : UI_DEFAULTS.density,
        );
        setBackground(
          typeof ui.background === "string"
            ? ui.background
            : UI_DEFAULTS.background,
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "불러오기 실패");
          setDetail(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlatformId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatformId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const bannerUrls = bannerLines
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await apiFetch<PlatformDetail>(
        `/platforms/${selectedPlatformId}/theme`,
        {
          method: "PATCH",
          body: JSON.stringify({
            themeJson: {
              primaryColor,
              logoUrl: logoUrl.trim() || null,
              siteName: siteName.trim() || detail?.name,
              bannerUrls,
              ui: {
                headerStyle,
                homeLayout,
                cardRadius,
                density,
                background,
              },
            },
          }),
        },
      );
      setDetail(updated);
      setSaveMsg("저장했습니다.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  function openPreview() {
    const port = detail?.previewPort;
    if (port == null) return;
    window.open(`http://localhost:${port}`, "_blank", "noopener,noreferrer");
  }

  if (ctxLoading) {
    return <p className="text-gray-500">불러오는 중…</p>;
  }

  if (!selectedPlatformId) {
    return (
      <p className="text-gray-500">
        왼쪽에서 플랫폼을 선택한 뒤 다시 오세요.
      </p>
    );
  }

  if (loadErr) {
    return <p className="text-sm text-red-400">{loadErr}</p>;
  }

  if (!detail) {
    return <p className="text-gray-500">테마 정보를 불러오는 중…</p>;
  }

  const stackCmd =
    detail.previewPort != null
      ? `pnpm solution:stack -- ${detail.slug} ${detail.previewPort}`
      : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">테마·UI</h1>
          <p className="mt-1 text-sm text-gray-500">
            브랜드 색·헤더·홈 레이아웃·카드 느낌을 한곳에서 수정합니다. 미리보기는
            브라우저만으로는 서버가 자동으로 켜지지 않습니다 — 아래 명령을{" "}
            <strong className="text-gray-500">저장소 루트 터미널</strong>에서
            실행하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPreview}
            disabled={detail.previewPort == null}
            className="rounded-lg border border-amber-700/60 bg-[#3182f6]/5 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-900/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            미리보기 (새 탭)
          </button>
        </div>
      </div>

      {postCreateHint && detail.previewPort != null && (
        <div className="rounded-xl border border-[#3182f6]/30 bg-[#3182f6]/5 px-4 py-4 text-sm">
          <p className="font-medium text-amber-100">플랫폼을 막 만드셨다면</p>
          <p className="mt-2 text-gray-500">
            로컬에서 미리보기를 켜려면 터미널에서 아래 중 하나를 실행하세요. (웹
            콘솔은 보안상 PC에 프로세스를 대신 켜 줄 수 없습니다.)
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="block max-w-full overflow-x-auto rounded bg-white px-3 py-2 font-mono text-xs text-amber-100/90">
              {stackCmd}
            </code>
            <button
              type="button"
              onClick={() => copyPreviewCommand(stackCmd)}
              className="shrink-0 rounded border border-amber-700/50 px-3 py-1.5 text-xs text-[#3182f6] hover:bg-[#3182f6]/5"
            >
              복사
            </button>
            <button
              type="button"
              onClick={dismissPostCreateHint}
              className="shrink-0 text-xs text-gray-500 hover:text-gray-700"
            >
              닫기
            </button>
          </div>
          {copyMsg && (
            <p className="mt-2 text-xs text-[#3182f6]/90">{copyMsg}</p>
          )}
        </div>
      )}

      {detail.previewPort != null && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          <p>
            <span className="text-gray-700">미리보기 포트</span>{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-[#3182f6]/90">
              {detail.previewPort}
            </code>
            <span className="text-gray-400"> · 슬러그 </span>
            <code className="rounded bg-white px-1.5 py-0.5 text-gray-700">
              {detail.slug}
            </code>
          </p>
          <p className="mt-3 text-xs text-gray-500">
            <strong className="text-gray-500">API + 솔루션 한 번에</strong> (권장)
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="block max-w-full flex-1 overflow-x-auto rounded bg-white px-3 py-2 font-mono text-xs">
              {stackCmd}
            </code>
            <button
              type="button"
              onClick={() => copyPreviewCommand(stackCmd)}
              className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              복사
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            <strong className="text-gray-500">복사본만</strong>{" "}
            <code className="text-gray-400">solution:provision</code> 은 설치 후{" "}
            <strong className="text-gray-500">Next가 자동으로 뜹니다</strong>.
            설치만 하려면{" "}
            <code className="rounded bg-white px-1 text-gray-500">
              pnpm solution:provision-only -- {detail.slug} {detail.previewPort}
            </code>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            <strong className="text-gray-500">단일 apps/solution-web</strong> 만
            쓸 때:{" "}
            <code className="rounded bg-white px-1 text-gray-500">
              pnpm dev:solution:preview -- {detail.previewPort}
            </code>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            API에 PREVIEW_BOOTSTRAP_SECRET이 있으면 솔루션{" "}
            <code className="text-gray-500">.env.local</code>에
            NEXT_PUBLIC_PREVIEW_BOOTSTRAP_SECRET도 맞춰 두세요.
          </p>
        </div>
      )}

      <form
        onSubmit={onSave}
        className="space-y-8 rounded-xl border border-gray-200 bg-gray-50 p-6"
      >
        {saveMsg && (
          <p
            className={
              saveMsg.includes("실패") || saveMsg.includes("오류")
                ? "text-sm text-red-400"
                : "text-sm text-[#3182f6]"
            }
          >
            {saveMsg}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            브랜드
          </h2>
          <label className="block text-sm text-gray-500">
            포인트 색 (HEX)
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="mt-2 h-10 w-full max-w-[12rem] cursor-pointer rounded border border-gray-200 bg-white"
            />
          </label>
          <label className="block text-sm text-gray-500">
            사이트 이름
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
            />
          </label>
          <label className="block text-sm text-gray-500">
            로고 URL (선택)
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
            />
          </label>
          <label className="block text-sm text-gray-500">
            배너 이미지 URL (한 줄에 하나)
            <textarea
              value={bannerLines}
              onChange={(e) => setBannerLines(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900"
            />
          </label>
        </section>

        <section className="space-y-4 border-t border-gray-200 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            UI 템플릿
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-gray-500">
              헤더 스타일
              <select
                value={headerStyle}
                onChange={(e) => setHeaderStyle(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
              >
                <option value="glass">글래스 (블러)</option>
                <option value="solid">솔리드</option>
                <option value="minimal">미니멀</option>
              </select>
            </label>
            <label className="block text-sm text-gray-500">
              홈 레이아웃
              <select
                value={homeLayout}
                onChange={(e) => setHomeLayout(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
              >
                <option value="banner">배너 강조</option>
                <option value="compact">컴팩트</option>
              </select>
            </label>
            <label className="block text-sm text-gray-500">
              카드 모서리
              <select
                value={cardRadius}
                onChange={(e) => setCardRadius(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
              >
                <option value="none">없음</option>
                <option value="sm">작게</option>
                <option value="md">보통</option>
                <option value="xl">크게</option>
              </select>
            </label>
            <label className="block text-sm text-gray-500">
              밀도
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
              >
                <option value="comfortable">여유</option>
                <option value="compact">촘촘</option>
              </select>
            </label>
            <label className="block text-sm text-gray-500 sm:col-span-2">
              배경 톤
              <select
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
              >
                <option value="dark">다크</option>
                <option value="midnight">미드나이트 블루</option>
                <option value="light">라이트</option>
              </select>
            </label>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-[#3182f6] disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <Link
            href="/console/platforms"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            플랫폼 목록
          </Link>
        </div>
      </form>
    </div>
  );
}
