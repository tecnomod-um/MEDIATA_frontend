// Adapt an already released summary to the existing statistical table fields.
export function summaryTableFeature(summary) {
  const feature = {
    featureName: summary.featureName,
    count: summary.unavailable ? null : summary.count,
    missingValuesCount: summary.unavailable ? null : summary.missing,
    mean: summary.mean, stdDev: summary.stdDev, min: summary.min, max: summary.max,
    supportedMin: summary.supportedMin, supportedMax: summary.supportedMax,
    meanCiLower: summary.meanCiLower, meanCiUpper: summary.meanCiUpper, skewness: summary.skewness,
    kurtosis: summary.kurtosis, sampleStdDev: summary.sampleStdDev, cardinality: summary.cardinality,
    modes: summary.modes, modeBand: summary.modeBand, modeFrequency: summary.modeFrequency, modeStatus: summary.modeStatus,
    qrt1: summary.q1, qrt3: summary.q3, median: summary.median,
    q1: summary.q1, q3: summary.q3, earliestDate: summary.min, latestDate: summary.max,
    datasetCount: `${summary.includedSources}/${summary.totalSources}`,
    status: summary.unavailable || (summary.approximate
      ? "Estimated"
      : summary.estimatedQuantiles ? "Combined · estimated distribution" : "Combined"),
  };
  if (summary.type === "categorical") {
    const categories = summary.categories || [];
    feature.categoryCounts = Object.fromEntries(categories.map(c => [c.value, c.count]));
    feature.mode = categories[0]?.value;
    feature.modeFrequency = categories[0]?.count;
    feature.modeFrequencyPercentage = categories[0]?.percent;
    feature.secondMode = categories[1]?.value;
    feature.secondModeFrequency = categories[1]?.count;
    feature.secondModePercentage = categories[1]?.percent;
  }
  return feature;
}
