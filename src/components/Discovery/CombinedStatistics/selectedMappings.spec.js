import { expect, it } from "vitest";
import { selectedMappings } from "./selectedMappings";
import { createColumnMappings, validateColumnMappings } from "./columnMappings";
import { collectDiscoveryStatistics } from "../discoveryStatistics";

const sources = [1, 2, 3].map(nodeId => ({ nodeId, fileName: "patients.csv", continuousFeatures: [{ featureName: "Age" }, { featureName: "Score" }], categoricalFeatures: [{ featureName: "Sex" }] }));
const all = collectDiscoveryStatistics(sources, [true, true, true]);
const mappings = createColumnMappings(sources);

it("opens an existing selected combination first without removing its other contributors or changing saved mappings", () => {
  const features = [all.categoricalFeatures[0], all.categoricalFeatures[1]];
  const draft = selectedMappings(mappings, sources, features);
  expect(draft[0].label).toBe("Sex");
  expect(draft[0].members).toHaveLength(3);
  draft[0].members.pop();
  expect(mappings.find(group => group.label === "Sex").members).toHaveLength(3);
});

it("prefills a reviewable mapping for differently named selected features from distinct sources", () => {
  const features = [all.continuousFeatures[0], all.continuousFeatures[3]];
  const draft = selectedMappings(mappings, sources, features);
  expect(draft[0].members.map(member => member.column)).toEqual(["Age", "Score"]);
  expect(validateColumnMappings(draft, sources)).toBeNull();
  expect(mappings.every(group => group.members.length === 3)).toBe(true);
});

it("keeps different types and multiple selected features from one dataset in separate combinations", () => {
  const draft = selectedMappings(mappings, sources, [all.continuousFeatures[0], all.continuousFeatures[1], all.categoricalFeatures[0]]);
  expect(draft).toHaveLength(3);
  expect(validateColumnMappings(draft, sources)).toBeNull();
});

it("prefills a single uncombined source feature and ignores stale selections", () => {
  const draft = selectedMappings([], sources, [all.continuousFeatures[0]]);
  expect(draft[0]).toMatchObject({ label: "Age", members: [{ nodeId: 1, fileName: "patients.csv", column: "Age" }] });
  expect(selectedMappings(mappings, sources, [{ nodeId: 99, fileName: "gone.csv", featureName: "Age" }])).toEqual(mappings);
});
