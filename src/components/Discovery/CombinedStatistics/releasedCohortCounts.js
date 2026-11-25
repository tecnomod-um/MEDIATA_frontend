import { featureArrays, sourceKey } from "./exact/combinedStatistics";

// Only current, exact source summaries can establish an already released population size.
export function releasedCohortCounts(sources) {
  const totals = new Map();
  for (const source of sources.values()) {
    const counts = Object.values(featureArrays).flatMap((key) => source[key] || [])
      .filter((feature) => !feature.approximate && !feature.estimatedSummary && !feature.combinedSummary)
      .filter((feature) => Number.isSafeInteger(feature.count) && feature.count >= 0
        && Number.isSafeInteger(feature.missingValuesCount) && feature.missingValuesCount >= 0)
      .map((feature) => feature.count + feature.missingValuesCount);
    if (counts.length && counts.every((count) => Number.isSafeInteger(count) && count === counts[0])) {
      totals.set(sourceKey(source), counts[0]);
    }
  }
  return totals;
}

// A combination can reuse a total only when every distinct selected source supplies it.
export function combinedCohortCount(group, totals) {
  const keys = group.members.map(sourceKey);
  if (!keys.length || new Set(keys).size !== keys.length || keys.some((key) => !totals.has(key))) return undefined;
  const count = keys.reduce((sum, key) => sum + totals.get(key), 0);
  return Number.isSafeInteger(count) ? count : undefined;
}
