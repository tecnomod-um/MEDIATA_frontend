import { buildCombinedStatistics, categoryFrequencies, sourceKey, featureArrays as arrays } from "./combinedStatistics.js";
import { activeColumnMappings, memberKey } from "./columnMappings.js";
import { addProtectedDistribution, buildApproximateSummary } from "./approximatePooling.js";
import { summaryTableFeature } from "./summaryTableFeature";
import { poolingContributions, needsProtectedMoments } from "./poolingContributions.js";
import {securePooledSummary} from "./securePooledSummary";


// Adapt released pooled summaries to the same shape used by the existing tables.
// Charts retain individual distributions; pooled quantiles need complete approved frequencies.
export function combineMappedTableData(data, results, activeIndices, mappings, approximateReleases, secureResults) {
  const visible = new Set(Object.values(arrays).flatMap(key => (data[key] || []).map(feature => memberKey({ ...feature, column: feature.originalName || feature.featureName }))));
  for (const feature of data.omittedFeatures || []) {
    visible.add(memberKey({ ...feature, column: feature.originalName || feature.featureName }));
  }
  const groups = activeColumnMappings(mappings, results, activeIndices).filter(group => group.members.some(member => visible.has(memberKey(member))));
  const used = new Set(groups.flatMap(group => group.members.map(memberKey)));
  const tableData = { continuousFeatures: [], categoricalFeatures: [], dateFeatures: [] };
  if (data.omittedFeatures?.length) {
    tableData.omittedFeatures = data.omittedFeatures.filter(feature => !used.has(memberKey({
      ...feature, column: feature.originalName || feature.featureName,
    })));
  }
  for (const key of Object.values(arrays)) {
    tableData[key] = (data[key] || []).filter(feature => !used.has(memberKey({ ...feature, column: feature.originalName || feature.featureName })));
  }
  const bySource = new Map(results.map(source => [sourceKey(source), source]));
  for (const group of groups) {
    const sources = group.members.map(member => {
      const source = bySource.get(sourceKey(member));
      const renamed = { ...source };
      for (const key of Object.values(arrays)) renamed[key] = (source[key] || []).filter(feature => feature.featureName === member.column).map(feature => ({ ...feature, featureName: group.label }));
      renamed.omittedFeatures = (source.omittedFeatures || []).filter(feature => feature.featureName === member.column).map(feature => ({ ...feature, featureName: group.label }));
      return renamed;
    });
    const exact = buildCombinedStatistics(sources, sources.map(() => true)).features.find(feature => feature.featureName === group.label)
      || { featureName: group.label, type: group.type, includedSources: 0, totalSources: sources.length, unavailable: "No matching records",
        contributions: sources.map(source => ({ source, status: "Not available" })) };
    const parts = approximateReleases ? poolingContributions(group, bySource) : [];
    const withheld = parts.filter(part => needsProtectedMoments(part, group.type));
    const moments = exact.unavailable && withheld.length && parts.every(part => part.feature || part.empty || part.withheld)
      ? { ...buildApproximateSummary({ ...group, members: withheld.map(part => part.member) }, approximateReleases,
          parts.filter(part => part.feature && !needsProtectedMoments(part, group.type)).map(part => part.feature), group.members.length),
        contributions: parts.map(({ source, feature, empty }) => ({
          source, feature, type: group.type,
          status: empty ? "No matching records" : undefined,
        })) }
      : exact;
    const summary = secureResults?.has(group.id) ? securePooledSummary(group,exact,secureResults.get(group.id))
      : approximateReleases ? addProtectedDistribution(group, parts, approximateReleases, moments) : moments;
    summary.contributions = summary.contributions.map(contribution => {
      const member = group.members.find(member => sourceKey(member) === sourceKey(contribution.source));
      const original = bySource.get(sourceKey(member));
      return { ...contribution, source: original, columnName: member.column,
        feature: contribution.feature ? { ...contribution.feature, featureName: member.column } : undefined };
    });
    const type = summary.type || group.type;
    const feature = {...summaryTableFeature(summary), pooled:true, mappingId:group.id, combinedSummary:summary};
    tableData[arrays[type]].push(feature);
  }
  return tableData;
}

export function tableExportFeatures(data) {
  return Object.entries(arrays).flatMap(([type, key]) => (data[key] || []).map(feature => {
    if (feature.combinedSummary) return feature.combinedSummary;
    if (feature.estimatedSummary) return feature.estimatedSummary;
    const count = feature.count, missing = feature.missingValuesCount;
    return {
      ...feature, type, missing, percentMissing: 100 * missing / (count + missing),
      min: type === "date" ? feature.earliestDate : feature.min,
      max: type === "date" ? feature.latestDate : feature.max,
      q1: type === "date" ? feature.q1 : feature.qrt1,
      q3: type === "date" ? feature.q3 : feature.qrt3,
      includedSources: 1, totalSources: 1, contributions: [{ source: feature, feature }],
      categories: type === "categorical" ? categoryFrequencies(Object.entries(feature.categoryCounts || {}), count) : undefined,
    };
  }));
}
