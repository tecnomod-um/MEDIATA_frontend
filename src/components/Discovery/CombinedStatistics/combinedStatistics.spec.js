import { describe, expect, it } from "vitest";
import { buildCombinedStatistics, combinedStatisticsCsv, poolMoments } from "./combinedStatistics";

const summary = (name, values, missing = 0) => {
  const mean = values.reduce((n, v) => n + v, 0) / values.length;
  return { featureName: name, count: values.length, missingValuesCount: missing, mean,
    stdDev: Math.sqrt(values.reduce((n, v) => n + (v - mean) ** 2, 0) / values.length), min: Math.min(...values), max: Math.max(...values) };
};
const source = (nodeId, features) => ({ nodeId, nodeName: `Site ${nodeId}`, fileName: "patients.csv", continuousFeatures: features });

describe("combined cohort statistics", () => {
  it("uses interpolated medians and quartiles across site boundaries", () => {
    const a = summary('Age', Array(6).fill(1)), b = summary('Age', Array(6).fill(3));
    a.valueCounts = [{value:1,count:6}]; b.valueCounts = [{value:3,count:6}];
    const pooled = buildCombinedStatistics([source(1,[a]),source(2,[b])],[true,true]).features[0];
    expect(pooled).toMatchObject({count:12, q1:1, median:2, q3:3, mean:2, stdDev:1});
  });
  it("does not overflow the weighted mean of a single large finite constant", () => {
    expect(poolMoments([{count:12,mean:1e307,stdDev:0}])).toMatchObject({mean:1e307,stdDev:0,count:12});
  });
  it("exports each feature's actual source cohort instead of an unrelated global filter", () => {
    const csv = combinedStatisticsCsv([{featureName:'Age',type:'continuous',count:12,cohort:'All records'}], 'Cluster (= 1) at another dataset');
    expect(csv).toContain('"All records"');
    expect(csv).not.toContain('Cluster (= 1)');
  });
  it("calculates exact numerical quantiles only from complete disclosure-approved frequencies", () => {
    const a = summary('Age', [...Array(6).fill(1), ...Array(6).fill(2)]);
    const b = summary('Age', Array(12).fill(10));
    a.valueCounts = [{ value: 1, count: 6 }, { value: 2, count: 6 }];
    b.valueCounts = [{ value: 10, count: 12 }];
    expect(buildCombinedStatistics([source(1, [a]), source(2, [b])], [true, true]).features[0]).toMatchObject({ count: 24, q1: 1.75, median: 6, q3: 10 });
    a.valueCounts = [{ value: 1, count: 5 }, { value: 2, count: 7 }];
    expect(buildCombinedStatistics([source(1, [a]), source(2, [b])], [true, true]).features[0].median).toBeUndefined();
  });
  it("matches direct calculation for unequal site sizes, including between-site variation", () => {
    const sites = [[20, 30], [60, 70, 80, 90], [40]];
    const pooled = poolMoments(sites.map(v => summary("Age", v)));
    const direct = summary("Age", sites.flat());
    expect(pooled.count).toBe(direct.count);
    expect(pooled.mean).toBeCloseTo(direct.mean, 12);
    expect(pooled.stdDev).toBeCloseTo(direct.stdDev, 12);
    expect(pooled.mean).not.toBeCloseTo(sites.reduce((n, v) => n + summary("Age", v).mean, 0) / 3);
  });
  it("uses selected sources only and computes missing percentages using all records", () => {
    const result = buildCombinedStatistics([source(1, [summary("Age", [10, 20], 2)]), source(2, [summary("Age", [100], 4)])], [true, false]);
    expect(result.features[0]).toMatchObject({ count: 2, missing: 2, percentMissing: 50, mean: 15, includedSources: 1 });
  });
  it("does not treat a missing or suppressed site as zero or return a misleading partial mean", () => {
    const hidden = { ...source(2, []), omittedFeatures: [{ featureName: "Age", reason: "Suppressed for privacy", count: 0 }] };
    const row = buildCombinedStatistics([source(1, [summary("Age", [10, 20])]), hidden], [true, true]).features[0];
    expect(row.unavailable).toBeTruthy();
    expect(row.mean).toBeUndefined();
    expect(row.count).toBeUndefined();
    expect(row.contributions[1].status).toBe("Suppressed for privacy");
  });
  it("accepts an empty cluster at one site without including the site's unfiltered records", () => {
    const empty = { ...source(2, []), message: "No records match the provided filters for file: patients.csv" };
    const row = buildCombinedStatistics([source(1, [summary("Age", [10, 20])]), empty], [true, true]).features[0];
    expect(row).toMatchObject({ mean: 15, count: 2, totalSources: 2 });
    expect(row.unavailable).toBeUndefined();
  });
  it("rejects incompatible types and malformed summary values", () => {
    const categorical = { ...source(2, []), categoricalFeatures: [{ featureName: "Age", count: 2, missingValuesCount: 0, categoryCounts: { adult: 2 } }] };
    expect(buildCombinedStatistics([source(1, [summary("Age", [10, 20])]), categorical], [true, true]).features[0].unavailable).toContain("Different variable types");
    expect(poolMoments([{ count: 2, mean: null, stdDev: 0 }])).toBeNull();
    expect(poolMoments([{ count: 2, mean: 4, stdDev: -1 }])).toBeNull();
  });
  it("combines full categorical frequencies and handles category names as data", () => {
    const categorical = (id, counts, count) => ({ ...source(id, []), categoricalFeatures: [{ featureName: "Sex", categoryCounts: counts, count, missingValuesCount: 1 }] });
    const row = buildCombinedStatistics([categorical(1, { Female: 2, Male: 1 }, 3), categorical(2, JSON.parse('{"Female":1,"Male":4,"__proto__":1}'), 6)], [true, true]).features[0];
    expect(row).toMatchObject({ count: 9, missing: 2 });
    expect(row.categories[0]).toMatchObject({ value: "Male", count: 5 });
    expect(row.categories.find(c => c.value === "__proto__").count).toBe(1);
  });
  it("reconstructs exact date summaries from date frequencies", () => {
    const date = (id, histogram, count) => ({ ...source(id, []), dateFeatures: [{ featureName: "Date", dateHistogram: histogram, count, missingValuesCount: 0 }] });
    const row = buildCombinedStatistics([date(1, { "2020-01-01": 2 }, 2), date(2, { "2020-01-05": 2 }, 2)], [true, true]).features[0];
    expect(row).toMatchObject({ mean: "2020-01-03", stdDev: 2, median: "2020-01-03", min: "2020-01-01", max: "2020-01-05" });
  });
  it("never averages numerical medians, quartiles or locally binned histograms", () => {
    const row = buildCombinedStatistics([source(1, [{ ...summary("Age", [1, 2]), median: 1.5, qrt1: 1, qrt3: 2 }]), source(2, [summary("Age", [9])])], [true, true]).features[0];
    expect(row.median).toBeUndefined();
    expect(row.q1).toBeUndefined();
  });
  it("exports unavailable results without invented counts and escapes spreadsheet formulas", () => {
    const csv = combinedStatisticsCsv([{ featureName: '=HYPERLINK("x")', type: "continuous", includedSources: 1, totalSources: 2, unavailable: "Suppressed" }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Suppressed"');
    expect(csv).not.toContain('"NaN"');
  });
});
