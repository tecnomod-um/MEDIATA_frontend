const NOISE_FAILURE = .025;
const SAMPLING_FAILURE = .025;

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function extremeMean(edges, low, high, minimum, exact) {
  const ordered = edges.map((edge, index) => ({ edge, low: low[index], high: high[index] }))
    .sort((a, b) => a.edge - b.edge);
  let best = minimum ? Infinity : -Infinity;
  for (let split = 0; split <= ordered.length; split++) {
    const weights = ordered.map((bin, index) => (index < split) === minimum ? bin.high : bin.low);
    const count = exact.count + sum(weights);
    if (!count) continue;
    const mean = (exact.sum + sum(ordered.map(({ edge }, index) => edge * weights[index]))) / count;
    best = minimum ? Math.min(best, mean) : Math.max(best, mean);
  }
  return best;
}

export function approximateMeanInterval(cells, { lowerEdges, upperEdges, variances }, exact) {
  // Invert the two-sided geometric tail and use a union bound over sites and bins.
  const cellsInRelease = cells.length * variances.length;
  const radius = sum(variances.map(variance => {
    const divisor = (1 + Math.sqrt(1 + 2 * variance)) / 2;
    const q = (divisor - 1) / divisor;
    return Math.ceil(Math.log(NOISE_FAILURE * (1 + q) / (2 * cellsInRelease)) / Math.log(q));
  }));
  const low = cells.map(cell => Math.max(0, cell - radius));
  const high = cells.map(cell => Math.max(0, cell + radius));
  const countLower = exact.count + sum(low);
  // Hoeffding gives the sampling term for independent observations in the configured range.
  // The two failure probabilities use separate portions of the total 5% error allowance.
  const minimum = Math.min(...lowerEdges, exact.min);
  const maximum = Math.max(...upperEdges, exact.max);
  if (!countLower) return { meanCiLower: minimum, meanCiUpper: maximum };
  const margin = (maximum - minimum) * Math.sqrt(Math.log(2 / SAMPLING_FAILURE) / (2 * countLower));
  return {
    meanCiLower: Math.max(minimum, extremeMean(lowerEdges, low, high, true, exact) - margin),
    meanCiUpper: Math.min(maximum, extremeMean(upperEdges, low, high, false, exact) + margin),
  };
}
