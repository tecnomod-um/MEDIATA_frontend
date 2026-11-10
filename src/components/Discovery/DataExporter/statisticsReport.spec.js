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

it("exports full-precision pooled and local results with per-source cohort identities, including duplicate site/file names", () => {
  const fixture = reportFixture();
  const appliedFilters = new Map([[sourceKey(fixture.sources[0]), "Cluster (= 1)"]]);
  const sheets = buildStatisticsReport({ ...fixture, appliedFilters });
  const age = sheetRecords(sheets, "Feature summaries").filter(row => row.Feature === "Age");
  expect(age).toHaveLength(3);
  expect(age[0]).toMatchObject({ Scope: "Pooled", "Non-missing count": 60, "Q1": null });
  expect(age[0].Status).toContain("quartiles unavailable");
  expect(age[0].Cohort).toContain("All records");
  expect(age[1]).toMatchObject({ Scope: "Dataset", "Node ID": "1", Cohort: "Cluster (= 1)", Mean: 20.123456789123 });
  expect(age[2]).toMatchObject({ "Node ID": "2", Cohort: "All records" });
  expect(sheetRecords(sheets, "Sources and filters").filter(row => row.Feature === "Age").map(row => row["Node ID"])).toContain("2");
});

it("maps selected source features onto combined rows, excludes hidden features, and can omit local breakdowns", () => {
  const fixture = reportFixture();
  const selectedEntries = [fixture.sourceData.continuousFeatures[0]];
  expect(exportFeatures(fixture.data, fixture.sourceData, selectedEntries, true).map(feature => feature.featureName)).toEqual(["Age"]);
  const sheets = buildStatisticsReport({ ...fixture, selectedEntries, selectedOnly: true, includeBreakdown: false });
  expect(sheetRecords(sheets, "Feature summaries")).toHaveLength(1);
  expect(sheets.some(sheet => sheet.name === "Category frequencies")).toBe(false);
  const visible = { ...fixture.data, continuousFeatures: [] };
  expect(exportFeatures(visible, fixture.sourceData, selectedEntries, true)).toHaveLength(0);
  expect(() => buildStatisticsReport({ ...fixture, data: visible, selectedEntries, selectedOnly: true })).toThrow("no features");
});

it("keeps zero-valued categories, counts, dates and quartiles without treating them as missing", () => {
  const fixture = reportFixture();
  const sheets = buildStatisticsReport({ ...fixture, data: fixture.sourceData });
  const groups = sheetRecords(sheets, "Feature summaries").filter(row => row.Feature === "Group");
  expect(groups[0]).toMatchObject({ Mode: "0", "Mode %": 50, "Missing count": 0 });
  expect(sheetRecords(sheets, "Category frequencies").filter(row => row.Category === "0")).toHaveLength(2);
  expect(sheetRecords(sheets, "Feature summaries").find(row => row.Feature === "VisitDate")).toMatchObject({ Type: "date", Q1: "2020-01-01", Mean: "2020-01-02" });
});

it("exports pooled categorical cardinality and the second most frequent category alongside complete frequencies", () => {
  const fixture = reportFixture();
  const rows = sheetRecords(buildStatisticsReport(fixture), "Feature summaries");
  const group = rows.find(row => row.Feature === "Group" && row.Scope === "Pooled");
  expect(group).toMatchObject({ Cardinality: 2, Mode: "0", "Mode count": 30,
    "2nd Mode": "B", "2nd Mode count": 30, "2nd Mode %": 50 });
  expect(group.Kurtosis).toBeNull();
  expect(group["Sample SD"]).toBeNull();
});

it("exports both combined and per-dataset relationships once, restricted to the chosen pairs", () => {
  const fixture = reportFixture();
  const selectedEntries = fixture.data.continuousFeatures;
  const sheets = buildStatisticsReport({ ...fixture, selectedEntries, selectedOnly: true, includeRelationships: true });
  const rows = sheetRecords(sheets, "Relationships");
  expect(rows.some(row => row.Scope === "Pooled" && row.Statistic === "covariances" && row["Paired count"] === 60)).toBe(true);
  expect(rows.filter(row => row.Scope === "Dataset" && row.Statistic === "covariances").map(row => [row["Feature 1"], row["Feature 2"]])).toEqual([
    ["Age (patients.csv · Hospital · 1)", "Score (patients.csv · Hospital · 1)"],
    ["Age (patients.csv · Hospital · 2)", "Score (patients.csv · Hospital · 2)"],
  ]);
  expect(new Set(rows.map(row => JSON.stringify([row.Statistic, row["Feature 1"], row["Feature 2"]]))).size).toBe(rows.length);
  expect(rows.every(row => !row["Feature 1"].includes("VisitDate"))).toBe(true);
});

it("does not export stale numerical values or category distributions from an unavailable pooled summary", () => {
  const fixture = reportFixture();
  const feature = fixture.data.continuousFeatures[0];
  const data = { continuousFeatures: [{ ...feature, combinedSummary: { ...feature.combinedSummary, mean: 123, unavailable: "Withheld by a source" } }] };
  const rows = sheetRecords(buildStatisticsReport({ ...fixture, data, includeBreakdown: false }), "Feature summaries");
  expect(rows[0]).toMatchObject({ Mean: null, "Non-missing count": null, Status: "Withheld by a source" });
});

it("preserves approved source bins and date frequencies without inventing pooled bins", () => {
  const fixture = reportFixture();
  Object.assign(fixture.sources[0].continuousFeatures[0], { histogram: [24], binRanges: ["[16, 24]"], histogramStatus: "COARSENED" });
  const rows = sheetRecords(buildStatisticsReport(fixture), "Source distributions");
  expect(rows.find(row => row.Feature === "Age")).toMatchObject({ "Node ID": "1", Count: 24, Status: "Coarsened bins", "Bin or date": "[16, 24]" });
  expect(rows.filter(row => row.Type === "Date")).toHaveLength(4);
  expect(rows.every(row => row["Node ID"])).toBe(true);
});

it("does not add an empty relationship worksheet when a single feature is exported", () => {
  const fixture = reportFixture();
  const sheets = buildStatisticsReport({ ...fixture, includeRelationships: true, selectedOnly: true, selectedEntries: [fixture.data.continuousFeatures[0]] });
  expect(sheets.some(sheet => sheet.name === "Relationships")).toBe(false);
  expect(sheetRecords(sheets, "Report details").find(row => row.Topic === "Relationships").Details).toContain("0 results");
});

it("produces the same UTF-8 CSV tables in one archive and protects formula-like text", async () => {
  const sheets = [{ name: "Feature summaries", rows: [["Feature", "Mean"], ['=HYPERLINK("x")', 0], ["Güttmann, age", 1.23456789123]] }];
  const blob = await writeStatisticsReport(sheets, "csv");
  const files = unzipSync(await bytes(blob));
  const csv = strFromU8(files["feature_summaries.csv"]);
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('"0"');
  expect(csv).toContain("Güttmann, age");
  expect(csv).toContain("1.23456789123");
  await expect(writeStatisticsReport(sheets, "html")).rejects.toThrow("Choose");
});

it("writes a real multi-sheet workbook with numeric precision, literal strings, styled headers and frozen panes", async () => {
  const sheets = [{ name: "Feature summaries", rows: [["Feature", "Mean"], ["=1+1", 1.23456789123], ["Zero", 0]] },
    { name: "Report details", rows: [["Topic", "Details"], ["Cohort", "Cluster (= 1)"]] }];
  const blob = await writeStatisticsReport(sheets, "xlsx");
  const files = unzipSync(await bytes(blob));
  const xml = strFromU8(files["xl/worksheets/sheet1.xml"]);
  expect(xml).toContain("1.23456789123");
  expect(strFromU8(files["xl/sharedStrings.xml"])).toContain("=1+1");
  expect(xml).not.toContain("<f>");
  expect(xml).toContain('state="frozen"');
  expect(strFromU8(files["xl/workbook.xml"])).toContain("Report details");
});

it("exports numerical CI bounds, skewness and every tied mode as numbers without reusing category summaries", async () => {
  const fixture = reportFixture();
  const feature = fixture.data.continuousFeatures[0];
  Object.assign(feature.combinedSummary, { meanCiLower: 12.123456789, meanCiUpper: 20.987654321,
    skewness: -0.1231518341349694, kurtosis: -2.000988630746416, sampleStdDev: 1.8237562766229864,
    modes: [0, 4], modeFrequency: 12, modeStatus: "Available" });
  const sheets = buildStatisticsReport({ ...fixture, selectedOnly: true, selectedEntries: [feature], includeBreakdown: false });
  const row = sheetRecords(sheets, "Feature summaries")[0];
  expect(row).toMatchObject({ "Mean 95% CI lower": 12.123456789, "Mean 95% CI upper": 20.987654321,
    Skewness: -0.1231518341349694, Kurtosis: -2.000988630746416, "Sample SD": 1.8237562766229864,
    Mode: 0, "Mode count": 12, "Mode status": "Available" });
  expect(sheetRecords(sheets, "Numerical modes").map(row => row.Mode)).toEqual([0, 4]);
  const csv = unzipSync(await bytes(await writeStatisticsReport(sheets, "csv")));
  expect(strFromU8(csv["feature_summaries.csv"])).toContain("12.123456789");
  expect(strFromU8(csv["numerical_modes.csv"])).toContain('"0"');
  const xlsx = unzipSync(await bytes(await writeStatisticsReport(sheets, "xlsx")));
  expect(strFromU8(xlsx["xl/worksheets/sheet1.xml"])).toContain("-0.1231518341349694");
});
