import {expect,it} from "vitest";
import {securePooledSummary} from "./securePooledSummary";
import {sourceKey} from "./combinedStatistics";
import {combineMappedTableData} from "./statisticsTableData";
import {collectDiscoveryStatistics} from "../discoveryStatistics";
import {buildStatisticsReport} from "../DataExporter/statisticsReport";

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
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("Secure aggregation");
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
  expect(sheet.rows[1][sheet.rows[0].indexOf("Notes")]).toContain("normalized score labels");
});
