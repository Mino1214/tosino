type JsonRecord = Record<string, unknown>;

export const DEFAULT_PLATFORM_HOST_SUFFIX =
  process.env.PLATFORM_ROOT_HOST_SUFFIX?.trim().toLowerCase() ||
  process.env.PLATFORM_HOST_SUFFIX?.trim().toLowerCase() ||
  'tozinosolution.com';

export type PlatformTemplateKey = 'HYBRID' | 'CASINO' | 'SPORTS';

export type SolutionRatePolicy = {
  upstreamCasinoPct: string | null;
  upstreamSportsPct: string | null;
  platformCasinoPct: string | null;
  platformSportsPct: string | null;
  autoMarginPct: string | null;
};

export type PlatformTemplatePreset = {
  key: PlatformTemplateKey;
  label: string;
  description: string;
  defaultHostSuffix: string;
  defaultThemeJson: JsonRecord;
  defaultFlagsJson: JsonRecord;
  defaultOperational: {
    rollingLockWithdrawals: boolean;
    rollingTurnoverMultiplier: number;
    agentCanEditMemberRolling: boolean;
    pointRulesJson: JsonRecord;
  };
  defaultRatePolicy: SolutionRatePolicy;
};

function dec(value: number | null): string | null {
  return value == null ? null : value.toFixed(2);
}

function buildRatePolicy(
  upstreamCasinoPct: number | null,
  upstreamSportsPct: number | null,
  autoMarginPct: number | null,
): SolutionRatePolicy {
  const margin = autoMarginPct ?? 1;
  return {
    upstreamCasinoPct: dec(upstreamCasinoPct),
    upstreamSportsPct: dec(upstreamSportsPct),
    platformCasinoPct:
      upstreamCasinoPct != null ? dec(upstreamCasinoPct + margin) : dec(margin),
    /** 스포츠 청구율은 상위 스포츠 알값과 동일(자동 마진은 카지노 버킷에만 가산). */
    platformSportsPct:
      upstreamSportsPct != null ? dec(upstreamSportsPct) : dec(0),
    autoMarginPct: dec(autoMarginPct),
  };
}

const TEMPLATE_PRESETS: Record<PlatformTemplateKey, PlatformTemplatePreset> = {
  HYBRID: {
    key: 'HYBRID',
    label: '하이브리드',
    description: '카지노와 스포츠를 함께 운영하는 기본 솔루션 템플릿',
    defaultHostSuffix: DEFAULT_PLATFORM_HOST_SUFFIX,
    defaultThemeJson: {
      primaryColor: '#c9a227',
      siteName: 'Hybrid Solution',
      bannerUrls: [],
      ui: {
        headerStyle: 'glass',
        homeLayout: 'banner',
        cardRadius: 'xl',
        density: 'comfortable',
        background: 'dark',
      },
    },
    defaultFlagsJson: {
      solutionTemplateKey: 'HYBRID',
    },
    defaultOperational: {
      rollingLockWithdrawals: true,
      rollingTurnoverMultiplier: 1,
      agentCanEditMemberRolling: true,
      pointRulesJson: {
        attendMode: 'instant',
      },
    },
    defaultRatePolicy: buildRatePolicy(0, 0, 1),
  },
  CASINO: {
    key: 'CASINO',
    label: '카지노 중심',
    description: '카지노 운영을 우선하는 솔루션 템플릿',
    defaultHostSuffix: DEFAULT_PLATFORM_HOST_SUFFIX,
    defaultThemeJson: {
      primaryColor: '#b68a2f',
      siteName: 'Casino Solution',
      bannerUrls: [],
      ui: {
        headerStyle: 'solid',
        homeLayout: 'banner',
        cardRadius: 'xl',
        density: 'comfortable',
        background: 'dark',
      },
    },
    defaultFlagsJson: {
      solutionTemplateKey: 'CASINO',
    },
    defaultOperational: {
      rollingLockWithdrawals: true,
      rollingTurnoverMultiplier: 1,
      agentCanEditMemberRolling: true,
      pointRulesJson: {
        attendMode: 'instant',
      },
    },
    defaultRatePolicy: buildRatePolicy(0, 0, 1.5),
  },
  SPORTS: {
    key: 'SPORTS',
    label: '스포츠 중심',
    description: '스포츠 운영을 우선하는 솔루션 템플릿',
    defaultHostSuffix: DEFAULT_PLATFORM_HOST_SUFFIX,
    defaultThemeJson: {
      primaryColor: '#1c7f55',
      siteName: 'Sports Solution',
      bannerUrls: [],
      ui: {
        headerStyle: 'solid',
        homeLayout: 'banner',
        cardRadius: 'xl',
        density: 'comfortable',
        background: 'dark',
      },
    },
    defaultFlagsJson: {
      solutionTemplateKey: 'SPORTS',
    },
    defaultOperational: {
      rollingLockWithdrawals: true,
      rollingTurnoverMultiplier: 1,
      agentCanEditMemberRolling: true,
      pointRulesJson: {
        attendMode: 'instant',
      },
    },
    defaultRatePolicy: buildRatePolicy(0, 0, 1),
  },
};

export function listPlatformTemplatePresets(): PlatformTemplatePreset[] {
  return Object.values(TEMPLATE_PRESETS);
}

export function getPlatformTemplatePreset(
  key?: string | null,
): PlatformTemplatePreset {
  const normalized = (key || '').trim().toUpperCase() as PlatformTemplateKey;
  return TEMPLATE_PRESETS[normalized] ?? TEMPLATE_PRESETS.HYBRID;
}

export function normalizePlatformSubdomain(slug: string): string {
  const cleaned = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return cleaned || 'solution';
}

export function buildDefaultPlatformHost(
  slug: string,
  hostSuffix = DEFAULT_PLATFORM_HOST_SUFFIX,
): string {
  return `${normalizePlatformSubdomain(slug)}.${hostSuffix}`;
}
