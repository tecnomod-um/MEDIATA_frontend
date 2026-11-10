import { describe, it, expect } from "vitest";
import { poolBivariateMoments, rankCorrelationFromCounts, chiSquareFromCounts, chiSquareSurvival, combineMappedRelationships } from "./pairedStatistics";
import { collectDiscoveryStatistics, relationshipStatisticsRows } from "../discoveryStatistics";
import { statisticsCsvRows } from "../../../util/statisticsCsv";
import { sourceKey } from "./combinedStatistics";
import { combineMappedTableData } from "./statisticsTableData";
import { createColumnMappings } from "./columnMappings";

const moments = (values, featureX = 'X', featureY = 'Y') => {
  const count = values.length, meanX = values.reduce((s, p) => s + p[0], 0) / count, meanY = values.reduce((s, p) => s + p[1], 0) / count;
  return { featureX, featureY, count, meanX, meanY,
    m2X: values.reduce((s, p) => s + (p[0] - meanX) ** 2, 0),
    m2Y: values.reduce((s, p) => s + (p[1] - meanY) ** 2, 0),
    crossMoment: values.reduce((s, p) => s + (p[0] - meanX) * (p[1] - meanY), 0) };
};
const repeated = pairs => pairs.flatMap(pair => Array.from({ length: 6 }, () => pair));
const site = (id, pairs) => {
  const part = moments(pairs);
  return { nodeId: id, nodeName: `Site ${id}`, fileName: 'data.csv', relationshipSummaryVersion: 1,
    continuousFeatures: ['X', 'Y'].map((name, i) => ({ featureName: name, count: pairs.length, missingValuesCount: 0,
      mean: i ? part.meanY : part.meanX, stdDev: Math.sqrt((i ? part.m2Y : part.m2X) / pairs.length),
      min: Math.min(...pairs.map(pair => pair[i])), max: Math.max(...pairs.map(pair => pair[i])) })),
    numericPairSummaries: [part], categoricalPairSummaries: [] };
};
const combined = (sources, mappings = createColumnMappings(sources)) => {
  const active = sources.map(() => true);
  return combineMappedRelationships(combineMappedTableData(collectDiscoveryStatistics(sources, active), sources, active, mappings), sources);
};

describe('pooled paired relationships', () => {
  it('exports only the datasets and filters that contributed to a particular pair', () => {
    const sources=[site(1,repeated([[1,3],[2,5]])),site(2,repeated([[3,7],[4,9]]))];
    const result=combined(sources,createColumnMappings(sources).filter(mapping=>mapping.label==='X'));
    const applied=new Map([[sourceKey(sources[0]),'Cluster (= 0)'],[sourceKey(sources[1]),'Cluster (= 1)']]);
    const csv=statisticsCsvRows(relationshipStatisticsRows(result,{},applied));
    const row=csv.split('\r\n').find(row=>row.startsWith('"covariances","X","Y (data.csv · Site 2)"'));
    expect(row).toContain('Site 2 / data.csv: Cluster (= 1)');
    expect(row).toContain('"12"');
    expect(row).not.toContain('Site 1');
    expect(row).not.toContain('Cluster (= 0)');
  });
  it('includes between-site co-variation and unequal complete-case counts', () => {
    const a = [[1, 10], [2, 8], [3, 7]], b = [[50, -1], [52, 0], [54, 3], [56, 8]];
    const result = poolBivariateMoments([moments(a), moments(b)]), direct = moments([...a, ...b]);
    expect(result.count).toBe(7);
    expect(result.covariance).toBeCloseTo(direct.crossMoment / 6, 12);
    expect(result.pearson).toBeCloseTo(direct.crossMoment / Math.sqrt(direct.m2X * direct.m2Y), 12);
  });
  it('accepts locally constant sites that become variable when pooled', () => {
    expect(poolBivariateMoments([moments(repeated([[1, 4]])), moments(repeated([[2, 8]]))]).pearson).toBeCloseTo(1, 12);
  });
  it('reconstructs global average-tie ranks instead of averaging local rank correlations', () => {
    const cells = [{ x: 1, y: 10, count: 6 }, { x: 2, y: 20, count: 6 }, { x: 10, y: 1, count: 6 }, { x: 20, y: 2, count: 6 }];
    expect(rankCorrelationFromCounts(cells)).toBeCloseTo(-.6, 12);
    const sources = [site(1, repeated([[1, 10], [2, 20]])), site(2, repeated([[10, 1], [20, 2]]))];
    sources.forEach((source, i) => source.numericPairSummaries[0].frequencies = cells.slice(i * 2, i * 2 + 2));
    const result = combined(sources);
    expect(result.covariances.X.Y).toBeCloseTo(-43.0625 * 24 / 23, 12);
    expect(result.pearsonCorrelations.X.Y).toBeCloseTo(-43.0625 / 58.1875, 12);
    expect(result.spearmanCorrelations.X.Y).toBeCloseTo(-.6, 12);
    expect(result.relationshipDetails.pearson.X.Y.count).toBe(24);
  });
  it('handles reversed pair orientation and column aliases', () => {
    const sources = [site(1, repeated([[1, 3], [2, 5]])), site(2, repeated([[3, 7], [4, 9]]))];
    const mappings = createColumnMappings(sources);
    mappings.find(group => group.label === 'X').members[1].column = 'OtherX';
    sources[1].continuousFeatures[0].featureName = 'OtherX';
    const pair = sources[1].numericPairSummaries[0];
    sources[1].numericPairSummaries = [{ ...pair, featureX: 'Y', featureY: 'OtherX', meanX: pair.meanY, meanY: pair.meanX, m2X: pair.m2Y, m2Y: pair.m2X }];
    expect(combined(sources, mappings).pearsonCorrelations.X.Y).toBeCloseTo(1, 12);
  });
  it('keeps covariance available when rank frequencies are withheld, and never substitutes a partial cohort', () => {
    const sources = [site(1, repeated([[1, 3], [2, 5]])), site(2, repeated([[3, 7], [4, 9]]))];
    const result = combined(sources);
    expect(result.covariances.X.Y).toBeTypeOf('number');
    expect(result.spearmanCorrelations.X.Y).toBeNull();
    expect(result.relationshipDetails.spearman.X.Y.reason).toMatch(/withheld/);
    sources[1].numericPairSummaries = [];
    const suppressed = combined(sources);
    expect(suppressed.covariances.X.Y).toBeNull();
    expect(suppressed.relationshipDetails.covariance.X.Y.count).toBeUndefined();
    expect(suppressed.relationshipDetails.covariance.X.Y.reason).toMatch(/No partial/);
  });
  it('fails closed for old nodes and malformed moments or disclosure cells', () => {
    expect(poolBivariateMoments([{ count: 6, meanX: 0, meanY: 0, m2X: 1, m2Y: 1, crossMoment: 10 }])).toBeNull();
    const sources = [site(1, repeated([[1, 3], [2, 5]])), site(2, repeated([[3, 7], [4, 9]]))];
    delete sources[1].relationshipSummaryVersion;
    expect(combined(sources).relationshipDetails.covariance.X.Y.reason).toMatch(/updated/);
  });
  it('recomputes chi-square from pooled contingency counts and preserves tiny upper-tail p-values', () => {
    const cells = [{ x: 'A', y: 'U', count: 48 }, { x: 'A', y: 'V', count: 12 }, { x: 'B', y: 'U', count: 12 }, { x: 'B', y: 'V', count: 48 }];
    const result = chiSquareFromCounts(cells);
    expect(result).toMatchObject({ count: 120, statistic: 43.2, degreesOfFreedom: 1, smallExpected: false });
    expect(result.pvalue).toBeCloseTo(4.942068131098457e-11, 18);
    expect(chiSquareSurvival(100, 1)).toBeCloseTo(1.523970604832105e-23, 28);
    expect(chiSquareSurvival(100, 2)).toBeCloseTo(Math.exp(-50), 28);
    expect(chiSquareSurvival(0, 4)).toBe(1);
  });
  it('pools mapped categorical pairs from complete tables and blocks suppressed contributors', () => {
    const sources = [1, 2].map(id => ({ nodeId: id, nodeName: `Site ${id}`, fileName: 'data.csv', relationshipSummaryVersion: 1,
      continuousFeatures: [], categoricalFeatures: [
        { featureName: 'X', count: 60, missingValuesCount: 0, categoryCounts: { A: 30, B: 30 } },
        { featureName: 'Y', count: 60, missingValuesCount: 0, categoryCounts: { U: 30, V: 30 } }],
      categoricalPairSummaries: [{ featureX: 'X', featureY: 'Y', count: 60, frequencies: [
        { x: 'A', y: 'U', count: 24 }, { x: 'A', y: 'V', count: 6 }, { x: 'B', y: 'U', count: 6 }, { x: 'B', y: 'V', count: 24 }] }] }));
    expect(combined(sources).chiSquareTest[0]).toMatchObject({ category1: 'X', category2: 'Y', count: 120, statistic: 43.2, degreesOfFreedom: 1 });
    sources[1].categoricalPairSummaries = [];
    const suppressed = combined(sources).chiSquareTest[0];
    expect(suppressed.pvalue).toBeUndefined(); expect(suppressed.count).toBeUndefined();
    expect(suppressed.reason).toMatch(/No partial/);
  });
});
