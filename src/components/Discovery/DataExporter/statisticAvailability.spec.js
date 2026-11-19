import {expect,it} from "vitest";
import {statisticValue} from "./statisticAvailability";

it("keeps valid zeros and explains mathematically undefined figures",()=>{
  expect(statisticValue({count:4,stdDev:0},"sampleStdDev",0)).toBe(0);
  expect(statisticValue({count:4,stdDev:0},"kurtosis",null)).toBe("Undefined: constant feature");
  expect(statisticValue({count:2,stdDev:1},"skewness",null)).toContain("fewer than 3");
  expect(statisticValue({count:1,stdDev:0},"meanCiLower",null)).toContain("fewer than 2");
  expect(statisticValue({count:0},"mean",null)).toContain("no non-missing");
});

it("distinguishes absent modes, protected uncertainty and an unavailable source",()=>{
  expect(statisticValue({count:4,modeStatus:"No repeated value"},"mode",null)).toBe("No repeated value");
  expect(statisticValue({count:4,approximate:true},"mean",null)).toContain("Not estimable");
  expect(statisticValue({unavailable:"A participant disconnected"},"mean",null)).toBe("Unavailable");
  expect(statisticValue({count:4},"median",null)).toBe("Not released");
});
