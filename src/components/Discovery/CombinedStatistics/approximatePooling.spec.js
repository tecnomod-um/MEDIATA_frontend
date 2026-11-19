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

it("uses the protected cohort count when a wide noisy histogram would collapse a small group",()=>{
  const input={version:5,group:"A",rowEpsilon:20,cohortCount:{count:4,noiseVariance:.000001,noiseComponents:[.000001]},
    features:{Value:{domain:{boundaries:[5,15,25,35],values:[10,20,30],type:"continuous",missingAllowed:false},counts:[2,2,-30,0],noiseVariance:4}}};
  const summary=buildApproximateSummary({...group,members:members.slice(0,1)},new Map([[keys[0],input]]));
  expect(summary).toMatchObject({count:4,mean:15,missing:0});
  expect(summary.sampleStdDev).toBeCloseTo(Math.sqrt(100/3));
  expect(summary).toMatchObject({q1:10,median:15,q3:20});
  const invalid={...input,cohortCount:{...input.cohortCount,count:1.5}};
  expect(buildApproximateSummary({...group,members:members.slice(0,1)},new Map([[keys[0],invalid]])).unavailable).toBeTruthy();
});

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

it("preserves node explanations and propagates cancellation without stale results", async () => {
  const member = members[0];
  const nodes = [{...member,serviceUrl:"http://node"}];
  const selected = new Map([[keys[0],member]]);
  getApproximatePoolingSource.mockRejectedValue({response:{data:{detail:"The saved grouping feature differs."}}});
  const responses = await loadApproximatePooling(selected,nodes,()=>({}),new AbortController().signal);
  expect(buildApproximateSummary({...group,members:[member]},responses).unavailable).toBe("The saved grouping feature differs.");
  const controller = new AbortController();
  controller.abort();
  await expect(loadApproximatePooling(selected,nodes,()=>({}),controller.signal)).rejects.toBeDefined();
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
  expect(summary).toMatchObject({ approximate: true, count: 169, missing: 3, includedSources: 3, median: 5 });
  expect(summary.mean).toBeCloseTo((89 * 5 + 80 * 15) / 169, 12);
  expect(summary).toMatchObject({min:5,estimatedExtrema:true});
  expect(summary.meanCiLower).toBeLessThan(summary.mean);
  expect(summary.meanCiUpper).toBeGreaterThan(summary.mean);
});

it("rejects partial or differently filtered estimates and coarsens incompatible grids", () => {
  const releases = new Map([[keys[0], release([100, 10, 0])], [keys[1], release([0, 100, 0])]]);
  expect(buildApproximateSummary(group, releases).count).toBeUndefined();
  releases.set(keys[2], release([20, 20, 0], [0, 12, 20]));
  expect(buildApproximateSummary(group, releases)).toMatchObject({count:250, mean:10, lowPrecision:true});
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
    count: 179, missing: 6, cardinality: 2,
    categories: [{ value: "East", count: 109 }, { value: "West", count: 62 }],
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
    categories: [{ value: "East", count: 45 }, { value: "West", count: 17 }, {value:"North",count:1}] });
  expect(summary.categories[0].percent).toBeCloseTo(100 * 45 / 63);
});

it("fits a coherent histogram and flags sparse estimates without ad hoc smoothing", () => {
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
  expect(result.mean).toBeCloseTo(unadjustedMean,12);
  expect(result.note).toContain("Low precision");
});

it("reports reconstructed category frequencies with the full count denominator", () => {
  const input = { version: 1, group: "A", noiseVariance: 4,
    features: { Value: { domain: { categories: ["East", "West"] }, counts: [40, 1, 3, 0] } } };
  const result = buildApproximateSummary({ ...group, type: "categorical", members: members.slice(0, 1) },
    new Map([[keys[0], input]]));
  expect(result).toMatchObject({ count: 44, cardinality: 2, categories: [{ value: "East", count: 40 }, {value:"West",count:1}] });
  expect(result.categories[0].percent).toBeCloseTo(100 * 40 / 44);
});

it("does not rank a combined unlisted bucket as a single observed category", () => {
  const input = {version:3,group:"A",rowEpsilon:Math.log(2),features:{Value:{
    domain:{categories:["Other","West"],type:"categorical"},counts:[100,50,300,0],noiseVariance:4}}};
  const result = buildApproximateSummary({...group,type:"categorical",members:members.slice(0,1)},new Map([[keys[0],input]]));
  expect(result).toMatchObject({count:450,cardinality:2,categories:[{value:"Other",count:100},{value:"West",count:50}]});
  expect(result.categories[0].percent).toBeCloseTo(100*100/450);
  expect(result.note).toContain("Unlisted category totals are excluded from mode rankings");
});

it("distinguishes estimated extrema from the statistically supported range", () => {
  const boundaries = Array.from({ length: 25 }, (_, index) => index * 5);
  const counts = Array(25).fill(0);
  counts[10] = 20;
  counts[23] = 6;
  const pair = { ...group, members: members.slice(0, 2) };
  const sources = [exact(members[0], 100, 50), withheld(members[1])];
  const active = sources.map(() => true);
  const sourceData = collectDiscoveryStatistics(sources, active);
  const input = new Map([[keys[1], release(counts, boundaries)]]);
  const data = combineMappedTableData(sourceData, sources, active, [pair], input);
  expect(data.continuousFeatures[0]).toMatchObject({ min: 50, max: 117.5,
    supportedMin: 50, supportedMax: 55 });
  const report = buildStatisticsReport({ data, sourceData, includeBreakdown: false });
  const { rows } = report.find(sheet => sheet.name === "Continuous statistics");
  expect(rows[1][rows[0].indexOf("Min")]).toBe(50);
  expect(rows[1][rows[0].indexOf("Max")]).toBe(117.5);
  expect(rows[1][rows[0].indexOf("Supported range lower")]).toBe(50);
  expect(rows[1][rows[0].indexOf("Supported range upper")]).toBe(55);
});

it("labels weak estimates and exports approved estimates even when exact filtering was withheld", () => {
  const weak = new Map(keys.map(key => [key, release([1, -1, 0])]));
  expect(buildApproximateSummary(group, weak)).toMatchObject({ count: 0, note: expect.stringContaining("No positive non-missing count") });
  expect(buildApproximateSummary(group, weak).mean).toBeUndefined();

  const sources = members.map(member => ({ ...member, disclosureWithheld: true, omittedFeatures: [
    { featureName: "Value", type: "continuous", reason: "Withheld" },
  ] }));
  const sourceData = collectDiscoveryStatistics(sources, [true, true, true]);
  const releases = new Map(keys.map(key => [key, release([40, 30, 0])]));
  const table = combineMappedTableData(sourceData, sources, [true, true, true], [group], releases);
  expect(table.continuousFeatures[0]).toMatchObject({ count: 210, status: "Low precision", datasetCount: "3/3" });
  const sheet = buildStatisticsReport({ data: table, sourceData, includeBreakdown: false }).find(item => item.name === "Continuous statistics");
  expect(sheet.rows).toHaveLength(2);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mean")]).toBeCloseTo((120 * 5 + 90 * 15) / 210);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Privacy-protected estimate");
  const breakdown = buildStatisticsReport({ data: table, sourceData }).find(item => item.name === "Continuous statistics");
  expect(breakdown.rows).toHaveLength(2);
});

it("validates generic feature variances against the declared release allowance", () => {
  const input = {version:3,group:"A",rowEpsilon:Math.log(1024/911),features:{
    Value:{domain:{boundaries:[0,10,20],type:"continuous"},counts:[200,100,0],noiseVariance:2*911*1024/(113**2)}}};
  const one = {...group,members:members.slice(0,1)};
  const inputs = new Map([[keys[0],input]]);
  expect(buildApproximateSummary(one,inputs)).toMatchObject({count:300,approximate:true});
  input.rowEpsilon /= 2;
  expect(buildApproximateSummary(one,inputs)).toHaveProperty("unavailable");
});

it("uses the actual independent noise components for whole-dataset post-processing",()=>{
  const one={...group,members:members.slice(0,1)};
  const whole={version:4,group:"all",selectionScope:"dataset",rowEpsilon:Math.log(2),features:{Value:{
    domain:{boundaries:[0,10,20]},counts:[200,0,0],noiseVariance:8,noiseComponents:[4,4]}}};
  const releases=new Map([[keys[0],whole]]);
  expect(buildApproximateSummary(one,releases)).toMatchObject({count:200,mean:5});
  whole.features.Value.noiseComponents=[4];
  expect(buildApproximateSummary(one,releases)).toHaveProperty("unavailable");
});

it("does not confuse an unfiltered dataset with a group whose label happens to be all",()=>{
  const one={version:4,group:"all",selectionScope:"dataset",rowEpsilon:Math.log(2),features:{Value:{
    domain:{boundaries:[0,10,20]},counts:[100,0,0],noiseVariance:4}}};
  const releases=new Map([[keys[0],one],[keys[1],{...one,selectionScope:"group"}]]);
  expect(buildApproximateSummary({...group,members:members.slice(0,2)},releases)).toHaveProperty("unavailable");
});

it("pools different discrete supports and preserves exact modes outside the protected support", () => {
  const results = [exact(members[0],100,7),exact(members[1],40,10)];
  delete results[1].continuousFeatures[0].valueCounts;
  const active = [true,true];
  const data = collectDiscoveryStatistics(results,active);
  const input = release([20,20,0],[9.5,10.5,11.5]);
  input.features.Value.domain.values = [10,11];
  const table = combineMappedTableData(data,results,active,[{...group,members:members.slice(0,2)}],new Map([[keys[1],input]]));
  expect(table.continuousFeatures[0]).toMatchObject({modes:[7],modeFrequency:100,mean:55/7});
});

it("pools protected dates with exact dates in days and exports an estimate note", () => {
  const day = Date.parse("2026-01-01T00:00:00Z")/86400000;
  const one = {...group,type:"date",members:members.slice(0,1)};
  const input = {version:3,group:"A",rowEpsilon:Math.log(2),features:{Value:{
    domain:{type:"date",boundaries:[day-.5,day+.5,day+1.5],values:[day,day+1]},counts:[50,50,0],noiseVariance:4}}};
  const exactDate = {count:100,missingValuesCount:0,dateHistogram:{"2026-01-03":100}};
  const summary = buildApproximateSummary(one,new Map([[keys[0],input]]),[exactDate],2);
  expect(summary).toMatchObject({type:"date",count:200,mean:"2026-01-02",median:"2026-01-02",q1:"2026-01-01",q3:"2026-01-03"});
  expect(summary.stdDev).toBeCloseTo(Math.sqrt(.6875));
  expect(buildApproximateSummary({...one,type:"continuous"},new Map([[keys[0],input]]))).toHaveProperty("unavailable");
  expect(buildApproximateSummary({...one,type:"categorical"},new Map([[keys[0],input]]))).toHaveProperty("unavailable");
});

it("does not claim reconstructed raw categories after a numerical type switch", () => {
  const input = release([100,50,0],[.5,1.5,2.5]);
  input.features.Value.domain.values = [1,2];
  const inputs = new Map([[keys[0],input]]);
  expect(buildApproximateSummary({...group,members:members.slice(0,1)},inputs)).toMatchObject({count:150});
  expect(buildApproximateSummary({...group,type:"categorical",members:members.slice(0,1)},inputs)).toHaveProperty("unavailable");
});

it("requests a protected date distribution when rounded local means cannot recover exact moments", () => {
  const one = {...group,type:"date",members:members.slice(0,1)};
  const source = {...members[0],dateFeatures:[{featureName:"Value",count:50,missingValuesCount:0,mean:"2026-01-01",stdDev:1}]};
  expect([...protectedPoolingMembers([one],[source]).keys()]).toEqual([keys[0]]);
  const day = Date.parse("2026-01-01T00:00:00Z")/86400000;
  const input = {version:3,group:"A",rowEpsilon:Math.log(2),features:{Value:{
    domain:{type:"date",boundaries:[day-.5,day+.5,day+1.5],values:[day,day+1]},counts:[25,25,0],noiseVariance:4}}};
  const data = collectDiscoveryStatistics([source],[true]);
  // A mapping requires two sites, so exercise the same fallback with both sources.
  const second = {...source,...members[1]};
  const combined = combineMappedTableData(collectDiscoveryStatistics([source,second],[true,true]),[source,second],
    [true,true],[{...one,members:members.slice(0,2)}],new Map([[keys[0],input],[keys[1],input]]));
  expect(combined.dateFeatures[0]).toMatchObject({count:100,mean:"2026-01-01",status:"Estimated"});
  expect(data.dateFeatures[0].mean).toBe("2026-01-01");
});
