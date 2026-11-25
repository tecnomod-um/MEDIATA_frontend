import { sourceKey } from "../exact/combinedStatistics";
import { addProtectedDistribution, buildApproximateSummary } from "../protected/protectedStatistics";

function reusableSummary(summary, type) {
  if (!summary || summary.unavailable || !Number.isSafeInteger(summary.count) || summary.count <= 0) return false;
  if (type === "continuous") return Number.isFinite(summary.mean) && Number.isFinite(summary.stdDev);
  if (type !== "categorical" || !summary.categories?.length) return false;
  const labels = new Set(summary.categories.map((category) => category.value));
  return labels.size === summary.categories.length
    && summary.categories.every((category) => Number.isSafeInteger(category.count) && category.count > 0)
    && summary.categories.reduce((sum, category) => sum + category.count, 0) <= summary.count;
}

// Adapt the finalized aggregate to the shared estimators. Preserve approved
// exact fields and retain the original feature/source identities for exports.
export function securePooledSummary(group, exact, entry, released, approvedTotal) {
  const unavailable = (reason) =>
    exact.unavailable
      ? { ...exact, unavailable: reason }
      : { ...exact, note: [exact.note, `Secure distribution unavailable: ${reason}`].filter(Boolean).join(" ") };
  if (entry?.unavailable) return unavailable(entry.unavailable);
  if (!entry) return exact;
  const { result, wireId, cohort, groups, features } = entry;
  const reason = result.unavailable?.[wireId];
  if (reason || !result.features[wireId])
    return unavailable(reason || "A participant could not contribute this feature.");
  // Shared count reconstruction is valid only for features from the same
  // source cohort. A two-site item must not borrow the three-site Age total.
  const sameCohort = groups
    .map((item, index) => ({ item, id: features[index].id }))
    .filter(({ item }) => JSON.stringify(item.members.map(sourceKey).sort()) === cohort);
  const release = {
    version: 4,
    group: result.manifestHash,
    selectionScope: "secure-pool",
    rowEpsilon: result.rowEpsilon,
    postprocessing: "supported-frequencies",
    features: Object.fromEntries(
      sameCohort.filter(({ id }) => result.features[id]).map(({ id }) => [id, result.features[id]]),
    ),
  };
  const member = { nodeId: "secure-pool", fileName: cohort, column: wireId };
  const target = { label: group.label, type: group.type, members: [member] };
  const releases = new Map([[sourceKey(member), release]]);
  const approvedTotals = new Map([[sourceKey(member), approvedTotal]]);
  // Published site releases can preserve approved moments without another query or noise draw.
  const secure = exact.unavailable ? buildApproximateSummary(target, releases, [], 1, approvedTotals) : exact;
  const reuseSiteSummaries =
    exact.unavailable &&
    !secure.unavailable &&
    reusableSummary(released, group.type);
  let summary = reuseSiteSummaries ? { ...released, reusedSiteSummaries: true } : secure;
  summary = addProtectedDistribution(target, [{ member, withheld: true }], releases, summary, approvedTotals);
  if (reuseSiteSummaries && group.type === "continuous") {
    // Keep the secure interval's uncertainty; expanding it to include the new point estimate cannot narrow it.
    if (Number.isFinite(secure.meanCiLower) && Number.isFinite(secure.meanCiUpper)) {
      summary.meanCiLower = Math.min(secure.meanCiLower, summary.meanCiLower ?? Infinity, summary.mean);
      summary.meanCiUpper = Math.max(secure.meanCiUpper, summary.meanCiUpper ?? -Infinity, summary.mean);
    }
    // Fall back if separately released estimates cannot describe an ordered distribution together.
    const ordered = [summary.min, summary.q1, summary.median, summary.q3, summary.max].filter(Number.isFinite);
    if (ordered.some((value, index) => index > 0 && value < ordered[index - 1])) {
      summary = addProtectedDistribution(target, [{ member, withheld: true }], releases, secure, approvedTotals);
    } else {
      if (Number.isFinite(summary.supportedMin) && Number.isFinite(summary.supportedMax)) {
        const lower = Math.max(summary.min, summary.supportedMin);
        const upper = Math.min(summary.max, summary.supportedMax);
        summary.supportedMin = lower <= upper ? lower : undefined;
        summary.supportedMax = lower <= upper ? upper : undefined;
      }
    }
  }
  if (summary === exact) return exact;
  return {
    ...summary,
    includedSources: group.members.length,
    totalSources: group.members.length,
    contributions: exact.contributions,
    note: [
      summary.note,
      summary.reusedSiteSummaries
        ? "Pooled statistics reuse already released site summaries. Their site-level privacy cost still applies; the independent secure-pooling allowance alone does not cover these reused values."
        : null,
      "Secure aggregation: nodes mask their independent cached protected contributions; only the combined histogram is released. The secure-path cost is additional to site-level releases and conditional on published metadata. Selected rows are pooled without patient deduplication.",
      group.type === "categorical"
        ? "Numerical point domains interpreted as categories use normalized score labels; original text formatting is not retained."
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
