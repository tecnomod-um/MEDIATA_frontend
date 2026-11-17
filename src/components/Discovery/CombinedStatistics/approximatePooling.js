import { getApproximatePoolingSource } from "../../../util/petitionHandler";
import { sourceKey } from "./combinedStatistics";
import { adjustedKurtosis, adjustedSkewness, sampleStandardDeviation } from "./numericalSummary";
import { approximateMeanInterval } from "./approximateMeanInterval";

const MAX_WIRE_COUNT = 1_000_000_000;
const UNIFORM_VARIANCES = [4, 24, 112];
const FEATURE_VARIANCES = [...UNIFORM_VARIANCES, 20 / 9, 80 / 9];
const NOTES = "Privacy-protected estimate. Counts include random noise. Numerical values use configured ranges. The mean interval includes binning, privacy noise and sampling uncertainty under independent observations. Exact extrema are unavailable.";
const COUNT_ONLY = "Estimated count only. The cohort is too small relative to the privacy noise to estimate the other statistics.";

function validCounts(cells, length) {
  return Array.isArray(cells) && cells.length === length
    && cells.every(count => Number.isSafeInteger(count) && Math.abs(count) <= MAX_WIRE_COUNT);
}

function histogramVariance(source, feature) {
  if (source?.version === 1 && UNIFORM_VARIANCES.includes(source.noiseVariance)) return source.noiseVariance;
  if (source?.version === 2 && FEATURE_VARIANCES.includes(feature?.noiseVariance)) return feature.noiseVariance;
  return null;
}

function estimateGroupTotal(source, referenceVariance) {
  let precision = 0, weightedTotal = 0;
  for (const feature of Object.values(source.features)) {
    const length = feature?.domain?.boundaries?.length
      ?? (Array.isArray(feature?.domain?.categories) ? feature.domain.categories.length + 2 : 0);
    const variance = histogramVariance(source, feature);
    if (variance === null || length < 2 || length > 66 || !validCounts(feature.counts, length)) continue;
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
    return { source, cell, variance: histogramVariance(source, cell) };
  });
  const first = pieces[0]?.cell;
  if (!first || pieces.some(({ source, cell, variance }) => !cell
    || typeof source.group !== "string" || source.group !== pieces[0].source.group
    || variance === null)) return null;
  const boundaries = first.domain?.boundaries;
  const categories = first.domain?.categories;
  const numeric = group.type === "continuous" && Array.isArray(boundaries) && boundaries.length >= 2
    && boundaries.length <= 65 && boundaries.every((edge, index) => Number.isFinite(edge) && Math.abs(edge) <= 1e9
      && (!index || edge > boundaries[index - 1]));
  const categorical = group.type === "categorical" && Array.isArray(categories) && categories.length
    && categories.length <= 64 && categories.every(label => typeof label === "string" && label !== "Other")
    && new Set(categories).size === categories.length;
  if (!numeric && !categorical) return null;
  const labels = numeric ? boundaries.slice(1).map((edge, index) => (boundaries[index] + edge) / 2) : [...categories, "Other"];
  const length = labels.length + 1;
  const domain = JSON.stringify(numeric ? boundaries : categories);
  if (pieces.some(({ cell }) => JSON.stringify(numeric ? cell.domain?.boundaries : cell.domain?.categories) !== domain
    || !validCounts(cell.counts, length))) return null;
  const variances = pieces.map(({ variance }) => variance);
  const binNoise = Math.sqrt(variances.reduce((sum, variance) => sum + variance, 0));
  const totals = pieces.map(({ source, variance }) => estimateGroupTotal(source, variance));
  // The feature's missing cell also contributes to its site's estimated total.
  const countVariance = totals.reduce((sum, total, index) =>
    sum + variances[index] + total.variance * (1 - 2 / length), 0);
  const missing = pieces.reduce((sum, { cell }) => sum + cell.counts.at(-1), 0);
  return {
    labels, boundaries,
    cells: labels.map((_, index) => pieces.reduce((sum, { cell }) => sum + cell.counts[index], 0)),
    count: Math.max(0, Math.round(totals.reduce((sum, total) => sum + total.total, 0) - missing)),
    missing: Math.max(0, missing),
    variances, binNoise, countNoise: Math.sqrt(countVariance),
  };
}

function numericalEstimates(labels, bins, count) {
  const mean = labels.reduce((sum, label, index) => sum + label * bins[index], 0) / count;
  const central = power => labels.reduce((sum, label, index) => sum + bins[index] * (label - mean) ** power, 0);
  const stdDev = Math.sqrt(central(2) / count);
  const valueAt = rank => {
    let remaining = rank;
    for (let index = 0; index < bins.length; index++) {
      if (remaining < bins[index]) return labels[index];
      remaining -= bins[index];
    }
    return labels.at(-1);
  };
  const percentile = probability => {
    const index = (count - 1) * probability;
    const lower = Math.floor(index);
    const value = valueAt(lower);
    return value + (index - lower) * (valueAt(Math.ceil(index)) - value);
  };
  return { mean, stdDev, sampleStdDev: sampleStandardDeviation(count, stdDev),
    q1: percentile(.25), median: percentile(.5), q3: percentile(.75),
    skewness: adjustedSkewness(count, stdDev, central(3)), kurtosis: adjustedKurtosis(count, stdDev, central(4)) };
}

export function buildApproximateSummary(group, releases) {
  const histogram = histogramFor(group, releases);
  const identity = { featureName: group.label, type: group.type, approximate: true };
  if (!histogram) return { ...identity, includedSources: 0, totalSources: group.members.length,
    unavailable: "Approximate pooling needs the same numeric cluster filter and compatible features at each dataset" };
  const { cells, count, missing, labels, boundaries, variances, binNoise, countNoise } = histogram;
  const summary = { ...identity, count, missing, percentMissing: count + missing ? 100 * missing / (count + missing) : null,
    includedSources: group.members.length, totalSources: group.members.length, note: NOTES };
  if (count <= 3 * countNoise) {
    return { ...summary, note: COUNT_ONLY };
  }
  if (group.type === "continuous") {
    const bins = numericalBins(cells, count, binNoise);
    if (!bins) return { ...summary, note: "Estimated count only. The numerical bin counts are too close to the privacy noise to estimate the distribution." };
    const interval = approximateMeanInterval(cells, boundaries, variances);
    const wide = interval.meanCiUpper - interval.meanCiLower >= (boundaries.at(-1) - boundaries[0]) / 2;
    const note = wide ? `${NOTES} Low precision: the mean interval covers at least half of the configured range.` : NOTES;
    return { ...summary, ...numericalEstimates(labels, bins, count), ...interval, lowPrecision: wide, note };
  }
  const bins = projectedCounts(cells, count);
  const categories = labels.map((value, index) => ({ value, count: bins[index], percent: 100 * bins[index] / count }))
    .filter((category, index) => category.count > 0 && cells[index] > 2 * binNoise)
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  if (!categories.length) return { ...summary,
    note: "Estimated count only. The individual category counts are too close to the privacy noise to rank." };
  return { ...summary, categories, cardinality: categories.length,
    note: "Privacy-protected estimate. Only categories with counts above the noise threshold are shown. Percentages use the full estimated non-missing count; near ties can change rank." };
}

export async function loadApproximatePooling(groups, nodes, filtersFor, signal) {
  const members = new Map(groups.flatMap(group => group.members.map(member => [sourceKey(member), member])));
  const responses = await Promise.all([...members].map(async ([key, member]) => {
    const node = nodes.find(item => String(item.nodeId) === String(member.nodeId));
    if (!node?.serviceUrl) return [key, null];
    const filters = filtersFor(member);
    if (!filters) return [key, null];
    try {
      return [key, await getApproximatePoolingSource(member.fileName, filters, node.serviceUrl, signal)];
    } catch (error) {
      if (signal?.aborted) throw error;
      return [key, null];
    }
  }));
  return new Map(responses);
}
