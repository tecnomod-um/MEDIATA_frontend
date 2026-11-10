import tQuantile from "@stdlib/stats-base-dists-t-quantile";

export const numericalMethods = {
  confidence: "95% Student t confidence interval for the mean: mean ± t(0.975, n−1) × sample SD / √n. Assumes independent observations; not a prediction interval or a site-adjusted model.",
  skewness: "Adjusted Fisher–Pearson sample skewness (G1). Undefined for fewer than three non-missing observations or a constant feature. Pooled third moments include within- and between-dataset variation.",
  kurtosis: "Bias-corrected Fisher excess kurtosis (G2), matching pandas kurtosis: a normal distribution has excess 0. Undefined for fewer than four observations or a constant feature. Pooled fourth moments include within- and between-dataset variation.",
  deviation: "Population SD divides squared deviations by n. Sample SD divides by n−1 and matches pandas describe(). Confidence intervals use sample SD. Neither local SDs nor local shape statistics are averaged across datasets.",
  mode: "Exact observed numerical modes; all ties are retained. No binning or density estimate. Local modes with protected counts are withheld. Pooled modes use complete approved value frequencies, or the intersection when all datasets share a local maximum. Local modes are never averaged.",
};

export function sampleStandardDeviation(count, populationSd) {
  const value = Number.isSafeInteger(count) && count > 1 && Number.isFinite(populationSd) && populationSd >= 0
    ? populationSd * Math.sqrt(count / (count - 1)) : null;
  return Number.isFinite(value) ? value : null;
}

export function adjustedKurtosis(count, populationSd, sumFourthDeviations) {
  if (count < 4 || !(populationSd > 0) || !Number.isFinite(sumFourthDeviations)) return null;
  const excess = sumFourthDeviations / count / populationSd / populationSd / populationSd / populationSd - 3;
  const value = ((count - 1) / (count - 2) / (count - 3)) * ((count + 1) * excess + 6);
  return Number.isFinite(value) ? value : null;
}

export function meanConfidenceInterval(count, mean, populationSd) {
  if (!Number.isSafeInteger(count) || count < 2 || !Number.isFinite(mean) || !Number.isFinite(populationSd) || populationSd < 0)
    return { meanCiLower: null, meanCiUpper: null };
  const margin = tQuantile(0.975, count - 1) * (populationSd / Math.sqrt(count - 1));
  return { meanCiLower: Number.isFinite(mean - margin) ? mean - margin : null,
    meanCiUpper: Number.isFinite(mean + margin) ? mean + margin : null };
}

export function adjustedSkewness(count, populationSd, sumCubedDeviations) {
  if (count < 3 || !(populationSd > 0) || !Number.isFinite(sumCubedDeviations)) return null;
  const value = (sumCubedDeviations / count / populationSd / populationSd / populationSd)
    * (Math.sqrt(count * (count - 1)) / (count - 2));
  return Number.isFinite(value) ? value : null;
}

export function numericalModes(entries) {
  if (!entries.length) return { modes: [], modeFrequency: null, modeStatus: "Complete value frequencies unavailable" };
  const frequency = Math.max(...entries.map(([, count]) => count));
  return { modes: frequency > 1 ? entries.filter(([, count]) => count === frequency).map(([value]) => value) : [],
    modeFrequency: frequency > 1 ? frequency : null, modeStatus: frequency > 1 ? "Available" : "No repeated value" };
}

export function poolNumericalModes(parts, entries) {
  if (entries.length) return numericalModes(entries);
  if (parts.length === 1) return { modes: parts[0].modes || [], modeFrequency: parts[0].modeFrequency ?? null,
    modeStatus: parts[0].modeStatus || "Unavailable" };
  // A shared local maximum attains the sum of every site's upper bound. All global ties
  // must also attain that bound at every site, so the intersection is exact.
  if (parts.length && parts.every(part => part.modeStatus === "Available" && part.modes?.length
    && part.modes.every(Number.isFinite) && Number.isSafeInteger(part.modeFrequency) && part.modeFrequency >= 6)) {
    const common = parts[0].modes.filter(value => parts.every(part => part.modes.includes(value)));
    if (common.length) return { modes: [...common].sort((a, b) => a - b),
      modeFrequency: parts.reduce((total, part) => total + part.modeFrequency, 0), modeStatus: "Available" };
  }
  return numericalModes([]);
}
