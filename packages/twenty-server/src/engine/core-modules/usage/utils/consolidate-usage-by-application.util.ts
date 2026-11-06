import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import {
  type UsageApplicationBreakdownItem,
  type UsageBreakdownItem,
} from 'src/engine/core-modules/usage/services/usage-analytics.service';

type ConsolidateUsageByApplicationParams = {
  items: UsageApplicationBreakdownItem[];
  flatApplicationMaps: FlatApplicationCacheMaps;
};

// Uninstalled apps are looked up too, or their spend would drop out of the pie while still billed.
// Keying on the label merges apps sharing a display name, which would otherwise collide as one chart id.
export const consolidateUsageByApplication = ({
  items,
  flatApplicationMaps,
}: ConsolidateUsageByApplicationParams): UsageBreakdownItem[] => {
  const creditsByKey = new Map<string, number>();

  for (const item of items) {
    const application = flatApplicationMaps.byId[item.applicationId];
    const key = application?.name ?? item.applicationId;

    creditsByKey.set(key, (creditsByKey.get(key) ?? 0) + item.creditsUsed);
  }

  return [...creditsByKey.entries()]
    .map(([key, creditsUsed]) => ({ key, label: key, creditsUsed }))
    .sort((a, b) => b.creditsUsed - a.creditsUsed);
};
