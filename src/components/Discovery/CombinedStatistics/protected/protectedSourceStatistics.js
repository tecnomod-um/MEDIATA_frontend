import { featureArrays, sourceKey } from "../exact/combinedStatistics";
import { sourceColumns, memberKey } from "../columnMappings";
import { poolingContributions, needsProtectedMode } from "../poolingContributions";
import { addProtectedDistribution, buildApproximateSummary } from "./protectedStatistics";
import { summaryTableFeature, tableExportFeatures } from "../summaryTableFeature";

export function protectedSourceMembers(results, baseline, activeIndices) {
  const sources = new Map(results.map((source) => [sourceKey(source), source]));
  return new Map(
    baseline.flatMap((source) => {
      const index = results.findIndex((result) => sourceKey(result) === sourceKey(source));
      if (!activeIndices[index]) return [];
      return sourceColumns(source).flatMap(({ column, type }) => {
        if (!featureArrays[type]) return [];
        const member = {
          nodeId: source.nodeId,
          fileName: source.fileName,
          column,
          ...(source.featureTypes ? { featureTypes: source.featureTypes } : {}),
        };
        const [part] = poolingContributions({ type, members: [member] }, sources);
        return part.withheld || (type === "continuous" && needsProtectedMode(part.feature))
          ? [[sourceKey(source), member]]
          : [];
      });
    }),
  );
}

// Source estimates stay separate from exact inputs used for pooling and relationships.
export function protectedSourceTableData(data, results, baseline, releases, hidden = new Set()) {
  if (!data || !releases?.size) return data;
  const sources = new Map(results.map((source) => [sourceKey(source), source]));
  const definitions = new Map(
    baseline.flatMap((source) =>
      sourceColumns(source).map(({ column, type }) => [memberKey({ ...source, column }), type]),
    ),
  );
  const table = {
    ...data,
    ...Object.fromEntries(Object.values(featureArrays).map((key) => [key, [...(data[key] || [])]])),
  };
  table.omittedFeatures = (data.omittedFeatures || []).flatMap((entry) => {
    const column = entry.originalName || entry.featureName;
    const member = { ...entry, column };
    const type = definitions.get(memberKey(member));
    if (!featureArrays[type] || hidden.has(memberKey(member))) return [entry];
    const group = { label: entry.featureName, type, members: [member] };
    const parts = poolingContributions(group, sources);
    if (!parts[0].withheld) return [entry];
    const summary = addProtectedDistribution(group, parts, releases, buildApproximateSummary(group, releases));
    if (summary.unavailable)
      return [{ ...entry, reason: [entry.reason, summary.unavailable].filter(Boolean).join(" ") }];
    const source = sources.get(sourceKey(member));
    summary.contributions = [{ source, columnName: column, type }];
    table[featureArrays[type]].push({
      ...entry,
      ...summaryTableFeature(summary),
      originalName: column,
      pooled: false,
      estimatedSummary: summary,
    });
    return [];
  });
  table.continuousFeatures = table.continuousFeatures.map((entry) => {
    if (entry.estimatedSummary || !needsProtectedMode(entry)) return entry;
    const member = { ...entry, column: entry.originalName || entry.featureName };
    const group = { label: entry.featureName, type: "continuous", members: [member] };
    const summary = tableExportFeatures({ continuousFeatures: [entry] })[0];
    const updated = addProtectedDistribution(group, poolingContributions(group, sources), releases, summary);
    if (updated === summary) return entry;
    return {
      ...entry,
      modes: updated.modes,
      modeBand: updated.modeBand,
      modeFrequency: updated.modeFrequency,
      modeStatus: updated.modeStatus,
      estimatedSummary: updated,
      status: "Estimated mode",
    };
  });
  return table;
}
