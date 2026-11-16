import { expect, it } from "vitest";
import { buildApproximateSummary } from "./approximatePooling";
import { sourceKey } from "./combinedStatistics";
import { combineMappedTableData } from "./statisticsTableData";
import { collectDiscoveryStatistics } from "../discoveryStatistics";
import { buildStatisticsReport } from "../DataExporter/statisticsReport";

const members = [1, 2, 3].map(nodeId => ({ nodeId, fileName: "example.csv", column: "Value" }));
const group = { id: "Value", label: "Value", type: "continuous", members };
const keys = members.map(sourceKey);
const release = (counts, boundaries = [0, 10, 20]) =>
  ({ version: 1, group: "A", noiseVariance: 4, features: { Value: { domain: { boundaries }, counts } } });

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
  expect(table.continuousFeatures[0]).toMatchObject({ count: 210, status: "Approximate", datasetCount: "3/3" });
  const sheet = buildStatisticsReport({ data: table, sourceData, includeBreakdown: false }).find(item => item.name === "Continuous statistics");
  expect(sheet.rows).toHaveLength(2);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mean")]).toBeCloseTo((120 * 5 + 90 * 15) / 210);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Privacy-protected estimate");
  const breakdown = buildStatisticsReport({ data: table, sourceData }).find(item => item.name === "Continuous statistics");
  expect(breakdown.rows.slice(2)).toHaveLength(3);
  expect(breakdown.rows.slice(2).every(row => row[breakdown.rows[0].indexOf("Non-missing count")] === 70)).toBe(true);
});
