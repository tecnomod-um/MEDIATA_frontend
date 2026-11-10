import { expect, it } from "vitest";
import { meanConfidenceInterval, adjustedSkewness, adjustedKurtosis, sampleStandardDeviation, numericalModes, poolNumericalModes } from "./numericalSummary";
import { poolMoments, buildCombinedStatistics } from "./combinedStatistics";

const summary = values => {
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  return { count: values.length, mean,
    stdDev: Math.sqrt(values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length),
    sumCubedDeviations: values.reduce((s, x) => s + (x - mean) ** 3, 0),
    sumFourthDeviations: values.reduce((s, x) => s + (x - mean) ** 4, 0) };
};

it("matches independent t interval and adjusted skewness references, using sample variance for inference", () => {
  const part = summary([1, 2, 3, 4, 8, 8]);
  const interval = meanConfidenceInterval(part.count, part.mean, part.stdDev);
  expect(interval.meanCiLower).toBeCloseTo(1.1733875313655244, 10);
  expect(interval.meanCiUpper).toBeCloseTo(7.493279135301142, 10);
  expect(adjustedSkewness(part.count, part.stdDev, part.sumCubedDeviations)).toBeCloseTo(0.5103681371632725, 12);
  expect(adjustedKurtosis(part.count, part.stdDev, part.sumFourthDeviations)).toBeCloseTo(-1.840938581314877, 12);
  expect(sampleStandardDeviation(part.count, part.stdDev)).toBeCloseTo(3.011090610836324, 12);
});

it("can certify a pooled mode shared by all local maxima even when rare non-modal frequencies are withheld", () => {
  const parts = [{ modes: [0, 4], modeFrequency: 12, modeStatus: "Available" },
    { modes: [4, 8], modeFrequency: 18, modeStatus: "Available" }];
  expect(poolNumericalModes(parts, [])).toEqual({ modes: [4], modeFrequency: 30, modeStatus: "Available" });
  expect(poolNumericalModes([parts[0]], [])).toEqual(parts[0]);
  expect(poolNumericalModes([parts[0], { ...parts[1], modeStatus: "Withheld" }], []).modes).toEqual([]);
  expect(poolNumericalModes([parts[0], { ...parts[1], modes: [8] }], []).modeFrequency).toBeNull();
});

it("merges third central moments across unequal sites and different partition orders", () => {
  const sites = [[0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1], Array(12).fill(4)];
  for (const order of [sites, [...sites].reverse(), [sites[1], sites[0], sites[2]]]) {
    const pooled = poolMoments(order.map(summary));
    expect(pooled.sumCubedDeviations).toBeCloseTo(-15.75, 12);
    expect(pooled.sumFourthDeviations).toBeCloseTo(280.96875, 12);
    expect(adjustedKurtosis(pooled.count, pooled.stdDev, pooled.sumFourthDeviations)).toBeCloseTo(-2.000988630746416, 12);
    expect(adjustedSkewness(pooled.count, pooled.stdDev, pooled.sumCubedDeviations)).toBeCloseTo(-0.1231518341349694, 12);
    expect(meanConfidenceInterval(pooled.count, pooled.mean, pooled.stdDev).meanCiLower).toBeCloseTo(1.4798952644523076, 10);
  }
});

it("keeps undefined skewness and intervals unavailable rather than reporting zero", () => {
  expect(adjustedSkewness(24, 0, 0)).toBeNull();
  expect(adjustedSkewness(24, 2, null)).toBeNull();
  expect(adjustedSkewness(2, 2, 1)).toBeNull();
  expect(meanConfidenceInterval(1, 5, 0).meanCiLower).toBeNull();
  expect(meanConfidenceInterval(24, 5, 0)).toEqual({ meanCiLower: 5, meanCiUpper: 5 });
  expect(meanConfidenceInterval(24, Infinity, 0).meanCiLower).toBeNull();
  expect(poolMoments([{ count: 24, mean: 3, stdDev: 1 }]).sumCubedDeviations).toBeNull();
  expect(adjustedKurtosis(24, 0, 0)).toBeNull();
  expect(adjustedKurtosis(3, 1, 1)).toBeNull();
  expect(adjustedKurtosis(24, 1, null)).toBeNull();
  expect(sampleStandardDeviation(1, 0)).toBeNull();
  expect(poolMoments([{ count: 24, mean: 3, stdDev: 1 }]).sumFourthDeviations).toBeNull();
});

it("matches direct fourth moments when non-constant sites have unequal sizes and nonzero local skewness", () => {
  const sites = [[0, 1, 4, 9], [1, 1, 2, 2, 2, 6], [20, 23, 25]];
  const expected = summary(sites.flat());
  for (const order of [sites, [...sites].reverse(), [sites[1], sites[0], sites[2]]]) {
    const pooled = poolMoments(order.map(summary));
    expect(pooled.sumFourthDeviations).toBeCloseTo(expected.sumFourthDeviations, 8);
    expect(pooled.sumCubedDeviations).toBeCloseTo(expected.sumCubedDeviations, 9);
  }
});

it("retains all numerical mode ties and never substitutes a local mode for the global mode", () => {
  expect(numericalModes([[0, 6], [4, 6], [10, 2]])).toEqual({ modes: [0, 4], modeFrequency: 6, modeStatus: "Available" });
  expect(numericalModes([[1, 1], [2, 1]]).modeStatus).toBe("No repeated value");
  const source = (id, values, counts) => ({ nodeId: id, fileName: "data.csv", continuousFeatures: [{ featureName: "X", ...summary(values),
    missingValuesCount: 0, min: Math.min(...values), max: Math.max(...values), valueCounts: counts,
    modes: [id === 1 ? 0 : 4], modeFrequency: 12, modeStatus: "Available" }] });
  const a = source(1, [...Array(12).fill(0), ...Array(9).fill(2)], [{ value: 0, count: 12 }, { value: 2, count: 9 }]);
  const b = source(2, [...Array(9).fill(2), ...Array(12).fill(4)], [{ value: 2, count: 9 }, { value: 4, count: 12 }]);
  const combined = buildCombinedStatistics([a, b], [true, true]).features[0];
  expect(combined.modes).toEqual([2]);
  expect(combined.modeFrequency).toBe(18);
  b.continuousFeatures[0].valueCounts = [];
  expect(buildCombinedStatistics([a, b], [true, true]).features[0].modeStatus).toContain("unavailable");
  expect(buildCombinedStatistics([a, b], [true, true]).features[0].modes).toEqual([]);
});
