import type { PlatformRow } from "@/context/PlatformContext";

type PlatformLike = Pick<PlatformRow, "slug" | "domains" | "solutionHostSuffix">;

function normalizeHost(host: string | null | undefined) {
  return (host ?? "").trim().toLowerCase().split(":")[0];
}

function stripPrefix(host: string, prefix: string) {
  return host.startsWith(prefix) ? host.slice(prefix.length) : host;
}

export function inferRootHost(platform: PlatformLike): string | null {
  const explicit = platform.domains
    .map((domain) => normalizeHost(domain.host))
    .find((host) => host && !host.startsWith("mod.") && !host.startsWith("agent."));
  if (explicit) return stripPrefix(explicit, "www.");
  const suffix = normalizeHost(platform.solutionHostSuffix);
  return suffix ? `${platform.slug}.${suffix}` : null;
}

export function inferAdminHost(platform: PlatformLike): string | null {
  const explicit = platform.domains
    .map((domain) => normalizeHost(domain.host))
    .find((host) => host.startsWith("mod."));
  if (explicit) return explicit;
  const root = inferRootHost(platform);
  return root ? `mod.${root}` : null;
}

export function inferAgentHost(platform: PlatformLike): string | null {
  const explicit = platform.domains
    .map((domain) => normalizeHost(domain.host))
    .find((host) => host.startsWith("agent."));
  if (explicit) return explicit;
  const root = inferRootHost(platform);
  return root ? `agent.${root}` : null;
}
