import {expect,it} from "vitest";
import {approvedQuartiles} from "./approvedQuartiles";

it("bounds quantiles from mixed released points and chart bins without splitting private counts",()=>{
  const result=approvedQuartiles([{count:6,valueCounts:[{value:0,count:6}]},
    {count:6,min:0,max:10,histogram:[6],binRanges:["[0 - 10]"]}]);
  expect(result).toMatchObject({q1:0,median:2.5,q3:5,estimatedQuantiles:true,
    quantileBounds:{q1:[0,0],median:[0,5],q3:[0,10]}});
});

it("rejects suppressed or incomplete chart distributions",()=>{
  expect(approvedQuartiles([{count:12,min:0,max:10,histogram:[6],binRanges:["[0 - 10]"]}])).toBeNull();
});
