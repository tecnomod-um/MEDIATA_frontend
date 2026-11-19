// A centered geometric G has cumulants k_r <= (r-1)! q/(1-q)^r.
// Thus a geometric difference is sub-gamma with its declared variance and
// scale 1/(1-q). Independent weighted sums add variances and take the largest
// weighted scale. This bounds a sum directly rather than bounding every bin.
const scale = (variance) => {
  const q = variance / (variance + 1 + Math.sqrt(2 * variance + 1));
  return 1 / (1 - q);
};
const radius = (variance, b, failure) => {
  const t = Math.log(2 / failure);
  return Math.sqrt(2 * variance * t) + b * t;
};

export function geometricMeanInterval(cells, histogram, exact) {
  const { lowerEdges, upperEdges, variances, countEstimate, countNoise, countScale } = histogram;
  const minimum = Math.min(...lowerEdges, exact.min),
    maximum = Math.max(...upperEdges, exact.max),
    center = (minimum + maximum) / 2;
  const fallback = { meanCiLower: minimum, meanCiUpper: maximum };
  if (!Number.isFinite(countEstimate) || !Number.isFinite(countScale)) return fallback;
  const delta = 0.025 / 3; // count, lower numerator and upper numerator, by union bound
  const nRadius = radius(countNoise ** 2, countScale, delta);
  const nLow = Math.max(0, exact.count + countEstimate - nRadius),
    nHigh = exact.count + countEstimate + nRadius;
  if (nLow <= 0) return fallback;
  const variance = variances.reduce((sum, v) => sum + v, 0),
    noiseScale = Math.max(...variances.map(scale));
  const bound = (edges, lower) => {
    const weights = edges.map((edge) => edge - center);
    const observed = exact.sum - center * exact.count + weights.reduce((sum, w, i) => sum + w * cells[i], 0);
    const v = variance * weights.reduce((sum, w) => sum + w * w, 0),
      b = noiseScale * Math.max(...weights.map(Math.abs));
    const numerator = observed + (lower ? -1 : 1) * radius(v, b, delta);
    const denominator = lower ? (numerator < 0 ? nLow : nHigh) : numerator > 0 ? nLow : nHigh;
    return center + numerator / denominator;
  };
  const sampling = (maximum - minimum) * Math.sqrt(Math.log(2 / 0.025) / (2 * nLow));
  return {
    meanCiLower: Math.max(minimum, bound(lowerEdges, true) - sampling),
    meanCiUpper: Math.min(maximum, bound(upperEdges, false) + sampling),
  };
}
