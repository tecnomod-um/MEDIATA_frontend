import { sourceKey, sourceLabel, sourceFileLabel } from "./CombinedStatistics/combinedStatistics.js";
import { columnArrays } from "./CombinedStatistics/columnMappings.js";
import { statisticsCsvRows } from "../../util/statisticsCsv.js";
import { combinedFilter } from "./FilterModal/appliedFilters.js";

export const relationshipArrays = ["covariances", "pearsonCorrelations", "spearmanCorrelations"];
const relationshipType = {covariances:"covariance", pearsonCorrelations:"pearson", spearmanCorrelations:"spearman"};
export const relationshipConventions = {
  covariances: "Sample covariance (divisor n−1), using paired non-missing observations.",
  pearsonCorrelations: "Pearson correlation using paired non-missing observations.",
  spearmanCorrelations: "Spearman correlation using global average-tie ranks of paired non-missing observations.",
  chiSquarePValue: "Pearson chi-square from paired category counts, without continuity correction.",
};

export function categoryPercent(frequency, count) {
  return Number.isFinite(frequency) && frequency >= 0 && Number.isSafeInteger(count) && count > 0 && frequency <= count
    ? 100 * frequency / count : undefined;
}

export function formatCategoryPercent(frequency, count) {
  const percent = categoryPercent(frequency, count);
  return percent == null ? "N/A" : `${percent.toFixed(2)}%`;
}

// Use the same source-qualified identities in tables, filters, charts and relationships.
// Relationship blocks remain local to their dataset; they are never averaged or pooled.
export function collectDiscoveryStatistics(results, activeIndices) {
  const collected = {
    ...Object.fromEntries(Object.values(columnArrays).map(key => [key, []])),
    ...Object.fromEntries(relationshipArrays.map(key => [key, Object.create(null)])),
    chiSquareTest: [], omittedFeatures: [],
    relationshipDetails: {covariance:{}, pearson:{}, spearman:{}},
  };
  results.forEach((source, index) => {
    if (!activeIndices[index]) return;
    const fileLabel = sourceFileLabel(source, results, index);
    const label = name => `${name} (${fileLabel})`;
    const identity = { nodeId: source.nodeId, nodeName: source.nodeName, fileName: source.fileName || fileLabel };
    const pairedCounts = new Map([...(source.numericPairSummaries || []), ...(source.categoricalPairSummaries || [])]
      .flatMap(pair => [[JSON.stringify([pair.featureX,pair.featureY]),pair.count], [JSON.stringify([pair.featureY,pair.featureX]),pair.count]]));
    const detail = (x,y) => ({count:pairedCounts.get(JSON.stringify([x,y])), datasets:[sourceLabel(source)], contributingSources:[identity], pooled:false});
    for (const key of Object.values(columnArrays)) {
      collected[key].push(...(source[key] || []).map(feature => ({
        ...feature, ...identity, originalName: feature.featureName, featureName: label(feature.featureName),
      })));
    }
    for (const key of relationshipArrays) {
      for (const [row, values] of Object.entries(source[key] || {})) {
        collected[key][label(row)] = Object.fromEntries(Object.entries(values).map(([column, value]) => [label(column), value]));
        collected.relationshipDetails[relationshipType[key]][label(row)] = Object.fromEntries(Object.keys(values).map(column => [label(column), detail(row,column)]));
      }
    }
    collected.chiSquareTest.push(...(source.chiSquareTest || []).map(test => ({
      ...test, ...identity, ...detail(test.category1,test.category2), category1: label(test.category1), category2: label(test.category2),
    })));
    collected.omittedFeatures.push(...(source.omittedFeatures || []).map(feature => ({
      ...feature, ...identity, originalName: feature.featureName, featureName: label(feature.featureName),
    })));
  });
  return collected;
}

// Apply the existing visibility toggles to relationships as well as feature summaries.
export function visibleRelationships(data) {
  const continuous = new Set([...(data?.continuousFeatures || []), ...(data?.dateFeatures || [])].map(feature => feature.featureName));
  const categorical = new Set((data?.categoricalFeatures || []).map(feature => feature.featureName));
  return {
    ...Object.fromEntries(relationshipArrays.map(key => [key, Object.fromEntries(
      Object.entries(data?.[key] || {}).filter(([row]) => continuous.has(row)).map(([row, values]) => [row,
        Object.fromEntries(Object.entries(values).filter(([column]) => continuous.has(column))),
      ]),
    )])),
    chiSquareTest: (data?.chiSquareTest || []).filter(test => categorical.has(test.category1) && categorical.has(test.category2)),
    omittedFeatures: data?.omittedFeatures || [],
    relationshipDetails: data?.relationshipDetails,
  };
}

export function updateSourceFeature(source, change) {
  if (sourceKey(source) !== sourceKey(change)) return source;
  return {...change.response, nodeId: source.nodeId, nodeName: source.nodeName, fileName: source.fileName};
}

export function relationshipStatisticsCsv(data, featureFilters = {}, appliedFilters) {
  const rows = [["Statistic", "Feature 1", "Feature 2", "Value", "Cohort", "Paired count", "Contributing datasets", "Status", "Chi-square statistic", "Degrees of freedom", "Methods"]];
  for (const key of relationshipArrays) {
    for (const [row, values] of Object.entries(data[key] || {})) {
      for (const [column, value] of Object.entries(values)) {
        if (row.localeCompare(column) > 0 && Object.hasOwn(data[key]?.[column] || {}, row)) continue; // Each symmetric pair appears once.
        const type = key === "covariances" ? "covariance" : key === "pearsonCorrelations" ? "pearson" : "spearman";
        const detail = data.relationshipDetails?.[type]?.[row]?.[column];
        const cohort = appliedFilters && detail?.contributingSources
          ? combinedFilter(appliedFilters, detail.contributingSources) || "All records" : featureFilters[row] || "All records";
        rows.push([key, row, column, Number.isFinite(value) ? value : "", cohort, detail?.count,
          detail?.datasets?.join("; "), detail?.reason || (detail?.pooled ? "Combined" : "Individual dataset"), "", "", relationshipConventions[key]]);
      }
    }
  }
  for (const test of data.chiSquareTest || []) {
    rows.push(["chiSquarePValue", test.category1, test.category2,
      Number.isFinite(test.pvalue) ? test.pvalue : "", appliedFilters && test.contributingSources
        ? combinedFilter(appliedFilters, test.contributingSources) || "All records" : featureFilters[test.category1] || "All records", test.count,
      test.datasets?.join("; "), test.reason || (test.pooled ? "Combined" : "Individual dataset"), test.statistic, test.degreesOfFreedom, relationshipConventions.chiSquarePValue]);
  }
  return statisticsCsvRows(rows);
}
