import { tableExportFeatures } from "../CombinedStatistics/statisticsTableData";
import { featureArrays, sourceKey, summaryConventions } from "../CombinedStatistics/combinedStatistics";
import { selectionKey, sourceFeatureSelection } from "../featureSelection";
import { combinedFilter, sourceFilter } from "../FilterModal/appliedFilters";
import { relationshipStatisticsRows, relationshipConventions } from "../discoveryStatistics";
import { numericalMethods } from "../CombinedStatistics/numericalSummary";

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

const sourceIdentity = source => [source?.nodeName || source?.nodeId || "", source?.fileName || "", String(source?.nodeId ?? "")];
const featureKey = feature => JSON.stringify([sourceKey(feature), feature.originalName || feature.featureName]);
const finite = value => typeof value === "number" && !Number.isFinite(value) ? null : value ?? null;

function localFeature(source, column) {
  for (const [type, key] of Object.entries(featureArrays)) {
    const feature = (source[key] || []).find(feature => feature.featureName === column);
    if (feature) return { ...feature, ...Object.fromEntries(["nodeId", "nodeName", "fileName"].map(key => [key, source[key]])), type, originalName: column };
  }
  return null;
}

export function buildStatisticsReport({ data, sourceData, selectedEntries = [], appliedFilters, relationships,
  selectedOnly = false, includeBreakdown = true, includeRelationships = false, createdAt = new Date().toISOString() }) {
  const features = exportFeatures(data, sourceData, selectedEntries, selectedOnly);
  if (!features.length) throw new Error("There are no features in this export scope.");
  const summaries = [], frequencies = [], modes = [], histograms = [], contributions = [], locals = new Map();
  const writeFeature = feature => {
    const summary = tableExportFeatures({ [featureArrays[feature.type]]: [feature] })[0];
    const parts = summary.contributions || [];
    const pooled = Boolean(feature.pooled);
    const scope = pooled ? "Pooled" : "Dataset";
    const identity = pooled ? ["", "", ""] : sourceIdentity(feature);
    const name = pooled ? feature.featureName : feature.originalName || feature.featureName;
    const cohort = pooled ? combinedFilter(appliedFilters, parts.map(part => part.source)) || "All records"
      : sourceFilter(appliedFilters, feature) || "All records";
    const unavailable = summary.unavailable;
    const value = field => unavailable ? null : finite(summary[field]);
    const categories = unavailable ? [] : summary.categories || [];
    const status = unavailable || (pooled && summary.type === "continuous" && summary.q1 == null
      ? "Available; pooled quartiles unavailable" : "Available");
    const numerical = summary.type === "continuous";
    const modalValues = unavailable ? [] : summary.modes || [];
    const modeCount = numerical ? value("modeFrequency") : categories[0]?.count ?? null;
    summaries.push([name, summary.type, scope, ...identity, value("count"), value("missing"), value("percentMissing"),
      value("mean"), value("stdDev"), value("min"), value("q1"), value("median"), value("q3"), value("max"),
      numerical ? modalValues[0] ?? null : categories[0]?.value ?? null, modeCount,
      numerical ? modeCount == null ? null : 100 * modeCount / summary.count : categories[0]?.percent ?? null,
      numerical ? unavailable || summary.modeStatus || "Unavailable" : null,
      numerical ? value("skewness") : null, numerical ? value("kurtosis") : null, numerical ? value("sampleStdDev") : null,
      numerical ? value("meanCiLower") : null, numerical ? value("meanCiUpper") : null,
      !unavailable && summary.type === "categorical" ? categories.length : null,
      categories[1]?.value ?? null, categories[1]?.count ?? null, categories[1]?.percent ?? null,
      status, cohort, summary.includedSources, summary.totalSources, summaryConventions[summary.type]]);
    if (numerical) modalValues.forEach(mode => modes.push([name, scope, ...identity, mode, modeCount,
      modeCount == null ? null : 100 * modeCount / summary.count, cohort]));
    categories.forEach(category => frequencies.push([name, scope, ...identity, category.value, category.count, category.percent, cohort]));
    if (!pooled && !unavailable) {
      if (feature.type === "date") Object.entries(feature.dateHistogram || {}).sort(([a], [b]) => a.localeCompare(b))
        .forEach(([day, count]) => histograms.push([name, ...identity, "Date", day, count, "Available", cohort]));
      else if (Array.isArray(feature.histogram)) {
        if (!feature.histogram.length) histograms.push([name, ...identity, "Numerical", null, null, "Histogram unavailable", cohort]);
        else feature.histogram.forEach((count, index) => histograms.push([name, ...identity, "Numerical", feature.binRanges?.[index] ?? null,
          finite(count), feature.histogramStatus === "COARSENED" ? "Coarsened bins" : "Available", cohort]));
      }
    }
    parts.forEach(part => {
      const column = part.columnName || part.feature?.originalName || part.feature?.featureName || feature.originalName || feature.featureName;
      contributions.push([name, scope, ...sourceIdentity(part.source), column, part.feature?.count ?? null,
        part.feature?.missingValuesCount ?? null, sourceFilter(appliedFilters, part.source) || "All records", part.status || (part.feature ? "Included" : "Unavailable")]);
      if (pooled && includeBreakdown && part.feature) {
        const local = localFeature(part.source, column);
        if (local) locals.set(featureKey(local), local);
      }
    });
  };
  features.forEach(writeFeature);
  const existing = new Set(features.filter(feature => !feature.pooled).map(featureKey));
  for (const [key, local] of locals) if (!existing.has(key)) writeFeature(local);
  const sheets = [
    { name: "Feature summaries", rows: [["Feature", "Type", "Scope", "Site", "Dataset", "Node ID", "Non-missing count", "Missing count", "Missing %",
      "Mean", "Population SD", "Min", "Q1", "Median", "Q3", "Max", "Mode", "Mode count", "Mode %", "Mode status",
      "Skewness", "Kurtosis", "Sample SD", "Mean 95% CI lower", "Mean 95% CI upper", "Cardinality",
      "2nd Mode", "2nd Mode count", "2nd Mode %", "Status", "Cohort",
      "Datasets included", "Datasets expected", "Methods"], ...summaries] },
  ];
  if (frequencies.length) sheets.push({ name: "Category frequencies", rows: [["Feature", "Scope", "Site", "Dataset", "Node ID", "Category", "Count", "Percent %", "Cohort"], ...frequencies] });
  if (modes.length) sheets.push({ name: "Numerical modes", rows: [["Feature", "Scope", "Site", "Dataset", "Node ID", "Mode", "Count", "Percent %", "Cohort"], ...modes] });
  if (histograms.length) sheets.push({ name: "Source distributions", rows: [["Feature", "Site", "Dataset", "Node ID", "Type", "Bin or date", "Count", "Status", "Cohort"], ...histograms] });
  let relationshipCount = 0;
  if (includeRelationships) {
    if (!relationships) throw new Error("Relationship statistics are not ready yet.");
    const names = new Set(features.map(feature => feature.featureName));
    const rows = relationshipStatisticsRows(relationships, {}, appliedFilters);
    const selectedRows = rows.slice(1).filter(row => names.has(row[1]) && names.has(row[2]));
    if (includeBreakdown && features.some(feature => feature.pooled)) {
      const localNames = new Set(sourceFeatureSelection(features, sourceData).map(feature => feature.featureName));
      selectedRows.push(...relationshipStatisticsRows(sourceData, {}, appliedFilters).slice(1).filter(row => localNames.has(row[1]) && localNames.has(row[2])));
    }
    const unique = [...new Map(selectedRows.map(row => [JSON.stringify(row.slice(0, 3)), row])).values()];
    relationshipCount = unique.length;
    if (relationshipCount) sheets.push({ name: "Relationships", rows: [rows[0], ...unique] });
  }
  sheets.push({ name: "Sources and filters", rows: [["Feature", "Scope", "Site", "Dataset", "Node ID", "Source feature", "Non-missing count", "Missing count", "Cohort", "Status"], ...contributions] });
  sheets.push({ name: "Report details", rows: [["Topic", "Details"],
    ["Created (UTC)", createdAt], ["Feature scope", selectedOnly ? "Selected features" : "All visible features"],
    ["View", features.some(feature => feature.pooled) ? "Combined feature statistics" : "Individual dataset statistics"],
    ["Dataset breakdown", includeBreakdown ? "Included for pooled features" : "Not included"],
    ["Relationships", includeRelationships ? `${relationshipCount} results; unavailable results retain their status. Only pairs of different exported features are included.` : "Not requested"],
    ["Observations", "Counts refer to dataset records. Patients are not deduplicated across datasets or visits."],
    ["Missing values", "Excluded separately for each feature. Relationship statistics use paired non-missing observations."],
    ["Unavailable results", "Blank cells are unavailable, not zero. Status explains withheld summaries or unavailable pooled quartiles."],
    ["Precision", "Values retain the precision supplied by the nodes; spreadsheet display formatting does not round stored values."],
    ["Continuous features", summaryConventions.continuous], ["Dates", summaryConventions.date],
    ["Categorical features", summaryConventions.categorical],
    ["Mode ties", "The summary shows the first mode. Numerical modes and Category frequencies retain all released ties; numerical modes are ordered by value."],
    ...Object.entries(numericalMethods),
    ["Distributions", "Source bins and date frequencies are preserved as released by the nodes. Independently binned histograms are never added into a fabricated pooled histogram."],
    ["Pooled quartiles", "Computed only from complete disclosure-approved value frequencies. Local quartiles are never averaged."],
    ["Percentile labels", "Q1 = 25%; median = 50%; Q3 = 75%. Numerical quantiles use linear interpolation (R7), matching the default pandas describe percentiles."],
    ...includeRelationships ? Object.entries(relationshipConventions) : [],
  ] });
  return sheets;
}
