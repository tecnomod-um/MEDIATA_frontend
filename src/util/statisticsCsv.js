// Shared encoding for statistics exports, including source labels and category text.
export function statisticsCsvRows(rows) {
  return rows.map(row => row.map(value => {
    const text = String(value ?? "");
    const numeric = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text);
    const formula = /^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text);
    const safe = formula && !numeric ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function statisticsObjectsCsv(records) {
  if (!records.length) return "";
  const headers = Object.keys(records[0]);
  return statisticsCsvRows([headers, ...records.map(record => headers.map(header => record[header]))]);
}
