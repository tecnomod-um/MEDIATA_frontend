// Validate and align already released noisy counts, then reconcile their totals.
// This module never requests patient data or samples additional privacy noise.
import { sourceKey } from "../exact/combinedStatistics";
import { numericalDomain, alignNumericalHistograms, alignCategoricalHistograms } from "./protectedHistogramDomains";
import { noiseCellCount, coherentFeatureCounts } from "./protectedCohortCounts";
import { supportedBins } from "./protectedSupport";

const MAX_WIRE_COUNT = 1_000_000_000;

function validCounts(cells, length) {
  return (
    Array.isArray(cells) &&
    cells.length === length &&
    cells.every((count) => Number.isSafeInteger(count) && Math.abs(count) <= MAX_WIRE_COUNT)
  );
}

function histogramVariance(source, feature) {
  if (![1, 2, 3, 4, 5].includes(source?.version)) return null;
  const variance = source.version === 1 ? source.noiseVariance : feature?.noiseVariance;
  if (!Number.isFinite(variance) || variance <= 0 || variance > MAX_WIRE_COUNT) return null;
  if (
    feature?.noiseComponents != null &&
    (!Array.isArray(feature.noiseComponents) ||
      !feature.noiseComponents.length ||
      feature.noiseComponents.length > 64 ||
      feature.noiseComponents.some((value) => !Number.isFinite(value) || value <= 0) ||
      Math.abs(feature.noiseComponents.reduce((sum, value) => sum + value, 0) - variance) >
        1e-9 * Math.max(1, variance))
  )
    return null;
  return variance;
}

function validRelease(source) {
  if (source.version >= 3) {
    if (!Number.isFinite(source.rowEpsilon) || source.rowEpsilon <= 0) return false;
    const mechanisms = [...Object.values(source.features || {}), ...(source.cohortCount ? [source.cohortCount] : [])];
    const charge = mechanisms.reduce((total, histogram) => {
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
  let precision = 0,
    weightedTotal = 0,
    tailScale = 0;
  const cohort = source.cohortCount;
  if (cohort) {
    const variance = histogramVariance(source, cohort);
    if (variance === null || !Number.isSafeInteger(cohort.count) || Math.abs(cohort.count) > MAX_WIRE_COUNT)
      return { total: NaN, variance: NaN, tailScale: NaN };
    precision = referenceVariance / variance;
    weightedTotal = precision * cohort.count;
    for (const v of cohort.noiseComponents || [variance]) {
      const q = v / (v + 1 + Math.sqrt(2 * v + 1));
      tailScale = Math.max(tailScale, 1 / (1 - q));
    }
  }
  for (const feature of Object.values(source.features)) {
    const wireLength =
      feature?.domain?.boundaries?.length ??
      (Array.isArray(feature?.domain?.categories) ? feature.domain.categories.length + 2 : 0);
    const variance = histogramVariance(source, feature);
    if (variance === null || wireLength < 2 || wireLength > 130 || !validCounts(feature.counts, wireLength)) continue;
    const length = noiseCellCount(feature);
    if (
      length < 1 ||
      (feature.domain.missingAllowed === false && feature.counts.at(-1) !== 0) ||
      (feature.domain.categories && feature.domain.unlistedCategoriesAllowed === false && feature.counts.at(-2) !== 0)
    )
      continue;
    // Each histogram includes missingness. Combine the noisy group sizes by inverse variance.
    const weight = referenceVariance / variance;
    for (const v of feature.noiseComponents || [variance]) {
      const q = v / (v + 1 + Math.sqrt(2 * v + 1));
      tailScale = Math.max(tailScale, 1 / (1 - q));
    }
    precision += weight / length;
    weightedTotal += weight * (feature.counts.reduce((sum, count) => sum + count, 0) / length);
  }
  return { total: weightedTotal / precision, variance: referenceVariance / precision, tailScale };
}

export function protectedHistogram(group, sources, approvedTotals = new Map()) {
  const pieces = group.members.map((member) => {
    const source = sources.get(sourceKey(member));
    const cell = source?.features?.[member.column];
    return { member, source, cell, variance: source && validRelease(source) ? histogramVariance(source, cell) : null };
  });
  const first = pieces[0]?.cell;
  if (
    !first ||
    pieces.some(
      ({ source, cell, variance }) =>
        !cell ||
        typeof source.group !== "string" ||
        source.group !== pieces[0].source.group ||
        (source.selectionScope || "group") !== (pieces[0].source.selectionScope || "group") ||
        variance === null,
    )
  )
    return null;
  if (
    pieces.some(
      ({ cell }) =>
        (cell.domain?.missingAllowed === false && cell.counts?.at(-1) !== 0) ||
        (cell.domain?.categories && cell.domain.unlistedCategoriesAllowed === false && cell.counts?.at(-2) !== 0),
    )
  )
    return null;
  let labels, boundaries, lowerEdges, upperEdges, aligned, scores, otherIndex;
  if (group.type === "continuous" || group.type === "date") {
    const domains = pieces.map(({ cell }) => numericalDomain(cell.domain));
    if (
      domains.some(
        (domain, index) =>
          !domain ||
          (group.type === "date") !== (pieces[index].cell.domain.type === "date") ||
          !validCounts(pieces[index].cell.counts, domain.boundaries.length),
      )
    )
      return null;
    const target = alignNumericalHistograms(
      domains,
      pieces.map(({ cell }) => cell.counts),
    );
    if (!target) return null;
    ({ labels, boundaries, lowerEdges, upperEdges, aligned, scores } = target);
  } else {
    if (group.type !== "categorical" || pieces.some(({ cell }) => !validCounts(cell.counts, cell.counts?.length)))
      return null;
    const target = alignCategoricalHistograms(
      pieces.map(({ cell }) => cell.domain),
      pieces.map(({ cell }) => cell.counts),
    );
    if (!target) return null;
    ({ labels, aligned, otherIndex } = target);
  }
  const variances = pieces.flatMap(({ variance, cell }, index) =>
    Array.from({ length: aligned[index].fanIn }, () => cell.noiseComponents || [variance]).flat(),
  );
  const binNoise = Math.sqrt(variances.reduce((sum, variance) => sum + variance, 0));
  const totals = pieces.map(({ member, source, variance }) => {
    const estimate = estimateGroupTotal(source, variance);
    const approved = approvedTotals.get(sourceKey(member));
    // Validate the release even when an approved total is available.
    return Number.isFinite(estimate.total) && Number.isSafeInteger(approved) && approved >= 0
      ? { ...estimate, total: approved, variance: 0, approved: true }
      : estimate;
  });
  if (totals.some((total) => !Number.isFinite(total.total))) return null;
  // The feature's missing cell also contributes to its site's estimated total.
  const coherent = pieces.map(({ cell, variance }, index) => coherentFeatureCounts(totals[index], cell, variance));
  return {
    labels,
    boundaries,
    lowerEdges,
    upperEdges,
    scores,
    otherIndex,
    supportedReconstruction: pieces.every(({ source }) => source.postprocessing === "supported-frequencies"),
    support:
      scores &&
      group.type !== "categorical" &&
      pieces.every(({ source }) => source.postprocessing === "supported-frequencies")
        ? supportedBins(
            labels.map((_, index) => aligned.reduce((sum, { counts }) => sum + counts[index], 0)),
            variances,
          )
        : null,
    cells: labels.map((_, index) => aligned.reduce((sum, { counts }) => sum + counts[index], 0)),
    count: coherent.reduce((sum, feature) => sum + feature.count, 0),
    missing: coherent.reduce((sum, feature) => sum + feature.missing, 0),
    countEstimated: pieces.some(({ cell }, index) => !totals[index].approved || cell.domain.missingAllowed !== false),
    countEstimate: coherent.reduce((sum, feature) => sum + feature.estimate, 0),
    countScale: Math.max(...totals.map((total) => total.tailScale)),
    variances,
    binNoise,
    countNoise: Math.sqrt(coherent.reduce((sum, feature) => sum + feature.variance, 0)),
  };
}
