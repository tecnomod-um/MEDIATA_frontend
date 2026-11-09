import { expect, it } from "vitest";
import { buildAppliedFilters, sourceFilter, tableFilterDescriptions } from "./appliedFilters";

const sources = [{ nodeId: 1, nodeName: "Alpha", fileName: "patients.csv" }, { nodeId: 2, nodeName: "Beta", fileName: "patients.csv" }];
const feature = (source, column) => ({ ...source, originalName: column, featureName: `${column} (${source.nodeName})` });
const alphaAge = feature(sources[0], "Age"), betaAge = feature(sources[1], "PatientAge");
const stats = { continuousFeatures: [alphaAge, betaAge, ...sources.map(source => feature(source, "cluster"))] };
const mappings = [{ members: [{ ...sources[0], column: "Age" }, { ...sources[1], column: "PatientAge" }] }];
const cluster = { "cluster (Alpha)": [{ type: "equal", value: "1" }] };

it("marks every affected statistic's cohort, including features without a direct predicate", () => {
  const applied = buildAppliedFilters(stats, cluster, { matchColumns: true }, sources, mappings);
  expect(sourceFilter(applied, sources[0])).toBe("cluster (= 1)");
  expect(sourceFilter(applied, sources[1])).toBe("cluster (= 1)");
  const descriptions = tableFilterDescriptions({ continuousFeatures: [alphaAge, betaAge] }, applied);
  expect(descriptions[alphaAge.featureName]).toContain("cluster");
  expect(descriptions[betaAge.featureName]).toContain("cluster");
});

it("keeps identically named files distinct when linked filters are off", () => {
  const applied = buildAppliedFilters(stats, cluster, { matchColumns: false }, sources, mappings);
  expect(sourceFilter(applied, sources[0])).toBeDefined();
  expect(sourceFilter(applied, sources[1])).toBeUndefined();
  const pooled = { featureName: "Age", pooled: true, combinedSummary: { contributions: sources.map(source => ({ source })) } };
  expect(tableFilterDescriptions({ continuousFeatures: [pooled] }, applied).Age).toContain("Beta / patients.csv: All records");
});

it("describes the actual aliased predicate at the destination and clears markers on reset", () => {
  const applied = buildAppliedFilters(stats, { [alphaAge.featureName]: [{ type: "greater", value: "60" }] }, { matchColumns: true }, sources, mappings);
  expect(sourceFilter(applied, sources[1])).toBe("PatientAge (> 60)");
  const reset = buildAppliedFilters(stats, {}, {}, sources, mappings);
  expect(reset.size).toBe(0);
  expect(tableFilterDescriptions({ continuousFeatures: [alphaAge, betaAge] }, reset)).toEqual({});
});
