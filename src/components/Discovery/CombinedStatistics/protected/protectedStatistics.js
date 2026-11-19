/**
 * Privacy-protected statistical estimation from released noisy distributions.
 * Noise generation, release caching and privacy accounting belong to the node.
 * These estimators postprocess its output; they do not make exact Discovery
 * outputs differentially private or enforce privacy across dataset versions.
 */
import { categoryFrequencies, completeNumericalFrequencies, poolMoments, sourceKey } from "../exact/combinedStatistics";
import { frequencyQuantile } from "../exact/frequencyQuantile";
import { needsProtectedDistribution } from "../poolingContributions";
import { protectedHistogram } from "./protectedHistogram";
import { adjustedKurtosis, adjustedSkewness, sampleStandardDeviation } from "../exact/numericalSummary";
import { approximateMeanInterval } from "./approximateMeanInterval";
import { simultaneousNoiseRadius } from "./geometricNoise";
import { numericalDateFeature, formatProtectedDates } from "./protectedDateSummary";
import { supportedVariation } from "./protectedShapeStatistics";
import { fitProtectedCounts } from "./protectedDistributionFit";
import { APPROVED_QUARTILES_NOTE } from "../exact/approvedQuartiles";
import { geometricMeanInterval } from "./geometricMeanInterval";

const NOTES =
  "Privacy-protected estimate. Counts include random noise. Numerical values use the node's published domains. The mean interval includes binning, privacy noise and sampling uncertainty for independent observations assumed to lie within the published bounds.";
const COUNT_ONLY =
  "No positive non-missing count could be established from the protected release. Point statistics are undefined for an empty reconstruction.";
const MIXED_NOTES = "Privacy-protected pooled estimate.";

function numericalEstimates(labels, bins, count) {
  const mean = labels.reduce((sum, label, index) => sum + label * bins[index], 0) / count;
  const central = (power) => labels.reduce((sum, label, index) => sum + bins[index] * (label - mean) ** power, 0);
  return {
    count,
    mean,
    stdDev: Math.sqrt(central(2) / count),
    sumCubedDeviations: central(3),
    sumFourthDeviations: central(4),
  };
}

function appendNote(summary, note) {
  return [summary.note, note].filter(Boolean).join(" ");
}

function releasePrivacyNote(group, releases) {
  const costs = group.members
    .map((member) => releases.get(sourceKey(member))?.rowEpsilon)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!costs.length) return "";
  const low = Math.min(...costs).toFixed(3),
    high = Math.max(...costs).toFixed(3);
  const secure = group.members.some((member) => member.nodeId === "secure-pool");
  return `Cumulative protected-histogram privacy cost (${secure ? "epsilon summed across participating dataset versions" : "epsilon per dataset version"}): ${low === high ? low : `${low} to ${high}`}. Higher values mean weaker row privacy; metadata and exact endpoints are outside this accounting.`;
}

export function addProtectedDistribution(group, parts, releases, summary) {
  if (
    group.type !== "continuous" ||
    summary.unavailable ||
    (summary.q1 != null &&
      !summary.approximate &&
      (summary.modes?.length || summary.modeStatus === "No repeated value")) ||
    !Number.isSafeInteger(summary.count) ||
    !summary.count
  )
    return summary;
  const selected = parts.filter(needsProtectedDistribution);
  if (!selected.length) return summary;
  const histogram = protectedHistogram({ ...group, members: selected.map((part) => part.member) }, releases);
  if (!histogram) return summary;
  const approved = parts.filter(({ feature }) => feature && completeNumericalFrequencies(feature));
  const exactEntries = approved.flatMap(({ feature }) => feature.valueCounts.map(({ value, count }) => [value, count]));
  const count = summary.count - exactEntries.reduce((total, [, frequency]) => total + frequency, 0);
  if (count < 0) return summary;
  const bins = count ? fitProtectedCounts(histogram.cells, count, histogram.support) : histogram.cells.map(() => 0);
  if (!bins) return summary;
  const entries = [...exactEntries, ...histogram.labels.map((value, index) => [value, bins[index]])]
    .filter(([, frequency]) => frequency > 0)
    .sort((a, b) => a[0] - b[0]);
  const quantile = (probability) =>
    histogram.scores || exactEntries.length
      ? frequencyQuantile(entries, summary.count, probability)
      : groupedQuantile(bins, histogram.boundaries, probability * summary.count);
  const withheld = selected.filter((part) => part.withheld);
  const protectedRange =
    withheld.length === selected.length
      ? histogram
      : summary.approximate && protectedHistogram({ ...group, members: withheld.map((part) => part.member) }, releases);
  const extrema = summary.approximate && protectedRange ? supportedRange(parts, protectedRange) : {};
  const mode = summary.modes?.length ? {} : protectedMode(exactEntries, histogram, bins);
  const previous =
    summary.quantileMethod === "released-histogram-bounds"
      ? { ...summary, note: (summary.note || "").replace(APPROVED_QUARTILES_NOTE, "").trim() }
      : summary;
  const replace = summary.quantileMethod === "released-histogram-bounds";
  const estimatesQuantiles =
    replace || summary.approximate || summary.q1 == null || summary.median == null || summary.q3 == null;
  return {
    ...summary,
    q1: replace ? quantile(0.25) : (summary.q1 ?? quantile(0.25)),
    median: replace ? quantile(0.5) : (summary.median ?? quantile(0.5)),
    q3: replace ? quantile(0.75) : (summary.q3 ?? quantile(0.75)),
    ...extrema,
    ...mode,
    estimatedQuantiles: Boolean(summary.estimatedQuantiles || estimatesQuantiles),
    estimatedMode: Object.keys(mode).length > 0,
    quantileMethod: "protected-frequencies",
    quantileBounds: undefined,
    note: appendNote(
      previous,
      [
        estimatesQuantiles && "Quartiles are estimated from protected frequency counts.",
        Object.keys(extrema).length &&
          "Supported range combines released extrema with bins whose counts exceed a simultaneous 97.5% noise bound. This range can miss rare values and does not estimate the true sample minimum or maximum.",
        mode.modeBand && "Estimated mode is a value range.",
        mode.modes?.length && "The numerical mode is estimated; near ties can change its rank.",
        mode.modeStatus === "No repeated value" &&
          "The reconstructed sample has no repeated value; its numerical mode is undefined.",
        releasePrivacyNote({ ...group, members: selected.map((part) => part.member) }, releases),
      ]
        .filter(Boolean)
        .join(" "),
    ),
  };
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
  const range = parts
    .filter(({ feature }) => feature?.count > 0)
    .flatMap(({ feature }) => [feature.min, feature.max])
    .filter(Number.isFinite);
  const radius = simultaneousNoiseRadius(histogram.variances, histogram.cells.length);
  histogram.cells.forEach((count, index) => {
    if (count <= radius) return;
    range.push(
      histogram.scores?.[index] ?? histogram.lowerEdges[index],
      histogram.scores?.[index] ?? histogram.upperEdges[index],
    );
  });
  return range.length ? { supportedMin: Math.min(...range), supportedMax: Math.max(...range) } : {};
}

function protectedMode(exactEntries, histogram, bins) {
  const { boundaries, scores, binNoise } = histogram;
  let candidates;
  if (scores) {
    const frequencies = new Map(scores.map((score, index) => [score, bins[index]]));
    exactEntries.forEach(([value, count]) => frequencies.set(value, (frequencies.get(value) || 0) + count));
    candidates = [...frequencies].map(([value, count]) => ({ value, count }));
  } else {
    const counts = [...bins];
    exactEntries.forEach(([value, count]) => {
      const index = boundaries.slice(1, -1).findIndex((edge) => edge > value);
      counts[index < 0 ? counts.length - 1 : index] += count;
    });
    candidates = counts.map((count, index) => ({ value: index, count }));
  }
  candidates.sort((a, b) => b.count - a.count || a.value - b.value);
  const first = candidates[0],
    second = candidates[1];
  if (!first || first.count <= 1) return { modes: [], modeFrequency: null, modeStatus: "No repeated value" };
  const uncertain = first.count <= 3 * binNoise || (second && first.count - second.count <= 3 * binNoise);
  return scores
    ? {
        modes: candidates.filter((part) => part.count === first.count).map((part) => part.value),
        modeFrequency: first.count,
        modeStatus: uncertain ? "Estimated; ranking sensitive to noise" : "Estimated",
      }
    : {
        modeBand: `${boundaries[first.value]}\u2013${boundaries[first.value + 1]}`,
        modeFrequency: first.count,
        modeStatus: uncertain ? "Estimated; ranking sensitive to noise" : "Estimated",
      };
}

function combinedNumerical(histogram, exact, summary) {
  const { cells, count, labels, boundaries } = histogram;
  const bins = count ? fitProtectedCounts(cells, count, histogram.support) : cells.map(() => 0);
  if (!bins)
    return {
      ...summary,
      lowPrecision: true,
      note: "Estimated count only. The numerical bin counts are too close to the privacy noise to estimate the distribution.",
    };
  const moments = poolMoments(count ? [...exact, numericalEstimates(labels, bins, count)] : exact);
  if (!moments || exact.some((part) => !Number.isFinite(part.min) || !Number.isFinite(part.max))) {
    return { ...summary, unavailable: "Incomplete numerical summaries" };
  }
  const fixed = {
    count: summary.count - count,
    sum: exact.reduce((sum, part) => sum + part.mean * part.count, 0),
    min: Math.min(...exact.map((part) => part.min)),
    max: Math.max(...exact.map((part) => part.max)),
  };
  const rawInterval = histogram.supportedReconstruction
    ? geometricMeanInterval(cells, histogram, fixed)
    : approximateMeanInterval(cells, histogram, fixed);
  const interval = {
    meanCiLower: Math.min(rawInterval.meanCiLower, moments.mean),
    meanCiUpper: Math.max(rawInterval.meanCiUpper, moments.mean),
  };
  const lowPrecision =
    summary.lowPrecision ||
    interval.meanCiUpper - interval.meanCiLower >=
      (Math.max(boundaries.at(-1), fixed.max) - Math.min(boundaries[0], fixed.min)) / 2;
  const { stdDev, sumCubedDeviations, sumFourthDeviations } = moments;
  const shapeSupported = supportedVariation(histogram, exact);
  const complete = exact.every(completeNumericalFrequencies);
  const entries = complete
    ? [
        ...labels.map((label, index) => [label, bins[index]]),
        ...exact.flatMap((part) => part.valueCounts.map(({ value, count }) => [value, count])),
      ]
        .filter(([, frequency]) => frequency > 0)
        .sort((a, b) => a[0] - b[0])
    : [];
  const quantile = (probability) => frequencyQuantile(entries, summary.count, probability);
  const note = [
    summary.note,
    histogram.support &&
      "The numerical reconstruction retains bins supported at a 5% false-discovery rate under the declared noise model; rare values may be omitted, so estimated extrema and shape are exploratory.",
    exact.length &&
      "The mean interval includes binning, privacy noise and sampling uncertainty for independent observations assumed to lie within the published bounds.",
    lowPrecision && "Low precision: the protected count is small relative to its noise or the mean interval is wide.",
    shapeSupported
      ? "Estimated skewness and kurtosis are sensitive to noise in tail counts and should be treated as exploratory."
      : "Skewness and kurtosis describe the reconstruction only; variation is not distinguishable from privacy noise, so nonzero shape estimates are unreliable.",
    (summary.count < 4 || stdDev === 0) &&
      "Sample SD needs two observations, skewness three and kurtosis four; zero reconstructed variance leaves shape statistics undefined.",
  ]
    .filter(Boolean)
    .join(" ");
  const minima = (histogram.supportedReconstruction ? histogram.lowerEdges : labels).filter(
    (_, index) => bins[index] > 0,
  );
  const maxima = (histogram.supportedReconstruction ? histogram.upperEdges : labels).filter(
    (_, index) => bins[index] > 0,
  );
  return {
    ...summary,
    ...moments,
    ...interval,
    lowPrecision,
    note:
      note +
      " Min and max are estimated endpoints of the reconstructed distribution; noise may omit or introduce extreme values.",
    ...(minima.length || exact.length
      ? {
          min: Math.min(...minima, ...exact.map((part) => part.min)),
          max: Math.max(...maxima, ...exact.map((part) => part.max)),
          estimatedExtrema: true,
        }
      : {}),
    sampleStdDev: sampleStandardDeviation(summary.count, stdDev),
    skewness: adjustedSkewness(summary.count, stdDev, sumCubedDeviations),
    kurtosis: adjustedKurtosis(summary.count, stdDev, sumFourthDeviations),
    ...(complete ? { q1: quantile(0.25), median: quantile(0.5), q3: quantile(0.75) } : {}),
  };
}

function combinedCategories(histogram, exact, summary) {
  const { cells, count, labels } = histogram;
  const counts = new Map();
  for (const part of exact) {
    const entries = Object.entries(part.categoryCounts || {});
    if (
      entries.some(([, value]) => !Number.isSafeInteger(value) || value < 0) ||
      entries.reduce((sum, [, value]) => sum + value, 0) !== part.count
    ) {
      return { ...summary, unavailable: "Incomplete distribution in the returned summaries" };
    }
    entries
      .filter(([, value]) => value > 0)
      .forEach(([label, value]) => counts.set(label, (counts.get(label) || 0) + value));
  }
  const radius = simultaneousNoiseRadius(histogram.variances, cells.length);
  if (count)
    fitProtectedCounts(cells, count).forEach((value, index) => {
      if (index === histogram.otherIndex) return;
      const label = labels[index];
      if (value > 0) counts.set(label, (counts.get(label) || 0) + value);
    });
  const categories = categoryFrequencies(counts, summary.count);
  if (!categories.length)
    return {
      ...summary,
      lowPrecision: true,
      note: "Estimated count only. The individual category counts are too close to the privacy noise to rank.",
    };
  const lowPrecision = summary.lowPrecision || (categories[1] && categories[0].count - categories[1].count <= radius);
  return {
    ...summary,
    lowPrecision: Boolean(lowPrecision),
    categories,
    cardinality: categories.length,
    note: `${exact.length ? MIXED_NOTES : "Privacy-protected estimate."} Category frequencies and cardinality are estimated from a nonnegative reconstruction of protected counts. Rare categories may be omitted or introduced by noise. Unlisted category totals are excluded from mode rankings. Percentages use the full estimated non-missing count; near ties can change rank.`,
  };
}

export function buildApproximateSummary(group, releases, exact = [], totalSources = group.members.length) {
  const histogram = protectedHistogram(group, releases);
  const identity = { featureName: group.label, type: group.type, approximate: true };
  if (!histogram) {
    const failure = group.members.map((member) => releases.get(sourceKey(member))?.unavailable).find(Boolean);
    const missingFeature = group.members.some((member) => {
      const release = releases.get(sourceKey(member));
      return release?.features && !Object.hasOwn(release.features, member.column);
    });
    return {
      ...identity,
      includedSources: exact.length,
      totalSources,
      unavailable:
        failure ||
        (missingFeature
          ? "The saved protected release does not include this feature."
          : "Statistics unavailable for the selected datasets or feature interpretation."),
    };
  }
  if (
    exact.some(
      (part) =>
        !Number.isSafeInteger(part.count) ||
        part.count < 0 ||
        !Number.isSafeInteger(part.missingValuesCount) ||
        part.missingValuesCount < 0,
    )
  ) {
    return {
      ...identity,
      includedSources: exact.length,
      totalSources,
      unavailable: "Incomplete counts in the returned summaries",
    };
  }
  const count = exact.reduce((sum, part) => sum + part.count, histogram.count);
  const missing = exact.reduce((sum, part) => sum + part.missingValuesCount, histogram.missing);
  if (!Number.isSafeInteger(count + missing)) {
    return { ...identity, includedSources: exact.length, totalSources, unavailable: "Invalid pooled count" };
  }
  const summary = {
    ...identity,
    lowPrecision: count <= 3 * histogram.countNoise,
    count,
    missing,
    percentMissing: count + missing ? (100 * missing) / (count + missing) : null,
    includedSources: group.members.length + exact.length,
    totalSources,
    note: [exact.length ? MIXED_NOTES : NOTES, releasePrivacyNote(group, releases)].filter(Boolean).join(" "),
  };
  if (count === 0) {
    return { ...summary, lowPrecision: true, note: COUNT_ONLY };
  }
  if (group.type === "date") {
    const parts = exact.map(numericalDateFeature);
    return parts.some((part) => !part)
      ? { ...summary, unavailable: "Incomplete date distribution" }
      : formatProtectedDates(combinedNumerical(histogram, parts, summary));
  }
  return group.type === "continuous"
    ? combinedNumerical(histogram, exact, summary)
    : combinedCategories(histogram, exact, summary);
}
