import { columnArrays } from "./CombinedStatistics/columnMappings";
import { sourceKey } from "./CombinedStatistics/combinedStatistics";
import { filterDiscoveryDatasets } from "./CombinedStatistics/filterDiscoveryDatasets";

// Resolve identities from source metadata, never from a decorated display label.
export async function requestFeatureTypeChanges({entries, targetType, statistics, sources, nodes, signal}) {
  const groups = new Map();
  for (const entry of entries) {
    if (entry.pooled) throw new Error("Select individual dataset columns to change their type.");
    const feature = Object.values(columnArrays).flatMap(key => statistics?.[key] || [])
      .find(feature => feature.featureName === entry.featureName && (entry.nodeId == null || feature.nodeId == null || String(feature.nodeId) === String(entry.nodeId)));
    const identity = {nodeId: entry.nodeId ?? feature?.nodeId, fileName: entry.fileName ?? feature?.fileName};
    const matches = sources.filter(source => source.fileName === identity.fileName
      && (identity.nodeId == null || String(source.nodeId) === String(identity.nodeId)));
    if (matches.length !== 1) throw new Error("Select a feature with an unambiguous dataset and site.");
    const source = matches[0], key = sourceKey(source);
    if (!groups.has(key)) groups.set(key, {source, columns: new Set()});
    groups.get(key).columns.add(feature?.originalName || entry.originalName || entry.featureName);
  }
  if (!groups.size) return [];
  const requested = [...groups.values()].map(({source, columns}) => ({...source,
    featureTypes: {...source.featureTypes, ...Object.fromEntries([...columns].map(column => [column, targetType]))}}));
  const responses = await filterDiscoveryDatasets(requested, nodes, () => null, ...(signal ? [{signal}] : []));
  return [...groups.values()].flatMap(({source, columns}, index) => [...columns].map(column => {
    const response = responses[index];
    const actualType = Object.keys(columnArrays).find(type => response[columnArrays[type]]?.some(feature => feature.featureName === column));
    if (!actualType) throw new Error(`${column} was withheld or could not be interpreted. The previous statistics were kept.`);
    if (actualType !== targetType && !(targetType === "continuous" && actualType === "date"))
      throw new Error("The node did not return the requested feature interpretation.");
    return {nodeId: source.nodeId, fileName: source.fileName, featureName: column, response,
      type: actualType === "date" ? "continuous" : actualType};
  }));
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
