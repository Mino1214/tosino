import { PrismaService } from '../prisma/prisma.service';

export function bootstrapHostCandidates(host?: string): string[] {
  const h = (host || 'localhost').toLowerCase().split(':')[0];
  const apexIfWww = h.startsWith('www.') ? h.slice(4) : null;
  return Array.from(
    new Set(
      [
        h,
        apexIfWww,
        h === '127.0.0.1' ? 'localhost' : null,
        h === 'localhost' ? '127.0.0.1' : null,
      ].filter((x): x is string => !!x),
    ),
  );
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
