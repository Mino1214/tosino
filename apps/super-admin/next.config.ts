import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const DEPLOY_HOSTS = [
  ...new Set(
    (
      process.env.NEXT_PUBLIC_DEPLOY_HOSTS ||
      process.env.DEPLOY_HOSTS ||
      [
        "mod.tozinosolution.com",
        "i-on.bet",
        "www.i-on.bet",
        "mod.i-on.bet",
        "agent.i-on.bet",
        "nexus001.vip",
        "www.nexus001.vip",
        "mod.nexus001.vip",
        "agent.nexus001.vip",
      ].join(",")
    )
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ),
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
    ...(basePath ? { basePath } : {}),
    ...(!isDev ? { output: "export" as const } : {}),
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
