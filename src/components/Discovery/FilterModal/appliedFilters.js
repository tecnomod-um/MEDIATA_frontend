import { sourceKey, sourceLabel } from "../CombinedStatistics/combinedStatistics.js";
import { fileFilterConditions } from "./filterFeatures.js";

const comparison = { equal: "=", less: "<", greater: ">", between: "between" };

export function describeConditions(conditions, operator = "AND") {
  return Object.entries(conditions).map(([column, group]) => {
    const criteria = group.conditions.map((condition, index) => {
      const value = Array.isArray(condition.value) ? condition.value.join(" and ") : condition.value;
      return `${index ? ` ${group.operators[index - 1] || "AND"} ` : ""}${comparison[condition.type] || condition.type} ${value}`;
    }).join("");
    return `${column} (${criteria})`;
  }).join(` ${operator} `);
}

// A predicate on any column changes every statistic computed from that file's cohort.
export function buildAppliedFilters(statistics, filters, logic, sources, mappings) {
  const applied = new Map();
  for (const source of sources) {
    const conditions = fileFilterConditions(statistics, filters || {}, logic?.operators || {}, source, sources.length, logic?.matchColumns ?? true, mappings);
    if (Object.keys(conditions).length) applied.set(sourceKey(source), describeConditions(conditions, logic?.operator));
  }
  return applied;
}

export const sourceFilter = (applied, source) => applied?.get(sourceKey(source));

export function combinedFilter(applied, members) {
  if (!members.some(member => sourceFilter(applied, member))) return undefined;
  return members.map(member => `${sourceLabel(member)}: ${sourceFilter(applied, member) || "All records"}`).join("; ");
}

export function tableFilterDescriptions(data, applied) {
  return Object.fromEntries(["continuousFeatures", "categoricalFeatures", "dateFeatures"].flatMap(key => (data?.[key] || []).flatMap(feature => {
    const description = feature.pooled ? combinedFilter(applied, feature.combinedSummary.contributions.map(contribution => contribution.source)) : sourceFilter(applied, feature);
    return description ? [[feature.featureName, description]] : [];
  })));
}
