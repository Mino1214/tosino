import { PrismaService } from '../prisma/prisma.service';
import { publicSportsSectionsFromIntegrations } from './sports-sections.util';
import { resolvePublicMediaUrl } from '../common/utils/media-url.util';

/**
 * 솔루션 부트스트랩의 공지 팝업 노출 여부.
 * 플랫폼·도메인은 기존과 같이 Host(또는 미리보기 port)로 resolve 된 뒤 해당 플랫폼 공지만 내려감.
 * 끄려면 ANNOUNCEMENT_MODAL_PUBLISH=false 또는 0
 */
function readAnnouncementModalPublish(): boolean {
  const v = process.env.ANNOUNCEMENT_MODAL_PUBLISH?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'off' || v === 'no') {
    return false;
  }
  return true;
}

export const ANNOUNCEMENT_MODAL_PUBLISH = readAnnouncementModalPublish();

export type PlatformBootstrapSource = {
  id: string;
  slug: string;
  name: string;
  previewPort: number | null;
  themeJson: unknown;
  flagsJson: unknown;
  integrationsJson: unknown;
};

export async function buildBootstrapPayload(
  prisma: PrismaService,
  p: PlatformBootstrapSource,
) {
  const theme = (p.themeJson as Record<string, unknown>) || {};
  const uiRaw = theme.ui;
  const ui =
    uiRaw && typeof uiRaw === 'object' && !Array.isArray(uiRaw)
      ? (uiRaw as Record<string, unknown>)
      : {};
  const announcementRows = await prisma.platformAnnouncement.findMany({
    where: { platformId: p.id, active: true },
    orderBy: { sortOrder: 'asc' },
    take: 4,
    select: { imageUrl: true, imageWidth: true, imageHeight: true },
  });
  return {
    platformId: p.id,
    slug: p.slug,
    name: p.name,
    previewPort: p.previewPort,
    theme: {
      primaryColor: (theme.primaryColor as string) || '#c9a227',
      logoUrl: (theme.logoUrl as string) || null,
      siteName: (theme.siteName as string) || p.name,
      bannerUrls: Array.isArray(theme.bannerUrls)
        ? (theme.bannerUrls as string[])
        : [],
      ui: {
        headerStyle: (ui.headerStyle as string) || 'glass',
        homeLayout: (ui.homeLayout as string) || 'banner',
        cardRadius: (ui.cardRadius as string) || 'xl',
        density: (ui.density as string) || 'comfortable',
        background: (ui.background as string) || 'dark',
      },
    },
    flags: (p.flagsJson as Record<string, unknown>) || {},
    sportsSections: publicSportsSectionsFromIntegrations(p.integrationsJson),
    announcements: {
      modalEnabled: ANNOUNCEMENT_MODAL_PUBLISH,
      items: announcementRows.map((r) => ({
        imageUrl: resolvePublicMediaUrl(r.imageUrl),
        width: r.imageWidth,
        height: r.imageHeight,
      })),
    },
  };
}
