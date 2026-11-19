import { simultaneousNoiseRadius } from "./geometricNoise";

const NOISE_FAILURE = 0.025;
const SAMPLING_FAILURE = 0.025;

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function extremeMean(edges, low, high, minimum, exact, lowerTotal, upperTotal) {
  const ordered = edges
    .map((edge, index) => ({ edge, low: low[index], high: high[index] }))
    .sort((a, b) => (minimum ? a.edge - b.edge : b.edge - a.edge));
  let count = sum(low),
    weighted = exact.sum + sum(edges.map((edge, index) => edge * low[index]));
  let best = minimum ? Infinity : -Infinity;
  const consider = (total, numerator) => {
    if (total < lowerTotal || total > upperTotal || exact.count + total <= 0) return;
    const value = numerator / (exact.count + total);
    best = minimum ? Math.min(best, value) : Math.max(best, value);
  };
  consider(count, weighted);
  for (const bin of ordered) {
    const capacity = bin.high - bin.low;
    for (const endpoint of [lowerTotal, upperTotal]) {
      if (endpoint >= count && endpoint <= count + capacity)
        consider(endpoint, weighted + (endpoint - count) * bin.edge);
    }
    count += capacity;
    weighted += capacity * bin.edge;
    consider(count, weighted);
  }
  return best;
}

export function approximateMeanInterval(
  cells,
  { lowerEdges, upperEdges, variances, countEstimate, countNoise },
  exact,
) {
  // Invert the two-sided geometric tail and use a union bound over sites and bins.
  const hasCount = Number.isFinite(countEstimate) && Number.isFinite(countNoise) && countNoise >= 0;
  const radius = simultaneousNoiseRadius(variances, cells.length, hasCount ? NOISE_FAILURE / 2 : NOISE_FAILURE);
  const low = cells.map((cell) => Math.max(0, cell - radius));
  const high = cells.map((cell) => Math.max(0, cell + radius));
  // Chebyshev controls the shared noisy count without assuming independence
  // from the feature bins. The union bound reserves separate error allowances.
  const countRadius = hasCount ? countNoise / Math.sqrt(NOISE_FAILURE / 2) : Infinity;
  const lowerTotal = Math.max(sum(low), hasCount ? countEstimate - countRadius : 0);
  const upperTotal = Math.min(sum(high), hasCount ? countEstimate + countRadius : Infinity);
  const countLower = exact.count + lowerTotal;
  // Hoeffding gives the sampling term for independent observations in the configured range.
  // The two failure probabilities use separate portions of the total 5% error allowance.
  const minimum = Math.min(...lowerEdges, exact.min);
  const maximum = Math.max(...upperEdges, exact.max);
  if (countLower <= 0 || lowerTotal > upperTotal) return { meanCiLower: minimum, meanCiUpper: maximum };
  const margin = (maximum - minimum) * Math.sqrt(Math.log(2 / SAMPLING_FAILURE) / (2 * countLower));
  return {
    meanCiLower: Math.max(minimum, extremeMean(lowerEdges, low, high, true, exact, lowerTotal, upperTotal) - margin),
    meanCiUpper: Math.min(maximum, extremeMean(upperEdges, low, high, false, exact, lowerTotal, upperTotal) + margin),
  };
}
