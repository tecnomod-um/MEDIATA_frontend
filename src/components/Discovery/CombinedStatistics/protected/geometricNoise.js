export function simultaneousNoiseRadius(variances, binCount, failureProbability = 0.025) {
  // For geometric difference noise, P(|Z| > r) = 2 q^(r+1) / (1+q).
  // Bound all component noise values before summing or regrouping released bins.
  const comparisons = binCount * variances.length;
  return variances.reduce((radius, variance) => {
    const root = Math.sqrt(1 + 2 * variance);
    const q = (root - 1) / (root + 1);
    const component = Math.max(
      0,
      Math.ceil(Math.log((failureProbability * (1 + q)) / (2 * comparisons)) / Math.log(q) - 1),
    );
    return radius + component;
  }, 0);
}
