import { columnArrays } from "./CombinedStatistics/columnMappings";
import { sourceKey } from "./CombinedStatistics/combinedStatistics";
import { filterDiscoveryDatasets } from "./CombinedStatistics/filterDiscoveryDatasets";

// Resolve identities from source metadata, never from a decorated display label.
export async function requestFeatureTypeChange({entry, statistics, sources, nodes, signal}) {
  if (entry?.pooled) throw new Error("Select an individual dataset column to change its type.");
  const feature = Object.values(columnArrays).flatMap(key => statistics?.[key] || [])
    .find(feature => feature.featureName === entry?.featureName && (entry.nodeId == null || feature.nodeId == null || String(feature.nodeId) === String(entry.nodeId)));
  const identity = {nodeId: entry.nodeId ?? feature?.nodeId, fileName: entry.fileName ?? feature?.fileName};
  const matches = sources.filter(source => source.fileName === identity.fileName
    && (identity.nodeId == null || String(source.nodeId) === String(identity.nodeId)));
  if (matches.length !== 1) throw new Error("Select a feature with an unambiguous dataset and site.");
  const source = matches[0];
  const column = feature?.originalName || entry.originalName || entry.featureName;
  const type = entry.type === "categorical" ? "continuous" : "categorical";
  const featureTypes = {...source.featureTypes, [column]: type};
  const [response] = await filterDiscoveryDatasets([{...source, featureTypes}], nodes, () => null, ...(signal ? [{signal}] : []));
  const actualType = Object.keys(columnArrays).find(type => response[columnArrays[type]]?.some(feature => feature.featureName === column));
  if (!actualType) throw new Error("The converted feature was withheld or could not be interpreted. The previous statistics were kept.");
  if (actualType !== type && !(type === "continuous" && actualType === "date"))
    throw new Error("The node did not return the requested feature interpretation.");
  return {nodeId: source.nodeId, fileName: source.fileName, featureName: column, response,
    type: actualType === "date" ? "continuous" : actualType};
}

export function reconcileFeatureVisibility(previous, visible, next, remembered = new Set()) {
  if (!previous || !visible) return {statistics: next, hidden: new Set()};
  const identity = feature => JSON.stringify([sourceKey(feature), feature.originalName || feature.featureName]);
  const shown = new Set(Object.values(columnArrays).flatMap(key => visible[key] || []).map(identity));
  const hidden = new Set(remembered);
  Object.values(columnArrays).flatMap(key => previous[key] || []).forEach(feature => {
    if (shown.has(identity(feature))) hidden.delete(identity(feature)); else hidden.add(identity(feature));
  });
  return {hidden, statistics: {...next, ...Object.fromEntries(Object.values(columnArrays).map(key => [key, (next[key] || []).filter(feature => !hidden.has(identity(feature)))]))}};
}
