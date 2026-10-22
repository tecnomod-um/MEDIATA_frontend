import { columnReferenceKey, inferColumnType, parseTerminology } from "../ColumnSearchList/columnMappingStatus";

const GENERIC_VALUES = new Set(["yes", "no", "y", "n", "true", "false", "0", "1", "unknown", "missing", "n/a", "integer", "double", "date"]);
const NAME_STOPWORDS = new Set(["at", "in", "of", "the", "and", "score", "value", "column"]);
const INSTRUMENT_SUFFIX = /^(?:bart|fim|bi)\d*$/;

const normalize = (value) => String(value ?? "")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

const tokens = (value) => new Set(normalize(value).split(/\s+/)
  .filter((token) => token && !NAME_STOPWORDS.has(token) && !INSTRUMENT_SUFFIX.test(token)));

const overlap = (left, right) => {
  if (!left.size || !right.size) return 0;
  const common = [...left].filter((value) => right.has(value)).length;
  return (2 * common) / (left.size + right.size);
};

const concept = (term) => {
  const { label, code } = parseTerminology(term);
  return code ? `sct:${code}` : label ? `label:${normalize(label)}` : "";
};

const valueConcepts = (column) => new Set(Object.values(column?.valueTerminologies || {})
  .map(concept).filter(Boolean));

const categoryValues = (column) => new Set((column?.values || [])
  .map(normalize)
  .filter((value) => value && !GENERIC_VALUES.has(value) && !/^\d+(?:[.,]\d+)?$/.test(value)
    && !/^(min|max|step|earliest|latest)\b/.test(value)));

const bound = (column, prefix) => {
  const raw = (column?.values || []).find((value) => String(value).startsWith(prefix));
  return raw ? Number(String(raw).slice(prefix.length)) : NaN;
};

const rangeSimilarity = (left, right) => {
  const a = [bound(left, "min:"), bound(left, "max:")];
  const b = [bound(right, "min:"), bound(right, "max:")];
  if (![...a, ...b].every(Number.isFinite) || a[1] <= a[0] || b[1] <= b[0]) return null;
  const intersection = Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
  return intersection / Math.max(a[1] - a[0], b[1] - b[0]);
};

export const rankSimilarColumns = (anchor, columns, selected = [], semanticScores = []) => {
  if (!anchor) return [];
  const omitted = new Set(selected.map(columnReferenceKey));
  omitted.add(columnReferenceKey(anchor));
  const semantic = new Map(semanticScores.map(({ nodeId, fileName, column, score }) =>
    [columnReferenceKey({ nodeId, fileName, column }), Number(score)]));
  const anchorTerm = concept(anchor.terminology);
  const anchorName = normalize(anchor.column);
  const anchorTokens = tokens(anchor.column);
  const anchorValues = categoryValues(anchor);
  const anchorValueTerms = valueConcepts(anchor);
  const anchorType = inferColumnType(anchor);

  return (columns || []).filter((column) => column?.column && !omitted.has(columnReferenceKey(column)))
    .map((column) => {
      let score = 0;
      let reason = "";
      const term = concept(column.terminology);
      if (anchorTerm && term && anchorTerm === term) {
        score += 100;
        reason = "Same terminology";
      }
      const nameSimilarity = overlap(anchorTokens, tokens(column.column));
      if (anchorName && anchorName === normalize(column.column)) {
        score += 56;
        reason ||= "Same name";
      } else if (nameSimilarity) {
        score += Math.round(42 * nameSimilarity);
        if (nameSimilarity >= 0.5) reason ||= "Similar name";
      }
      const valueTermSimilarity = overlap(anchorValueTerms, valueConcepts(column));
      if (valueTermSimilarity) {
        score += Math.round(35 * valueTermSimilarity);
        reason ||= "Shared value concepts";
      }
      const candidateType = inferColumnType(column);
      const ranges = rangeSimilarity(anchor, column);
      if (anchorType === candidateType) {
        const valueSimilarity = overlap(anchorValues, categoryValues(column));
        if (valueSimilarity) {
          score += Math.round(28 * valueSimilarity);
          reason ||= "Shared values";
        }
        if (ranges) score += Math.round(12 * ranges);
        score += 4;
      }
      const semanticScore = semantic.get(columnReferenceKey(column));
      const numericTypes = ["Integer", "Decimal"];
      const numericScaleMismatch = numericTypes.includes(anchorType) && numericTypes.includes(candidateType)
        && ranges !== null && ranges < 0.3;
      if (Number.isFinite(semanticScore) && semanticScore >= 0.58 && !numericScaleMismatch) {
        const semanticContribution = Math.round((semanticScore - 0.42) * 145 + score * 0.35);
        if (semanticContribution > score) {
          score = semanticContribution;
          reason ||= "Semantic match";
        }
      }
      return { column, score, reason: reason || "Related variable" };
    })
    .filter(({ score }) => score >= 24)
    .sort((a, b) => b.score - a.score || a.column.column.localeCompare(b.column.column));
};
