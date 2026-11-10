import { expect, it } from "vitest";
import { createColumnMappings, validateColumnMappings, activeColumnMappings, changeMappingType, reconcileMappingTypes } from "./columnMappings";
import { combineMappedTableData, tableExportFeatures } from "./statisticsTableData";

const numeric = (featureName, count, mean) => ({ featureName, count, mean, min: mean, max: mean, stdDev: 0, missingValuesCount: 0 });
const sources = [
  { nodeId: 1, nodeName: "Alpha", fileName: "patients.csv", continuousFeatures: [numeric("Age", 10, 20)] },
  { nodeId: 2, nodeName: "Beta", fileName: "patients.csv", continuousFeatures: [numeric("PatientAge", 30, 80), numeric("Age", 30, 200)] },
];
const mapping = { id: "age", label: "Pooled age", type: "continuous", members: [{ nodeId: 1, fileName: "patients.csv", column: "Age" }, { nodeId: 2, fileName: "patients.csv", column: "PatientAge" }] };
const data = { continuousFeatures: sources.flatMap(source => source.continuousFeatures.map(feature => ({ ...feature, nodeId: source.nodeId, nodeName: source.nodeName, fileName: source.fileName, originalName: feature.featureName, featureName: `${feature.featureName} (${source.nodeName})` }))), categoricalFeatures: [], dateFeatures: [] };

it("preserves aliases while reconciling complete type changes and leaves mixed-type combinations explicit", () => {
  const converted = sources.map((source, index) => ({ ...source,
    continuousFeatures: source.continuousFeatures.filter(feature => feature.featureName !== (index ? "PatientAge" : "Age")),
    categoricalFeatures: [{ featureName: index ? "PatientAge" : "Age", categoryCounts: { A: 12 } }],
  }));
  expect(reconcileMappingTypes([mapping], [converted[0], sources[1]])[0]).toEqual(mapping);
  const updated = reconcileMappingTypes([mapping], converted)[0];
  expect(updated).toEqual({ ...mapping, type: "categorical" });
  expect(validateColumnMappings([updated], converted)).toBeNull();
  expect(mapping.type).toBe("continuous");
});

it("pools explicitly mapped aliases and retains an unmapped same-name column", () => {
  expect(validateColumnMappings([mapping], sources)).toBeNull();
  const table = combineMappedTableData(data, sources, [true, true], [mapping]);
  expect(table.continuousFeatures).toHaveLength(2);
  expect(table.continuousFeatures[0]).toMatchObject({ featureName: "Age (Beta)", mean: 200 });
  expect(table.continuousFeatures[1]).toMatchObject({ featureName: "Pooled age", count: 40, mean: 65 });
  expect(table.continuousFeatures[1].combinedSummary.contributions.map(c => c.columnName)).toEqual(["Age", "PatientAge"]);
  expect(tableExportFeatures(table).at(-1).contributions[1]).toMatchObject({ columnName: "PatientAge", source: { nodeName: "Beta", fileName: "patients.csv" } });
});

it("keeps mapped suppressed sites in the cohort and blocks incomplete pooled results", () => {
  const suppressed = [sources[0], { ...sources[1], continuousFeatures: [], omittedFeatures: [{ featureName: "PatientAge", reason: "Privacy threshold" }] }];
  const result = combineMappedTableData(data, suppressed, [true, true], [mapping]).continuousFeatures.at(-1);
  expect(result.count).toBeNull();
  expect(result.mean).toBeUndefined();
  expect(result.status).toContain("Unavailable");
});

it("treats a genuinely empty mapped site as zero matching records", () => {
  const empty = [sources[0], { ...sources[1], continuousFeatures: [], message: "No records match the filter" }];
  expect(combineMappedTableData(data, empty, [true, true], [mapping]).continuousFeatures.at(-1)).toMatchObject({ count: 10, mean: 20, datasetCount: "1/2" });
});

it("uses active dataset selection without deleting saved mappings", () => {
  expect(activeColumnMappings([{ ...mapping, members: [...mapping.members].reverse() }], sources, [true, true])[0].members.map(member => member.nodeId)).toEqual([1, 2]);
  expect(activeColumnMappings([mapping], sources, [true, false])).toEqual([]);
  const firstOnly = { ...data, continuousFeatures: data.continuousFeatures.filter(feature => feature.nodeId === 1) };
  expect(combineMappedTableData(firstOnly, sources, [true, false], [mapping])).toEqual(firstOnly);
  expect(mapping.members).toHaveLength(2);
});

it("validates incompatible types, duplicate use, missing columns, and incomplete groups", () => {
  const mixed = [sources[0], { ...sources[1], continuousFeatures: [], categoricalFeatures: [{ featureName: "PatientAge" }] }];
  expect(validateColumnMappings([mapping], mixed)).toContain("same data type");
  expect(validateColumnMappings([mapping, { ...mapping, id: "second", label: "Other age" }], sources)).toContain("already used");
  expect(validateColumnMappings([{ ...mapping, members: mapping.members.slice(0, 1) }], sources)).toContain("at least two files");
  expect(validateColumnMappings([{ ...mapping, members: [mapping.members[0], { ...mapping.members[1], column: "Missing" }] }], sources)).toContain("no longer available");
  expect(validateColumnMappings([{ ...mapping, label: " " }], sources)).toContain("name");
});

it("changing the combination type clears incompatible selections without converting source data", () => {
  const changed = changeMappingType(mapping, "categorical", sources);
  expect(changed.type).toBe("categorical");
  expect(changed.members).toEqual([]);
  expect(mapping.members).toHaveLength(2);
  expect(sources[0].continuousFeatures[0].featureName).toBe("Age");
  expect(changeMappingType(mapping, "continuous", sources).members).toEqual(mapping.members);
});

it("suggests same-name mappings without silently omitting a suppressed site", () => {
  const hidden = { nodeId: 3, fileName: "patients.csv", omittedFeatures: [{ featureName: "Age", reason: "Privacy threshold" }] };
  const groups = createColumnMappings([...sources, hidden]);
  expect(groups[0].members).toHaveLength(3);
  expect(groups[0].label).toBe("Age");
});

it("prevents combined names from overwriting an unrelated individual feature in matrices or selection", () => {
  const collision='Age (patients.csv · Beta)';
  expect(validateColumnMappings([{...mapping,label:collision}],sources)).toContain('matches an individual');
  const unusualLabel='PatientAge (patients.csv · Beta)';
  const unusual=sources.map(source=>({...source,continuousFeatures:[...source.continuousFeatures,numeric(unusualLabel,12,1)]}));
  const defaults=createColumnMappings(unusual);
  expect(defaults.some(group=>group.label===`${unusualLabel} (combined)`)).toBe(true);
  expect(new Set(defaults.map(group=>group.label)).size).toBe(defaults.length);
});

it("does not create ambiguous combinations from unnamed source summaries", () => {
  expect(createColumnMappings([1,2].map(nodeId=>({nodeId,fileName:'data.csv',continuousFeatures:[{mean:1}]})))).toEqual([]);
});
