import {expect,it} from "vitest";
import {fitProtectedCounts} from "./protectedDistributionFit";

it("projects signed frequencies to a nonnegative histogram with exactly the declared count",()=>{
  expect(fitProtectedCounts([-5,9,2],7)).toEqual([0,7,0]);
  expect(fitProtectedCounts([3,3,3],8)).toEqual([3,3,2]);
  expect(fitProtectedCounts([2,9],0)).toEqual([0,0]);
  expect(fitProtectedCounts([NaN,2],3)).toBeNull();
});
