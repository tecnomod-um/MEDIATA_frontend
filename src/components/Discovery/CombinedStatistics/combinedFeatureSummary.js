import { buildCombinedStatistics, featureArrays, sourceKey } from "./exact/combinedStatistics";
import { poolingContributions, needsProtectedMoments } from "./poolingContributions";
import { addProtectedDistribution, buildApproximateSummary } from "./protected/protectedStatistics";
import { securePooledSummary } from "./secure/securePooledSummary";
import { releasedCohortCounts, combinedCohortCount } from "./releasedCohortCounts";

function mappedSource(source, member, label) {
  const renamed = { ...source };
  for (const key of Object.values(featureArrays)) {
    renamed[key] = (source[key] || [])
      .filter((feature) => feature.featureName === member.column)
      .map((feature) => ({ ...feature, featureName: label }));
  }
  renamed.omittedFeatures = (source.omittedFeatures || [])
    .filter((feature) => feature.featureName === member.column)
    .map((feature) => ({ ...feature, featureName: label }));
  return renamed;
}

function protectedSummary(group, sources, releases, exact, approvedTotals) {
  const parts = poolingContributions(group, sources);
  const withheld = parts.filter((part) => needsProtectedMoments(part, group.type));
  const moments =
    exact.unavailable && withheld.length && parts.every((part) => part.feature || part.empty || part.withheld)
      ? {
          ...buildApproximateSummary(
            { ...group, members: withheld.map((part) => part.member) },
            releases,
            parts
              .filter((part) => part.feature && !needsProtectedMoments(part, group.type))
              .map((part) => part.feature),
            group.members.length,
            approvedTotals,
          ),
          contributions: parts.map(({ source, feature, empty }) => ({
            source,
            feature,
            type: group.type,
            status: empty ? "No matching records" : undefined,
          })),
        }
      : exact;
  return addProtectedDistribution(group, parts, releases, moments, approvedTotals);
}

// Keep approved exact values and use protected distributions to fill the remaining statistics.
export function combineFeatureSummary(group, sources, releases, secureResults, approvedTotals = releasedCohortCounts(sources)) {
  const renamed = group.members.map((member) => mappedSource(sources.get(sourceKey(member)), member, group.label));
  const exact = buildCombinedStatistics(
    renamed,
    renamed.map(() => true),
  ).features.find((feature) => feature.featureName === group.label) || {
    featureName: group.label,
    type: group.type,
    includedSources: 0,
    totalSources: renamed.length,
    unavailable: "No matching records",
    contributions: renamed.map((source) => ({ source, status: "Not available" })),
  };

  // Reuse only site releases already supplied by the caller; never request them to replace a secure round.
  const released =
    exact.unavailable && releases?.size
      ? protectedSummary(group, sources, releases, exact, approvedTotals)
      : undefined;
  const summary = secureResults?.has(group.id)
    ? securePooledSummary(group, exact, secureResults.get(group.id), released, combinedCohortCount(group, approvedTotals))
    : releases
      ? protectedSummary(group, sources, releases, exact, approvedTotals)
      : exact;

  return {
    ...summary,
    contributions: summary.contributions.map((contribution) => {
      const member = group.members.find((member) => sourceKey(member) === sourceKey(contribution.source));
      return {
        ...contribution,
        source: sources.get(sourceKey(member)),
        columnName: member.column,
        feature: contribution.feature ? { ...contribution.feature, featureName: member.column } : undefined,
      };
    }),
  };
}
