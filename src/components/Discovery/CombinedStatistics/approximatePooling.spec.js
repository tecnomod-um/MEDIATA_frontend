import { expect, it, vi } from "vitest";
import { buildApproximateSummary, loadApproximatePooling, protectedPoolingMembers } from "./approximatePooling";
import { getApproximatePoolingSource } from "../../../util/petitionHandler";
import { sourceKey } from "./combinedStatistics";
import { combineMappedTableData } from "./statisticsTableData";
import { collectDiscoveryStatistics } from "../discoveryStatistics";
import { buildStatisticsReport } from "../DataExporter/statisticsReport";

const members = [1, 2, 3].map(nodeId => ({ nodeId, fileName: "example.csv", column: "Value" }));
const group = { id: "Value", label: "Value", type: "continuous", members };
const keys = members.map(sourceKey);
const release = (counts, boundaries = [0, 10, 20]) =>
  ({ version: 1, group: "A", noiseVariance: 4, features: { Value: { domain: { boundaries }, counts } } });
const exact = (member, count, mean, missingValuesCount = 0) => ({
  ...member,
  continuousFeatures: [{ featureName: member.column, count, mean, stdDev: 0, min: mean, max: mean, missingValuesCount,
    valueCounts: [{ value: mean, count }] }],
});
const withheld = member => ({ ...member, omittedFeatures: [
  { featureName: member.column, type: "continuous", reason: "Suppressed for privacy: release controls" },
] });

vi.mock("../../../util/petitionHandler", () => ({ getApproximatePoolingSource: vi.fn() }));

it("requests only withheld contributions and skips complete groups", async () => {
  const nodes = members.map(member => ({ ...member, serviceUrl: String(member.nodeId) }));
  const filters = { conditions: { Group: [] }, operator: "AND" };
  const signal = new AbortController().signal;
  getApproximatePoolingSource.mockClear().mockResolvedValue(release([0, 4, 0]));
  const results = [exact(members[0], 40, 2), exact(members[1], 60, 8), exact(members[2], 40, 10)];
  expect(await loadApproximatePooling(protectedPoolingMembers([group], results), nodes, () => filters, signal)).toEqual(new Map());
  expect(getApproximatePoolingSource).not.toHaveBeenCalled();
  const pending = protectedPoolingMembers([group], [results[0], results[1], withheld(members[2])]);
  expect(await loadApproximatePooling(pending, nodes, () => filters, signal)).toEqual(new Map([[keys[2], release([0, 4, 0])]]));
  expect(getApproximatePoolingSource).toHaveBeenCalledExactlyOnceWith("example.csv", filters, "3", signal);
});

it("preserves exact site rows in exports and includes a small protected site in the weighted pool", () => {
  const results = [exact(members[0], 40, 2, 3), exact(members[1], 60, 8, 7), withheld(members[2])];
  const active = results.map(() => true);
  const sourceData = collectDiscoveryStatistics(results, active);
  const releases = new Map(keys.map(key => [key, release(key === keys[2] ? [0, 4, 0] : [300, 0, 0])]));
  const table = combineMappedTableData(sourceData, results, active, [group], releases);
  const [feature] = table.continuousFeatures;
  expect(feature).toMatchObject({ count: 104, missingValuesCount: 10, datasetCount: "3/3", status: "Estimated" });
  expect(feature.mean).toBeCloseTo(620 / 104);
  expect(feature.stdDev).toBeCloseTo(Math.sqrt((40 * 2 ** 2 + 60 * 8 ** 2 + 4 * 15 ** 2) / 104 - (620 / 104) ** 2));
  expect(feature.median).toBe(8);
  expect(feature.meanCiLower).toBeLessThan(feature.mean);
  expect(feature.meanCiUpper).toBeGreaterThan(feature.mean);
  const { rows } = buildStatisticsReport({ data: table, sourceData }).find(sheet => sheet.name === "Continuous statistics");
  const mean = rows[0].indexOf("Mean"), count = rows[0].indexOf("Non-missing count"), note = rows[0].indexOf("Notes");
  expect(rows.slice(2).map(row => [row[count], row[mean]])).toEqual([[40, 2], [60, 8]]);
  expect(rows[1][note]).toContain("Privacy-protected pooled estimate");

  const hidden = { ...sourceData, continuousFeatures: sourceData.continuousFeatures.filter(feature => feature.nodeId !== 1) };
  const withHiddenMember = combineMappedTableData(hidden, results, active, [group], releases);
  const report = buildStatisticsReport({ data: withHiddenMember, sourceData: hidden });
  const continuous = report.find(sheet => sheet.name === "Continuous statistics");
  expect(continuous.rows.slice(2).map(row => row[mean])).toEqual([2, 8]);

  releases.delete(keys[2]);
  const missing = combineMappedTableData(sourceData, results, active, [group], releases).continuousFeatures[0];
  expect(missing.count).toBeNull();
  expect(missing.mean).toBeUndefined();
});

it("keeps exact features exact in the fallback view, including when a matching dataset is empty", () => {
  const results = [exact(members[0], 40, 2), exact(members[1], 60, 8),
    { ...members[2], message: "No records match the provided filters" }];
  const active = results.map(() => true);
  const sourceData = collectDiscoveryStatistics(results, active);
  const table = combineMappedTableData(sourceData, results, active, [group], new Map());
  expect(table).toEqual(combineMappedTableData(sourceData, results, active, [group]));
  expect(table.continuousFeatures[0]).toMatchObject({ count: 100, status: "Combined", mean: 5.6 });
});

it("fills distribution statistics independently of exact moments and exports their estimate label", () => {
  const results = [exact(members[0], 40, 2), exact(members[1], 60, 8), exact(members[2], 40, 10)];
  delete results[1].continuousFeatures[0].valueCounts;
  const active = results.map(() => true);
  const sourceData = collectDiscoveryStatistics(results, active);
  const base = combineMappedTableData(sourceData, results, active, [group]).continuousFeatures[0];
  expect(base.median).toBeUndefined();
  expect([...protectedPoolingMembers([group], results).keys()]).toEqual([keys[1]]);
  const releases = new Map([[keys[1], release([60, 0, 0])]]);
  const table = combineMappedTableData(sourceData, results, active, [group], releases);
  const [row] = table.continuousFeatures;
  expect(row).toMatchObject({ count: base.count, mean: base.mean, stdDev: base.stdDev,
    min: base.min, max: base.max, median: 5, modeBand: "0–10", status: "Combined · estimated distribution" });
  expect(row.combinedSummary.approximate).toBeUndefined();
  const { rows } = buildStatisticsReport({ data: table, sourceData }).find(sheet => sheet.name === "Continuous statistics");
  expect(rows[1][rows[0].indexOf("Notes")]).toContain("Quartiles are estimated from protected frequency counts");
  expect(rows[1][rows[0].indexOf("Mode")]).toBe("0–10");
});

it("combines signed contributions before projecting counts or calculating statistics", () => {
  const releases = new Map(keys.map((key, index) => [key, release([[80, 20, 3], [-4, 70, -2], [14, -9, 0]][index])]));
  const summary = buildApproximateSummary(group, releases);
  expect(summary).toMatchObject({ approximate: true, count: 171, missing: 1, includedSources: 3, median: 5 });
  expect(summary.mean).toBeCloseTo((90 * 5 + 81 * 15) / 171, 12);
  expect(summary.min).toBeUndefined();
  expect(summary.meanCiLower).toBeLessThan(summary.mean);
  expect(summary.meanCiUpper).toBeGreaterThan(summary.mean);
});

it("never labels a partial or incompatible estimate as pooled", () => {
  const releases = new Map([[keys[0], release([100, 10, 0])], [keys[1], release([0, 100, 0])]]);
  expect(buildApproximateSummary(group, releases).count).toBeUndefined();
  releases.set(keys[2], release([20, 20, 0], [0, 12, 20]));
  expect(buildApproximateSummary(group, releases)).toHaveProperty("unavailable");
  releases.set(keys[2], { ...release([20, 20, 0]), group: "B" });
  expect(buildApproximateSummary(group, releases)).toHaveProperty("unavailable");
});

it("retains public categorical labels, pools other and missing separately, and ranks the estimated counts", () => {
  const category = { ...group, type: "categorical" };
  const releases = new Map(keys.map((key, index) => [key, {
    version: 1, group: "A", noiseVariance: 4,
    features: { Value: { domain: { categories: ["East", "West"] }, counts: [[60, 30, 2, 4], [30, 12, -3, -2], [20, 20, 10, 2]][index] } },
  }]));
  expect(buildApproximateSummary(category, releases)).toMatchObject({
    count: 181, missing: 4, cardinality: 3,
    categories: [{ value: "East", count: 110 }, { value: "West", count: 62 }, { value: "Other", count: 9 }],
  });
});

it("uses the more precise short histograms to estimate cohort size without fresh noise", () => {
  const releases = new Map(keys.map(key => [key, {
    ...release([80, 40, 0]),
    features: {
      Value: { domain: { boundaries: [0, 10, 20] }, counts: [80, 40, 0] },
      Kind: { domain: { categories: ["Listed"] }, counts: [100, 0, 0] },
    },
  }]));
  // Both three-cell histograms get equal weight, regardless of the requested feature.
  expect(buildApproximateSummary(group, releases).count).toBe(330);
});

it("pools prior and new releases with their measured feature variances", () => {
  const next = {
    version: 2, group: "A", features: {
      Value: { domain: { boundaries: [0, 10, 20] }, counts: [65, 55, 0], noiseVariance: 20 / 9 },
      Kind: { domain: { categories: ["Listed"] }, counts: [60, 0, 0], noiseVariance: 80 / 9 },
    },
  };
  const releases = new Map([[keys[0], next], [keys[1], release([30, 20, 0])]]);
  const pair = { ...group, members: members.slice(0, 2) };
  const result = buildApproximateSummary(pair, releases);
  expect(result.count).toBe(158);
  expect(result.mean).toBeCloseTo((89 * 5 + 69 * 15) / 158, 10);
  expect(result.meanCiLower).toBeLessThan(result.mean);
  expect(result.meanCiUpper).toBeGreaterThan(result.mean);

  delete next.features.Value.noiseVariance;
  expect(buildApproximateSummary(pair, releases)).toHaveProperty("unavailable");
});

it("uses published scores for new numerical releases and can pool them with a prior interval release", () => {
  const scored = release([0, 0, 100, 0], [0, 5, 15, 20]);
  scored.features.Value.domain.values = [0, 10, 20];
  const inputs = new Map([[keys[0], scored], [keys[1], release([40, 60, 0])]]);
  expect(buildApproximateSummary({ ...group, members: members.slice(0, 1) }, inputs))
    .toMatchObject({ count: 100, mean: 20, median: 20 });
  expect(buildApproximateSummary({ ...group, members: members.slice(0, 2) }, inputs))
    .toMatchObject({ count: 200, mean: 13, median: 15 });
});

it("adds released and protected category counts with one pooled percentage denominator", () => {
  const category = { ...group, type: "categorical", members: members.slice(0, 1) };
  const inputs = new Map([[keys[0], { version: 1, group: "A", noiseVariance: 4,
    features: { Value: { domain: { categories: ["East", "West", "North"] }, counts: [20, 2, 1, 0, 0] } } }]]);
  const priors = [{ count: 40, missingValuesCount: 2, categoryCounts: { East: 25, West: 15 } }];
  const summary = buildApproximateSummary(category, inputs, priors, 2);
  expect(summary).toMatchObject({ count: 63, missing: 2, totalSources: 2,
    categories: [{ value: "East", count: 45 }, { value: "West", count: 17 }] });
  expect(summary.categories[0].percent).toBeCloseTo(100 * 45 / 63);
});

it("downweights isolated perturbations in sparse numerical profiles and preserves the count", () => {
  const boundaries = Array.from({ length: 25 }, (_, index) => index * 5);
  const cells = Array(25).fill(0);
  cells[10] = 12;
  cells[11] = 15;
  cells[12] = 13;
  cells[22] = -3;
  cells[23] = 4;
  const input = release(cells, boundaries);
  input.features.Kind = { domain: { categories: ["Listed"] }, counts: [44, 0, 0] };
  const result = buildApproximateSummary({ ...group, members: members.slice(0, 1) }, new Map([[keys[0], input]]));
  const unadjustedMean = (12 * 52.5 + 15 * 57.5 + 13 * 62.5 + 4 * 117.5) / 44;
  expect(result).toMatchObject({ count: 44, lowPrecision: true });
  expect(result.mean).toBeLessThan(unadjustedMean - 2);
  expect(result.note).toContain("Low precision");
});

it("keeps category noise out of modes and retains the full count as the percentage denominator", () => {
  const input = { version: 1, group: "A", noiseVariance: 4,
    features: { Value: { domain: { categories: ["East", "West"] }, counts: [40, 1, 3, 0] } } };
  const result = buildApproximateSummary({ ...group, type: "categorical", members: members.slice(0, 1) },
    new Map([[keys[0], input]]));
  expect(result).toMatchObject({ count: 44, cardinality: 1, categories: [{ value: "East", count: 40 }] });
  expect(result.categories[0].percent).toBeCloseTo(100 * 40 / 44);
});

it("labels weak estimates and exports approved estimates even when exact filtering was withheld", () => {
  const weak = new Map(keys.map(key => [key, release([1, -1, 0])]));
  expect(buildApproximateSummary(group, weak)).toMatchObject({ count: 0, note: expect.stringContaining("Estimated count only") });
  expect(buildApproximateSummary(group, weak).mean).toBeUndefined();

  const sources = members.map(member => ({ ...member, disclosureWithheld: true, omittedFeatures: [
    { featureName: "Value", type: "continuous", reason: "Withheld" },
  ] }));
  const sourceData = collectDiscoveryStatistics(sources, [true, true, true]);
  const releases = new Map(keys.map(key => [key, release([40, 30, 0])]));
  const table = combineMappedTableData(sourceData, sources, [true, true, true], [group], releases);
  expect(table.continuousFeatures[0]).toMatchObject({ count: 210, status: "Estimated", datasetCount: "3/3" });
  const sheet = buildStatisticsReport({ data: table, sourceData, includeBreakdown: false }).find(item => item.name === "Continuous statistics");
  expect(sheet.rows).toHaveLength(2);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mean")]).toBeCloseTo((120 * 5 + 90 * 15) / 210);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Privacy-protected estimate");
  const breakdown = buildStatisticsReport({ data: table, sourceData }).find(item => item.name === "Continuous statistics");
  expect(breakdown.rows).toHaveLength(2);
});
