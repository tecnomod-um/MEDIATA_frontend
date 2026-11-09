import { sourceKey } from "../CombinedStatistics/combinedStatistics.js";

const featureArrays = ["continuousFeatures", "categoricalFeatures", "dateFeatures"];

export const filterFeatures = statistics => featureArrays.flatMap(key => statistics?.[key] || []);

export function matchingFilterFeatures(statistics, feature, mappings = []) {
  const key = featureArrays.find(key => statistics?.[key]?.includes(feature));
  const mapping = mappings.find(group => group.members.some(member => sourceKey(member) === sourceKey(feature) && member.column === (feature.originalName || feature.featureName)));
  if (mapping) return (statistics?.[key] || []).filter(other => mapping.members.some(member => sourceKey(member) === sourceKey(other) && member.column === (other.originalName || other.featureName)));
  return (statistics?.[key] || []).filter(other => (other.originalName || other.featureName) === (feature.originalName || feature.featureName));
}

export function featureAppliesToSource(feature, source, sourceCount) {
  if (feature.fileName) return sourceKey(feature) === sourceKey(source);
  return sourceCount === 1 || feature.featureName.endsWith(`(${source.fileName})`);
}

export function fileFilterConditions(statistics, conditions, operators, source, sourceCount, matchColumns = false, mappings = []) {
  const features = filterFeatures(statistics);
  const result = {};
  for (const [name, criteria] of Object.entries(conditions)) {
    if (!criteria?.length) continue;
    const feature = features.find(item => item.featureName === name);
    const targets = feature && matchColumns ? matchingFilterFeatures(statistics, feature, mappings) : [feature];
    const target = feature && targets.find(target => featureAppliesToSource(target, source, sourceCount));
    if (!target) continue;
    const column = target.originalName || target.featureName;
    if (Object.hasOwn(result, column)) throw new Error(`Different filters are set for ${column}. Remove the duplicate before applying filters to matching columns.`);
    // Define own properties so category/column names such as __proto__ stay data.
    Object.defineProperty(result, column, { value: { conditions: criteria, operators: operators[name] || [] }, enumerable: true });
  }
  return result;
}
