import {simultaneousNoiseRadius} from "./geometricNoise";

// Shape ratios are unstable when the released evidence does not distinguish
// variation from histogram noise. A positive surrogate variance alone is insufficient.
export function supportedVariation(histogram, exact) {
  if (exact.some(part => part.count > 0 && part.stdDev > 0)) return true;
  const fixed = [...new Set(exact.filter(part => part.count > 0).map(part => part.mean))];
  if (fixed.length > 1) return true;
  const radius = simultaneousNoiseRadius(histogram.variances,histogram.cells.length);
  const ranges = fixed.map(value => [value,value]);
  histogram.cells.forEach((count,index) => {
    if (count > radius) ranges.push(histogram.scores ? [histogram.scores[index],histogram.scores[index]]
      : [histogram.lowerEdges[index],histogram.upperEdges[index]]);
  });
  return ranges.length > 1 && ranges.some(([low,high]) => ranges.some(([otherLow,otherHigh]) => low > otherHigh || high < otherLow));
}
