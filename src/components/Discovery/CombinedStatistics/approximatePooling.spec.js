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
  expect(table.continuousFeatures[0]).toMatchObject({ count: 210, status: "Approximate (low precision)", datasetCount: "3/3" });
  const sheet = buildStatisticsReport({ data: table, sourceData, includeBreakdown: false }).find(item => item.name === "Continuous statistics");
  expect(sheet.rows).toHaveLength(2);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mean")]).toBeCloseTo((120 * 5 + 90 * 15) / 210);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Privacy-protected estimate");
  const breakdown = buildStatisticsReport({ data: table, sourceData }).find(item => item.name === "Continuous statistics");
  expect(breakdown.rows.slice(2)).toHaveLength(3);
  expect(breakdown.rows.slice(2).every(row => row[breakdown.rows[0].indexOf("Non-missing count")] === 70)).toBe(true);
});
