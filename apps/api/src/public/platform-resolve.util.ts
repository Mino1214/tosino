import { PrismaService } from '../prisma/prisma.service';

const SUPER_ADMIN_HOST =
  process.env.SUPER_ADMIN_HOST?.trim().toLowerCase() ||
  'mod.tozinosolution.com';
const PREFIXES = ['www.', 'mod.', 'agent.'] as const;

/**
 * User 사이트와 다른 솔루션 어드민 전용 호스트 → 플랫폼 slug.
 * (예: mod.i-on.bet 은 회원용 i-on.bet 과 별도인데, 로그인 시 같은 데모 플랫폼이어야 함)
 * `SOLUTION_ADMIN_BIND_HOSTS=host:slug,...` 로 추가·덮어쓰기.
 */
function adminHostSlugBindings(): Map<string, string> {
  const m = new Map<string, string>([['mod.i-on.bet', 'demo']]);
  const raw = process.env.SOLUTION_ADMIN_BIND_HOSTS?.trim();
  if (!raw) return m;
  for (const part of raw.split(',')) {
    const seg = part.split(':').map((s) => s.trim().toLowerCase());
    if (seg.length >= 2 && seg[0] && seg[1]) m.set(seg[0], seg[1]);
  }
  return m;
}

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
  const h = (host || '').toLowerCase().split(':')[0];
  /** 솔루션 어드민 전용 호스트는 PlatformDomain 보다 slug 바인딩이 우선 (잘못 연결된 도메인 때문에 다른 플랫폼으로 로그인되는 것 방지) */
  if (h) {
    const slug = adminHostSlugBindings().get(h);
    if (slug) {
      const p = await prisma.platform.findUnique({ where: { slug } });
      if (p) return p;
    }
  }

  for (const candidate of bootstrapHostCandidates(host)) {
    const domain = await prisma.platformDomain.findFirst({
      where: { host: candidate },
      include: { platform: true },
    });
    if (domain) return domain.platform;
  }

  return null;
}
