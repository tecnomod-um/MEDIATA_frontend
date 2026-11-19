import {it, expect} from "vitest";
import {frequencyQuantile} from "./frequencyQuantile";

it("matches conventional linear quartiles without expanding the distribution", () => {
  const entries = [[1,6],[2,6],[3,6],[4,6]];
  expect([0,.25,.5,.75,1].map(p=>frequencyQuantile(entries,24,p))).toEqual([1,1.75,2.5,3.25,4]);
  expect(frequencyQuantile([[8,1]],1,.5)).toBe(8);
  expect(frequencyQuantile([[1,600000000],[3,600000000]],1200000000,.5)).toBe(2);
});
