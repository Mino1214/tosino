import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const DEPLOY_HOSTS = [
  "nexus001.vip",
  "www.nexus001.vip",
  "mod.nexus001.vip",
  "demo1.nexus001.vip",
  "demo2.nexus001.vip",
] as const;

function nextAppBasePath(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_BASE_PATH?.trim() ||
    process.env.BASE_PATH?.trim();
  if (!raw) return undefined;
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/+$/, "") || "/";
  return trimmed === "/" ? undefined : trimmed;
}

const basePath = nextAppBasePath();
const assetVersion =
  process.env.NEXT_PUBLIC_ASSET_VERSION?.trim() ||
  process.env.ASSET_VERSION?.trim() ||
  `${Date.now()}`;

function devApiRewrites() {
  if (process.env.NODE_ENV !== "development") return [];
  const target = (
    process.env.API_PROXY_TARGET || "http://127.0.0.1:4001"
  ).replace(/\/$/, "");
  return [
    { source: "/api/:path*", destination: `${target}/api/:path*` },
    { source: "/uploads/:path*", destination: `${target}/uploads/:path*` },
  ];
}

export default function defineConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    transpilePackages: ["@tosino/shared"],
    ...(basePath ? { basePath } : {}),
    ...(!isDev ? { output: "export" as const } : {}),
    env: {
      NEXT_PUBLIC_ASSET_VERSION: assetVersion,
    },
    ...(isDev
      ? {
          async rewrites() {
            return devApiRewrites();
          },
        }
      : {}),
    images: {
      ...(!isDev ? { unoptimized: true } : {}),
      remotePatterns: [
        ...DEPLOY_HOSTS.map((hostname) => ({
          protocol: "https" as const,
          hostname,
          pathname: "/**",
        })),
        { protocol: "http", hostname: "localhost", pathname: "/**" },
        { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
      ],
    },
  };
}
