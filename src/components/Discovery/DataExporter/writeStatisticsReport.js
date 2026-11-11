import writeExcelFile from "write-excel-file/universal";
import { zipSync, strToU8 } from "fflate";
import { statisticsCsvRows } from "../../../util/statisticsCsv";

const headerStyle = { fontWeight: "bold", backgroundColor: "#0b2a33", textColor: "#ffffff", wrap: true };

export function workbookSheets(sheets) {
  return sheets.map(sheet => ({
    sheet: sheet.name,
    stickyRowsCount: 1, stickyColumnsCount: 1,
    showGridLines: false,
    columns: sheet.rows[0].map((header, column) => ({ width: Math.min(46, Math.max(15, String(header).length + 2,
      ...sheet.rows.slice(1, 100).map(row => Math.min(40, String(row[column] ?? "").length + 2)))) })),
    data: sheet.rows.map((row, index) => row.map((value, column) => value == null ? null : {
      value,
      ...(index === 0 ? headerStyle : {
        backgroundColor: index % 2 ? "#f2f6f7" : "#ffffff",
        verticalAlign: "top",
        ...(typeof value === "number" ? { format: sheet.rows[0][column].includes("%") ? '0.00"%"' : Number.isInteger(value) ? "#,##0" : "0.0000" } : { wrap: true }),
      }),
    })),
  }));
}

export async function writeStatisticsReport(sheets, format) {
  if (format === "xlsx") return writeExcelFile(workbookSheets(sheets), { fontFamily: "Calibri", fontSize: 11 }).toBlob();
  if (format !== "csv") throw new Error("Choose an Excel workbook or CSV tables.");
  const files = Object.fromEntries(sheets.map(sheet => [
    `${sheet.name.toLowerCase().replaceAll(" ", "_")}.csv`, strToU8(`\uFEFF${statisticsCsvRows(sheet.rows)}`),
  ]));
  return new Blob([zipSync(files)], { type: "application/zip" });
}
