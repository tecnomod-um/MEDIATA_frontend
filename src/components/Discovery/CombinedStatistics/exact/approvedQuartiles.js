import { frequencyQuantile } from "./frequencyQuantile";

const number = "([-+]?\\d+(?:\\.\\d+)?(?:[eE][-+]?\\d+)?)";
const rangePattern = new RegExp(`^[\\[(]\\s*${number}\\s*(?:-|\\u2013|,)\\s*${number}\\s*[\\])]$`);
export const APPROVED_QUARTILES_NOTE =
  "Quartiles are midpoint estimates of bounds from released histogram bins, including their printed-edge rounding. They are not exact pooled percentiles.";
const rounding = (text) => {
  const [mantissa, exponent = "0"] = text.toLowerCase().split("e");
  return 0.5 * 10 ** (Number(exponent) - (mantissa.split(".")[1]?.length || 0));
};

// Released chart bins can bound pooled sample quantiles even when exact value
// frequencies are unavailable. Their midpoints are labelled as estimates.
export function approvedQuartiles(parts) {
  const lower = [],
    upper = [];
  let count = 0;
  for (const part of parts) {
    if (part.valueCounts) {
      for (const cell of part.valueCounts) {
        lower.push([cell.value, cell.count]);
        upper.push([cell.value, cell.count]);
      }
    } else {
      if (
        !Array.isArray(part.histogram) ||
        !part.histogram.length ||
        part.histogram.length > 200 ||
        !Array.isArray(part.binRanges) ||
        part.histogram.length !== part.binRanges.length ||
        part.histogram.some((value) => !Number.isSafeInteger(value) || value < 0) ||
        part.histogram.reduce((sum, value) => sum + value, 0) !== part.count
      )
        return null;
      for (let index = 0; index < part.histogram.length; index++) {
        if (!part.histogram[index]) continue;
        const match = part.binRanges[index].match(rangePattern);
        if (!match) return null;
        const low = Math.max(part.min, Number(match[1]) - rounding(match[1]));
        const high = Math.min(part.max, Number(match[2]) + rounding(match[2]));
        if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) return null;
        lower.push([low, part.histogram[index]]);
        upper.push([high, part.histogram[index]]);
      }
    }
    count += part.count;
  }
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  lower.sort((a, b) => a[0] - b[0]);
  upper.sort((a, b) => a[0] - b[0]);
  const result = {},
    bounds = {};
  for (const [field, p] of [
    ["q1", 0.25],
    ["median", 0.5],
    ["q3", 0.75],
  ]) {
    const low = frequencyQuantile(lower, count, p),
      high = frequencyQuantile(upper, count, p);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    result[field] = (low + high) / 2;
    bounds[field] = [low, high];
  }
  return {
    ...result,
    quantileBounds: bounds,
    estimatedQuantiles: true,
    quantileMethod: "released-histogram-bounds",
    note: APPROVED_QUARTILES_NOTE,
  };
}
