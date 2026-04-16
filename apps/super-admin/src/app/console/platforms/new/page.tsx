"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type TemplateRatePolicy = {
  upstreamCasinoPct: string | null;
  upstreamSportsPct: string | null;
  platformCasinoPct: string | null;
  platformSportsPct: string | null;
  autoMarginPct: string | null;
};

type PlatformTemplate = {
  key: string;
  label: string;
  description: string;
  defaultHostSuffix: string;
  defaultRatePolicy: TemplateRatePolicy;
};

type TemplateResponse = {
  defaultHostSuffix: string;
  items: PlatformTemplate[];
};

function normalizeSubdomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeHostPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^\.+|\.+$/g, "");
}

function rateNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function ConsoleNewPlatformPage() {
  const router = useRouter();
  const { refresh, setSelectedPlatformId, platforms } = usePlatform();
  const [slug, setSlug] = useState("brand-b");
  const [name, setName] = useState("Brand B");
  const [subdomain, setSubdomain] = useState("brand-b");
  const [hostSuffix, setHostSuffix] = useState("tozinosolution.com");
  const [previewPortOpt, setPreviewPortOpt] = useState("");
  const [cloneFromPlatformId, setCloneFromPlatformId] = useState("");
  const [templates, setTemplates] = useState<PlatformTemplate[]>([]);
  const [templateKey, setTemplateKey] = useState("HYBRID");
  const [upstreamCasinoPct, setUpstreamCasinoPct] = useState("0.00");
  const [upstreamSportsPct, setUpstreamSportsPct] = useState("0.00");
  const [platformMarginPct, setPlatformMarginPct] = useState("1.00");
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

  useEffect(() => {
    apiFetch<TemplateResponse>("/platforms/templates")
      .then((data) => {
        setTemplates(data.items);
        setHostSuffix(data.defaultHostSuffix);
        const initial = data.items.find((item) => item.key === "HYBRID") ?? data.items[0];
        if (initial) {
          setTemplateKey(initial.key);
          setUpstreamCasinoPct(initial.defaultRatePolicy.upstreamCasinoPct ?? "0.00");
          setUpstreamSportsPct(initial.defaultRatePolicy.upstreamSportsPct ?? "0.00");
          setPlatformMarginPct(initial.defaultRatePolicy.autoMarginPct ?? "1.00");
        }
      })
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "템플릿을 불러오지 못했습니다"),
      );
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.key === templateKey) ?? null,
    [templates, templateKey],
  );

  useEffect(() => {
    const next = normalizeSubdomain(slug);
    if (next) setSubdomain(next);
  }, [slug]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setHostSuffix(selectedTemplate.defaultHostSuffix);
    setUpstreamCasinoPct(
      selectedTemplate.defaultRatePolicy.upstreamCasinoPct ?? "0.00",
    );
    setUpstreamSportsPct(
      selectedTemplate.defaultRatePolicy.upstreamSportsPct ?? "0.00",
    );
    setPlatformMarginPct(
      selectedTemplate.defaultRatePolicy.autoMarginPct ?? "1.00",
    );
  }, [selectedTemplate]);

  const primaryHost = useMemo(() => {
    const label = normalizeSubdomain(subdomain || slug);
    const suffix = normalizeHostPart(hostSuffix);
    if (!suffix) return label;
    return label ? `${label}.${suffix}` : suffix;
  }, [hostSuffix, slug, subdomain]);
  const adminHost = useMemo(
    () => (primaryHost ? `mod.${primaryHost}` : ""),
    [primaryHost],
  );
  const agentHost = useMemo(
    () => (primaryHost ? `agent.${primaryHost}` : ""),
    [primaryHost],
  );

  const platformCasinoPct = useMemo(
    () => (rateNumber(upstreamCasinoPct) + rateNumber(platformMarginPct)).toFixed(2),
    [platformMarginPct, upstreamCasinoPct],
  );
  const platformSportsPct = useMemo(
    () => (rateNumber(upstreamSportsPct) + rateNumber(platformMarginPct)).toFixed(2),
    [platformMarginPct, upstreamSportsPct],
  );

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
        templateKey,
        primaryHost,
        themeJson: {
          siteName: name,
          bannerUrls: [],
        },
        solutionRatePolicy: {
          upstreamCasinoPct: upstreamCasinoPct.trim(),
          upstreamSportsPct: upstreamSportsPct.trim(),
          autoMarginPct: platformMarginPct.trim(),
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
      if (typeof window !== "undefined" && created.previewPort != null) {
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
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/console/platforms"
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 플랫폼 목록
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-100">새 플랫폼</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
      >
        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        <label className="block text-sm text-zinc-400">
          솔루션 템플릿
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          >
            {templates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.label}
              </option>
            ))}
          </select>
          {selectedTemplate ? (
            <p className="mt-1 text-xs text-zinc-500">
              {selectedTemplate.description}
            </p>
          ) : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-zinc-400">
            도메인 라벨
            <input
              value={subdomain}
              onChange={(e) => setSubdomain(normalizeSubdomain(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              placeholder="brand-b"
            />
            <p className="mt-1 text-xs text-zinc-600">
              Apex 도메인을 그대로 쓰려면 비워두세요.
            </p>
          </label>
          <label className="block text-sm text-zinc-400">
            루트 도메인
            <input
              value={hostSuffix}
              onChange={(e) => setHostSuffix(normalizeHostPart(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              placeholder="tozinosolution.com 또는 brand.com"
            />
            <p className="mt-1 text-xs text-zinc-600">
              저장되는 플랫폼 기준 도메인입니다. admin/agent는 이 도메인 앞에
              `mod.` / `agent.` 가 붙습니다.
            </p>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
            <p className="text-xs text-zinc-500">유저 도메인</p>
            <p className="mt-1 font-mono text-sm text-amber-200">{primaryHost}</p>
            <p className="mt-1 text-xs text-zinc-600">
              `{primaryHost || "root-domain"}` 로 회원 앱이 열립니다.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
            <p className="text-xs text-zinc-500">솔루션 어드민</p>
            <p className="mt-1 font-mono text-sm text-emerald-200">{adminHost}</p>
            <p className="mt-1 text-xs text-zinc-600">
              `mod.` prefix 로 solution-admin 이 열립니다.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
            <p className="text-xs text-zinc-500">에이전트</p>
            <p className="mt-1 font-mono text-sm text-sky-200">{agentHost}</p>
            <p className="mt-1 text-xs text-zinc-600">
              `agent.` prefix 로 solution-agent 가 열립니다.
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              상위업체 요율 / 플랫폼 청구율
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              상위업체 매입 요율과 자동 마진을 넣으면, 플랫폼 청구 요율은 자동으로
              계산됩니다. 카지노·슬롯·미니는 동일 알 버킷, 스포츠는 별도 요율입니다.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block text-sm text-zinc-400">
              상위 카지노 %
              <input
                value={upstreamCasinoPct}
                onChange={(e) => setUpstreamCasinoPct(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              상위 스포츠 %
              <input
                value={upstreamSportsPct}
                onChange={(e) => setUpstreamSportsPct(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              자동 마진 %
              <input
                value={platformMarginPct}
                onChange={(e) => setPlatformMarginPct(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-black/20 px-4 py-3">
              <p className="text-xs text-zinc-500">플랫폼 카지노 청구율</p>
              <p className="mt-1 font-mono text-lg text-emerald-300">
                {platformCasinoPct}%
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black/20 px-4 py-3">
              <p className="text-xs text-zinc-500">플랫폼 스포츠 청구율</p>
              <p className="mt-1 font-mono text-lg text-emerald-300">
                {platformSportsPct}%
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
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
              <option value="">없음 · 템플릿 기본값 사용</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs leading-relaxed text-zinc-500">
          복제 출처를 고르면 테마·플래그·연동·동기화 구성을 가져오고, 템플릿과
          상위업체 요율은 새 플랫폼 기준으로 다시 정리합니다.
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
