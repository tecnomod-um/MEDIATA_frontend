import { sourceKey, featureArrays as arrays } from "./exact/combinedStatistics";
import { activeColumnMappings, memberKey } from "./columnMappings";
import { combineFeatureSummary } from "./combinedFeatureSummary";
import { summaryTableFeature } from "./summaryTableFeature";
import { releasedCohortCounts } from "./releasedCohortCounts";

// Adapt released pooled summaries to the same shape used by the existing tables.
// Charts retain individual distributions; pooled quantiles need complete approved frequencies.
export function combineMappedTableData(data, results, activeIndices, mappings, approximateReleases, secureResults) {
  const visible = new Set(
    Object.values(arrays).flatMap((key) =>
      (data[key] || []).map((feature) =>
        memberKey({ ...feature, column: feature.originalName || feature.featureName }),
      ),
    ),
  );
  for (const feature of data.omittedFeatures || []) {
    visible.add(memberKey({ ...feature, column: feature.originalName || feature.featureName }));
  }
  const groups = activeColumnMappings(mappings, results, activeIndices).filter((group) =>
    group.members.some((member) => visible.has(memberKey(member))),
  );
  const used = new Set(groups.flatMap((group) => group.members.map(memberKey)));
  const tableData = { continuousFeatures: [], categoricalFeatures: [], dateFeatures: [] };
  if (data.omittedFeatures?.length) {
    tableData.omittedFeatures = data.omittedFeatures.filter(
      (feature) =>
        !used.has(
          memberKey({
            ...feature,
            column: feature.originalName || feature.featureName,
          }),
        ),
    );
  }
  for (const key of Object.values(arrays)) {
    tableData[key] = (data[key] || []).filter(
      (feature) => !used.has(memberKey({ ...feature, column: feature.originalName || feature.featureName })),
    );
  }
  const bySource = new Map(results.map((source) => [sourceKey(source), source]));
  const approvedTotals = releasedCohortCounts(bySource);
  for (const group of groups) {
    const summary = combineFeatureSummary(group, bySource, approximateReleases, secureResults, approvedTotals);
    const type = summary.type || group.type;
    const feature = { ...summaryTableFeature(summary), pooled: true, mappingId: group.id, combinedSummary: summary };
    tableData[arrays[type]].push(feature);
  }
  return tableData;
}
