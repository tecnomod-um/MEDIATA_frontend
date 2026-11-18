import {expect, it} from "vitest";
import {protectedSourceMembers, protectedSourceTableData} from "./protectedSourceStatistics";
import {sourceKey} from "./combinedStatistics";
import {collectDiscoveryStatistics} from "../discoveryStatistics";
import {combineMappedTableData, tableExportFeatures} from "./statisticsTableData";
import {buildStatisticsReport} from "../DataExporter/statisticsReport";

const source = {nodeId:1,nodeName:"Alpha",fileName:"arbitrary.csv"};
const baseline = [{...source, continuousFeatures:[{featureName:"Instrument reading"}], categoricalFeatures:[{featureName:"Arm"}]}];
const results = [{...source, disclosureWithheld:true, omittedFeatures:[
  {featureName:"Instrument reading",type:"continuous",reason:"Statistics withheld by disclosure controls"},
  {featureName:"Arm",type:"categorical",reason:"Statistics withheld by disclosure controls"}]}];
const release = {version:3,group:"Treatment",rowEpsilon:2*Math.log(2), features:{
  "Instrument reading":{domain:{boundaries:[0,5,15],values:[0,10],type:"continuous"},counts:[100,100,0],noiseVariance:4},
  Arm:{domain:{categories:["North","South"],type:"categorical"},counts:[160,40,0,0],noiseVariance:4}}};
const releases = new Map([[sourceKey(source), release]]);

it("requests one saved release per withheld active dataset, independent of merged mode", () => {
  expect([...protectedSourceMembers(results,baseline,[true]).keys()]).toEqual([sourceKey(source)]);
  expect(protectedSourceMembers(results,baseline,[false]).size).toBe(0);
  expect(protectedSourceMembers(baseline,baseline,[true]).size).toBe(0);
});

it("displays and exports site estimates with their source identity and estimate notes", () => {
  const data = collectDiscoveryStatistics(results,[true]);
  const table = protectedSourceTableData(data,results,baseline,releases);
  expect(table.omittedFeatures).toEqual([]);
  expect(table.continuousFeatures[0]).toMatchObject({...source,pooled:false,originalName:"Instrument reading",count:200,mean:5,status:"Estimated"});
  expect(table.categoricalFeatures[0]).toMatchObject({count:200,mode:"North",modeFrequency:160});
  const summary = tableExportFeatures(table)[0];
  expect(summary).toMatchObject({approximate:true,type:"continuous",mean:5});
  const report = buildStatisticsReport({data:table,sourceData:table});
  const continuous = report.find(sheet => sheet.name === "Continuous statistics");
  expect(continuous.rows[1][continuous.rows[0].indexOf("Mean")]).toBe(5);
  expect(continuous.rows[1][continuous.rows[0].indexOf("Site")]).toBe("Alpha");
  expect(continuous.rows[1][continuous.rows[0].indexOf("Dataset")]).toBe("arbitrary.csv");
  expect(continuous.rows[1][continuous.rows[0].indexOf("Notes")]).toContain("Privacy-protected estimate");
  expect(data.continuousFeatures).toEqual([]);
  expect(data.omittedFeatures).toHaveLength(2);
});

it("retains exact summaries and respects hidden columns without inventing relationships", () => {
  const exact = {...source,continuousFeatures:[{featureName:"Instrument reading",count:50,mean:42,missingValuesCount:0}]};
  const data = collectDiscoveryStatistics([exact],[true]);
  expect(protectedSourceTableData(data,[exact],baseline,releases)).toEqual(data);
  const omitted = collectDiscoveryStatistics(results,[true]);
  const hidden = new Set([JSON.stringify([sourceKey(source),"Instrument reading"])]);
  const table = protectedSourceTableData(omitted,results,baseline,releases,hidden);
  expect(table.continuousFeatures).toEqual([]);
  expect(table.pearsonCorrelations).toEqual(omitted.pearsonCorrelations);
});

it("explains missing cached features without recalibrating an old saved release", () => {
  const data = collectDiscoveryStatistics(results,[true]);
  const prior = {...release,features:{Arm:release.features.Arm}};
  const table = protectedSourceTableData(data,results,baseline,new Map([[sourceKey(source),prior]]));
  expect(table.continuousFeatures).toEqual([]);
  expect(table.omittedFeatures[0].reason).toContain("saved protected release does not include this feature");
  const report = buildStatisticsReport({data:table,sourceData:table});
  const sheet = report.find(sheet => sheet.name === "Continuous statistics");
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mean")]).toBeNull();
});

it("uses the shared distribution code for site modes and exports supported ranges as estimates", () => {
  const input = {...release,features:{...release.features,
    "Instrument reading":{...release.features["Instrument reading"],counts:[180,20,0]}}};
  const data = collectDiscoveryStatistics(results,[true]);
  const table = protectedSourceTableData(data,results,baseline,new Map([[sourceKey(source),input]]));
  expect(table.continuousFeatures[0]).toMatchObject({modes:[0],modeFrequency:180,supportedMin:0,supportedMax:10});
  expect(table.continuousFeatures[0].min).toBeUndefined();
  const sheet = buildStatisticsReport({data:table,sourceData:table}).find(sheet => sheet.name === "Continuous statistics");
  expect(sheet.rows[1][sheet.rows[0].indexOf("Mode")]).toBe(0);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Supported range lower")]).toBe(0);
  expect(sheet.rows[1][sheet.rows[0].indexOf("Min")]).toBeNull();
});

it("includes available site estimates in a merged export without reusing estimates as exact input", () => {
  const other = {nodeId:2,nodeName:"Beta",fileName:"arbitrary.csv",continuousFeatures:[{
    featureName:"Instrument reading",count:100,mean:10,stdDev:0,min:10,max:10,missingValuesCount:0,
    valueCounts:[{value:10,count:100}]}]};
  const raw = [...results,other];
  const data = collectDiscoveryStatistics(raw,[true,true]);
  const local = protectedSourceTableData(data,raw,[...baseline,other],releases);
  const mapping = {id:"reading",label:"Reading",type:"continuous",members:[source,other].map(item => ({...item,column:"Instrument reading"}))};
  const merged = combineMappedTableData(local,raw,[true,true],[mapping],releases);
  expect(merged.continuousFeatures[0]).toMatchObject({count:300,mean:20/3,pooled:true,status:"Estimated"});
  const report = buildStatisticsReport({data:merged,sourceData:local});
  const continuous = report.find(sheet => sheet.name === "Continuous statistics");
  expect(continuous.rows.slice(1).map(row => row[continuous.rows[0].indexOf("Mean")])).toEqual([20/3,5,10]);
});
