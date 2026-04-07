import {
  partitionSportsFeedsByMarket,
  platformIntegrationsSchema,
} from '@tosino/shared';

export type PublicSportsRow = { id: string; sportLabel: string };

export type PublicSportsSections = {
  domestic: PublicSportsRow[];
  european: PublicSportsRow[];
  unset: PublicSportsRow[];
};

export function publicSportsSectionsFromIntegrations(
  integrationsJson: unknown,
): PublicSportsSections {
  const parsed = platformIntegrationsSchema.safeParse(integrationsJson ?? {});
  if (!parsed.success) {
    return { domestic: [], european: [], unset: [] };
  }
  const { domestic, european, unset } = partitionSportsFeedsByMarket(
    parsed.data,
  );
  const map = (feeds: { id: string; sportLabel: string }[]) =>
    feeds.map((f) => ({ id: f.id, sportLabel: f.sportLabel }));
  return {
    domestic: map(domestic),
    european: map(european),
    unset: map(unset),
  };
}
