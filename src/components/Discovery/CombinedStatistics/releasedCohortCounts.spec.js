import { expect, it } from "vitest";
import { releasedCohortCounts, combinedCohortCount } from "./releasedCohortCounts";
import { sourceKey } from "./exact/combinedStatistics";

const first = { nodeId: 1, fileName: "measurements.csv" };
const second = { nodeId: 2, fileName: "measurements.csv" };
const feature = (count, missingValuesCount = 0) => ({ count, missingValuesCount });
const totalsFor = (...sources) => releasedCohortCounts(new Map(sources.map((source) => [sourceKey(source), source])));

it("shares released population counts across types without confusing them with non-missing counts", () => {
  const totals = totalsFor({ ...first, continuousFeatures: [feature(8, 2)], categoricalFeatures: [feature(7, 3)],
    dateFeatures: [feature(10)] }, { ...second, dateFeatures: [feature(4, 1)] });
  expect(totals.get(sourceKey(first))).toBe(10);
  expect(totals.get(sourceKey(second))).toBe(5);
  expect(combinedCohortCount({ members: [first, second] }, totals)).toBe(15);
});

it("rejects conflicting, malformed and estimated counts rather than treating them as approved totals", () => {
  expect(totalsFor({ ...first, continuousFeatures: [feature(10), feature(9)] }).size).toBe(0);
  expect(totalsFor({ ...first, continuousFeatures: [feature(-1), feature(1.5), feature(Number.MAX_SAFE_INTEGER, 1)] }).size).toBe(0);
  for (const marker of [{ approximate: true }, { estimatedSummary: {} }, { combinedSummary: {} }]) {
    expect(totalsFor({ ...first, continuousFeatures: [{ ...feature(10), ...marker }] }).size).toBe(0);
  }
});

it("uses current results only and never borrows counts from other nodes, files or selections", () => {
  const initial = totalsFor({ ...first, continuousFeatures: [feature(100)] });
  const filtered = totalsFor({ ...first, continuousFeatures: [feature(8)] }, { ...second, omittedFeatures: [] });
  expect(initial.get(sourceKey(first))).toBe(100);
  expect(filtered.get(sourceKey(first))).toBe(8);
  expect(combinedCohortCount({ members: [first, second] }, filtered)).toBeUndefined();
  expect(combinedCohortCount({ members: [{ ...first, fileName: "other.csv" }] }, filtered)).toBeUndefined();
  expect(totalsFor({ ...first, disclosureWithheld: true }).size).toBe(0);
});

it("handles zero populations and refuses duplicate sources or overflowing totals", () => {
  const totals = totalsFor({ ...first, continuousFeatures: [feature(0)] }, { ...second, continuousFeatures: [feature(5)] });
  expect(combinedCohortCount({ members: [first] }, totals)).toBe(0);
  expect(combinedCohortCount({ members: [first, first] }, totals)).toBeUndefined();
  expect(combinedCohortCount({ members: [] }, totals)).toBeUndefined();
  totals.set(sourceKey(first), Number.MAX_SAFE_INTEGER);
  expect(combinedCohortCount({ members: [first, second] }, totals)).toBeUndefined();
});
