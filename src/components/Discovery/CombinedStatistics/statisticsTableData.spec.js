import { expect, it } from "vitest";
import { combineMappedTableData, tableExportFeatures } from "./statisticsTableData";
import { createColumnMappings, activeColumnMappings } from "./columnMappings";

const feature = (name, count, mean) => ({ featureName: name, count, mean, stdDev: 0, min: mean, max: mean, missingValuesCount: 0 });
const results = [
  { nodeId: 1, nodeName: "Alpha", fileName: "patients.csv", continuousFeatures: [feature("Age", 10, 20), feature("Score", 10, 1)], categoricalFeatures: [{ featureName: "Sex", count: 10, missingValuesCount: 0, categoryCounts: { F: 8, M: 2 } }] },
  { nodeId: 2, nodeName: "Beta", fileName: "patients.csv", continuousFeatures: [feature("Age", 30, 80), feature("Score", 30, 3)], categoricalFeatures: [{ featureName: "Sex", count: 30, missingValuesCount: 0, categoryCounts: { F: 12, M: 18 } }] },
];
const data = Object.fromEntries(["continuousFeatures", "categoricalFeatures", "dateFeatures"].map(key => [key, results.flatMap(source => (source[key] || []).map(f => ({ ...source, ...f, originalName: f.featureName, featureName: `${f.featureName} (${source.nodeName})` })))]));
const active = [true, true];
const candidates = createColumnMappings(results);

it("finds matching names and types across distinct sources, without combining mixed types", () => {
  expect(candidates.map(c => c.label)).toEqual(["Age", "Score", "Sex"]);
  const mixed = [results[0], { ...results[1], continuousFeatures: [], categoricalFeatures: [{ featureName: "Age" }] }];
  expect(createColumnMappings(mixed)).toEqual([]);
  expect(activeColumnMappings(candidates, results, [true, false])).toEqual([]);
});

it("combines only chosen table columns and leaves other rows and original distributions intact", () => {
  const table = combineMappedTableData(data, results, active, candidates.filter(c => c.label === "Age"));
  expect(table.continuousFeatures.map(f => f.featureName)).toEqual(["Score (Alpha)", "Score (Beta)", "Age"]);
  expect(table.continuousFeatures[2]).toMatchObject({ count: 40, mean: 65, datasetCount: "2/2", pooled: true });
  expect(table.continuousFeatures[2].qrt1).toBeUndefined();
  expect(table.categoricalFeatures).toEqual(data.categoricalFeatures);
  expect(results[0].continuousFeatures[0].mean).toBe(20);
  expect(data.continuousFeatures).toHaveLength(4);
});

it("uses pooled categorical frequencies for the existing mode columns", () => {
  const table = combineMappedTableData(data, results, active, candidates);
  expect(table.categoricalFeatures[0]).toMatchObject({ featureName: "Sex", count: 40, modeFrequency: 20, modeFrequencyPercentage: 50, secondModeFrequency: 20 });
});

it("uses non-missing category denominators consistently in tables and exports", () => {
  const withMissing = results.map((source, index) => ({ ...source, categoricalFeatures: source.categoricalFeatures.map(feature => ({ ...feature, missingValuesCount: index ? 8 : 2 })) }));
  const table = combineMappedTableData(data, withMissing, active, candidates);
  const sex = table.categoricalFeatures[0];
  expect(sex).toMatchObject({ count: 40, missingValuesCount: 10, modeFrequency: 20, modeFrequencyPercentage: 50 });
  expect(sex.combinedSummary.categories[0].percent).toBe(50);
  expect(sex.combinedSummary.percentMissing).toBe(20);
});

it("honors hiding all features without reintroducing pooled rows", () => {
  const hidden = { continuousFeatures: [], categoricalFeatures: [], dateFeatures: [] };
  expect(combineMappedTableData(hidden, results, active, candidates)).toEqual(hidden);
});

it("keeps suppressed rows unavailable instead of exposing a partial pooled result", () => {
  const suppressed = [results[0], { ...results[1], continuousFeatures: [], omittedFeatures: [{ featureName: "Age", reason: "Privacy threshold" }] }];
  const table = combineMappedTableData(data, suppressed, active, candidates.filter(c => c.label === "Age"));
  expect(table.continuousFeatures.at(-1)).toMatchObject({ featureName: "Age", count: null, status: "Unavailable for one or more selected datasets" });
  expect(table.continuousFeatures.at(-1).mean).toBeUndefined();
});

it("exports the displayed combined and individual rows with filter provenance", () => {
  const table = combineMappedTableData(data, results, active, candidates.filter(c => c.label === "Age"));
  const rows = tableExportFeatures(table);
  expect(rows.find(row => row.featureName === "Age")).toMatchObject({ count: 40, mean: 65, includedSources: 2 });
  expect(rows.find(row => row.featureName === "Score (Beta)")).toMatchObject({ count: 30, mean: 3, includedSources: 1 });
});
