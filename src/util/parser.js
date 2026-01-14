// Utility functions for converting JSON to CSV format
export const jsonToCSV = (jsonArray) => {
  const csvRows = [];

  const headers = Object.keys(jsonArray[0]);
  csvRows.push(headers.join(","));

  jsonArray.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      return typeof value === "string" || value instanceof String
        ? value
        : value.toString();
    });
    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
}
