"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

export default function ConsoleNewPlatformPage() {
  const router = useRouter();
  const { refresh, setSelectedPlatformId, platforms } = usePlatform();
  const [slug, setSlug] = useState("brand-b");
  const [name, setName] = useState("Brand B");
  const [primaryHost, setPrimaryHost] = useState("brand-b.localhost");
  const [previewPortOpt, setPreviewPortOpt] = useState("");
  const [cloneFromPlatformId, setCloneFromPlatformId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "SUPER_ADMIN") {
      router.replace("/console/platforms");
    }
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const portNum = previewPortOpt.trim()
        ? Number(previewPortOpt.trim())
        : NaN;
      const body: Record<string, unknown> = {
        slug,
        name,
        primaryHost,
        themeJson: {
          primaryColor: "#c9a227",
          siteName: name,
          bannerUrls: [],
        },
      };
      if (Number.isFinite(portNum) && portNum >= 1024 && portNum <= 65535) {
        body.previewPort = portNum;
      }
      if (cloneFromPlatformId.trim()) {
        body.cloneFromPlatformId = cloneFromPlatformId.trim();
      }
      const created = await apiFetch<{
        id: string;
        slug: string;
        previewPort: number | null;
      }>("/platforms", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSelectedPlatformId(created.id);
      if (
        typeof window !== "undefined" &&
        created.previewPort != null
      ) {
        sessionStorage.setItem(
          "tosinoPlatformPreviewHint",
          JSON.stringify({
            platformId: created.id,
            slug: created.slug,
            previewPort: created.previewPort,
            at: Date.now(),
          }),
        );
      }
      await refresh();
      router.push("/console/theme");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/console/platforms"
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 플랫폼 목록
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-100">새 플랫폼</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
      >
        {err && <p className="text-sm text-red-400">{err}</p>}
        <label className="block text-sm text-zinc-400">
          슬러그
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          이름
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          기본 도메인(host)
          <input
            value={primaryHost}
            onChange={(e) => setPrimaryHost(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            placeholder="예: demo.example.com"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          미리보기 포트 (선택, 비우면 3200–3299 자동)
          <input
            type="number"
            min={1024}
            max={65535}
            value={previewPortOpt}
            onChange={(e) => setPreviewPortOpt(e.target.value)}
            placeholder="예: 3201"
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          프로젝트 설정 복제 출처 (선택)
          <select
            value={cloneFromPlatformId}
            onChange={(e) => setCloneFromPlatformId(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          >
            <option value="">없음 · 기본 연동만</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-zinc-500">
          출처를 고르면 테마·플래그·연동(integrations)·동기화 작업 구성을 복사합니다.
          회원·지갑·거래 데이터는 복사하지 않습니다. 미리보기: 단일 소스면 루트{" "}
          <code className="text-zinc-400">pnpm dev:solution:preview -- [포트]</code>{" "}
          + 솔루션{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_PREVIEW_PORT</code>.
          플랫폼마다 <strong className="text-zinc-400">solution-web을 통째로 복사</strong>해
          별도 프로세스로 띄우려면 저장소 루트에서{" "}
          <code className="text-zinc-400">pnpm solution:provision -- [슬러그] [포트]</code>{" "}
          는 복사 후 <strong className="text-zinc-400">Next 서버까지 자동 실행</strong>됩니다.
          설치만:{" "}
          <code className="text-zinc-400">pnpm solution:provision-only -- …</code>
          . API까지 한 터미널:{" "}
          <code className="text-zinc-400">pnpm solution:stack -- [슬러그] [포트]</code>
          . 자세한 내용은{" "}
          <code className="text-zinc-400">deployments/solution-instances/README.md</code>.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {loading ? "생성 중…" : "생성"}
        </button>
      </form>
    </div>
  );
}
