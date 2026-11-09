import gammainc from "@stdlib/math-base-special-gammainc";
import { sourceKey, sourceLabel } from "./combinedStatistics.js";

const validCount = n => Number.isSafeInteger(n) && n >= 6;
const finite = Number.isFinite;
const key = (x, y) => JSON.stringify([x, y]);

// Parallel centred co-moments: both columns always refer to the same complete cases.
export function poolBivariateMoments(parts) {
  let count = 0, meanX = 0, meanY = 0, m2X = 0, m2Y = 0, crossMoment = 0;
  for (const part of parts) {
    if (!Number.isSafeInteger(part.count) || part.count < 1
      || ![part.meanX, part.meanY, part.m2X, part.m2Y, part.crossMoment].every(finite)
      || part.m2X < 0 || part.m2Y < 0) return null;
    const bound = Math.sqrt(part.m2X) * Math.sqrt(part.m2Y);
    if (Math.abs(part.crossMoment) > bound + Math.max(1, bound) * 1e-10) return null;
    if (!count) {
      count = part.count; meanX = part.meanX; meanY = part.meanY;
      m2X = part.m2X; m2Y = part.m2Y; crossMoment = part.crossMoment;
      continue;
    }
    const next = count + part.count;
    if (!Number.isSafeInteger(next)) return null;
    const dx = part.meanX - meanX, dy = part.meanY - meanY, factor = count * (part.count / next);
    m2X += part.m2X + dx * dx * factor;
    m2Y += part.m2Y + dy * dy * factor;
    crossMoment += part.crossMoment + dx * dy * factor;
    meanX += dx * (part.count / next); meanY += dy * (part.count / next); count = next;
  }
  if (!count || ![meanX, meanY, m2X, m2Y, crossMoment].every(finite)) return null;
  const denominator = Math.sqrt(m2X) * Math.sqrt(m2Y);
  return { count, meanX, meanY, m2X, m2Y, crossMoment,
    covariance: count > 1 ? crossMoment / (count - 1) : undefined,
    pearson: denominator > 0 ? Math.max(-1, Math.min(1, crossMoment / denominator)) : undefined };
}

export function rankCorrelationFromCounts(cells) {
  const marginal = axis => {
    const counts = new Map();
    cells.forEach(cell => counts.set(cell[axis], (counts.get(cell[axis]) || 0) + cell.count));
    let before = 0;
    return new Map([...counts].sort((a, b) => a[0] - b[0]).map(([value, count]) => {
      const rank = before + (count + 1) / 2; before += count; return [value, rank];
    }));
  };
  const xs = marginal("x"), ys = marginal("y");
  return poolBivariateMoments(cells.map(cell => ({ count: cell.count,
    meanX: xs.get(cell.x), meanY: ys.get(cell.y), m2X: 0, m2Y: 0, crossMoment: 0 })))?.pearson;
}

// Evaluate the upper tail directly; 1 - CDF loses precision for small p-values.
export function chiSquareSurvival(statistic, degreesOfFreedom) {
  if (!finite(statistic) || statistic < 0 || !Number.isSafeInteger(degreesOfFreedom) || degreesOfFreedom < 1) return undefined;
  return gammainc(statistic / 2, degreesOfFreedom / 2, true, true);
}

export function chiSquareFromCounts(cells) {
  const xs = new Map(), ys = new Map(), observed = new Map();
  let count = 0;
  for (const cell of cells) {
    if (!Number.isSafeInteger(cell.count) || cell.count < 1) return null;
    xs.set(cell.x, (xs.get(cell.x) || 0) + cell.count);
    ys.set(cell.y, (ys.get(cell.y) || 0) + cell.count);
    observed.set(key(cell.x, cell.y), (observed.get(key(cell.x, cell.y)) || 0) + cell.count);
    count += cell.count;
  }
  if (!Number.isSafeInteger(count) || !count || xs.size < 2 || ys.size < 2) return null;
  let statistic = 0, smallExpected = false;
  for (const [x, nx] of xs) for (const [y, ny] of ys) {
    const expected = nx / count * ny, n = observed.get(key(x, y)) || 0;
    statistic += (n - expected) ** 2 / expected;
    smallExpected ||= expected < 5;
  }
  const degreesOfFreedom = (xs.size - 1) * (ys.size - 1);
  return { count, statistic, degreesOfFreedom, pvalue: chiSquareSurvival(statistic, degreesOfFreedom), smallExpected };
}

const members = feature => feature.pooled ? feature.combinedSummary.contributions.map(part => ({
  source: part.source, column: part.columnName || part.feature?.featureName,
})) : [{ source: feature, column: feature.originalName || feature.featureName }];

function pairedContributions(x, y, sources) {
  if (x.combinedSummary?.unavailable || y.combinedSummary?.unavailable) return { reason: "A mapped feature is unavailable or suppressed at a selected dataset." };
  const right = new Map(members(y).map(part => [sourceKey(part.source), part]));
  const pairs = members(x).flatMap(part => {
    const other = right.get(sourceKey(part.source));
    if (!other) return [];
    const source = sources.get(sourceKey(part.source));
    return source ? [{ source, x: part.column, y: other.column }] : [];
  });
  return pairs.length ? { pairs } : { reason: "No shared dataset contains both selected features. Records from different files are never joined." };
}

const summaryKey = (x, y) => x <= y ? key(x, y) : key(y, x);

function indexSummaries(sources) {
  return new Map([...sources].map(([id, source]) => [id, Object.fromEntries(
    ["numericPairSummaries", "categoricalPairSummaries"].map(array => {
      const index = new Map();
      for (const pair of source[array] || []) {
        const id = summaryKey(pair.featureX, pair.featureY);
        index.set(id, index.has(id) ? null : pair); // Ambiguous duplicates remain unavailable.
      }
      return [array, index];
    }))]));
}

function findSummary(indexes, source, array, x, y) {
  const part = indexes.get(sourceKey(source))?.[array]?.get(summaryKey(x, y));
  if (!part) return null;
  if (part.featureX === x) return part;
  return { ...part, meanX: part.meanY, meanY: part.meanX, m2X: part.m2Y, m2Y: part.m2X,
    frequencies: part.frequencies?.map(cell => ({ x: cell.y, y: cell.x, count: cell.count })) };
}

function releasedParts(pairs, array, indexes) {
  const parts = [];
  for (const pair of pairs) {
    if (pair.source.message?.startsWith("No records match")) continue;
    if (pair.source.relationshipSummaryVersion !== 1) return { reason: "A contributing node must be updated to provide paired aggregate summaries." };
    const part = findSummary(indexes, pair.source, array, pair.x, pair.y);
    if (!part || !validCount(part.count)) return { reason: "Paired statistics are suppressed or unavailable at a contributing dataset. No partial result is shown." };
    parts.push(part);
  }
  return parts.length ? { parts } : { reason: "No complete paired observations are available." };
}

function completeFrequencies(parts, numeric) {
  return parts.every(part => Array.isArray(part.frequencies) && part.frequencies.length > 0 && part.frequencies.length <= 200
    && part.frequencies.every(cell => validCount(cell.count) && (numeric ? finite(cell.x) && finite(cell.y) : typeof cell.x === "string" && typeof cell.y === "string"))
    && part.frequencies.reduce((n, cell) => n + cell.count, 0) === part.count);
}

// Adapt mappings to the original matrix component, using the same cohorts as feature tables.
export function combineMappedRelationships(tableData, results) {
  const sources = new Map(results.map(source => [sourceKey(source), source]));
  const indexes = indexSummaries(sources);
  const numerical = [...(tableData.continuousFeatures || []), ...(tableData.dateFeatures || [])];
  const categorical = tableData.categoricalFeatures || [];
  const matrices = { covariances: Object.create(null), pearsonCorrelations: Object.create(null), spearmanCorrelations: Object.create(null) };
  const details = { covariance: Object.create(null), pearson: Object.create(null), spearman: Object.create(null) }, chiSquareTest = [];
  for (const feature of numerical) for (const field of Object.keys(matrices)) matrices[field][feature.featureName] = Object.create(null);
  for (let i = 0; i < numerical.length; i++) for (let j = i; j < numerical.length; j++) {
    const x = numerical[i], y = numerical[j], found = pairedContributions(x, y, sources);
    const released = found.reason ? found : releasedParts(found.pairs, "numericPairSummaries", indexes);
    const pooled = released.parts && poolBivariateMoments(released.parts);
    const reason = released.reason || (!pooled ? "Incomplete or invalid paired moments." : undefined);
    const scope = { count: pooled?.count, datasets: found.pairs?.map(pair => sourceLabel(pair.source)),
      contributingSources: found.pairs?.map(({source}) => ({nodeId:source.nodeId, nodeName:source.nodeName, fileName:source.fileName})),
      pooled: released.parts?.length > 1, reason };
    const frequencies = released.parts && completeFrequencies(released.parts, true);
    const spearman = !reason && (x === y && pooled.m2X > 0 ? 1 : frequencies ? rankCorrelationFromCounts(released.parts.flatMap(part => part.frequencies)) : undefined);
    const values = { covariances: pooled?.covariance, pearsonCorrelations: pooled?.pearson, spearmanCorrelations: spearman };
    for (const [field, value] of Object.entries(values)) {
      const shown = !reason && finite(value) ? value : null;
      matrices[field][x.featureName][y.featureName] = shown; matrices[field][y.featureName][x.featureName] = shown;
      const type = field === "covariances" ? "covariance" : field === "pearsonCorrelations" ? "pearson" : "spearman";
      const description = { ...scope, reason: reason || (finite(value) ? undefined : type === "spearman" && !frequencies ? "Global ranks require complete joint frequencies; one or more nodes withheld them under disclosure controls." : "Correlation is undefined for a constant paired feature.") };
      (details[type][x.featureName] ||= Object.create(null))[y.featureName] = description;
      (details[type][y.featureName] ||= Object.create(null))[x.featureName] = description;
    }
  }
  for (let i = 0; i < categorical.length; i++) for (let j = i + 1; j < categorical.length; j++) {
    const x = categorical[i], y = categorical[j], found = pairedContributions(x, y, sources);
    const released = found.reason ? found : releasedParts(found.pairs, "categoricalPairSummaries", indexes);
    const safe = released.parts && completeFrequencies(released.parts, false);
    const pooled = safe && chiSquareFromCounts(released.parts.flatMap(part => part.frequencies));
    chiSquareTest.push({ category1: x.featureName, category2: y.featureName, pvalue: pooled?.pvalue,
      count: pooled?.count, statistic: pooled?.statistic, degreesOfFreedom: pooled?.degreesOfFreedom,
      datasets: found.pairs?.map(pair => sourceLabel(pair.source)),
      contributingSources: found.pairs?.map(({source}) => ({nodeId:source.nodeId, nodeName:source.nodeName, fileName:source.fileName})),
      pooled: released.parts?.length > 1,
      reason: released.reason || (!safe ? "A complete contingency table was not released under disclosure controls." : !pooled ? "At least two observed categories per feature are required." : pooled.smallExpected ? "Some expected cell counts are below 5; the chi-square approximation may be unreliable." : undefined) });
  }
  return { ...matrices, chiSquareTest, omittedFeatures: [], relationshipDetails: details };
}
