import { sourceKey, sourceLabel, sourceFileLabel, featureArrays as columnArrays } from "./combinedStatistics.js";

export { columnArrays };
export const memberKey = member => JSON.stringify([sourceKey(member), member.column]);

function uncombinedLabels(groups, sources) {
  const used = new Set(groups.flatMap(group => group.members.map(memberKey)));
  return new Set(sources.flatMap((source, index) => sourceColumns(source)
    .filter(feature => !used.has(memberKey({...source, column:feature.column})))
    .map(feature => `${feature.column} (${sourceFileLabel(source,sources,index)})`.toLowerCase())));
}

export function sourceColumns(source) {
  return Object.entries(columnArrays).flatMap(([type, key]) => (source[key] || []).map(feature => ({ column: feature.featureName, type })))
    .concat((source.omittedFeatures || []).map(feature => ({ column: feature.featureName, type: null, unavailable: true })))
    .filter(feature => typeof feature.column === "string" && feature.column.trim().length > 0);
}

export function changeMappingType(group, type, sources) {
  return { ...group, type, members: group.members.filter(member => {
    const source = sources.find(source => sourceKey(source) === sourceKey(member));
    const feature = source && sourceColumns(source).find(feature => feature.column === member.column);
    return feature?.type === type || (feature?.unavailable && type === group.type);
  }) };
}

export function createColumnMappings(sources) {
  const groups = new Map();
  sources.forEach(source => sourceColumns(source).forEach(feature => {
    if (!groups.has(feature.column)) groups.set(feature.column, []);
    groups.get(feature.column).push({ ...feature, nodeId: source.nodeId, fileName: source.fileName });
  }));
  const mappings = [...groups].flatMap(([label, members]) => {
    const types = new Set(members.map(member => member.type).filter(Boolean));
    if (members.length < 2 || types.size !== 1 || new Set(members.map(sourceKey)).size !== members.length) return [];
    return [{ id: JSON.stringify([label, ...types]), label, type: [...types][0], members: members.map(({ nodeId, fileName, column }) => ({ nodeId, fileName, column })) }];
  }).sort((a, b) => a.label.localeCompare(b.label));
  const reserved = uncombinedLabels(mappings, sources);
  const labels = new Set(reserved);
  return mappings.map(group => {
    let label = group.label, suffix = 1;
    while (labels.has(label.toLowerCase())) {
      label = `${group.label} (combined${suffix === 1 ? "" : ` ${suffix}`})`;
      suffix += 1;
    }
    labels.add(label.toLowerCase());
    return {...group,label};
  });
}

export function validateColumnMappings(groups, sources) {
  const labels = new Set(), ids = new Set(), used = new Set();
  for (const group of groups) {
    const label = group.label.trim();
    if (!label) return "Give each combined feature a name.";
    if (labels.has(label.toLowerCase())) return `The combined feature name “${label}” is used more than once.`;
    if (ids.has(group.id)) return "Each feature combination must have its own identifier.";
    if (!columnArrays[group.type]) return `Select features for “${label}”.`;
    if (group.members.length < 2) return `Select a feature from at least two files for “${label}”.`;
    labels.add(label.toLowerCase()); ids.add(group.id);
    const files = new Set();
    for (const member of group.members) {
      const source = sources.find(source => sourceKey(source) === sourceKey(member));
      const feature = source && sourceColumns(source).find(feature => feature.column === member.column);
      if (!feature) return `The feature “${member.column}” is no longer available in ${source ? sourceLabel(source) : member.fileName}.`;
      if (feature.type && feature.type !== group.type) return `Features combined as “${label}” must have the same data type.`;
      if (files.has(sourceKey(member))) return `Select only one feature per file for “${label}”.`;
      if (used.has(memberKey(member))) return `“${member.column}” in ${sourceLabel(source)} is already used in another combination.`;
      files.add(sourceKey(member)); used.add(memberKey(member));
    }
  }
  const reserved = uncombinedLabels(groups,sources);
  if (groups.some(group => reserved.has(group.label.trim().toLowerCase())))
    return "A combined feature name matches an individual source feature. Choose a distinct name.";
  return null;
}

export function activeColumnMappings(groups, results, activeIndices) {
  const selected = new Map(results.filter((_, index) => activeIndices[index]).map((source, index) => [sourceKey(source), index]));
  return groups.map(group => ({ ...group, members: group.members.filter(member => selected.has(sourceKey(member)))
    .sort((a, b) => selected.get(sourceKey(a)) - selected.get(sourceKey(b))) })).filter(group => group.members.length > 1);
}
