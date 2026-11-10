import { buildCombinedStatistics, sourceKey, featureArrays as arrays } from "./combinedStatistics.js";
import { activeColumnMappings, memberKey } from "./columnMappings.js";


// Adapt released pooled summaries to the same shape used by the existing tables.
// Charts retain individual distributions; pooled quantiles need complete approved frequencies.
export function combineMappedTableData(data, results, activeIndices, mappings) {
  const visible = new Set(Object.values(arrays).flatMap(key => (data[key] || []).map(feature => memberKey({ ...feature, column: feature.originalName || feature.featureName }))));
  const groups = activeColumnMappings(mappings, results, activeIndices).filter(group => group.members.some(member => visible.has(memberKey(member))));
  const used = new Set(groups.flatMap(group => group.members.map(memberKey)));
  const tableData = { continuousFeatures: [], categoricalFeatures: [], dateFeatures: [] };
  for (const key of Object.values(arrays)) {
    tableData[key] = (data[key] || []).filter(feature => !used.has(memberKey({ ...feature, column: feature.originalName || feature.featureName })));
  }
  for (const group of groups) {
    const sources = group.members.map(member => {
      const source = results.find(source => sourceKey(source) === sourceKey(member));
      const renamed = { ...source };
      for (const key of Object.values(arrays)) renamed[key] = (source[key] || []).filter(feature => feature.featureName === member.column).map(feature => ({ ...feature, featureName: group.label }));
      renamed.omittedFeatures = (source.omittedFeatures || []).filter(feature => feature.featureName === member.column).map(feature => ({ ...feature, featureName: group.label }));
      return renamed;
    });
    const summary = buildCombinedStatistics(sources, sources.map(() => true)).features.find(feature => feature.featureName === group.label)
      || { featureName: group.label, type: group.type, includedSources: 0, totalSources: sources.length, unavailable: "No matching records", contributions: [] };
    summary.contributions = summary.contributions.map(contribution => {
      const member = group.members.find(member => sourceKey(member) === sourceKey(contribution.source));
      const original = results.find(source => sourceKey(source) === sourceKey(member));
      return { ...contribution, source: original, columnName: member.column,
        feature: contribution.feature ? { ...contribution.feature, featureName: member.column } : undefined };
    });
    const type = summary.type || group.type;
    const feature = {
      featureName: summary.featureName, pooled: true, mappingId: group.id, combinedSummary: summary,
      count: summary.unavailable ? null : summary.count,
      missingValuesCount: summary.unavailable ? null : summary.missing,
      mean: summary.mean, stdDev: summary.stdDev, min: summary.min, max: summary.max,
      qrt1: summary.q1, qrt3: summary.q3, median: summary.median,
      q1: summary.q1, q3: summary.q3, earliestDate: summary.min, latestDate: summary.max,
      datasetCount: `${summary.includedSources}/${summary.totalSources}`,
      status: summary.unavailable || "Combined",
    };
    if (type === "categorical") {
      const categories = summary.categories || [];
      feature.categoryCounts = Object.fromEntries(categories.map(c => [c.value, c.count]));
      feature.mode = categories[0]?.value;
      feature.modeFrequency = categories[0]?.count;
      feature.modeFrequencyPercentage = categories[0]?.percent;
      feature.secondMode = categories[1]?.value;
      feature.secondModeFrequency = categories[1]?.count;
      feature.secondModePercentage = categories[1]?.percent;
    }
    tableData[arrays[type]].push(feature);
  }
  return tableData;
}

export function tableExportFeatures(data) {
  return Object.entries(arrays).flatMap(([type, key]) => (data[key] || []).map(feature => {
    if (feature.combinedSummary) return feature.combinedSummary;
    const count = feature.count, missing = feature.missingValuesCount;
    return {
      ...feature, type, missing, percentMissing: 100 * missing / (count + missing),
      min: type === "date" ? feature.earliestDate : feature.min,
      max: type === "date" ? feature.latestDate : feature.max,
      q1: type === "date" ? feature.q1 : feature.qrt1,
      q3: type === "date" ? feature.q3 : feature.qrt3,
      includedSources: 1, totalSources: 1, contributions: [{ source: feature, feature }],
      categories: type === "categorical" ? Object.entries(feature.categoryCounts || {}).map(([value, n]) => ({ value, count: n, percent: 100 * n / count })) : undefined,
    };
  }));
}
