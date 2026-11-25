import { categoryFrequencies, featureArrays as arrays } from "./exact/combinedStatistics";

// Adapt an already released summary to the existing statistical table fields.
export function summaryTableFeature(summary) {
  const feature = {
    featureName: summary.featureName,
    count: summary.unavailable ? null : summary.count,
    countEstimated: summary.countEstimated,
    missingValuesCount: summary.unavailable ? null : summary.missing,
    mean: summary.mean,
    stdDev: summary.stdDev,
    min: summary.min,
    max: summary.max,
    supportedMin: summary.supportedMin,
    supportedMax: summary.supportedMax,
    meanCiLower: summary.meanCiLower,
    meanCiUpper: summary.meanCiUpper,
    skewness: summary.skewness,
    kurtosis: summary.kurtosis,
    sampleStdDev: summary.sampleStdDev,
    cardinality: summary.cardinality,
    modes: summary.modes,
    modeBand: summary.modeBand,
    modeFrequency: summary.modeFrequency,
    modeStatus: summary.modeStatus,
    qrt1: summary.q1,
    qrt3: summary.q3,
    median: summary.median,
    q1: summary.q1,
    q3: summary.q3,
    earliestDate: summary.min,
    latestDate: summary.max,
    datasetCount: `${summary.includedSources}/${summary.totalSources}`,
    status:
      summary.unavailable ||
      (summary.approximate
        ? summary.lowPrecision
          ? "Low precision"
          : "Estimated"
        : summary.estimatedQuantiles
          ? "Combined · estimated distribution"
          : summary.estimatedMode
            ? "Combined · estimated mode"
            : "Combined"),
  };
  if (summary.type === "categorical") {
    const categories = summary.categories || [];
    feature.categoryCounts = Object.fromEntries(categories.map((c) => [c.value, c.count]));
    feature.mode = categories[0]?.value;
    feature.modeFrequency = categories[0]?.count;
    feature.modeFrequencyPercentage = categories[0]?.percent;
    feature.secondMode = categories[1]?.value;
    feature.secondModeFrequency = categories[1]?.count;
    feature.secondModePercentage = categories[1]?.percent;
  }
  return feature;
}

// Adapt the same table summaries for export without recalculating statistics.
export function tableExportFeatures(data) {
  return Object.entries(arrays).flatMap(([type, key]) =>
    (data[key] || []).map((feature) => {
      if (feature.combinedSummary) return feature.combinedSummary;
      if (feature.estimatedSummary) return feature.estimatedSummary;
      const count = feature.count,
        missing = feature.missingValuesCount;
      return {
        ...feature,
        type,
        missing,
        percentMissing: (100 * missing) / (count + missing),
        min: type === "date" ? feature.earliestDate : feature.min,
        max: type === "date" ? feature.latestDate : feature.max,
        q1: type === "date" ? feature.q1 : feature.qrt1,
        q3: type === "date" ? feature.q3 : feature.qrt3,
        includedSources: 1,
        totalSources: 1,
        contributions: [{ source: feature, feature }],
        categories:
          type === "categorical" ? categoryFrequencies(Object.entries(feature.categoryCounts || {}), count) : undefined,
      };
    }),
  );
}
