import { getApproximatePoolingSource } from "../../../util/petitionHandler";
import { categoryFrequencies, completeNumericalFrequencies, poolMoments, sourceKey } from "./combinedStatistics";
import { frequencyQuantile } from "./frequencyQuantile";
import { poolingContributions, needsProtectedMoments } from "./poolingContributions";
import { adjustedKurtosis, adjustedSkewness, sampleStandardDeviation } from "./numericalSummary";
import { approximateMeanInterval } from "./approximateMeanInterval";
import { simultaneousNoiseRadius } from "./geometricNoise";
import { numericalDomain, alignNumericalHistograms, alignCategoricalHistograms } from "./protectedHistogramDomains";
import { numericalDateFeature, formatProtectedDates } from "./protectedDateSummary";

const MAX_WIRE_COUNT = 1_000_000_000;
const NOTES = "Privacy-protected estimate. Counts include random noise. Numerical values use the node's published domains. The mean interval includes binning, privacy noise and sampling uncertainty under independent observations.";
const COUNT_ONLY = "Estimated count only. The remaining statistics could not be estimated reliably.";
const MIXED_NOTES = "Privacy-protected pooled estimate.";

function validCounts(cells, length) {
  return Array.isArray(cells) && cells.length === length
    && cells.every(count => Number.isSafeInteger(count) && Math.abs(count) <= MAX_WIRE_COUNT);
}

function histogramVariance(source, feature) {
  if (![1, 2, 3].includes(source?.version)) return null;
  const variance = source.version === 1 ? source.noiseVariance : feature?.noiseVariance;
  if (!Number.isFinite(variance) || variance <= 0 || variance > MAX_WIRE_COUNT) return null;
  return variance;
}

function validRelease(source) {
  if (source.version === 3) {
    if (!Number.isFinite(source.rowEpsilon) || source.rowEpsilon <= 0) return false;
    const charge = Object.values(source.features || {}).reduce((total, histogram) => {
      const v = histogram?.noiseVariance;
      if (!Number.isFinite(v) || v <= 0 || v > MAX_WIRE_COUNT) return Infinity;
      const q = v / (v + 1 + Math.sqrt(2 * v + 1));
      return total - Math.log(q);
    }, 0);
    if (charge > source.rowEpsilon + 1e-9) return false;
  }
  return true;
}

function estimateGroupTotal(source, referenceVariance) {
  let precision = 0, weightedTotal = 0;
  for (const feature of Object.values(source.features)) {
    const length = feature?.domain?.boundaries?.length
      ?? (Array.isArray(feature?.domain?.categories) ? feature.domain.categories.length + 2 : 0);
    const variance = histogramVariance(source, feature);
    if (variance === null || length < 2 || length > 130 || !validCounts(feature.counts, length)) continue;
    // Each histogram includes missingness. Combine the noisy group sizes by inverse variance.
    const weight = referenceVariance / variance;
    precision += weight / length;
    weightedTotal += weight * (feature.counts.reduce((sum, count) => sum + count, 0) / length);
  }
  return { total: weightedTotal / precision, variance: referenceVariance / precision };
}

function roundCounts(weights, total) {
  const rounded = weights.map(Math.floor);
  const order = weights.map((weight, index) => ({ index, fraction: weight - rounded[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remainder = total - rounded.reduce((count, value) => count + value, 0);
  order.slice(0, remainder).forEach(({ index }) => rounded[index]++);
  return rounded;
}

function projectedCounts(cells, total) {
  // Project the signed frequencies onto nonnegative counts that add to the noisy total.
  const ordered = [...cells].sort((a, b) => b - a);
  let sum = 0, threshold = 0;
  for (let index = 0; index < ordered.length; index++) {
    sum += ordered[index];
    const candidate = (sum - total) / (index + 1);
    if (ordered[index] <= candidate) break;
    threshold = candidate;
  }
  return roundCounts(cells.map(cell => Math.max(0, cell - threshold)), total);
}

function numericalBins(cells, count, binNoise) {
  if (count >= 2 * binNoise * cells.length) return projectedCounts(cells, count);
  // In sparse histograms, an isolated noisy bin can disproportionately affect the mean.
  // Use adjacent bins as evidence and rescale the supported counts to the same noisy total.
  const weights = cells.map((cell, index) => {
    const nearby = cells.slice(Math.max(0, index - 1), index + 2);
    const localCount = nearby.reduce((total, value) => total + value, 0);
    const support = Math.max(0, Math.min(1, localCount / (1.25 * binNoise * Math.sqrt(nearby.length))));
    return Math.max(0, cell - binNoise / 2) * (.25 + .75 * support);
  });
  const weight = weights.reduce((sum, value) => sum + value, 0);
  return weight > 0 ? roundCounts(weights.map(value => value * count / weight), count) : null;
}

function histogramFor(group, sources) {
  const pieces = group.members.map(member => {
    const source = sources.get(sourceKey(member));
    const cell = source?.features?.[member.column];
    return { source, cell, variance: source && validRelease(source) ? histogramVariance(source, cell) : null };
  });
  const first = pieces[0]?.cell;
  if (!first || pieces.some(({ source, cell, variance }) => !cell
    || typeof source.group !== "string" || source.group !== pieces[0].source.group
    || variance === null)) return null;
  let labels, boundaries, lowerEdges, upperEdges, aligned, scores, otherIndex;
  if (group.type === "continuous" || group.type === "date") {
    const domains = pieces.map(({ cell }) => numericalDomain(cell.domain));
    if (domains.some((domain, index) => !domain
      || (group.type === "date") !== (pieces[index].cell.domain.type === "date")
      || !validCounts(pieces[index].cell.counts, domain.boundaries.length))) return null;
    const target = alignNumericalHistograms(domains, pieces.map(({cell}) => cell.counts));
    if (!target) return null;
    ({labels, boundaries, lowerEdges, upperEdges, aligned, scores} = target);
  } else {
    if (group.type !== "categorical" || pieces.some(({cell}) => !validCounts(cell.counts, cell.counts?.length))) return null;
    const target = alignCategoricalHistograms(pieces.map(({cell}) => cell.domain), pieces.map(({cell}) => cell.counts));
    if (!target) return null;
    ({labels, aligned, otherIndex} = target);
  }
  const variances = pieces.flatMap(({ variance }, index) => Array(aligned[index].fanIn).fill(variance));
  const binNoise = Math.sqrt(variances.reduce((sum, variance) => sum + variance, 0));
  const totals = pieces.map(({ source, variance }) => estimateGroupTotal(source, variance));
  // The feature's missing cell also contributes to its site's estimated total.
  const countVariance = totals.reduce((sum, total, index) =>
    sum + pieces[index].variance + total.variance * (1 - 2 / pieces[index].cell.counts.length), 0);
  const missing = pieces.reduce((sum, { cell }) => sum + cell.counts.at(-1), 0);
  return {
    labels, boundaries, lowerEdges, upperEdges, scores, otherIndex,
    cells: labels.map((_, index) => aligned.reduce((sum, { counts }) => sum + counts[index], 0)),
    count: Math.max(0, Math.round(totals.reduce((sum, total) => sum + total.total, 0) - missing)),
    missing: Math.max(0, missing),
    variances, binNoise, countNoise: Math.sqrt(countVariance),
  };
}

function numericalEstimates(labels, bins, count) {
  const mean = labels.reduce((sum, label, index) => sum + label * bins[index], 0) / count;
  const central = power => labels.reduce((sum, label, index) => sum + bins[index] * (label - mean) ** power, 0);
  return { count, mean, stdDev: Math.sqrt(central(2) / count),
    sumCubedDeviations: central(3), sumFourthDeviations: central(4) };
}

function appendNote(summary, note) {
  return [summary.note, note].filter(Boolean).join(" ");
}

export function addProtectedDistribution(group, parts, releases, summary) {
  if (group.type !== "continuous" || summary.unavailable || (summary.q1 != null && !summary.approximate)
    || !Number.isSafeInteger(summary.count) || !summary.count) return summary;
  const selected = parts.filter(needsProtectedDistribution);
  if (!selected.length) return summary;
  const histogram = histogramFor({ ...group, members: selected.map(part => part.member) }, releases);
  if (!histogram) return summary;
  const approved = parts.filter(({ feature }) => feature && completeNumericalFrequencies(feature));
  const exactEntries = approved.flatMap(({ feature }) => feature.valueCounts.map(({ value, count }) => [value, count]));
  const count = summary.count - exactEntries.reduce((total, [, frequency]) => total + frequency, 0);
  if (count < 0 || (count && summary.count <= 3 * histogram.countNoise)) return summary;
  const bins = count ? numericalBins(histogram.cells, count, histogram.binNoise)
    ?? (approved.length ? projectedCounts(histogram.cells, count) : null) : histogram.cells.map(() => 0);
  if (!bins) return summary;
  const entries = [...exactEntries, ...histogram.labels.map((value, index) => [value, bins[index]])]
    .filter(([, frequency]) => frequency > 0).sort((a, b) => a[0] - b[0]);
  const quantile = probability => histogram.scores || exactEntries.length
    ? frequencyQuantile(entries, summary.count, probability)
    : groupedQuantile(bins, histogram.boundaries, probability * summary.count);
  const withheld = selected.filter(part => part.withheld);
  const protectedRange = withheld.length === selected.length ? histogram
    : summary.approximate && histogramFor({ ...group, members: withheld.map(part => part.member) }, releases);
  const extrema = summary.approximate && protectedRange ? supportedRange(parts, protectedRange) : {};
  const mode = summary.modes?.length ? {} : protectedMode(exactEntries, histogram, bins);
  return { ...summary, q1: summary.q1 ?? quantile(.25), median: summary.median ?? quantile(.5),
    q3: summary.q3 ?? quantile(.75), ...extrema, ...mode, estimatedQuantiles: true,
    note: appendNote(summary, [
      "Quartiles are estimated from protected frequency counts.",
      Object.keys(extrema).length && "Supported range combines released extrema with bins whose counts exceed a simultaneous 97.5% noise bound. This range can miss rare values and does not estimate the true sample minimum or maximum.",
      mode.modeBand && "Estimated mode is a value range.",
      mode.modes?.length && "The numerical mode is estimated.",
    ].filter(Boolean).join(" ")) };
}

function groupedQuantile(bins, boundaries, rank) {
  let cumulative = 0;
  for (let index = 0; index < bins.length; index++) {
    const count = bins[index];
    if (count && cumulative + count >= rank) {
      const fraction = (rank - cumulative) / count;
      return boundaries[index] + fraction * (boundaries[index + 1] - boundaries[index]);
    }
    cumulative += count;
  }
  return boundaries.at(-1);
}

function supportedRange(parts, histogram) {
  const range = parts.filter(({ feature }) => feature?.count > 0).flatMap(({ feature }) => [feature.min, feature.max])
    .filter(Number.isFinite);
  const radius = simultaneousNoiseRadius(histogram.variances, histogram.cells.length);
  histogram.cells.forEach((count, index) => {
    if (count <= radius) return;
    range.push(histogram.scores?.[index] ?? histogram.lowerEdges[index],
      histogram.scores?.[index] ?? histogram.upperEdges[index]);
  });
  return range.length ? { supportedMin: Math.min(...range), supportedMax: Math.max(...range) } : {};
}

function protectedMode(exactEntries, histogram, bins) {
  const { boundaries, scores, binNoise } = histogram;
  if (scores) {
    const frequencies = new Map(scores.map((score, index) => [score, bins[index]]));
    exactEntries.forEach(([value, count]) => frequencies.set(value, (frequencies.get(value) || 0) + count));
    const [first, second] = [...frequencies].sort((a, b) => b[1] - a[1]);
    if (!first || first[1] <= 3 * binNoise || (second && first[1] - second[1] <= 3 * binNoise)) return {};
    return {modes:[first[0]], modeFrequency:first[1]};
  }
  const counts = [...bins];
  for (const [value, count] of exactEntries) {
    const index = boundaries.slice(1, -1).findIndex(edge => edge > value);
    counts[index < 0 ? counts.length - 1 : index] += count;
  }
  const [first, second] = counts.map((count, index) => ({ count, index })).sort((a, b) => b.count - a.count);
  if (first.count <= 3 * binNoise || (second && first.count - second.count <= 3 * binNoise)) return {};
  const modeFrequency = first.count;
  return scores ? { modes: [scores[first.index]], modeFrequency }
    : { modeBand: `${boundaries[first.index]}–${boundaries[first.index + 1]}`, modeFrequency };
}

function needsProtectedDistribution({ withheld, feature }) {
  return withheld || (feature?.count > 0 && !completeNumericalFrequencies(feature));
}

function combinedNumerical(histogram, exact, summary) {
  const { cells, count, labels, boundaries, binNoise } = histogram;
  const bins = count ? numericalBins(cells, count, binNoise) ?? (exact.length ? projectedCounts(cells, count) : null)
    : cells.map(() => 0);
  if (!bins) return { ...summary, note: "Estimated count only. The numerical bin counts are too close to the privacy noise to estimate the distribution." };
  const moments = poolMoments(count ? [...exact, numericalEstimates(labels, bins, count)] : exact);
  if (!moments || exact.some(part => !Number.isFinite(part.min) || !Number.isFinite(part.max))) {
    return { ...summary, unavailable: "Incomplete numerical summaries" };
  }
  const fixed = {
    count: summary.count - count,
    sum: exact.reduce((sum, part) => sum + part.mean * part.count, 0),
    min: Math.min(...exact.map(part => part.min)),
    max: Math.max(...exact.map(part => part.max)),
  };
  const interval = approximateMeanInterval(cells, histogram, fixed);
  const lowPrecision = interval.meanCiUpper - interval.meanCiLower >=
    (Math.max(boundaries.at(-1), fixed.max) - Math.min(boundaries[0], fixed.min)) / 2;
  const { stdDev, sumCubedDeviations, sumFourthDeviations } = moments;
  const complete = exact.every(completeNumericalFrequencies);
  const entries = complete ? [...labels.map((label, index) => [label, bins[index]]),
    ...exact.flatMap(part => part.valueCounts.map(({ value, count }) => [value, count]))]
    .filter(([, frequency]) => frequency > 0).sort((a, b) => a[0] - b[0]) : [];
  const quantile = probability => frequencyQuantile(entries, summary.count, probability);
  const note = [
    summary.note,
    exact.length && "The mean interval includes binning, privacy noise and sampling uncertainty under independent observations.",
    lowPrecision && "Low precision: the mean interval covers at least half of the configured range.",
    "Estimated skewness and kurtosis are sensitive to noise in tail counts and should be treated as exploratory.",
  ].filter(Boolean).join(" ");
  return { ...summary, ...moments, ...interval, lowPrecision, note,
    sampleStdDev: sampleStandardDeviation(summary.count, stdDev),
    skewness: adjustedSkewness(summary.count, stdDev, sumCubedDeviations),
    kurtosis: adjustedKurtosis(summary.count, stdDev, sumFourthDeviations),
    ...(complete ? { q1: quantile(.25), median: quantile(.5), q3: quantile(.75) } : {}) };
}

function combinedCategories(histogram, exact, summary) {
  const { cells, count, labels } = histogram;
  const counts = new Map();
  for (const part of exact) {
    const entries = Object.entries(part.categoryCounts || {});
    if (entries.some(([, value]) => !Number.isSafeInteger(value) || value < 0)
      || entries.reduce((sum, [, value]) => sum + value, 0) !== part.count) {
      return { ...summary, unavailable: "Incomplete distribution in the returned summaries" };
    }
    entries.filter(([, value]) => value > 0).forEach(([label, value]) => counts.set(label, (counts.get(label) || 0) + value));
  }
  const radius = simultaneousNoiseRadius(histogram.variances, cells.length);
  if (count) projectedCounts(cells, count).forEach((value, index) => {
    if (index === histogram.otherIndex) return;
    const label = labels[index];
    if (value > 0 && (counts.has(label) || cells[index] > radius)) counts.set(label, (counts.get(label) || 0) + value);
  });
  const categories = categoryFrequencies(counts, summary.count);
  if (!categories.length) return { ...summary,
    note: "Estimated count only. The individual category counts are too close to the privacy noise to rank." };
  return { ...summary, categories, cardinality: categories.length,
    note: `${exact.length ? MIXED_NOTES : "Privacy-protected estimate."} Categories supported only by estimated counts must exceed a simultaneous 97.5% noise bound. The number of supported categories is estimated. Rare categories may be omitted or introduced by noise. Unlisted category totals are excluded from mode rankings. Percentages use the full estimated non-missing count; near ties can change rank.` };
}

export function buildApproximateSummary(group, releases, exact = [], totalSources = group.members.length) {
  const histogram = histogramFor(group, releases);
  const identity = { featureName: group.label, type: group.type, approximate: true };
  if (!histogram) {
    const failure = group.members.map(member => releases.get(sourceKey(member))?.unavailable).find(Boolean);
    const missingFeature = group.members.some(member => {
      const release = releases.get(sourceKey(member));
      return release?.features && !Object.hasOwn(release.features, member.column);
    });
    return { ...identity, includedSources: exact.length, totalSources,
      unavailable: failure || (missingFeature ? "The saved protected release does not include this feature."
        : "Statistics unavailable for the selected datasets or feature interpretation.") };
  }
  if (exact.some(part => !Number.isSafeInteger(part.count) || part.count < 0
    || !Number.isSafeInteger(part.missingValuesCount) || part.missingValuesCount < 0)) {
    return { ...identity, includedSources: exact.length, totalSources, unavailable: "Incomplete counts in the returned summaries" };
  }
  const count = exact.reduce((sum, part) => sum + part.count, histogram.count);
  const missing = exact.reduce((sum, part) => sum + part.missingValuesCount, histogram.missing);
  if (!Number.isSafeInteger(count + missing)) {
    return { ...identity, includedSources: exact.length, totalSources, unavailable: "Invalid pooled count" };
  }
  const summary = { ...identity, count, missing, percentMissing: count + missing ? 100 * missing / (count + missing) : null,
    includedSources: group.members.length + exact.length, totalSources, note: exact.length ? MIXED_NOTES : NOTES };
  if (count <= 3 * histogram.countNoise) {
    return { ...summary, note: COUNT_ONLY };
  }
  if (group.type === "date") {
    const parts = exact.map(numericalDateFeature);
    return parts.some(part => !part) ? {...summary, unavailable:"Incomplete date distribution"}
      : formatProtectedDates(combinedNumerical(histogram, parts, summary));
  }
  return group.type === "continuous" ? combinedNumerical(histogram, exact, summary) : combinedCategories(histogram, exact, summary);
}

export function protectedPoolingMembers(groups, results) {
  const sources = new Map(results.map(source => [sourceKey(source), source]));
  return new Map(groups.flatMap(group => {
    const parts = poolingContributions(group, sources);
    return parts.every(part => part.feature || part.empty || part.withheld)
      ? parts.filter(part => needsProtectedMoments(part, group.type) || (group.type === "continuous" && needsProtectedDistribution(part)))
        .map(({ member }) => [sourceKey(member), member]) : [];
  }));
}

export async function loadApproximatePooling(members, nodes, filtersFor, signal) {
  const responses = await Promise.all([...members].map(async ([key, member]) => {
    const node = nodes.find(item => String(item.nodeId) === String(member.nodeId));
    if (!node?.serviceUrl) return [key, null];
    const filters = filtersFor(member);
    if (!filters) return [key, null];
    try {
      return [key, await getApproximatePoolingSource(member.fileName, filters, node.serviceUrl, signal)];
    } catch (error) {
      if (signal?.aborted) throw error;
      const detail = error?.response?.data?.detail;
      return [key, {unavailable:typeof detail === "string" ? detail : "Protected statistics could not be requested."}];
    }
  }));
  return new Map(responses);
}
