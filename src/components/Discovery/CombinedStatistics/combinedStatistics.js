import { frequencyQuantile } from "./frequencyQuantile.js";
import { meanConfidenceInterval, adjustedSkewness, adjustedKurtosis, sampleStandardDeviation, poolNumericalModes } from "./numericalSummary.js";
// Pool only the summaries already released by each node. No patient rows are transferred.
export const sourceKey = (source) => JSON.stringify([String(source.nodeId ?? ""), source.fileName]);
export const sourceLabel = (source) => `${source.nodeName || source.nodeId || "Node"} / ${source.fileName}`;
export function sourceFileLabel(source, results, index = results.indexOf(source)) {
  const duplicate = results.some((other, i) => i !== index && other.fileName === source.fileName);
  const siteName = source.nodeName || source.nodeId;
  const duplicateSiteName = duplicate && results.some((other, i) => i !== index && other.fileName === source.fileName
    && (other.nodeName || other.nodeId) === siteName);
  return `${source.fileName || `File #${index + 1}`}${duplicate ? ` · ${siteName}${duplicateSiteName ? ` · ${source.nodeId}` : ""}` : ""}`;
}
export const featureArrays = { continuous: "continuousFeatures", categorical: "categoricalFeatures", date: "dateFeatures" };
export const summaryConventions = {
  continuous: "Population SD (n) and sample SD (n−1); 95% Student t CI for the mean (sample SD, n−1 df); adjusted Fisher–Pearson skewness (G1) and Fisher excess kurtosis (G2); exact numerical modes; linear quantiles (R7); non-missing observations",
  date: "Population SD in days (n); linear quantiles (R7), displayed as whole dates; non-missing observations",
  categorical: "Category percentages use non-missing observations; missingness is reported separately",
};
const validCount = (n) => Number.isSafeInteger(n) && n >= 0;
const finite = (n) => typeof n === "number" && Number.isFinite(n);

export function categoryFrequencies(counts, total) {
  return [...counts].filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([value, count]) => ({ value, count, percent: 100 * count / total }));
}

// Chan's parallel variance formula; the node reports population standard deviations.
export function poolMoments(parts) {
  let count = 0, mean = 0, m2 = 0, m3 = 0, m4 = 0, hasThirdMoments = true, hasFourthMoments = true;
  for (const part of parts) {
    if (!validCount(part.count) || !finite(part.mean) || !finite(part.stdDev) || part.stdDev < 0) return null;
    if (!part.count) continue;
    const partM3 = part.stdDev === 0 ? 0 : part.sumCubedDeviations;
    const partM4 = part.stdDev === 0 ? 0 : part.sumFourthDeviations;
    hasThirdMoments &&= finite(partM3);
    hasFourthMoments &&= finite(partM4) && finite(partM3);
    if (!count) {
      count = part.count; mean = part.mean; m2 = part.count * part.stdDev ** 2;
      m3 = partM3;
      m4 = partM4;
      continue;
    }
    const nextCount = count + part.count;
    if (!Number.isSafeInteger(nextCount)) return null;
    const delta = part.mean - mean;
    // Pébay's parallel moments, updated from highest to lowest order.
    const a = count / nextCount, b = part.count / nextCount, weight = count * b;
    const partM2 = part.count * part.stdDev ** 2;
    m4 += partM4 + delta ** 4 * weight * (a * a - a * b + b * b)
      + 6 * delta ** 2 * (a * a * partM2 + b * b * m2) + 4 * delta * (a * partM3 - b * m3);
    m3 += partM3 + delta ** 3 * weight * ((count - part.count) / nextCount)
      + 3 * delta * (a * partM2 - b * m2);
    m2 += partM2 + delta ** 2 * weight;
    mean += delta * b;
    count = nextCount;
  }
  return count && finite(m2) && finite(mean) ? { count, mean, stdDev: Math.sqrt(Math.max(0, m2 / count)),
    sumCubedDeviations: hasThirdMoments && finite(m3) ? m3 : null,
    sumFourthDeviations: hasFourthMoments && finite(m4) ? m4 : null } : null;
}

const dayNumber = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) / 86400000 : NaN;
const dateString = value => new Date(Math.trunc(value) * 86400000).toISOString().slice(0, 10);

function dateSummary(histogram) {
  const entries = Object.entries(histogram).map(([day, count]) => [dayNumber(day), count]).sort((a, b) => a[0] - b[0]);
  if (!entries.length || entries.some(([day, n]) => !finite(day) || !validCount(n))) return null;
  const count = entries.reduce((n, entry) => n + entry[1], 0);
  if (!count || !Number.isSafeInteger(count)) return null;
  const moments = poolMoments(entries.map(([day, frequency]) => ({ count: frequency, mean: day, stdDev: 0 })));
  if (!moments) return null;
  const percentile = p => dateString(frequencyQuantile(entries, count, p));
  return {
    count, mean: dateString(moments.mean), stdDev: moments.stdDev,
    min: dateString(entries[0][0]), max: dateString(entries.at(-1)[0]),
    q1: percentile(.25), median: percentile(.5), q3: percentile(.75),
  };
}

export function buildCombinedStatistics(results, activeIndices) {
  const sources = results.filter((_, index) => activeIndices[index]);
  const names = new Set(sources.flatMap(r => [
    ...Object.values(featureArrays).flatMap(k => (r[k] || []).map(f => f.featureName)),
    ...(r.omittedFeatures || []).map(f => f.featureName),
  ]));
  const features = [...names].sort((a, b) => a.localeCompare(b)).map(featureName => {
    const contributions = sources.map(source => {
      for (const [type, key] of Object.entries(featureArrays)) {
        const feature = (source[key] || []).find(f => f.featureName === featureName);
        if (feature) return { source, type, feature, status: "Included" };
      }
      const omitted = (source.omittedFeatures || []).find(f => f.featureName === featureName);
      return { source, status: omitted ? omitted.reason : source.message?.startsWith("No records match") ? "No matching records" : "Not available" };
    });
    const included = contributions.filter(c => c.feature);
    const types = new Set(included.map(c => c.type));
    const row = { featureName, contributions, includedSources: included.length, totalSources: sources.length };
    // A partial cohort must never look like a pooled result for all selected sites.
    const unavailable = contributions.some(c => !c.feature && c.status !== "No matching records");
    if (unavailable) return { ...row, unavailable: "Unavailable for one or more selected datasets" };
    if (types.size !== 1) return { ...row, unavailable: types.size ? "Different variable types across datasets" : "No matching records" };
    const type = included[0].type;
    const parts = included.map(c => c.feature);
    if (parts.some(f => !validCount(f.count) || !validCount(f.missingValuesCount))) return { ...row, type, unavailable: "Incomplete counts in the returned summaries" };
    const count = parts.reduce((n, f) => n + f.count, 0);
    const missing = parts.reduce((n, f) => n + f.missingValuesCount, 0);
    if (!Number.isSafeInteger(count + missing) || !count) return { ...row, type, unavailable: "No non-missing observations" };
    const base = { ...row, type, count, missing, percentMissing: 100 * missing / (count + missing) };
    if (type === "continuous") {
      const moments = poolMoments(parts);
      if (!moments || parts.some(f => !finite(f.min) || !finite(f.max))) return { ...base, unavailable: "Incomplete numerical summaries" };
      // Local quantiles and independently binned histograms cannot yield exact pooled quantiles.
      const counts = new Map();
      const complete = parts.every(part => Array.isArray(part.valueCounts) && part.valueCounts.length > 0 && part.valueCounts.length <= 200
        && part.valueCounts.every(cell => finite(cell.value) && validCount(cell.count) && cell.count >= 6)
        && part.valueCounts.reduce((n, cell) => n + cell.count, 0) === part.count);
      if (complete) parts.forEach(part => part.valueCounts.forEach(cell => counts.set(cell.value, (counts.get(cell.value) || 0) + cell.count)));
      const entries = [...counts].sort((a, b) => a[0] - b[0]);
      const percentile = p => frequencyQuantile(entries, count, p);
      return { ...base, ...moments, min: Math.min(...parts.map(f => f.min)), max: Math.max(...parts.map(f => f.max)),
        ...meanConfidenceInterval(count, moments.mean, moments.stdDev),
        skewness: adjustedSkewness(count, moments.stdDev, moments.sumCubedDeviations),
        kurtosis: adjustedKurtosis(count, moments.stdDev, moments.sumFourthDeviations),
        sampleStdDev: sampleStandardDeviation(count, moments.stdDev),
        ...poolNumericalModes(parts, entries),
        ...(complete ? { q1: percentile(.25), median: percentile(.5), q3: percentile(.75) } : {}) };
    }
    const field = type === "date" ? "dateHistogram" : "categoryCounts";
    const counts = new Map();
    for (const part of parts) {
      const entries = Object.entries(part[field] || {});
      if (entries.some(([, n]) => !validCount(n)) || entries.reduce((n, entry) => n + entry[1], 0) !== part.count) return { ...base, unavailable: "Incomplete distribution in the returned summaries" };
      entries.filter(([, n]) => n > 0).forEach(([value, n]) => counts.set(value, (counts.get(value) || 0) + n));
    }
    if (type === "date") {
      const summary = dateSummary(Object.fromEntries(counts));
      return summary ? { ...base, ...summary } : { ...base, unavailable: "Incomplete date distribution" };
    }
    return { ...base, cardinality: counts.size, categories: categoryFrequencies(counts, count) };
  });
  return { sources, features };
}
