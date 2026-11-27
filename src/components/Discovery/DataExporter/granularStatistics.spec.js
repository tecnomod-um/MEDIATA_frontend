import { expect, it } from "vitest";
import { buildStatisticsReport } from "./statisticsReport";
import { tableExportFeatures } from "../CombinedStatistics/summaryTableFeature";
import { buildCombinedStatistics, dayNumber, dateString, numericalDateFeature, sourceKey } from "../CombinedStatistics/exact/combinedStatistics";
import { protectedPoolingMembers } from "../CombinedStatistics/poolingContributions";
import { approvedQuartiles } from "../CombinedStatistics/exact/approvedQuartiles";

const source = { nodeId: 1, nodeName: "Alpha", fileName: "source.csv" };
const records = (sheets, name) => {
  const [headers, ...rows] = sheets.find(sheet => sheet.name === name).rows;
  return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
};

it("preserves common category summaries while marking only unreleased details", () => {
  const data = { categoricalFeatures: [{ ...source, featureName: "Group", count: 96, missingValuesCount: 0,
    cardinality: 3, mode: "A", modeFrequency: 80, modeFrequencyPercentage: 100 * 80 / 96,
    secondMode: "B", secondModeFrequency: null, secondModePercentage: null,
    categoryCountsStatus: "COARSENED", categoryCounts: {}, categoryBins: [
      { label: "A", count: 80, grouped: false }, { label: "Other categories", count: 16, grouped: true },
    ] }] };
  const sheets = buildStatisticsReport({ data, sourceData: data });
  expect(records(sheets, "Categorical statistics")[0]).toMatchObject({
    "Non-missing count": 96, "Missing count": 0, "Distinct categories": 3,
    Mode: "A", "Mode count": 80, "2nd mode": "B", "2nd mode count": "Withheld", "2nd mode %": "Withheld",
  });
  expect(tableExportFeatures(data)[0].categories).toBeUndefined();
  expect(records(sheets, "Categorical statistics")[0].Notes).toBe("Some category frequencies withheld");
});

it("does not treat grouped chart buckets as real categories when pooling", () => {
  const partial = { ...source, categoricalFeatures: [{ featureName: "Group", count: 96, missingValuesCount: 0,
    categoryCountsStatus: "COARSENED", categoryCounts: {}, categoryBins: [{ label: "Other categories", count: 96, grouped: true }] }] };
  const complete = { ...source, nodeId: 2, categoricalFeatures: [{ featureName: "Group", count: 96, missingValuesCount: 0,
    categoryCounts: { A: 60, B: 36 } }] };
  const pooled = buildCombinedStatistics([partial, complete], [true, true]).features[0];
  expect(pooled).toMatchObject({ count: 192, missing: 0, countsReleased: true, unavailable: expect.any(String) });
  expect(pooled.categories).toBeUndefined();
  const group = { id: "group", label: "Group", type: "categorical", members: [1, 2].map(nodeId => ({ nodeId, fileName: "source.csv", column: "Group" })) };
  expect([...protectedPoolingMembers([group], [partial, complete]).keys()]).toEqual([sourceKey(partial)]);
});

function dates(nodeId, values, start, end) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const m2 = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return { ...source, nodeId, dateFeatures: [{ featureName: "Visit", count: values.length, missingValuesCount: nodeId - 1,
    earliestDate: dateString(Math.min(...values)), latestDate: dateString(Math.max(...values)),
    mean: dateString(mean), stdDev: Math.sqrt(m2 / values.length), sumEpochDays: values.reduce((sum, value) => sum + value, 0),
    sumSquaredDeviations: m2, histogramStatus: "COARSENED", dateHistogram: {},
    dateBins: [{ start, end, count: values.length }] }] };
}

it("pools date moments exactly and labels histogram-based pooled quantiles as estimates", () => {
  const raw = Array.from({ length: 24 }, (_, index) => index);
  const sites = [dates(1, raw.slice(0, 12), "1969-12-29", "1970-01-18"), dates(2, raw.slice(12), "1970-01-05", "1970-02-01")];
  const row = buildCombinedStatistics(sites, [true, true]).features[0];
  expect(row).toMatchObject({ count: 24, missing: 1, mean: "1970-01-12", min: "1970-01-01", max: "1970-01-24", estimatedQuantiles: true });
  expect(row.stdDev).toBeCloseTo(Math.sqrt(raw.reduce((sum, value) => sum + (value - 11.5) ** 2, 0) / 24), 12);
  for (const [field, exact] of [["q1", 5.75], ["median", 11.5], ["q3", 17.25]]) {
    expect(row.quantileBounds[field][0]).toBeLessThanOrEqual(exact);
    expect(row.quantileBounds[field][1]).toBeGreaterThanOrEqual(exact);
    expect(Number.isFinite(dayNumber(row[field]))).toBe(true);
  }
  expect(numericalDateFeature(sites[0].dateFeatures[0]).min).toBe(0);
});

it("never invents date moments by treating interval endpoints as patient dates", () => {
  const site = dates(1, [0, 1, 2, 3, 4, 5], "1969-12-29", "1970-01-04");
  delete site.dateFeatures[0].sumEpochDays;
  delete site.dateFeatures[0].sumSquaredDeviations;
  expect(numericalDateFeature(site.dateFeatures[0])).toBeNull();
  expect(buildCombinedStatistics([site], [true]).features[0].unavailable).toBeTruthy();
});

it("rejects malformed explicit histogram bounds without crashing or inventing quantiles", () => {
  expect(approvedQuartiles([{ count: 6, min: 0, max: 10, histogram: [6], histogramBounds: [null] }])).toBeNull();
});
