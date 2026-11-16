import { getApproximatePoolingSource } from "../../../util/petitionHandler";
import { sourceKey } from "./combinedStatistics";
import { adjustedKurtosis, adjustedSkewness, sampleStandardDeviation } from "./numericalSummary";
import { approximateMeanInterval } from "./approximateMeanInterval";

const MAX_WIRE_COUNT = 1_000_000_000;
const NOTES = "Privacy-protected estimate. Counts include random noise. Numerical values use configured ranges. The mean interval includes binning, privacy noise and sampling uncertainty under independent observations. Exact extrema are unavailable.";

function validCounts(cells, length) {
  return Array.isArray(cells) && cells.length === length
    && cells.every(count => Number.isSafeInteger(count) && Math.abs(count) <= MAX_WIRE_COUNT);
}

function estimateGroupTotal(source) {
  let precision = 0, weightedTotal = 0;
  for (const feature of Object.values(source.features)) {
    const length = feature?.domain?.boundaries?.length
      ?? (Array.isArray(feature?.domain?.categories) ? feature.domain.categories.length + 2 : 0);
    if (length < 2 || length > 66 || !validCounts(feature.counts, length)) continue;
    // Each histogram includes a missing-value cell, so all estimate the same group size.
    precision += 1 / length;
    weightedTotal += feature.counts.reduce((sum, count) => sum + count, 0) / length;
  }
  return { total: weightedTotal / precision, variance: source.noiseVariance / precision };
}

function projectedCounts(cells, total) {
  if (!total) return cells.map(() => 0);
  // Project the signed frequencies onto nonnegative counts that add to the noisy total.
  const ordered = [...cells].sort((a, b) => b - a);
  let sum = 0, threshold = 0;
  for (let index = 0; index < ordered.length; index++) {
    sum += ordered[index];
    const candidate = (sum - total) / (index + 1);
    if (ordered[index] <= candidate) break;
    threshold = candidate;
  }
  const weights = cells.map(cell => Math.max(0, cell - threshold));
  const rounded = weights.map(Math.floor);
  const order = weights.map((weight, index) => ({ index, fraction: weight - rounded[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remainder = total - rounded.reduce((count, value) => count + value, 0);
  order.slice(0, remainder).forEach(({ index }) => rounded[index]++);
  return rounded;
}

function histogramFor(group, sources) {
  const pieces = group.members.map(member => {
    const source = sources.get(sourceKey(member));
    return { source, cell: source?.features?.[member.column] };
  });
  const first = pieces[0]?.cell;
  if (!first || pieces.some(({ source, cell }) => source?.version !== 1 || !cell
    || typeof source.group !== "string" || source.group !== pieces[0].source.group
    || ![4, 24, 112].includes(source.noiseVariance))) return null;
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
  const variances = pieces.map(({ source }) => source.noiseVariance);
  const totals = pieces.map(({ source }) => estimateGroupTotal(source));
  const missing = pieces.reduce((sum, { cell }) => sum + cell.counts.at(-1), 0);
  return {
    labels, boundaries,
    cells: labels.map((_, index) => pieces.reduce((sum, { cell }) => sum + cell.counts[index], 0)),
    count: Math.max(0, Math.round(totals.reduce((sum, total) => sum + total.total, 0) - missing)),
    missing: Math.max(0, missing),
    variances, countNoise: Math.sqrt(totals.reduce((sum, total, index) => sum + total.variance + variances[index], 0)),
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
  const { cells, count, missing, labels, boundaries, variances, countNoise } = histogram;
  const summary = { ...identity, count, missing, percentMissing: count + missing ? 100 * missing / (count + missing) : null,
    includedSources: group.members.length, totalSources: group.members.length, note: NOTES };
  if (count <= 3 * countNoise) {
    return { ...summary, note: "Estimated count only. The cohort is too small relative to the privacy noise to estimate the other statistics." };
  }
  const bins = projectedCounts(cells, count);
  if (group.type === "continuous") return { ...summary, ...numericalEstimates(labels, bins, count),
    ...approximateMeanInterval(cells, boundaries, variances) };
  const categories = labels.map((value, index) => ({ value, count: bins[index], percent: 100 * bins[index] / count }))
    .filter(category => category.count > 0)
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return { ...summary, categories, cardinality: categories.length,
    note: "Privacy-protected estimate. Category counts include random noise; near ties and rare categories can change rank." };
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
