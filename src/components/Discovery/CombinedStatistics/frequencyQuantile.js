// R7/linear quantiles of a sorted, complete frequency distribution. Counts stay
// compressed: exact pooled percentiles never require expanding patient records.
export function frequencyQuantile(entries, count, probability) {
  const position = (count - 1) * probability;
  const lower = Math.floor(position), upper = Math.ceil(position), weight = position - lower;
  let before = 0, left;
  for (const [value, frequency] of entries) {
    before += frequency;
    if (left === undefined && lower < before) left = value;
    if (upper < before) return lower === upper ? value : left * (1 - weight) + value * weight;
  }
  return undefined;
}
