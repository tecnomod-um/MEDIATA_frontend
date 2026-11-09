import { filterMultipleFiles } from "../../../util/petitionHandler";
import { sourceKey } from "./combinedStatistics";

export async function filterDiscoveryDatasets(results, nodes, getFilters, options) {
  const groups = new Map();
  results.forEach(source => {
    const id = String(source.nodeId);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(source);
  });
  const responses = await Promise.all([...groups].map(async ([id, sources]) => {
    const node = nodes.find(n => String(n.nodeId) === id);
    if (!node?.serviceUrl) throw new Error(`No connection available for ${sources[0].nodeName || id}`);
    // Bind the destination to the request, including proxy routing and node-specific auth.
    const response = await filterMultipleFiles({ multipleFileFilters: sources.map(source => ({ fileName: source.fileName, filters: getFilters(source),
      ...(Object.keys(source.featureTypes || {}).length ? {featureTypes: source.featureTypes} : {}) })) }, node.serviceUrl, ...(options ? [options] : []));
    if (!Array.isArray(response)) throw new Error(`Invalid statistics response from ${node.name || id}`);
    return sources.map(source => {
      const matches = response.filter(item => item.fileName === source.fileName);
      if (matches.length !== 1 || /^(error|failed|thread interrupted|statistics withheld)/i.test(matches[0]?.message || "")) throw new Error(`Statistics unavailable for ${source.fileName} at ${node.name || id}`);
      if (Object.keys(source.featureTypes || {}).length && (matches[0].featureTypeSummaryVersion !== 1
          || JSON.stringify(Object.entries(matches[0].featureTypes || {}).sort()) !== JSON.stringify(Object.entries(source.featureTypes).sort())))
        throw new Error(`The node did not preserve feature types for ${source.fileName}. Update the node before retrying.`);
      return { ...matches[0], fileName: source.fileName, nodeId: source.nodeId, nodeName: source.nodeName };
    });
  }));
  const bySource = new Map(responses.flat().map(source => [sourceKey(source), source]));
  if (options?.signal?.aborted) throw new DOMException("Statistics refresh canceled", "AbortError");
  return results.map(source => bySource.get(sourceKey(source)));
}
