const NOISE_FAILURE = .025;
const SAMPLING_FAILURE = .025;

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function extremeMean(edges, low, high, minimum) {
  let best = minimum ? edges.at(-1) : edges[0];
  for (let split = 0; split <= edges.length; split++) {
    const weights = edges.map((_, index) => (index < split) === minimum ? high[index] : low[index]);
    const count = sum(weights);
    if (!count) continue;
    const mean = sum(edges.map((edge, index) => edge * weights[index])) / count;
    best = minimum ? Math.min(best, mean) : Math.max(best, mean);
  }
  return best;
}

export function approximateMeanInterval(cells, boundaries, variances) {
  // Invert the two-sided geometric tail and use a union bound over sites and bins.
  const cellsInRelease = cells.length * variances.length;
  const radius = sum(variances.map(variance => {
    const divisor = (1 + Math.sqrt(1 + 2 * variance)) / 2;
    const q = (divisor - 1) / divisor;
    return Math.ceil(Math.log(NOISE_FAILURE * (1 + q) / (2 * cellsInRelease)) / Math.log(q));
  }));
  const low = cells.map(cell => Math.max(0, cell - radius));
  const high = cells.map(cell => Math.max(0, cell + radius));
  const countLower = sum(low);
  // Hoeffding gives the sampling term for independent observations in the configured range.
  // The two failure probabilities use separate portions of the total 5% error allowance.
  const minimum = boundaries[0], maximum = boundaries.at(-1);
  if (!countLower) return { meanCiLower: minimum, meanCiUpper: maximum };
  const margin = (maximum - minimum) * Math.sqrt(Math.log(2 / SAMPLING_FAILURE) / (2 * countLower));
  return {
    meanCiLower: Math.max(minimum, extremeMean(boundaries.slice(0, -1), low, high, true) - margin),
    meanCiUpper: Math.min(maximum, extremeMean(boundaries.slice(1), low, high, false) + margin),
  };
}
