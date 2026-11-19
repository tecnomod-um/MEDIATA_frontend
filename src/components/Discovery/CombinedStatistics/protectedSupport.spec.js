import {expect,it} from "vitest";
import {geometricUpperTail,supportedBins} from "./protectedSupport";

it("uses conservative geometric tails and rejects noise-only ordinal cells",()=>{
  expect(geometricUpperTail([4],0)).toBe(1);
  const exactTail=2**-5/1.5; // P(Geom(.5)-Geom(.5) >= 5)
  expect(geometricUpperTail([4],5)).toBeGreaterThanOrEqual(exactTail);
  expect(geometricUpperTail([4],20)).toBeLessThan(geometricUpperTail([4],5));
  expect(supportedBins([2000,2,1,-2],[4,4,4])).toEqual([0]);
  expect(supportedBins([200,500,100],[4,4,4]).sort()).toEqual([0,1,2]);
  expect(supportedBins([0,1,0],[100])).toBeNull();
});
