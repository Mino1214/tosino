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

export const platformIntegrationsSchema = z.object({
  sportsFeeds: z.array(sportsFeedConfigSchema).optional(),
});

export type PlatformIntegrations = z.infer<typeof platformIntegrationsSchema>;
export type SportsFeedConfig = z.infer<typeof sportsFeedConfigSchema>;

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
