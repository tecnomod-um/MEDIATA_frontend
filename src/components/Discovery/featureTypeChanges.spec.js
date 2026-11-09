import {beforeEach, expect, it, vi} from "vitest";
import {requestFeatureTypeChange, reconcileFeatureVisibility} from "./featureTypeChanges";
import {filterDiscoveryDatasets} from "./CombinedStatistics/filterDiscoveryDatasets";
vi.mock("./CombinedStatistics/filterDiscoveryDatasets", () => ({filterDiscoveryDatasets: vi.fn()}));
beforeEach(() => vi.resetAllMocks());
const source = {nodeId: 0, nodeName: "Alpha", fileName: "same.csv", featureTypes: {Flag: "categorical"}};
const entry = {featureName: "Age (years) (same.csv · Alpha)", originalName: "Age (years)", nodeId: 0, fileName: "same.csv", type: "continuous"};
const options = () => ({entry, statistics: {continuousFeatures: [entry]}, sources: [source, {...source, nodeId: 2}], nodes: [{nodeId: 0, serviceUrl: "http://alpha"}]});

it("uses the exact column and site, preserving earlier overrides without mutating inputs", async () => {
  const response = {categoricalFeatures: [{featureName: "Age (years)"}]};
  filterDiscoveryDatasets.mockResolvedValue([response]);
  const input = options(), before = JSON.stringify(input);
  expect(await requestFeatureTypeChange(input)).toMatchObject({nodeId: 0, featureName: "Age (years)", type: "categorical", response});
  const [sources, nodes, getFilters] = filterDiscoveryDatasets.mock.calls[0];
  expect(sources).toEqual([{...source, featureTypes: {Flag: "categorical", "Age (years)": "categorical"}}]);
  expect(nodes).toBe(input.nodes);
  expect(getFilters(source)).toBeNull();
  expect(JSON.stringify(input)).toBe(before);
});

it("keeps dates as dates when restoring their numerical interpretation", async () => {
  filterDiscoveryDatasets.mockResolvedValue([{dateFeatures: [{featureName: "Age (years)"}]}]);
  const input = options(); input.entry = {...entry, type: "categorical"};
  expect(await requestFeatureTypeChange(input)).toMatchObject({type: "continuous"});
});

it("respects an explicit source identity even if older display labels collide", async () => {
  const input=options();
  input.entry={...entry,nodeId:2};
  input.statistics={continuousFeatures:[entry,input.entry]};
  filterDiscoveryDatasets.mockResolvedValue([{categoricalFeatures:[{featureName:'Age (years)'}]}]);
  expect(await requestFeatureTypeChange(input)).toMatchObject({nodeId:2});
  expect(filterDiscoveryDatasets.mock.calls[0][0][0].nodeId).toBe(2);
});

it("rejects ambiguous sites, pooled columns, withheld results and wrong-type responses", async () => {
  await expect(requestFeatureTypeChange({...options(), entry: {...entry, pooled: true}})).rejects.toThrow("individual");
  await expect(requestFeatureTypeChange({...options(), entry: {featureName: "Unknown", fileName: "same.csv"}})).rejects.toThrow("unambiguous");
  filterDiscoveryDatasets.mockResolvedValue([{categoricalFeatures: []}]);
  await expect(requestFeatureTypeChange(options())).rejects.toThrow("withheld");
  filterDiscoveryDatasets.mockResolvedValue([{continuousFeatures: [{featureName: "Age (years)"}]}]);
  await expect(requestFeatureTypeChange(options())).rejects.toThrow("requested");
});

it("preserves hidden columns across type changes without hiding another site's same-named column", () => {
  const other = {...entry, nodeId: 2, featureName: "Age (years) (same.csv · Beta)"};
  const previous = {continuousFeatures: [entry, other]};
  const visible = {continuousFeatures: [other]};
  const converted = {...entry, count: 12};
  const next = {categoricalFeatures: [converted], continuousFeatures: [other], covariances: {new: {}}};
  const reconciled = reconcileFeatureVisibility(previous, visible, next);
  const result = reconciled.statistics;
  expect(result.categoricalFeatures).toEqual([]);
  expect(result.continuousFeatures).toEqual([other]);
  expect(result.covariances).toBe(next.covariances);
  expect(next.categoricalFeatures).toEqual([converted]);
  const disabled = {continuousFeatures: [other]};
  const removed = reconcileFeatureVisibility(next, result, disabled, reconciled.hidden);
  const reenabled = reconcileFeatureVisibility(disabled, disabled, next, removed.hidden);
  expect(reenabled.statistics.categoricalFeatures).toEqual([]);
});
