import { columnArrays } from "./CombinedStatistics/columnMappings";
import { sourceKey } from "./CombinedStatistics/combinedStatistics";

export const selectionKey = entry => entry.pooled ? `pooled:${entry.featureName}`
  : JSON.stringify([sourceKey(entry), entry.originalName || entry.featureName]);

export function selectableFeatures(statistics) {
  return Object.entries(columnArrays).flatMap(([type, key]) => (statistics?.[key] || [])
    .map(feature => ({...feature, type: type === "date" ? "continuous" : type})));
}

export function toggleFeatureSelection(previous, entry, additive) {
  const exists = previous.some(item => selectionKey(item) === selectionKey(entry));
  if (!additive) return exists && previous.length === 1 ? [] : [entry];
  return exists ? previous.filter(item => selectionKey(item) !== selectionKey(entry)) : [...previous, entry];
}

export function reconcileFeatureSelection(entries, statistics, tableStatistics) {
  const available = [...selectableFeatures(statistics), ...selectableFeatures(tableStatistics).filter(feature => feature.pooled)];
  return entries.flatMap(entry => {
    const feature = available.find(item => selectionKey(item) === selectionKey(entry));
    return feature ? [feature] : [];
  });
}

// A combined table row selects its contributing source columns, never a fabricated distribution.
export function sourceFeatureSelection(entries, statistics) {
  const available = selectableFeatures(statistics);
  const selected = entries.flatMap(entry => entry.pooled
    ? (entry.combinedSummary?.contributions || []).flatMap(part => available.filter(feature =>
      sourceKey(feature) === sourceKey(part.source)
      && (feature.originalName || feature.featureName) === part.columnName))
    : available.filter(feature => selectionKey(feature) === selectionKey(entry)));
  return [...new Map(selected.map(feature => [selectionKey(feature), feature])).values()];
}

export const isFeatureSelected = (entries, name, type) => entries.some(entry =>
  entry.featureName === name && entry.type === type);
