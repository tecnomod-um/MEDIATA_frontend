import { expect, it } from "vitest";
import { buildStatisticsReport, exportFeatures } from "./statisticsReport";
import { writeStatisticsReport } from "./writeStatisticsReport";
import { reportFixture } from "./reportTestFixtures";
import { sourceKey } from "../CombinedStatistics/combinedStatistics";
import { unzipSync, strFromU8 } from "fflate";

const records = sheet => sheet.rows.slice(1).map(row => Object.fromEntries(sheet.rows[0].map((key, index) => [key, row[index]])));
const sheetRecords = (sheets, name) => records(sheets.find(sheet => sheet.name === name));
const bytes = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result));
  reader.onerror = reject;
  reader.readAsArrayBuffer(blob);
});

it("keeps the feature inventory small and distinguishes identically named sites without internal IDs", () => {
  const fixture = reportFixture();
  const appliedFilters = new Map([[sourceKey(fixture.sources[0]), "Cluster (= 1)"]]);
  const sheets = buildStatisticsReport({ ...fixture, appliedFilters });
  expect(sheets.map(sheet => sheet.name)).toEqual(["Features", "Continuous statistics", "Categorical statistics", "Date statistics", "Filters"]);
  const inventory = sheetRecords(sheets, "Features").filter(row => row.Feature === "Age");
  expect(inventory).toEqual([
    { Feature: "Age", Type: "continuous", Site: null, Dataset: "Combined", "Merged from": "Hospital / patients.csv: Age; Hospital (2) / patients.csv: Age" },
    { Feature: "Age", Type: "continuous", Site: "Hospital", Dataset: "patients.csv", "Merged from": null },
    { Feature: "Age", Type: "continuous", Site: "Hospital (2)", Dataset: "patients.csv", "Merged from": null },
  ]);
  const age = sheetRecords(sheets, "Continuous statistics").filter(row => row.Feature === "Age");
  expect(age[0]).toMatchObject({ Dataset: "Combined", "Non-missing count": 60, "Q1 (25%)": null });
  expect(age[0].Notes).toContain("Pooled quartiles unavailable");
  expect(age[1]).toMatchObject({ Site: "Hospital", Mean: 20.123456789123, "Q1 (25%)": 18.123456789123 });
  expect(age[2]).toMatchObject({ Site: "Hospital (2)", Mean: 80 });
  expect(sheetRecords(sheets, "Filters")).toEqual([{ Site: "Hospital", Dataset: "patients.csv", Filter: "Cluster (= 1)" }]);
  const headers = sheets.flatMap(sheet => sheet.rows[0]);
  for (const field of ["Node ID", "Cohort", "Scope", "Source feature", "Status", "Methods"]) expect(headers).not.toContain(field);
});

it("maps selected source features onto combined rows and honors visibility and breakdown", () => {
  const fixture = reportFixture();
  const selectedEntries = [fixture.sourceData.continuousFeatures[0]];
  expect(exportFeatures(fixture.data, fixture.sourceData, selectedEntries, true).map(feature => feature.featureName)).toEqual(["Age"]);
  const sheets = buildStatisticsReport({ ...fixture, selectedEntries, selectedOnly: true, includeBreakdown: false });
  expect(sheets.map(sheet => sheet.name)).toEqual(["Features", "Continuous statistics"]);
  expect(sheetRecords(sheets, "Continuous statistics")).toHaveLength(1);
  const visible = { ...fixture.data, continuousFeatures: [] };
  expect(exportFeatures(visible, fixture.sourceData, selectedEntries, true)).toHaveLength(0);
  expect(() => buildStatisticsReport({ ...fixture, data: visible, selectedEntries, selectedOnly: true })).toThrow("no features");
});

it("uses only four inventory fields for unmerged features and preserves zero categories and dates", () => {
  const fixture = reportFixture();
  const sheets = buildStatisticsReport({ ...fixture, data: fixture.sourceData });
  expect(sheets[0].rows[0]).toEqual(["Feature", "Type", "Site", "Dataset"]);
  expect(sheets.map(sheet => sheet.name)).toEqual(["Features", "Continuous statistics", "Categorical statistics", "Date statistics"]);
  expect(sheetRecords(sheets, "Categorical statistics")[0]).toMatchObject({ Mode: "0", "Mode %": 50, "Missing count": 0 });
  expect(sheetRecords(sheets, "Date statistics")[0]).toMatchObject({ "Q1 (25%)": "2020-01-01", "Mean date": "2020-01-02" });
});

it("exports category statistics and the two most frequent categories together", () => {
  const fixture = reportFixture();
  const [group] = sheetRecords(buildStatisticsReport(fixture), "Categorical statistics");
  expect(group).toMatchObject({ Dataset: "Combined", "Distinct categories": 2, Mode: "0", "Mode count": 30,
    "2nd mode": "B", "2nd mode count": 30, "2nd mode %": 50 });
  expect(group).not.toHaveProperty("Std. Dev. (sample)");
});

it("exports the selected combined and per-dataset relationships once with clear dataset labels", () => {
  const fixture = reportFixture();
  const selectedEntries = fixture.data.continuousFeatures;
  const sheets = buildStatisticsReport({ ...fixture, selectedEntries, selectedOnly: true, includeRelationships: true });
  const rows = sheetRecords(sheets, "Relationships");
  const covariance = rows.filter(row => row.Statistic === "Covariance");
  expect(covariance).toEqual([
    { Statistic: "Covariance", "Feature 1": "Age (combined)", "Feature 2": "Score (combined)", Value: expect.any(Number),
      "Paired count": 60, Datasets: "Hospital / patients.csv; Hospital (2) / patients.csv", Notes: null },
    { Statistic: "Covariance", "Feature 1": "Age", "Feature 2": "Score", Value: 2,
      "Paired count": 24, Datasets: "Hospital / patients.csv", Notes: null },
    { Statistic: "Covariance", "Feature 1": "Age", "Feature 2": "Score", Value: 2,
      "Paired count": 36, Datasets: "Hospital (2) / patients.csv", Notes: null },
  ]);
  expect(rows.every(row => !row["Feature 1"].includes("VisitDate"))).toBe(true);
});

it("leaves withheld pooled values blank and keeps a note and merge mapping", () => {
  const fixture = reportFixture();
  const feature = fixture.data.continuousFeatures[0];
  const data = { continuousFeatures: [{ ...feature, combinedSummary: { ...feature.combinedSummary, mean: 123, unavailable: "Withheld by a source" } }] };
  const sheets = buildStatisticsReport({ ...fixture, data, includeBreakdown: false });
  expect(sheetRecords(sheets, "Continuous statistics")[0]).toMatchObject({
    Mean: null, "Std. Dev. (sample)": null, "Non-missing count": null, Notes: "Withheld by a source",
  });
  expect(sheetRecords(sheets, "Features")[0]["Merged from"]).toContain("Hospital (2) / patients.csv: Age");
});

it("exports actual source filters for a combined-only selection", () => {
  const fixture = reportFixture();
  const appliedFilters = new Map([[sourceKey(fixture.sources[1]), "Cluster (= 2)"]]);
  const sheets = buildStatisticsReport({ ...fixture, appliedFilters, selectedEntries: [fixture.data.continuousFeatures[0]],
    selectedOnly: true, includeBreakdown: false });
  expect(sheetRecords(sheets, "Filters")).toEqual([{ Site: "Hospital (2)", Dataset: "patients.csv", Filter: "Cluster (= 2)" }]);
});

it("omits relationship tables when disabled or when there are no selected pairs", () => {
  const fixture = reportFixture();
  expect(buildStatisticsReport(fixture).map(sheet => sheet.name)).not.toContain("Relationships");
  const sheets = buildStatisticsReport({ ...fixture, includeRelationships: true, selectedOnly: true, selectedEntries: [fixture.data.continuousFeatures[0]] });
  expect(sheets.map(sheet => sheet.name)).not.toContain("Relationships");
});

it("produces the same UTF-8 CSV tables in one archive and protects formula-like text", async () => {
  const sheets = [{ name: "Continuous statistics", rows: [["Feature", "Mean"], ['=HYPERLINK("x")', 0], ["Güttmann, age", 1.23456789123]] }];
  const blob = await writeStatisticsReport(sheets, "csv");
  const files = unzipSync(await bytes(blob));
  const csv = strFromU8(files["continuous_statistics.csv"]);
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('"0"');
  expect(csv).toContain("Güttmann, age");
  expect(csv).toContain("1.23456789123");
  await expect(writeStatisticsReport(sheets, "html")).rejects.toThrow("Choose");
});

it("writes a real multi-sheet workbook with numeric precision, literal strings, styled headers and frozen panes", async () => {
  const sheets = [{ name: "Continuous statistics", rows: [["Feature", "Mean"], ["=1+1", 1.23456789123], ["Zero", 0]] },
    { name: "Filters", rows: [["Site", "Dataset", "Filter"], ["Hospital", "patients.csv", "Cluster (= 1)"]] }];
  const blob = await writeStatisticsReport(sheets, "xlsx");
  const files = unzipSync(await bytes(blob));
  const xml = strFromU8(files["xl/worksheets/sheet1.xml"]);
  expect(xml).toContain("1.23456789123");
  expect(strFromU8(files["xl/sharedStrings.xml"])).toContain("=1+1");
  expect(xml).not.toContain("<f>");
  expect(xml).toContain('state="frozen"');
  expect(strFromU8(files["xl/workbook.xml"])).toContain("Filters");
});

it("exports numerical CI bounds, skewness and all tied modes without reusing category summaries", async () => {
  const fixture = reportFixture();
  const feature = fixture.data.continuousFeatures[0];
  Object.assign(feature.combinedSummary, { meanCiLower: 12.123456789, meanCiUpper: 20.987654321,
    skewness: -0.1231518341349694, kurtosis: -2.000988630746416, sampleStdDev: 1.8237562766229864,
    modes: [0, 4], modeFrequency: 12, modeStatus: "Available" });
  const sheets = buildStatisticsReport({ ...fixture, selectedOnly: true, selectedEntries: [feature], includeBreakdown: false });
  const row = sheetRecords(sheets, "Continuous statistics")[0];
  expect(row).toMatchObject({ "Mean 95% CI lower": 12.123456789, "Mean 95% CI upper": 20.987654321,
    Skewness: -0.1231518341349694, "Excess kurtosis": -2.000988630746416, "Std. Dev. (sample)": 1.8237562766229864,
    Mode: "0, 4", "Mode count": 12 });
  const csv = unzipSync(await bytes(await writeStatisticsReport(sheets, "csv")));
  expect(strFromU8(csv["continuous_statistics.csv"])).toContain("12.123456789");
  expect(strFromU8(csv["continuous_statistics.csv"])).toContain('"0, 4"');
  expect(Object.keys(csv)).toEqual(["features.csv", "continuous_statistics.csv"]);
  const xlsx = unzipSync(await bytes(await writeStatisticsReport(sheets, "xlsx")));
  expect(strFromU8(xlsx["xl/worksheets/sheet2.xml"])).toContain("-0.1231518341349694");
});
