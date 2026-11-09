import { beforeEach, expect, it, vi } from "vitest";
import { filterDiscoveryDatasets } from "./filterDiscoveryDatasets";
import { filterMultipleFiles } from "../../../util/petitionHandler";
vi.mock("../../../util/petitionHandler", () => ({ filterMultipleFiles: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const sources = [{ nodeId: 1, fileName: "patients.csv" }, { nodeId: 2, fileName: "patients.csv" }];
const nodes = [{ nodeId: 1, serviceUrl: "http://alpha" }, { nodeId: 2, serviceUrl: "http://beta" }];

it("carries all source-specific type choices through applying and clearing filters, rejecting old nodes", async () => {
  const typed = [{...sources[0], featureTypes: {Age: 'categorical', Score: 'continuous'}}];
  filterMultipleFiles.mockResolvedValue([{fileName: 'patients.csv', featureTypeSummaryVersion: 1, featureTypes: typed[0].featureTypes}]);
  await filterDiscoveryDatasets(typed, nodes, () => null);
  expect(filterMultipleFiles).toHaveBeenCalledWith({multipleFileFilters: [{fileName: 'patients.csv', filters: null, featureTypes: typed[0].featureTypes}]}, 'http://alpha');
  filterMultipleFiles.mockResolvedValue([{fileName: 'patients.csv'}]);
  await expect(filterDiscoveryDatasets(typed, nodes, () => null)).rejects.toThrow('preserve feature types');
  filterMultipleFiles.mockResolvedValue([{fileName: 'patients.csv', featureTypeSummaryVersion: 1, featureTypes: {Age: 'categorical'}}]);
  await expect(filterDiscoveryDatasets(typed, nodes, () => null)).rejects.toThrow('preserve feature types');
});

it("binds each request to its node and preserves same-named files across sites", async () => {
  filterMultipleFiles.mockImplementation(async (_, url) => [{ fileName: "patients.csv", continuousFeatures: [{ mean: url === "http://alpha" ? 20 : 70 }] }]);
  const result = await filterDiscoveryDatasets(sources, nodes, () => ({ conditions: {} }));
  expect(result.map(r => r.continuousFeatures[0].mean)).toEqual([20, 70]);
  expect(result.map(r => r.nodeId)).toEqual([1, 2]);
  expect(filterMultipleFiles.mock.calls.map(c => c[1])).toEqual(["http://alpha", "http://beta"]);
});
it("rejects an incomplete response instead of mixing stale and filtered statistics", async () => {
  filterMultipleFiles.mockImplementation(async (_, url) => url === "http://alpha" ? [{ fileName: "patients.csv" }] : []);
  await expect(filterDiscoveryDatasets(sources, nodes, () => null)).rejects.toThrow("Statistics unavailable");
});
it("propagates a site failure without modifying the caller's previous results", async () => {
  filterMultipleFiles.mockRejectedValue(new Error("Offline"));
  const previous = JSON.stringify(sources);
  await expect(filterDiscoveryDatasets(sources, nodes, () => null)).rejects.toThrow("Offline");
  expect(JSON.stringify(sources)).toBe(previous);
});

it("does not retain old paired aggregates when a refreshed node omits or suppresses them", async () => {
  const previous = sources.map(source => ({ ...source, relationshipSummaryVersion: 1, numericPairSummaries: [{ count: 100 }], continuousFeatures: [{ mean: 99 }] }));
  filterMultipleFiles.mockResolvedValue([{ fileName: 'patients.csv', continuousFeatures: [], numericPairSummaries: [] }]);
  const refreshed = await filterDiscoveryDatasets(previous, nodes, () => null);
  expect(refreshed[0].numericPairSummaries).toEqual([]);
  expect(refreshed[0].relationshipSummaryVersion).toBeUndefined();
  expect(refreshed[0].continuousFeatures).toEqual([]);
});
