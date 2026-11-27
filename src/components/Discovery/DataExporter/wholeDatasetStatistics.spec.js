import { expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { collectDiscoveryStatistics } from "../discoveryStatistics";
import { protectedSourceMembers } from "../CombinedStatistics/protected/protectedSourceStatistics";
import { buildStatisticsReport } from "./statisticsReport";
import { writeStatisticsReport } from "./writeStatisticsReport";
import { releasedCohortCounts } from "../CombinedStatistics/releasedCohortCounts";
import { sourceKey } from "../CombinedStatistics/exact/combinedStatistics";

const bytes = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

it("still requests protected estimates for a filtered selection of a whole-file baseline", () => {
  const baseline = [{ nodeId: 1, fileName: "source.csv", disclosureMode: "WHOLE_DATASET",
    continuousFeatures: [{ featureName: "Score", count: 12, missingValuesCount: 0, modes: [1], modeStatus: "Available" }],
  }];
  const filtered = [{ ...baseline[0], disclosureMode: "COHORT_AGGREGATES", continuousFeatures: [],
    disclosureWithheld: true, omittedFeatures: [{ featureName: "Score", reason: "Statistics withheld by disclosure controls" }],
  }];
  expect(protectedSourceMembers(filtered, baseline, [true]).size).toBe(1);
});

it("uses only explicitly released counts from withheld features for pooled count reconciliation", () => {
  const source = { nodeId: 1, fileName: "source.csv", omittedFeatures: [{ featureName: "Score",
    countsReleased: true, count: 4, missingValuesCount: 8 }] };
  expect(releasedCohortCounts(new Map([[sourceKey(source), source]])).get(sourceKey(source))).toBe(12);
  const filtered = { ...source, omittedFeatures: [{ featureName: "Score", count: 0, missingValuesCount: 0 }] };
  expect(releasedCohortCounts(new Map([[sourceKey(filtered), filtered]])).size).toBe(0);
});

it("exports approved whole-file counts while keeping protected values unavailable", async () => {
  const sources = ["Alpha", "Beta", "Gamma"].map((nodeName, nodeId) => ({
    nodeId, nodeName, fileName: "source.csv", disclosureMode: "WHOLE_DATASET", disclosurePolicyVersion: 3,
    continuousFeatures: [{ featureName: "Score", count: 12, missingValuesCount: 0, percentMissing: 0,
      min: 0, qrt1: 0.5, median: 1, qrt3: 1.5, max: 2, mean: 1, stdDev: 1,
      modes: [], modeStatus: "No repeated value" },
      { featureName: "Empty number", count: 0, missingValuesCount: 12, percentMissing: 100,
        min: null, qrt1: null, median: null, qrt3: null, max: null, mean: null, stdDev: null }],
    categoricalFeatures: [
      { featureName: "Group", count: 12, missingValuesCount: 0, categoryCounts: { A: 6, B: 6 } },
      { featureName: "Empty", count: 0, missingValuesCount: 12, categoryCounts: {} },
    ], dateFeatures: [], omittedFeatures: [
      { featureName: "Sparse reading", type: "continuous", count: 4, missingValuesCount: 8, percentMissing: 100 * 8 / 12,
        countsReleased: true, reason: "Suppressed for privacy: fewer than six observations" },
      { featureName: "Rare group", type: "categorical", count: 12, missingValuesCount: 0, percentMissing: 0,
        countsReleased: true, reason: "Suppressed for privacy: rare exact values" },
    ],
  }));
  const active = sources.map(() => true);
  expect(protectedSourceMembers(sources, sources, active).size).toBe(0);
  const data = collectDiscoveryStatistics(sources, active);
  const sheets = buildStatisticsReport({ data, sourceData: data, includeBreakdown: false });
  const records = name => {
    const [headers, ...rows] = sheets.find(sheet => sheet.name === name).rows;
    return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  };
  expect(records("Features")).toHaveLength(18);
  expect(records("Continuous statistics")).toHaveLength(9);
  expect(records("Continuous statistics")[0]).toMatchObject({
    "Non-missing count": 12, "Missing count": 0, "Missing %": 0, Min: 0,
  });
  expect(records("Continuous statistics").find(row => row.Feature === "Empty number")).toMatchObject({
    "Non-missing count": 0, "Missing count": 12, "Missing %": 100,
    Mean: "Undefined: no non-missing observations", Min: "Undefined: no non-missing observations",
  });
  expect(records("Continuous statistics").find(row => row.Feature === "Sparse reading")).toMatchObject({
    "Non-missing count": 4, "Missing count": 8, "Missing %": 100 * 8 / 12,
    Mean: "Unavailable", Min: "Unavailable", "Std. Dev. (sample)": "Unavailable",
  });
  const categories = records("Categorical statistics");
  expect(categories.filter(row => row.Feature === "Group")).toHaveLength(3);
  expect(categories.find(row => row.Feature === "Group")).toMatchObject({
    "Non-missing count": 12, "Missing count": 0, "2nd mode": "B", "2nd mode count": 6,
  });
  expect(categories.find(row => row.Feature === "Empty")).toMatchObject({
    "Non-missing count": 0, "Missing count": 12, "Missing %": 100,
    Mode: "Undefined: no non-missing observations",
  });
  expect(categories.find(row => row.Feature === "Rare group")).toMatchObject({
    "Non-missing count": 12, "Missing count": 0, Mode: "Unavailable", "Mode count": "Unavailable",
  });
  for (const format of ["csv", "xlsx"]) {
    const blob = await writeStatisticsReport(sheets, format);
    const files = unzipSync(await bytes(blob));
    const text = Object.values(files).map(strFromU8).join("\n");
    expect(text).toContain("Undefined: no non-missing observations");
    expect(text).not.toContain("Privacy-protected estimate");
    expect(text).toContain("Suppressed for privacy");
  }
});
