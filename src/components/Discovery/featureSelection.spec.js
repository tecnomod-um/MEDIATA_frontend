import {expect, it} from "vitest";
import {toggleFeatureSelection, reconcileFeatureSelection, sourceFeatureSelection} from "./featureSelection";

const age = {featureName:"Age (same.csv · Alpha)", originalName:"Age", nodeId:1, fileName:"same.csv", type:"continuous"};
const otherAge = {...age, nodeId:2, featureName:"Age (same.csv · Beta)"};
const sex = {...age, featureName:"Sex", originalName:"Sex", type:"categorical"};

it("adds and removes explicit source identities; a normal click focuses one feature", () => {
  const multiple = toggleFeatureSelection([age], otherAge, true);
  expect(multiple).toEqual([age, otherAge]);
  expect(toggleFeatureSelection(multiple, age, true)).toEqual([otherAge]);
  expect(toggleFeatureSelection(multiple, sex, false)).toEqual([sex]);
  expect(toggleFeatureSelection([sex], sex, false)).toEqual([]);
});

it("keeps the selected source while its type changes, and removes hidden or excluded sources", () => {
  const next = {continuousFeatures:[otherAge], categoricalFeatures:[age,sex]};
  expect(reconcileFeatureSelection([age,sex,otherAge],next,next).map(entry=>entry.type)).toEqual(["categorical","categorical","continuous"]);
  expect(reconcileFeatureSelection([age,otherAge],{continuousFeatures:[otherAge]},{})).toEqual([otherAge]);
});

it("expands a selected combined row into its actual columns once, including differently named mappings", () => {
  const alias={...otherAge,originalName:"PatientAge"};
  const pooled={featureName:"Age",pooled:true,combinedSummary:{contributions:[
    {source:age,columnName:"Age"},{source:alias,columnName:"PatientAge"}]}};
  expect(sourceFeatureSelection([pooled,age],{continuousFeatures:[age,alias]})).toEqual([age,alias]);
});
