import {expect,it} from "vitest";
import {geometricMeanInterval} from "./geometricMeanInterval";

const empty={count:0,sum:0,min:Infinity,max:-Infinity};
it("bounds the numerator and shared count without assuming their independence",()=>{
  const h={lowerEdges:[0,10],upperEdges:[0,10],variances:[4,4,4],countEstimate:1000,countNoise:2,countScale:2};
  const interval=geometricMeanInterval([500,500],h,empty);
  expect(interval.meanCiLower).toBeGreaterThan(0);
  expect(interval.meanCiLower).toBeLessThan(5);
  expect(interval.meanCiUpper).toBeGreaterThan(5);
  expect(interval.meanCiUpper).toBeLessThan(10);
  const coarse=geometricMeanInterval([500,500],{...h,lowerEdges:[0,5],upperEdges:[5,10]},empty);
  expect(coarse.meanCiUpper-coarse.meanCiLower).toBeGreaterThan(interval.meanCiUpper-interval.meanCiLower);
});

it("does not manufacture a narrow confidence interval for an uncertain small count",()=>{
  expect(geometricMeanInterval([2,2],{lowerEdges:[0,10],upperEdges:[0,10],variances:[4],countEstimate:4,countNoise:5,countScale:2},empty))
    .toEqual({meanCiLower:0,meanCiUpper:10});
});
