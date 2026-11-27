import { dateString } from "../exact/combinedStatistics";

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
