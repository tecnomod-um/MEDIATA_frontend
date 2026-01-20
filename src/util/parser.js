// Utility JSON related functions
export const jsonToCSV = (jsonArray) => {
  const csvRows = [];

  const headers = Object.keys(jsonArray[0]);
  csvRows.push(headers.join(","));

  jsonArray.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      return typeof value === "string" || value instanceof String ? value : String(value);
    });
    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
};

export const parseJson = (text, fallback = null) => {
  try {
    const s = String(text ?? "").trim();
    if (!s) return { ok: true, value: fallback };
    return { ok: true, value: JSON.parse(s) };
  } catch (e) {
    return { ok: false, error: e };
  }
};

export const parseJsonObject = (text, options = {}) => {
  const {
    fallback = {},
    allowEmpty = true,
  } = options;

  const s = String(text ?? "").trim();

  if (!s) {
    if (!allowEmpty) return { ok: false, error: new Error("Empty JSON") };
    return { ok: true, value: fallback };
  }

  const res = parseJson(s, fallback);
  if (!res.ok) return res;

  const v = res.value;
  const isPlainObject = v && typeof v === "object" && !Array.isArray(v);
  if (!isPlainObject) return { ok: false, error: new Error("Not a JSON object") };

  return { ok: true, value: v };
};
