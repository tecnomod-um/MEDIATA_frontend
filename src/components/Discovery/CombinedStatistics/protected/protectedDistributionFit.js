// Minimum-distance reconstruction of an already released histogram. Projection
// enforces nonnegative frequencies and the shared estimated non-missing total.
export function fitProtectedCounts(cells, total, support) {
  if (!Number.isSafeInteger(total) || total < 0 || !cells.length || !cells.every(Number.isFinite)) return null;
  if (!total) return cells.map(() => 0);
  if (support?.length && support.length < cells.length) {
    const fitted = fitProtectedCounts(
      support.map((index) => cells[index]),
      total,
    );
    const result = cells.map(() => 0);
    support.forEach((index, i) => {
      result[index] = fitted[i];
    });
    return result;
  }
  const ordered = [...cells].sort((a, b) => b - a);
  let sum = 0,
    threshold = 0;
  for (let index = 0; index < ordered.length; index++) {
    sum += ordered[index];
    const candidate = (sum - total) / (index + 1);
    if (ordered[index] <= candidate) break;
    threshold = candidate;
  }
  const fitted = cells.map((cell) => Math.max(0, cell - threshold));
  const result = fitted.map(Math.floor);
  const order = fitted
    .map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remainder = total - result.reduce((sum, count) => sum + count, 0);
  order.slice(0, remainder).forEach(({ index }) => result[index]++);
  return result;
}
