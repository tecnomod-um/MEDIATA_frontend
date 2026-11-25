import {expect,it} from "vitest";
import {securePooledSummary} from "./securePooledSummary";
import {sourceKey} from "../exact/combinedStatistics";
import {combineMappedTableData} from "../statisticsTableData";
import {collectDiscoveryStatistics} from "../../discoveryStatistics";
import {buildStatisticsReport} from "../../DataExporter/statisticsReport";

const members=[1,2,3].map(nodeId=>({nodeId,fileName:"data.csv",column:"Value"}));
const group={id:"all",label:"Reading",type:"continuous",members};
const subset={id:"subset",label:"Other reading",type:"continuous",members:members.slice(0,2)};
const histogram=counts=>({domain:{boundaries:[-.5,5,10.5],values:[0,10],type:"continuous",missingAllowed:false},counts,noiseVariance:12,noiseComponents:[4,4,4]});
const result={protocol:"pairwise-masked-v1",manifestHash:"query",rowEpsilon:6,features:{f0:histogram([70,30,0]),f1:histogram([20,20,0])}};
const entry={result,wireId:"f0",cohort:JSON.stringify(members.map(sourceKey).sort()),groups:[group,subset],features:[{id:"f0"},{id:"f1"}]};
const exact={featureName:"Reading",type:"continuous",unavailable:"Withheld source",contributions:members.map(source=>({source}))};

it("keeps reconstruction separate for combinations with different source cohorts",()=>{
  const summary=securePooledSummary(group,exact,entry);
  expect(summary).toMatchObject({count:100,mean:3,approximate:true,includedSources:3,totalSources:3});
  expect(summary.note).toContain("only the combined histogram");
  expect(summary.contributions).toBe(exact.contributions);
  expect(securePooledSummary(subset,exact,{...entry,wireId:"f1",cohort:JSON.stringify(subset.members.map(sourceKey).sort())}))
    .toMatchObject({count:40,mean:5,totalSources:2});
});

it("preserves exact released moments while completing withheld modes from the secure pool",()=>{
  const released={...exact,unavailable:undefined,count:100,missing:0,percentMissing:0,mean:2,stdDev:4,min:0,max:10,
    q1:0,median:0,q3:10,modes:[],modeStatus:"Withheld"};
  const summary=securePooledSummary(group,released,entry);
  expect(summary).toMatchObject({mean:2,stdDev:4,count:100,q1:0,median:0,q3:10,estimatedMode:true,estimatedQuantiles:false,modes:[0]});
  expect(summary.approximate).not.toBe(true);
  expect(securePooledSummary(group,exact,{unavailable:"A participant disconnected"}).unavailable).toContain("disconnected");
  expect(securePooledSummary(group,exact,{...entry,result:{...result,unavailable:{f0:"Unsupported interpretation"}}}).unavailable).toContain("Unsupported");
});

it("reuses already released site moments without dropping exact contributions or narrowing uncertainty",()=>{
  const feature=(count,value)=>({featureName:"Value",count,mean:value,stdDev:0,min:value,max:value,missingValuesCount:0,
    sumCubedDeviations:0,sumFourthDeviations:0,valueCounts:[{value,count}]});
  const sources=[{...members[0],continuousFeatures:[feature(60,2)]},
    {...members[1],continuousFeatures:[feature(30,4)]},
    {...members[2],omittedFeatures:[{featureName:"Value",type:"continuous",reason:"Suppressed for privacy: release controls"}]}];
  const data=collectDiscoveryStatistics(sources,[true,true,true]);
  const releases=new Map([[sourceKey(members[2]),{version:3,group:"selected",rowEpsilon:2*Math.log(2),
    features:{Value:{domain:{boundaries:[-.5,5,10.5],values:[0,10],type:"continuous",missingAllowed:false},
      counts:[1,1,0],noiseVariance:4}}}]]);
  const secure=new Map([[group.id,entry]]);
  const before=combineMappedTableData(data,sources,[true,true,true],[group],undefined,secure).continuousFeatures[0].combinedSummary;
  const summary=combineMappedTableData(data,sources,[true,true,true],[group],releases,secure).continuousFeatures[0].combinedSummary;
  const values=[...Array(60).fill(2),...Array(30).fill(4),0,10];
  const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
  const central=power=>values.reduce((sum,value)=>sum+(value-mean)**power,0);
  expect(summary).toMatchObject({count:92,min:0,max:10,approximate:true,reusedSiteSummaries:true});
  expect(summary.mean).toBeCloseTo(mean,12);
  expect(summary.sampleStdDev).toBeCloseTo(Math.sqrt(central(2)/91),12);
  expect(summary.sumCubedDeviations).toBeCloseTo(central(3),9);
  expect(summary.sumFourthDeviations).toBeCloseTo(central(4),9);
  expect(summary.meanCiLower).toBeLessThanOrEqual(before.meanCiLower);
  expect(summary.meanCiUpper).toBeGreaterThanOrEqual(before.meanCiUpper);
  expect(summary.note).toContain("site-level privacy cost still applies");
  expect(summary.note).toContain("epsilon per dataset version");
  expect(summary.contributions[2].feature).toBeUndefined();
  const table=combineMappedTableData(data,sources,[true,true,true],[group],releases,secure);
  const sheet=buildStatisticsReport({data:table,sourceData:data,includeBreakdown:false}).find(item=>item.name==="Continuous statistics");
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mean")]).toBeCloseTo(mean,12);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Includes privacy-protected site estimates");
  expect(sources[2].continuousFeatures).toBeUndefined();
});

it("keeps the secure estimate when site releases are incomplete or the secure round failed",()=>{
  const sources=members.map(member=>({...member,omittedFeatures:[{featureName:"Value",type:"continuous",reason:"Suppressed for privacy: release controls"}]}));
  const data=collectDiscoveryStatistics(sources,[true,true,true]);
  const releases=new Map([[sourceKey(members[0]),{version:1,group:"selected",noiseVariance:4,
    features:{Value:{domain:{boundaries:[0,5,15]},counts:[10,10,0]}}}]]);
  const table=combineMappedTableData(data,sources,[true,true,true],[group],releases,new Map([[group.id,entry]]));
  expect(table.continuousFeatures[0]).toMatchObject({count:100,mean:3});
  expect(table.continuousFeatures[0].combinedSummary.reusedSiteSummaries).not.toBe(true);
  const complete={featureName:"Reading",type:"continuous",count:20,mean:5,min:0,max:10,contributions:exact.contributions};
  expect(securePooledSummary(group,exact,{unavailable:"Disconnected"},complete).unavailable).toBe("Disconnected");
  const invalid={...entry,result:{...result,features:{f0:{...histogram([70,30,0]),noiseVariance:0}}}};
  expect(securePooledSummary(group,exact,invalid,complete).unavailable).toBeTruthy();
  expect(securePooledSummary(group,exact,entry,{...complete,count:0}).count).toBe(100);
  expect(securePooledSummary(group,exact,entry,{...complete,mean:undefined}).mean).toBe(3);
});

it("retains the original distribution when released bounds conflict with secure quartiles",()=>{
  const released={...exact,unavailable:undefined,count:100,mean:5,stdDev:0,min:5,max:5,missing:0,
    approximate:true,note:"Already released estimate"};
  const summary=securePooledSummary(group,exact,entry,released);
  expect(summary).toMatchObject({count:100,mean:3,min:0,max:10});
  expect(summary.reusedSiteSummaries).not.toBe(true);
});

it("uses the existing table and CSV report path without treating protected inputs as exact relationships",()=>{
  const sources=members.map(member=>({...member,nodeName:`Site ${member.nodeId}`,disclosureWithheld:true,
    omittedFeatures:[{featureName:"Value",type:"continuous",reason:"Suppressed for privacy: release controls"}]}));
  const data=collectDiscoveryStatistics(sources,[true,true,true]);
  const table=combineMappedTableData(data,sources,[true,true,true],[group],undefined,new Map([[group.id,entry]]));
  expect(table.continuousFeatures[0]).toMatchObject({count:100,mean:3,pooled:true});
  expect(table.continuousFeatures[0].combinedSummary.contributions).toHaveLength(3);
  expect(table.continuousFeatures[0].combinedSummary.contributions.every(part=>!part.feature)).toBe(true);
  const sheet=buildStatisticsReport({data:table,sourceData:data,includeBreakdown:false}).find(item=>item.name==="Continuous statistics");
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mean")]).toBe(3);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Privacy-protected estimate");
  expect(data.continuousFeatures).toEqual([]);
});

it("retains source provenance when only the secure round can supply the summaries",()=>{
  const sources=members.map(member=>({...member,nodeName:`Site ${member.nodeId}`}));
  const data={continuousFeatures:[],omittedFeatures:members.map(member=>({...member,featureName:"Value"}))};
  const table=combineMappedTableData(data,sources,[true,true,true],[group],undefined,new Map([[group.id,entry]]));
  const contributions=table.continuousFeatures[0].combinedSummary.contributions;
  expect(contributions).toHaveLength(3);
  expect(contributions.map(part=>part.source.nodeName)).toEqual(["Site 1","Site 2","Site 3"]);
  expect(contributions.every(part=>part.columnName==="Value" && !part.feature)).toBe(true);
});

it("exports categorical score counts through the same report after a type switch",()=>{
  const categorical={...group,type:"categorical"};
  const features={f0:{domain:{categories:["0","10"],type:"categorical",missingAllowed:false,unlistedCategoriesAllowed:false},
    counts:[70,30,0,0],noiseVariance:12,noiseComponents:[4,4,4]}};
  const converted={...entry,groups:[categorical],result:{...result,features}};
  const sources=members.map(member=>({...member,nodeName:`Site ${member.nodeId}`,
    omittedFeatures:[{featureName:"Value",type:"categorical",reason:"Suppressed for privacy: release controls"}]}));
  const data=collectDiscoveryStatistics(sources,[true,true,true]);
  const table=combineMappedTableData(data,sources,[true,true,true],[categorical],undefined,new Map([[group.id,converted]]));
  expect(table.continuousFeatures).toEqual([]);
  const summary=table.categoricalFeatures[0].combinedSummary;
  expect(summary.count).toBe(100);
  expect(summary.categories).toMatchObject([{value:"0",count:70,percent:70},{value:"10",count:30,percent:30}]);
  const sheet=buildStatisticsReport({data:table,sourceData:data,includeBreakdown:false}).find(item=>item.name==="Categorical statistics");
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mode")]).toBe("0");
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mode count")]).toBe(70);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Privacy-protected estimate");
});

it("pools categorical site releases using the same population counts as numerical features", () => {
  const categorical = { ...group, type: "categorical" };
  const feature = (count, category) => ({ featureName: "Value", count, missingValuesCount: 0, categoryCounts: { [category]: count } });
  const sources = [
    { ...members[0], categoricalFeatures: [feature(60, "North")] },
    { ...members[1], categoricalFeatures: [feature(30, "South")] },
    { ...members[2], continuousFeatures: [{ featureName: "Other reading", count: 9, missingValuesCount: 3 }],
      omittedFeatures: [{ featureName: "Value", type: "categorical", reason: "Suppressed for privacy: release controls" }] },
  ];
  const domain = { categories: ["North", "South"], type: "categorical", missingAllowed: false, unlistedCategoriesAllowed: false };
  const site = { version: 3, group: "selected", rowEpsilon: 2 * Math.log(2),
    features: { Value: { domain, counts: [5, 9, 0, 0], noiseVariance: 4 } } };
  const secureEntry = { ...entry, groups: [categorical], result: { ...result,
    features: { f0: { domain, counts: [70, 36, 0, 0], noiseVariance: 12, noiseComponents: [4, 4, 4] } } } };
  const data = collectDiscoveryStatistics(sources, [true, true, true]);
  const releases = new Map([[sourceKey(members[2]), site]]);
  const makeTable = (rows, selectedReleases = releases) => combineMappedTableData(
    collectDiscoveryStatistics(rows, [true, true, true]), rows, [true, true, true], [categorical], selectedReleases,
    new Map([[categorical.id, secureEntry]]));
  const table = makeTable(sources);
  const summary = table.categoricalFeatures[0].combinedSummary;
  expect(summary).toMatchObject({ count: 102, missing: 0, countEstimated: false, reusedSiteSummaries: true });
  expect(summary.categories).toMatchObject([{ value: "North", count: 64 }, { value: "South", count: 38 }]);
  expect(summary.categories.reduce((sum, category) => sum + category.count, 0)).toBe(summary.count);
  expect(summary.categories.reduce((sum, category) => sum + category.percent, 0)).toBeCloseTo(100, 12);
  const report = buildStatisticsReport({ data: table, sourceData: data, includeBreakdown: false });
  const sheet = report.find(sheet => sheet.name === "Categorical statistics");
  expect(sheet.rows[1][sheet.rows[0].indexOf("Non-missing count")]).toBe(summary.count);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mode count")]).toBe(64);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).not.toContain("Count estimated");
  // Reusing just the secure result still honours the approved total for this source population.
  const secureOnly = makeTable(sources, new Map()).categoricalFeatures[0].combinedSummary;
  expect(secureOnly.count).toBe(102);
  const unknown = sources.map((source, index) => index === 2 ? { ...source, continuousFeatures: [] } : source);
  const estimated = makeTable(unknown).categoricalFeatures[0].combinedSummary;
  expect(estimated).toMatchObject({ count: 104, countEstimated: true, reusedSiteSummaries: true });
  expect(estimated.categories.map(category => category.count)).toEqual([65, 39]);
  expect(makeTable(unknown).categoricalFeatures[0].combinedSummary).toEqual(estimated);
  expect(sources[2].continuousFeatures[0].count).toBe(9);
});

it("does not replace a failed categorical secure round with previously released site results", () => {
  const categorical = { ...group, type: "categorical" };
  const released = { ...exact, unavailable: undefined, count: 10, missing: 0,
    categories: [{ value: "North", count: 10, percent: 100 }] };
  expect(securePooledSummary(categorical, exact, { unavailable: "Disconnected" }, released, 10).unavailable).toBe("Disconnected");
  const invalid = { ...entry, groups: [categorical], result: { ...result,
    features: { f0: { domain: { categories: ["North"], type: "categorical" }, counts: [10, 0, 0], noiseVariance: 0 } } } };
  expect(securePooledSummary(categorical, exact, invalid, released, 10).unavailable).toBeTruthy();
});
