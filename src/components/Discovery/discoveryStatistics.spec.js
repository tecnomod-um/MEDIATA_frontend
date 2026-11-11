import { describe, it, expect } from "vitest";
import { collectDiscoveryStatistics, visibleRelationships, updateSourceFeature, relationshipStatistics } from "./discoveryStatistics";

const site = (nodeId, nodeName, value) => ({
  nodeId, nodeName, fileName: "patients.csv",
  continuousFeatures: [{ featureName: "Age" }, { featureName: "Score" }],
  categoricalFeatures: [{ featureName: "Sex" }, { featureName: "Stroke" }], dateFeatures: [],
  covariances: { Age: { Score: value }, Score: { Age: value } },
  pearsonCorrelations: { Age: { Score: value / 10 }, Score: { Age: value / 10 } },
  chiSquareTest: [{ category1: "Sex", category2: "Stroke", pvalue: value / 100 }],
  omittedFeatures: [{ featureName: "Private", reason: "Suppressed for privacy" }],
});

describe("shared discovery statistics", () => {
  it("disambiguates identical dataset and site display names with the immutable site identifier", () => {
    const data = collectDiscoveryStatistics([site(1,'Hospital',2),site(2,'Hospital',8)],[true,true]);
    expect(data.continuousFeatures.map(feature=>feature.featureName)).toEqual([
      'Age (patients.csv · Hospital · 1)','Score (patients.csv · Hospital · 1)',
      'Age (patients.csv · Hospital · 2)','Score (patients.csv · Hospital · 2)',
    ]);
    expect(data.covariances['Age (patients.csv · Hospital · 2)']['Score (patients.csv · Hospital · 2)']).toBe(8);
  });
  it("keeps same-named features and local relationships distinct across sites", () => {
    const alpha = site(1, "Alpha", 2), beta = site(2, "Beta", 8);
    const data = collectDiscoveryStatistics([alpha, beta], [true, true]);
    expect(data.covariances["Age (patients.csv · Alpha)"]["Score (patients.csv · Alpha)"]).toBe(2);
    expect(data.covariances["Age (patients.csv · Beta)"]["Score (patients.csv · Beta)"]).toBe(8);
    expect(data.covariances["Age (patients.csv · Alpha)"]["Score (patients.csv · Beta)"]).toBeUndefined();
    expect(data.chiSquareTest.map(test => test.category1)).toEqual(["Sex (patients.csv · Alpha)", "Sex (patients.csv · Beta)"]);
    expect(data.omittedFeatures[0].featureName).toBe("Private (patients.csv · Alpha)");
    expect(alpha.covariances.Age.Score).toBe(2);
    expect(collectDiscoveryStatistics([alpha, beta], [true, false]).continuousFeatures).toHaveLength(2);
  });

  it("uses the feature visibility toggles for relationship matrices and chi-square tests", () => {
    const data = collectDiscoveryStatistics([site(1, "Alpha", 2)], [true]);
    data.continuousFeatures = data.continuousFeatures.filter(feature => feature.originalName !== "Score");
    data.categoricalFeatures = data.categoricalFeatures.filter(feature => feature.originalName !== "Stroke");
    const relationships = visibleRelationships(data);
    expect(relationships.covariances).toEqual({ "Age (patients.csv)": {} });
    expect(relationships.chiSquareTest).toEqual([]);
    expect(data.covariances["Age (patients.csv)"]["Score (patients.csv)"]).toBe(2);
  });

  it("replaces recalculated relationships only at the converted source", () => {
    const sources = [site(1, "Alpha", 2), site(2, "Beta", 8)];
    const change = { nodeId: 1, fileName: "patients.csv", featureName: "Age", response: {
      continuousFeatures: [{featureName:"Score"}], categoricalFeatures: [{featureName:"Sex"}, {featureName:"Stroke"}, { featureName: "Age", categoryCounts: { adult: 10 } }],
      covariances: {}, pearsonCorrelations: {}, spearmanCorrelations: {}, chiSquareTest: [],
    } };
    const updated = sources.map(source => updateSourceFeature(source, change));
    expect(updated[0].continuousFeatures.map(feature => feature.featureName)).toEqual(["Score"]);
    expect(updated[0].covariances).toEqual({});
    expect(updated[0].categoricalFeatures.at(-1).featureName).toBe("Age");
    expect(updated[1]).toBe(sources[1]);
  });

  it("lists each local relationship once per pair, with its source identity", () => {
    const data = collectDiscoveryStatistics([site(1, "Alpha", 2), site(2, "Beta", 8)], [true, true]);
    const rows = [...relationshipStatistics(visibleRelationships(data))];
    expect(rows).toHaveLength(6);
    expect(rows.filter(row => row.kind === "covariances").map(({ left, right, value, detail }) =>
      [left, right, value, detail.contributingSources[0].nodeName])).toEqual([
      ["Age (patients.csv · Alpha)", "Score (patients.csv · Alpha)", 2, "Alpha"],
      ["Age (patients.csv · Beta)", "Score (patients.csv · Beta)", 8, "Beta"],
    ]);
  });
});
