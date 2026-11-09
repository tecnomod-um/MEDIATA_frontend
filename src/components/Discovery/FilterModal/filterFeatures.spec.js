import { describe, expect, it } from "vitest";
import { matchingFilterFeatures, fileFilterConditions } from "./filterFeatures";

const sources = [{ nodeId: "alpha", fileName: "patients.csv" }, { nodeId: "beta", fileName: "patients.csv" }];
const features = sources.map((source, index) => ({ ...source, featureName: `cluster (${index})`, originalName: "cluster" }));
const stats = { continuousFeatures: features };
const criterion = [{ type: "equal", value: "1", filterType: "continuous" }];

describe("shared filter columns", () => {
  it("uses the mapped destination's actual column name for aliased filters", () => {
    const alias = { ...features[1], originalName: "ClusterNumber", featureName: "ClusterNumber (1)" };
    const aliasedStats = { continuousFeatures: [features[0], alias] };
    const mappings = [{ members: [{ ...sources[0], column: "cluster" }, { ...sources[1], column: "ClusterNumber" }] }];
    const payload = fileFilterConditions(aliasedStats, { "cluster (0)": criterion }, {}, sources[1], 2, true, mappings);
    expect(payload).toEqual({ ClusterNumber: { conditions: criterion, operators: [] } });
    expect(fileFilterConditions(aliasedStats, { "cluster (0)": criterion }, {}, sources[1], 2, false, mappings)).toEqual({});
  });
  it("copies criteria from an ordinary column to same-name, same-type columns", () => {
    expect(matchingFilterFeatures(stats, features[0])).toEqual(features);
    for (const source of sources) {
      expect(fileFilterConditions(stats, { "cluster (0)": criterion }, {}, source, 2, true)).toEqual({ cluster: { conditions: criterion, operators: [] } });
    }
  });
  it("keeps identically named files at different nodes separate", () => {
    const conditions = { "cluster (1)": criterion };
    expect(fileFilterConditions(stats, conditions, {}, sources[0], 2)).toEqual({});
    expect(fileFilterConditions(stats, conditions, {}, sources[1], 2)).toHaveProperty("cluster.conditions", criterion);
  });
  it("does not copy criteria to a different variable type", () => {
    const mixed = { continuousFeatures: [features[0]], categoricalFeatures: [features[1]] };
    expect(fileFilterConditions(mixed, { "cluster (0)": criterion }, {}, sources[1], 2, true)).toEqual({});
  });
  it("retains the source criteria operators when copying", () => {
    expect(fileFilterConditions(stats, { "cluster (0)": criterion }, { "cluster (0)": ["OR"] }, sources[1], 2, true).cluster.operators).toEqual(["OR"]);
  });
  it("rejects duplicate linked filters instead of silently dropping a condition", () => {
    expect(() => fileFilterConditions(stats, { "cluster (0)": criterion, "cluster (1)": criterion }, {}, sources[1], 2, true)).toThrow("Different filters");
  });
});
