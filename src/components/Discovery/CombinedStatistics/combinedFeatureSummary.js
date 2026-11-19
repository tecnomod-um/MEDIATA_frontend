import { buildCombinedStatistics, featureArrays, sourceKey } from "./exact/combinedStatistics";
import { poolingContributions, needsProtectedMoments } from "./poolingContributions";
import { addProtectedDistribution, buildApproximateSummary } from "./protected/protectedStatistics";
import { securePooledSummary } from "./secure/securePooledSummary";

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

function protectedSummary(group, sources, releases, exact) {
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
          ),
          contributions: parts.map(({ source, feature, empty }) => ({
            source,
            feature,
            type: group.type,
            status: empty ? "No matching records" : undefined,
          })),
        }
      : exact;
  return addProtectedDistribution(group, parts, releases, moments);
}

/**
 * Compose approved exact summaries with the appropriate protected distribution.
 * Secure aggregation is a transport layer for protected contributions, not a
 * stronger privacy allowance. Never replace a failed secure round with an
 * unmasked cross-node request. Existing approved exact fields remain exact.
 */
export function combineFeatureSummary(group, sources, releases, secureResults) {
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

  const summary = secureResults?.has(group.id)
    ? securePooledSummary(group, exact, secureResults.get(group.id))
    : releases
      ? protectedSummary(group, sources, releases, exact)
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
