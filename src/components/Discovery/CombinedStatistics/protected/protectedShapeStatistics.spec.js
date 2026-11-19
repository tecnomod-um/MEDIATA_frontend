import {expect,it} from "vitest";
import {supportedVariation} from "./protectedShapeStatistics";

it("does not call a noisy tail evidence of variation in an otherwise constant cohort",()=>{
  const histogram={cells:[52,2],scores:[0,5],variances:[4]};
  expect(supportedVariation(histogram,[{count:1000,mean:0,stdDev:0}])).toBe(false);
});

it("preserves shape calculations when exact or sufficiently strong released variation exists",()=>{
  const histogram={cells:[52,2],scores:[0,5],variances:[4]};
  expect(supportedVariation(histogram,[{count:1000,mean:2,stdDev:1}])).toBe(true);
  expect(supportedVariation({...histogram,cells:[52,52]},[])).toBe(true);
});
