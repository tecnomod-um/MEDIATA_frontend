const finite = value => Number.isFinite(value) && Math.abs(value) <= 1e9;
const close = (a, b) => Math.abs(a - b) <= 16 * Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b));

export function numericalDomain(domain) {
  const {boundaries, values} = domain || {};
  if (!Array.isArray(boundaries) || boundaries.length < 2 || boundaries.length > 129
    || !boundaries.every((edge, index) => finite(edge) && (!index || edge > boundaries[index - 1]))) return null;
  if (values != null && (!Array.isArray(values) || values.length !== boundaries.length - 1
    || !values.every((value, index) => finite(value) && value >= boundaries[index] && value <= boundaries[index + 1])
    || !values.every((value, index) => !index || value > values[index - 1]))) return null;
  return {boundaries, values, labels: values ?? boundaries.slice(1).map((edge, index) => (boundaries[index] + edge) / 2)};
}

function binFor(value, boundaries) {
  const index = boundaries.slice(1, -1).findIndex(edge => edge > value);
  return index < 0 ? boundaries.length - 2 : index;
}

export function alignNumericalHistograms(domains, histograms) {
  if (domains.some(domain => !domain)) return null;
  if (domains.every(domain => domain.values)) {
    const scores = [...new Set(domains.flatMap(domain => domain.values))].sort((a, b) => a - b);
    if (scores.length <= 256) {
      const positions = new Map(scores.map((value, index) => [value, index]));
      const boundaries = [Math.max(-1e9, scores[0] - .5),
        ...scores.slice(1).map((value, index) => (scores[index] + value) / 2), Math.min(1e9, scores.at(-1) + .5)];
      return {labels:scores, scores, boundaries, lowerEdges:scores, upperEdges:scores,
        aligned:domains.map((domain, index) => {
          const counts = scores.map(() => 0);
          domain.values.forEach((value, cell) => { counts[positions.get(value)] += histograms[index][cell]; });
          return {counts, fanIn:1};
        })};
    }
  }
  const intervals = domains.filter(domain => !domain.values);
  const minimum = Math.min(...domains.map(domain => domain.values?.[0] ?? domain.boundaries[0]));
  const maximum = Math.max(...domains.map(domain => domain.values?.at(-1) ?? domain.boundaries.at(-1)));
  const candidates = [...new Set([minimum, maximum, ...intervals.flatMap(domain => domain.boundaries)])].sort((a, b) => a - b);
  const boundaries = candidates.filter(edge => edge >= minimum && edge <= maximum && intervals.every(domain =>
    edge <= domain.boundaries[0] || edge >= domain.boundaries.at(-1) || domain.boundaries.some(value => close(value, edge))));
  if (boundaries.length < 2 || boundaries[0] !== minimum || boundaries.at(-1) !== maximum) return null;
  const labels = boundaries.slice(1).map((edge, index) => (boundaries[index] + edge) / 2);
  const aligned = domains.map((domain, index) => {
    const counts = labels.map(() => 0), cellsPerBin = labels.map(() => 0);
    for (let cell = 0; cell < domain.labels.length; cell++) {
      const bin = binFor(domain.labels[cell], boundaries);
      if (!domain.values && (domain.boundaries[cell] < boundaries[bin] && !close(domain.boundaries[cell], boundaries[bin])
        || domain.boundaries[cell + 1] > boundaries[bin + 1] && !close(domain.boundaries[cell + 1], boundaries[bin + 1]))) return null;
      counts[bin] += histograms[index][cell];
      cellsPerBin[bin]++;
    }
    return {counts, fanIn:Math.max(...cellsPerBin)};
  });
  return aligned.some(part => !part) ? null : {labels, boundaries, lowerEdges:boundaries.slice(0, -1), upperEdges:boundaries.slice(1), aligned};
}

function categoricalDomain(domain) {
  if (Array.isArray(domain?.categories) && domain.categories.length > 0 && domain.categories.length <= 128
    && domain.categories.every(label => typeof label === 'string') && new Set(domain.categories).size === domain.categories.length) {
    return {labels:domain.categories, other:domain.unlistedCategoriesAllowed !== false};
  }
  // Numerical histograms do not preserve lexical category codes (e.g. 01 vs 1).
  return null;
}

export function alignCategoricalHistograms(domains, histograms) {
  const definitions = domains.map(categoricalDomain);
  if (definitions.some((definition, index) => !definition
    || histograms[index].length !== definition.labels.length + 2
    || (!definition.other && histograms[index][definition.labels.length] !== 0))) return null;
  const labels = [...new Set(definitions.flatMap(definition => definition.labels))].sort();
  let other = 'Other';
  while (labels.includes(other)) other += ' (unlisted)';
  const hasOther = definitions.some(definition => definition.other);
  if (hasOther) labels.push(other);
  const positions = new Map(labels.map((label, index) => [label, index]));
  const aligned = definitions.map((definition, index) => {
    const counts = labels.map(() => 0);
    definition.labels.forEach((label, cell) => { counts[positions.get(label)] += histograms[index][cell]; });
    if (definition.other) counts[positions.get(other)] += histograms[index][definition.labels.length];
    return {counts, fanIn:1};
  });
  return {labels, aligned, otherIndex:hasOther ? labels.length - 1 : null};
}
