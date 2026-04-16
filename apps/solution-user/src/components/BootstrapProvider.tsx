"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchBootstrap } from "@/lib/api";

export type BootstrapData = Awaited<ReturnType<typeof fetchBootstrap>>;

type BootstrapCtx = { bootstrap: BootstrapData; requestHost: string };

const BootstrapContext = createContext<BootstrapCtx | null>(null);

export function useBootstrap(): BootstrapData | null {
  return useContext(BootstrapContext)?.bootstrap ?? null;
}

/** bootstrap/sports-odds 공개 API에 넘기는 host (미리보기 포트 모드에서는 쿼리가 port로 대체됨) */
export function useBootstrapHost(): string {
  return useContext(BootstrapContext)?.requestHost ?? "localhost";
}

function shellClass(ui: BootstrapData["theme"]["ui"] | undefined): string {
  const bg = ui?.background ?? "dark";
  if (bg === "light") return "min-h-screen bg-zinc-100 text-zinc-900";
  if (bg === "midnight") return "min-h-screen bg-[#0c1222] text-slate-100";
  return "min-h-screen bg-[#050505] text-zinc-100";
}

/**
 * 공개 API ?host= 와 DB platform_domains 가 맞아야 함.
 * - SSR 로 들어온 헤더만 쓰면 Cloudflare·프록시 뒤에서 어긋날 수 있음 → 클라이언트에선 주소창 hostname 우선.
 * - LAN IP 로만 열 때는 .env 에 NEXT_PUBLIC_PLATFORM_DOMAIN=nexus001.vip 처럼 고정.
 */
export function effectiveBootstrapHost(serverHost: string): string {
  const override = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim();
  if (override) return override;
  if (typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }
  return serverHost;
}

export function BootstrapProvider({
  host,
  children,
}: {
  host: string;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestHost, setRequestHost] = useState(host);
  const previewPort = process.env.NEXT_PUBLIC_PREVIEW_PORT;

  useEffect(() => {
    const h = effectiveBootstrapHost(host);
    setRequestHost(h);
    let cancelled = false;
    fetchBootstrap(h)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Bootstrap error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [host]);

  useEffect(() => {
    if (!data?.theme.primaryColor) return;
    document.documentElement.style.setProperty(
      "--theme-primary",
      data.theme.primaryColor,
    );
  }, [data]);

  const ctxValue = useMemo((): BootstrapCtx | null => {
    if (!data) return null;
    return { bootstrap: data, requestHost };
  }, [data, requestHost]);

  if (error) {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center text-zinc-200">
          <div>
            <p className="font-medium">일시적으로 연결할 수 없습니다</p>
            <p className="mt-2 text-sm text-zinc-500">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300"
          >
            새로고침
          </button>
        </div>
      );
    }

    const isNotFound =
      /\b404\b/.test(error) ||
      /Unknown host/i.test(error) ||
      /platform domain/i.test(error) ||
      /미리보기 포트/i.test(error);
    const isForbidden = /\b403\b/.test(error) || /미리보기 비밀값/i.test(error);
    const isServerErr =
      /\b500\b/.test(error) || /Internal Server Error/i.test(error);
    const hint = previewPort
      ? isForbidden
        ? "API의 PREVIEW_BOOTSTRAP_SECRET과 솔루션의 NEXT_PUBLIC_PREVIEW_BOOTSTRAP_SECRET을 동일하게 맞추세요."
        : isNotFound
          ? `DB에 previewPort=${previewPort} 인 플랫폼이 있는지, 시드·관리자에서 포트가 할당됐는지 확인하세요. Next가 이 포트에서 떠 있어야 합니다. 저장소 루트에서 단일 앱: pnpm dev:solution:preview -- ${previewPort} (API는 별도 터미널). 복사본+API 동시: pnpm solution:stack -- <플랫폼슬러그> ${previewPort}.`
          : isServerErr
            ? "API 서버 오류입니다. DB·마이그레이션·로그를 확인하세요."
            : "NEXT_PUBLIC_API_URL과 CORS를 확인하세요."
      : isNotFound
        ? "관리자에서 플랫폼 도메인에 이 주소(Host)를 등록했는지 확인하세요. 개발 시에는 localhost 또는 127.0.0.1 둘 다 매칭됩니다."
        : isServerErr
          ? "API 서버 오류입니다. DATABASE_URL·DB 기동 여부, prisma migrate 적용 여부를 확인하고 API 로그를 보세요."
          : "NEXT_PUBLIC_API_URL이 API 주소와 같은지, CORS/방화벽을 확인하세요.";
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-red-300">
        <div>
          <p className="font-medium">Bootstrap 실패</p>
          <p className="mt-2 text-sm text-zinc-500">{error}</p>
          <p className="mt-4 text-xs text-zinc-600">{hint}</p>
        </div>
      </div>
    );
  }

  if (!data || !ctxValue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        로딩 중…
      </div>
    );
  }

  return (
    <BootstrapContext.Provider value={ctxValue}>
      <div className={shellClass(data.theme.ui)}>{children}</div>
    </BootstrapContext.Provider>
  );
}
