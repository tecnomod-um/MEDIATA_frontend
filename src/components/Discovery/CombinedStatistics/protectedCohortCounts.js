export function noiseCellCount(histogram) {
  const domain = histogram.domain;
  const length = domain?.boundaries?.length ?? (domain?.categories?.length + 2);
  return length - (domain?.missingAllowed === false ? 1 : 0)
    - (domain?.categories && domain.unlistedCategoriesAllowed === false ? 1 : 0);
}

export function coherentFeatureCounts(total, histogram, variance) {
  const cohort = Math.max(0, Math.round(total.total));
  const hasMissingNoise = histogram.domain.missingAllowed !== false;
  const missing = hasMissingNoise ? Math.max(0, Math.min(cohort, histogram.counts.at(-1))) : 0;
  const covariance = hasMissingNoise ? total.variance / noiseCellCount(histogram) : 0;
  return {count:cohort - missing, missing, estimate:total.total - (hasMissingNoise ? histogram.counts.at(-1) : 0),
    variance:Math.max(0, total.variance + (hasMissingNoise ? variance : 0) - 2 * covariance)};
}
