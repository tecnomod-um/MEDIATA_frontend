import { tableExportFeatures } from "../CombinedStatistics/statisticsTableData";
import { featureArrays, sourceKey } from "../CombinedStatistics/combinedStatistics";
import { sampleStandardDeviation } from "../CombinedStatistics/numericalSummary";
import { selectionKey, sourceFeatureSelection } from "../featureSelection";
import { sourceFilter } from "../FilterModal/appliedFilters";
import { relationshipStatistics } from "../discoveryStatistics";

export function exportFeatures(data, sourceData, selectedEntries = [], selectedOnly = false) {
  const features = Object.entries(featureArrays).flatMap(([type, key]) => (data?.[key] || []).map(feature => ({ ...feature, type })));
  if (!selectedOnly) return features;
  const selected = new Set(selectedEntries.map(selectionKey));
  const members = sourceFeatureSelection(selectedEntries, sourceData);
  return features.filter(feature => selected.has(selectionKey(feature)) || (feature.pooled
    ? feature.combinedSummary.contributions.some(part => members.some(member => sourceKey(member) === sourceKey(part.source)
      && (member.originalName || member.featureName) === part.columnName))
    : members.some(member => selectionKey(member) === selectionKey(feature))));
}

const sourceColumn = feature => feature.originalName || feature.featureName;
const siteKey = source => String(source.nodeId ?? source.nodeName ?? "");
const finite = value => typeof value === "number" && !Number.isFinite(value) ? null : value ?? null;
const sourceParts = feature => feature.combinedSummary?.contributions || [];

function exportSiteLabels(sources) {
  const names = new Map(sources.map(source => [siteKey(source), source.nodeName || "Unnamed site"]));
  const reserved = new Set(names.values());
  const used = new Set();
  for (const [key, name] of names) {
    let label = name;
    if (used.has(name)) {
      let suffix = 2;
      do { label = `${name} (${suffix++})`; } while (reserved.has(label) || used.has(label));
    }
    names.set(key, label);
    used.add(label);
  }
  return names;
}

const identityHeaders = ["Feature", "Site", "Dataset"];
const countHeaders = ["Non-missing count", "Missing count", "Missing %"];
const quartileHeaders = ["Min", "Q1 (25%)", "Median (50%)", "Q3 (75%)", "Max"];

const summaryTables = {
  continuous: {
    name: "Continuous statistics",
    headers: ["Mean", "Std. Dev. (sample)", ...quartileHeaders, "Mode", "Mode count", "Mode %",
      "Skewness", "Excess kurtosis", "Mean 95% CI lower", "Mean 95% CI upper"],
  },
  categorical: {
    name: "Categorical statistics",
    headers: ["Distinct categories", "Mode", "Mode count", "Mode %", "2nd mode", "2nd mode count", "2nd mode %"],
  },
  date: {
    name: "Date statistics",
    headers: ["Mean date", "Std. Dev. (days, population)", ...quartileHeaders],
  },
};

function summaryRow(summary, type, pooled) {
  const value = field => summary.unavailable ? null : finite(summary[field]);
  const quantiles = ["min", "q1", "median", "q3", "max"].map(value);
  const counts = ["count", "missing", "percentMissing"].map(value);
  if (type === "categorical") {
    const categories = summary.unavailable ? [] : summary.categories || [];
    const mode = category => [category?.value ?? null, category?.count ?? null, finite(category?.percent)];
    return { values: [...counts, summary.unavailable ? null : categories.length, ...mode(categories[0]), ...mode(categories[1])],
      note: summary.unavailable };
  }
  if (type === "date") return { values: [...counts, value("mean"), value("stdDev"), ...quantiles], note: summary.unavailable };

  const modes = summary.unavailable ? [] : (summary.modes || []).filter(Number.isFinite);
  const modeCount = value("modeFrequency");
  const sampleSd = value("sampleStdDev") ?? sampleStandardDeviation(value("count"), value("stdDev"));
  const note = summary.unavailable || [
    pooled && summary.q1 == null ? "Pooled quartiles unavailable" : "",
    !modes.length && summary.modeStatus && summary.modeStatus !== "Available" ? `Mode: ${summary.modeStatus}` : "",
  ].filter(Boolean).join(". ");
  return {
    values: [...counts, value("mean"), sampleSd, ...quantiles, modes.length > 1 ? modes.join(", ") : modes[0] ?? null,
      modeCount, modeCount != null && summary.count > 0 ? 100 * modeCount / summary.count : null,
      ...["skewness", "kurtosis", "meanCiLower", "meanCiUpper"].map(value)],
    note,
  };
}

function table(name, headers, entries) {
  const hasNotes = entries.some(entry => entry.note);
  return { name, rows: [
    hasNotes ? [...headers, "Notes"] : headers,
    ...entries.map(({ row, note }) => hasNotes ? [...row, note || null] : row),
  ] };
}

const relationshipNames = {
  covariances: "Covariance",
  pearsonCorrelations: "Pearson correlation",
  spearmanCorrelations: "Spearman correlation",
  chiSquarePValue: "Chi-square p-value",
};

function relationshipsTable(data, sourceLabel) {
  const entries = [];
  const seen = new Set();
  for (const [statistics, included] of data) {
    if (!statistics) continue;
    const byName = new Map(included.map(feature => [feature.featureName, feature]));
    for (const { kind, left, right, value, detail } of relationshipStatistics(statistics)) {
      const x = byName.get(left), y = byName.get(right);
      if (!x || !y) continue;
      const key = JSON.stringify([kind, ...[selectionKey(x), selectionKey(y)].sort()]);
      if (seen.has(key)) continue;
      seen.add(key);
      const label = feature => feature.pooled ? `${sourceColumn(feature)} (combined)` : sourceColumn(feature);
      const sources = detail?.contributingSources || [];
      entries.push({
        row: [relationshipNames[kind], label(x), label(y), finite(value), finite(detail?.count), sources.map(sourceLabel).join("; "),
          finite(detail?.statistic), finite(detail?.degreesOfFreedom)],
        note: detail?.reason,
      });
    }
  }
  if (!entries.length) return null;
  const headers = ["Statistic", "Feature 1", "Feature 2", "Value", "Paired count", "Datasets"];
  if (entries.some(({ row }) => row[0] === relationshipNames.chiSquarePValue)) headers.push("Chi-square statistic", "Degrees of freedom");
  else entries.forEach(entry => { entry.row = entry.row.slice(0, headers.length); });
  return table("Relationships", headers, entries);
}

export function buildStatisticsReport({ data, sourceData, selectedEntries = [], appliedFilters, relationships,
  selectedOnly = false, includeBreakdown = true, includeRelationships = false }) {
  const features = exportFeatures(data, sourceData, selectedEntries, selectedOnly);
  if (!features.length) throw new Error("There are no features in this export scope.");
  const hasCombined = features.some(feature => feature.pooled);
  const memberKeys = hasCombined && includeBreakdown
    ? new Set(sourceFeatureSelection(features, sourceData).map(selectionKey)) : new Set();
  const local = exportFeatures(sourceData).filter(feature => memberKeys.has(selectionKey(feature)));
  const visibleKeys = new Set(features.map(selectionKey));
  const exported = [...features, ...local.filter(feature => !visibleKeys.has(selectionKey(feature)))];
  const sources = new Map(exported.flatMap(feature => feature.pooled ? sourceParts(feature).map(part => part.source) : [feature])
    .map(source => [sourceKey(source), source]));
  const labels = exportSiteLabels([...sources.values()]);
  const site = source => labels.get(siteKey(source)) || source.nodeName || "Unnamed site";
  const sourceLabel = source => `${site(source)} / ${source.fileName}`;
  const featureRows = [];
  const summaries = { continuous: [], categorical: [], date: [] };

  for (const feature of exported) {
    const name = sourceColumn(feature);
    const [siteName, dataset] = feature.pooled ? [null, "Combined"] : [site(feature), feature.fileName];
    const summary = tableExportFeatures({ [featureArrays[feature.type]]: [feature] })[0];
    const { values, note } = summaryRow(summary, feature.type, feature.pooled);
    const mapping = feature.pooled ? sourceParts(feature).map(part =>
      `${sourceLabel(part.source)}: ${part.columnName || part.feature?.featureName || name}`).join("; ") : null;
    featureRows.push([name, feature.type, siteName, dataset, ...(hasCombined ? [mapping] : [])]);
    summaries[feature.type].push({ row: [name, siteName, dataset, ...values], note });
  }

  const sheets = [{ name: "Features", rows: [["Feature", "Type", "Site", "Dataset", ...(hasCombined ? ["Merged from"] : [])], ...featureRows] }];
  for (const [type, { name, headers }] of Object.entries(summaryTables)) {
    if (summaries[type].length) sheets.push(table(name, [...identityHeaders, ...countHeaders, ...headers], summaries[type]));
  }
  if (includeRelationships) {
    if (!relationships) throw new Error("Relationship statistics are not ready yet.");
    const sheet = relationshipsTable([[relationships, features], [sourceData, local]], sourceLabel);
    if (sheet) sheets.push(sheet);
  }
  const filters = [...sources.values()].flatMap(source => {
    const filter = sourceFilter(appliedFilters, source);
    return filter ? [[site(source), source.fileName, filter]] : [];
  });
  if (filters.length) sheets.push({ name: "Filters", rows: [["Site", "Dataset", "Filter"], ...filters] });
  return sheets;
}
