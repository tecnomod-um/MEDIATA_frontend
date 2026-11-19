import {expect, it} from "vitest";
import {alignCategoricalHistograms, alignNumericalHistograms, numericalDomain} from "./protectedHistogramDomains";

it("unites different point domains without moving or losing counts", () => {
  const domains = [{boundaries:[-.5,.5,1.5], values:[0,1]}, {boundaries:[.5,1.5,2.5], values:[1,2]}].map(numericalDomain);
  const target = alignNumericalHistograms(domains, [[8,-2,0],[5,12,1]]);
  expect(target.scores).toEqual([0,1,2]);
  expect(target.aligned).toEqual([{counts:[8,-2,0], fanIn:1}, {counts:[0,5,12], fanIn:1}]);
});

it("coarsens overlapping intervals instead of splitting a count across bins", () => {
  const target = alignNumericalHistograms([{boundaries:[0,4,8]}, {boundaries:[4,6,8,10]}].map(numericalDomain),
    [[10,20,0],[3,5,7,0]]);
  expect(target.boundaries).toEqual([0,4,8,10]);
  expect(target.aligned).toEqual([{counts:[10,20,0],fanIn:1}, {counts:[0,8,7],fanIn:2}]);
});

it("does not mistake distinct large numerical boundaries for the same edge", () => {
  const target = alignNumericalHistograms([{boundaries:[999999990,999999995,1e9]},
    {boundaries:[999999990,999999995.1,1e9]}].map(numericalDomain), [[5,6,0],[7,8,0]]);
  expect(target.boundaries).toEqual([999999990,1e9]);
  expect(target.aligned.map(part => part.counts)).toEqual([[11],[15]]);
});

it("aligns different category dictionaries and distinguishes a literal Other category", () => {
  const target = alignCategoricalHistograms([{categories:["Other","West"]}, {categories:["East","West"]}],
    [[2,5,1,0],[4,3,-1,0]]);
  expect(target.labels).toEqual(["East","Other","West","Other (unlisted)"]);
  expect(target.aligned.map(part => part.counts)).toEqual([[0,2,5,1],[4,0,3,-1]]);
});

it("cannot reconstruct exact category labels from an interval histogram", () => {
  expect(alignCategoricalHistograms([{boundaries:[0,10,20]}], [[8,9,0]])).toBeNull();
  expect(numericalDomain({boundaries:[0,10,5]})).toBeNull();
  expect(numericalDomain({boundaries:[0,1,2],values:[1,1]})).toBeNull();
});
