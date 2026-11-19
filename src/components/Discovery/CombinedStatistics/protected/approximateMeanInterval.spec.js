import {expect,it} from "vitest";
import {approximateMeanInterval} from "./approximateMeanInterval";

it("uses a shared count bound to constrain the mass allowed in noisy tails",()=>{
  const cells=[50,...Array(19).fill(0)];
  const histogram={lowerEdges:Array.from({length:20},(_,i)=>i*5),upperEdges:Array.from({length:20},(_,i)=>i*5),variances:[4]};
  const exact={count:1000,sum:0,min:0,max:0};
  const before=approximateMeanInterval(cells,histogram,exact);
  const after=approximateMeanInterval(cells,{...histogram,countEstimate:50,countNoise:1},exact);
  expect(after.meanCiLower).toBe(0);
  expect(after.meanCiUpper).toBeLessThan(before.meanCiUpper);
  expect(after.meanCiUpper).toBeGreaterThan(0);
});

it("returns the full published range when noisy constraints conflict instead of a false interval",()=>{
  const result=approximateMeanInterval([100,100],{lowerEdges:[0,10],upperEdges:[10,20],variances:[4],countEstimate:1,countNoise:0},
    {count:0,sum:0,min:Infinity,max:-Infinity});
  expect(result).toEqual({meanCiLower:0,meanCiUpper:20});
});
