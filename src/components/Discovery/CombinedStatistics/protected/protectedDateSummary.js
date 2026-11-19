import { dateString, dayNumber, poolMoments } from "../exact/combinedStatistics";

// Date histograms use UTC epoch days for arithmetic; deviations remain in days.
export function numericalDateFeature(feature) {
  const entries = Object.entries(feature.dateHistogram || {}).map(([date, count]) => [dayNumber(date), count]);
  if (
    !entries.length ||
    entries.some(([day, count]) => !Number.isFinite(day) || !Number.isSafeInteger(count) || count < 0) ||
    entries.reduce((sum, [, count]) => sum + count, 0) !== feature.count
  )
    return null;
  const moments = poolMoments(entries.map(([mean, count]) => ({ mean, count, stdDev: 0 })));
  return (
    moments && {
      ...feature,
      ...moments,
      min: Math.min(...entries.map(([day]) => day)),
      max: Math.max(...entries.map(([day]) => day)),
      valueCounts: entries.map(([value, count]) => ({ value, count })),
    }
  );
}

export function formatProtectedDates(summary) {
  const result = { ...summary };
  for (const field of [
    "mean",
    "min",
    "max",
    "q1",
    "median",
    "q3",
    "supportedMin",
    "supportedMax",
    "meanCiLower",
    "meanCiUpper",
  ]) {
    if (Number.isFinite(result[field])) result[field] = dateString(result[field]);
  }
  return result;
}
