import { PrismaService } from '../prisma/prisma.service';

const SUPER_ADMIN_HOST =
  process.env.SUPER_ADMIN_HOST?.trim().toLowerCase() ||
  'mod.tozinosolution.com';
const PREFIXES = ['www.', 'mod.', 'agent.'] as const;

export function bootstrapHostCandidates(host?: string): string[] {
  const h = (host || 'localhost').toLowerCase().split(':')[0];
  const visited = new Set<string>();
  const queue = [h];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (current === SUPER_ADMIN_HOST) continue;

    for (const prefix of PREFIXES) {
      if (current.startsWith(prefix)) {
        const stripped = current.slice(prefix.length);
        if (stripped) queue.push(stripped);
      }
    }
  }

  if (h === '127.0.0.1') visited.add('localhost');
  if (h === 'localhost') visited.add('127.0.0.1');

  return Array.from(visited);
}

/** Host 헤더·쿼리로 플랫폼 행 조회 (도메인 매칭) */
export async function resolvePlatformFromRequestHost(
  prisma: PrismaService,
  host?: string,
) {
  for (const candidate of bootstrapHostCandidates(host)) {
    const domain = await prisma.platformDomain.findFirst({
      where: { host: candidate },
      include: { platform: true },
    });
    if (domain) return domain.platform;
  }
  return null;
}
