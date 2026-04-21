import { readOddsApiConfig } from '@tosino/shared';
import { PrismaService } from '../prisma/prisma.service';
import { publicSportsSectionsFromIntegrations } from './sports-sections.util';
import {
  normalizePublicAssetUrl,
  resolvePublicMediaUrl,
} from '../common/utils/media-url.util';

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

/** 솔루션에서 OddsHost 탭 503 안내용(비밀값 노출 없음) */
function oddshostEndpointFlags(): {
  keyConfigured: boolean;
  prematchConfigured: boolean;
  marketsConfigured: boolean;
} {
  const e = (k: string) => !!(process.env[k] || '').trim();
  const base = (process.env.ODDSHOST_BASE_URL || '').trim();
  return {
    keyConfigured: e('ODDSHOST_KEY'),
    prematchConfigured:
      e('ODDSHOST_TEMPLATE_PREMATCH') ||
      (!!base && e('ODDSHOST_PATH_PREMATCH')),
    marketsConfigured:
      e('ODDSHOST_TEMPLATE_MARKETS') ||
      (!!base && e('ODDSHOST_PATH_MARKETS')),
  };
}

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
  const plimits = await prisma.platform.findUnique({
    where: { id: p.id },
    select: {
      minDepositKrw: true,
      minDepositUsdt: true,
      minWithdrawKrw: true,
      minWithdrawUsdt: true,
      minPointRedeemPoints: true,
      minPointRedeemKrw: true,
      minPointRedeemUsdt: true,
      rollingLockWithdrawals: true,
      rollingTurnoverMultiplier: true,
      agentCanEditMemberRolling: true,
    },
  });
  const decStr = (v: { toString(): string } | null | undefined) =>
    v != null ? v.toString() : null;
  const theme = (p.themeJson as Record<string, unknown>) || {};
  const oddsApi = readOddsApiConfig(p.integrationsJson);
  const uiRaw = theme.ui;
  const ui =
    uiRaw && typeof uiRaw === 'object' && !Array.isArray(uiRaw)
      ? (uiRaw as Record<string, unknown>)
      : {};
  const announcementRows = await prisma.platformAnnouncement.findMany({
    where: { platformId: p.id, active: true },
    orderBy: { sortOrder: 'asc' },
    take: 4,
    select: {
      id: true,
      imageUrl: true,
      imageWidth: true,
      imageHeight: true,
      mandatoryRead: true,
    },
  });
  const bannerUrlsRaw = Array.isArray(theme.bannerUrls)
    ? (theme.bannerUrls as string[])
    : [];
  /** 솔루션에서 OddsHost 프록시 호출 시 쿼리 oddshostSecret 으로 씀. API `ODDSHOST_PROXY_SECRET` 과 동일. */
  const oddshostProxySecret =
    (process.env.ODDSHOST_PROXY_SECRET || '').trim() || null;
  return {
    platformId: p.id,
    slug: p.slug,
    name: p.name,
    previewPort: p.previewPort,
    theme: {
      primaryColor: (theme.primaryColor as string) || '#c9a227',
      logoUrl: normalizePublicAssetUrl(theme.logoUrl as string | undefined),
      siteName: (theme.siteName as string) || p.name,
      bannerUrls: bannerUrlsRaw
        .map((u) => normalizePublicAssetUrl(u))
        .filter((u): u is string => !!u),
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
    oddsApi: oddsApi
      ? {
          enabled: oddsApi.enabled,
          sports: oddsApi.sports,
          bookmakers: oddsApi.bookmakers,
          status: oddsApi.status,
          cacheTtlSeconds: oddsApi.cacheTtlSeconds,
          matchLimit: oddsApi.matchLimit,
          betSlipTemplate: oddsApi.betSlipTemplate,
        }
      : null,
    walletRules: {
      minDepositKrw: decStr(plimits?.minDepositKrw ?? null),
      minDepositUsdt: decStr(plimits?.minDepositUsdt ?? null),
      minWithdrawKrw: decStr(plimits?.minWithdrawKrw ?? null),
      minWithdrawUsdt: decStr(plimits?.minWithdrawUsdt ?? null),
      minPointRedeemPoints: plimits?.minPointRedeemPoints ?? null,
      minPointRedeemKrw: decStr(plimits?.minPointRedeemKrw ?? null),
      minPointRedeemUsdt: decStr(plimits?.minPointRedeemUsdt ?? null),
      rollingLockWithdrawals: plimits?.rollingLockWithdrawals ?? true,
      rollingTurnoverMultiplier: decStr(plimits?.rollingTurnoverMultiplier ?? null),
      agentCanEditMemberRolling: plimits?.agentCanEditMemberRolling ?? true,
    },
    announcements: {
      modalEnabled: ANNOUNCEMENT_MODAL_PUBLISH,
      items: announcementRows.map((r) => ({
        id: r.id,
        imageUrl: resolvePublicMediaUrl(r.imageUrl),
        width: r.imageWidth,
        height: r.imageHeight,
        mandatoryRead: r.mandatoryRead === true,
      })),
    },
    oddshost: oddshostEndpointFlags(),
    oddshostProxySecret,
  };
}
