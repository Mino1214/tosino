import { z } from "zod";

export const UserRoleSchema = z.enum([
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "MASTER_AGENT",
  "USER",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const themeUiSchema = z.object({
  headerStyle: z.enum(["glass", "solid"]).default("glass"),
  homeLayout: z.enum(["banner", "minimal"]).default("banner"),
  cardRadius: z.enum(["xl", "lg", "md"]).default("xl"),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  background: z.enum(["dark", "darker"]).default("dark"),
});
export type ThemeUi = z.infer<typeof themeUiSchema>;

export const bootstrapThemeSchema = z.object({
  primaryColor: z.string(),
  logoUrl: z.string().nullable(),
  siteName: z.string(),
  bannerUrls: z.array(z.string()),
  ui: themeUiSchema.partial().optional(),
});
export type BootstrapTheme = z.infer<typeof bootstrapThemeSchema>;

/** Third-party sports / odds feed metadata (tokens live in env, not here). */
export const sportsFeedKindSchema = z.enum([
  "graphql_persisted",
  "rest_json",
  "virtual_feed",
]);

/** UI·동기화에서 국내/유럽 스포츠 탭으로 나눌 때 사용 */
export const sportsFeedMarketSchema = z.enum(["DOMESTIC", "EUROPEAN"]);

export const SPORTS_FEED_MARKET_LABELS: Record<
  z.infer<typeof sportsFeedMarketSchema>,
  string
> = {
  DOMESTIC: "국내 스포츠",
  EUROPEAN: "유럽 스포츠",
};

export const sportsFeedConfigSchema = z.object({
  id: z.string(),
  sportLabel: z.string(),
  /** 없으면 클라이언트에서 기본 탭(예: 유럽) 또는 미분류로 처리 */
  market: sportsFeedMarketSchema.optional(),
  kind: sportsFeedKindSchema,
  baseUrl: z.string().url().optional(),
  operationName: z.string().optional(),
  persistedQueryHash: z.string().optional(),
  resourcePath: z.string().optional(),
  credentialEnvKey: z.string().optional(),
  cacheTtlSeconds: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const oddsApiStatusFilterSchema = z.enum(["all", "live", "prematch"]);
export type OddsApiStatusFilter = z.infer<typeof oddsApiStatusFilterSchema>;

export const oddsApiMarketKeySchema = z.enum([
  "moneyline",
  "handicap",
  "totals",
]);
export type OddsApiMarketKey = z.infer<typeof oddsApiMarketKeySchema>;

const DEFAULT_ODDS_API_BET_SLIP_TEMPLATE = {
  title: "배팅카트",
  subtitle: "실시간 배당 기준",
  quickAmounts: [10000, 50000, 100000, 300000, 500000, 1000000],
  marketPriority: ["moneyline", "handicap", "totals"] as OddsApiMarketKey[],
  showBookmakerCount: true,
  showSourceBookmaker: true,
};

export const oddsApiBetSlipTemplateSchema = z.object({
  title: z.string().default(DEFAULT_ODDS_API_BET_SLIP_TEMPLATE.title),
  subtitle: z.string().default(DEFAULT_ODDS_API_BET_SLIP_TEMPLATE.subtitle),
  quickAmounts: z
    .array(z.number().int().positive())
    .default(DEFAULT_ODDS_API_BET_SLIP_TEMPLATE.quickAmounts),
  marketPriority: z
    .array(oddsApiMarketKeySchema)
    .default(DEFAULT_ODDS_API_BET_SLIP_TEMPLATE.marketPriority),
  showBookmakerCount: z
    .boolean()
    .default(DEFAULT_ODDS_API_BET_SLIP_TEMPLATE.showBookmakerCount),
  showSourceBookmaker: z
    .boolean()
    .default(DEFAULT_ODDS_API_BET_SLIP_TEMPLATE.showSourceBookmaker),
});
export type OddsApiBetSlipTemplate = z.infer<
  typeof oddsApiBetSlipTemplateSchema
>;

export const oddsApiConfigSchema = z.object({
  enabled: z.boolean().default(false),
  sports: z.array(z.string()).default([]),
  bookmakers: z.array(z.string()).default([]),
  status: oddsApiStatusFilterSchema.default("all"),
  cacheTtlSeconds: z.number().int().positive().default(30),
  matchLimit: z.number().int().positive().max(500).default(120),
  betSlipTemplate: oddsApiBetSlipTemplateSchema.default(
    DEFAULT_ODDS_API_BET_SLIP_TEMPLATE,
  ),
});
export type OddsApiConfig = z.infer<typeof oddsApiConfigSchema>;

export const platformIntegrationsSchema = z.object({
  sportsFeeds: z.array(sportsFeedConfigSchema).optional(),
  oddsApi: oddsApiConfigSchema.optional(),
});

export type PlatformIntegrations = z.infer<typeof platformIntegrationsSchema>;
export type SportsFeedConfig = z.infer<typeof sportsFeedConfigSchema>;

export const casinoLobbySampleGameSchema = z.object({
  game: z.string(),
  title: z.string(),
  group: z.string().optional(),
  icon: z.string().optional(),
});
export type CasinoLobbySampleGame = z.infer<typeof casinoLobbySampleGameSchema>;

export const casinoLobbyVendorCategorySchema = z.enum([
  "casino",
  "slot",
  "arcade",
  "other",
  "holdem",
]);
export type CasinoLobbyVendorCategory = z.infer<
  typeof casinoLobbyVendorCategorySchema
>;

export const casinoLobbyVendorSchema = z.object({
  id: z.string(),
  category: casinoLobbyVendorCategorySchema,
  name: z.string(),
  shortName: z.string(),
  vendor: z.string(),
  game: z.string().default("lobby"),
  route: z.string().default(""),
  status: z.enum(["live", "paused"]).default("live"),
  logo: z.string().nullable().default(null),
  headline: z.string().default(""),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  gameCount: z.number().int().nonnegative().nullable().default(null),
  featuredLabels: z.array(z.string()).default([]),
  sampleGames: z.array(casinoLobbySampleGameSchema).default([]),
  entryStyle: z.enum(["hero", "card"]).default("hero"),
});
export type CasinoLobbyVendor = z.infer<typeof casinoLobbyVendorSchema>;

export const casinoLobbyCatalogSchema = z.object({
  updatedAt: z.string(),
  casino: z.array(casinoLobbyVendorSchema),
  slot: z.array(casinoLobbyVendorSchema),
  arcade: z.array(casinoLobbyVendorSchema),
  other: z.array(casinoLobbyVendorSchema),
  holdem: z.array(casinoLobbyVendorSchema),
});
export type CasinoLobbyCatalog = z.infer<typeof casinoLobbyCatalogSchema>;

export {
  ODDSHOST_SPORT_ID_NAME_KR,
  ODDSHOST_SPORT_IDS_WITH_KO_LABEL,
  oddshostSportNameKr,
} from "./oddshost-sport-id-ko";

export function readOddsApiConfig(
  integrations: unknown,
): OddsApiConfig | null {
  if (!integrations || typeof integrations !== "object") {
    return null;
  }
  const raw = (integrations as { oddsApi?: unknown }).oddsApi;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const merged = {
    ...DEFAULT_ODDS_API_BET_SLIP_TEMPLATE,
    ...(raw as Record<string, unknown>),
  };
  const templateRaw =
    (raw as { betSlipTemplate?: unknown }).betSlipTemplate ?? {};
  const normalized = {
    ...merged,
    betSlipTemplate: {
      ...DEFAULT_ODDS_API_BET_SLIP_TEMPLATE,
      ...(templateRaw && typeof templateRaw === "object"
        ? (templateRaw as Record<string, unknown>)
        : {}),
    },
  };
  const parsed = oddsApiConfigSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

/** 솔루션 UI에서 국내/유럽 탭으로 나눌 때 사용 */
export function partitionSportsFeedsByMarket(
  integrations: PlatformIntegrations | null | undefined,
): {
  domestic: SportsFeedConfig[];
  european: SportsFeedConfig[];
  unset: SportsFeedConfig[];
} {
  const feeds = integrations?.sportsFeeds ?? [];
  const domestic: SportsFeedConfig[] = [];
  const european: SportsFeedConfig[] = [];
  const unset: SportsFeedConfig[] = [];
  for (const f of feeds) {
    if (f.market === "DOMESTIC") domestic.push(f);
    else if (f.market === "EUROPEAN") european.push(f);
    else unset.push(f);
  }
  return { domestic, european, unset };
}
