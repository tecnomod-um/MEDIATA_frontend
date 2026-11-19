import {expect,it} from "vitest";
import {coherentFeatureCounts,noiseCellCount} from "./protectedCohortCounts";

it("uses one coherent cohort total without treating negative missing noise as extra observations",()=>{
  const total={total:21.4,variance:4};
  const feature={domain:{boundaries:[0,1,2]},counts:[10,12,-5]};
  expect(coherentFeatureCounts(total,feature,4)).toMatchObject({count:21,missing:0});
  feature.counts[2]=80;
  expect(coherentFeatureCounts(total,feature,4)).toMatchObject({count:0,missing:21});
});

it("does not include public structural-zero cells in the noise variance",()=>{
  const histogram={domain:{categories:["North","South"],missingAllowed:false,unlistedCategoriesAllowed:false},counts:[12,9,0,0]};
  expect(noiseCellCount(histogram)).toBe(2);
  expect(coherentFeatureCounts({total:21,variance:2},histogram,4)).toMatchObject({count:21,missing:0,variance:2,estimate:21});
});
