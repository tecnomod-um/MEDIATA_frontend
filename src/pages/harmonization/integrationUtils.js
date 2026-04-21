import Papa from "papaparse";

/**
 * Pure utility functions extracted from integration.jsx.
 * None of these functions depend on React state or hooks.
 */

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

export const parseCSV = (text) => {
  const result = Papa.parse(String(text ?? ""), {
    skipEmptyLines: "greedy",
  });

  return (result.data || []).map((row) => {
    const cells = Array.isArray(row) ? row : [];
    const [column, ...values] = cells;

    return {
      column: typeof column === "string" ? column.replace(/^\uFEFF/, "").trim() : "",
      values: values.map((value) => (typeof value === "string" ? value.trim() : value)),
    };
  });
};

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

export const formatValue = (value, type) => {
  if (type === "date") {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date) ? date.toISOString().split("T")[0] : "";
  }
  return value !== undefined && value !== null ? value.toString() : "";
};

// ---------------------------------------------------------------------------
// Hierarchy extraction from backend response
// ---------------------------------------------------------------------------

export const extractHierarchy = (res) => {
  const r = res && typeof res === "object" ? res : null;
  const hierarchy = r?.hierarchy;
  return Array.isArray(hierarchy) ? hierarchy : [];
};

// ---------------------------------------------------------------------------
// Enrich progress helpers
// ---------------------------------------------------------------------------

export const normalizeEnrichStep = (msg) => {
  const m = String(msg || "").trim();
  if (!m) return "";
  return m.replace(/\(batch\s+\d+\s*\/\s*\d+\)/i, "").trim();
};

// ---------------------------------------------------------------------------
// Column data merging
// ---------------------------------------------------------------------------

export const mergeColumnsData = (existingData, newData) => {
  const mergedData = [...existingData];
  newData.forEach((row) => {
    const existingColumn = mergedData.find(
      (item) => item.column === row.column && item.fileName === row.fileName
    );
    if (existingColumn) {
      existingColumn.values = Array.from(new Set([...existingColumn.values, ...row.values]));
      existingColumn.nodeId = row.nodeId;
    } else {
      mergedData.push(row);
    }
  });
  return mergedData;
};

// ---------------------------------------------------------------------------
// Draft building helpers (used when opening a mapping for editing)
// ---------------------------------------------------------------------------

export const makeId = () => crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;

/**
 * Collects the distinct column references embedded inside a mapping's groups
 * and resolves them against the full columnsData array.
 */
export const buildGroupsFromMapping = (mapping, columnsData) => {
  const refs = new Map();

  (mapping?.groups || []).forEach((g) => {
    (g?.values || []).forEach((v) => {
      (v?.mapping || []).forEach((m) => {
        const key = `${m.nodeId}::${m.fileName}::${m.groupColumn}`;
        refs.set(key, { nodeId: m.nodeId, fileName: m.fileName, column: m.groupColumn });
      });
    });
  });

  const groups = [];
  for (const ref of refs.values()) {
    const col = columnsData.find(
      (c) => c.nodeId === ref.nodeId && c.fileName === ref.fileName && c.column === ref.column
    );
    if (col) groups.push(col);
  }
  return groups;
};

/**
 * Builds the initial draft state for a standard (non-one-hot) mapping that is
 * about to be opened in the ColumnMapping editor.
 */
export const buildStandardDraft = (mappingKey, mapping, columnsData) => {
  const values = mapping?.groups?.[0]?.values || [];

  const customValues = values.map((v) => ({
    id: makeId(),
    name: v?.name || "",
    snomedTerm: v?.terminology || "",
    mapping: v?.mapping || [],
  }));

  const valueDescriptions = {};
  customValues.forEach((cv, i) => {
    valueDescriptions[cv.id] = values[i]?.description || "";
  });

  return {
    groups: buildGroupsFromMapping(mapping, columnsData),
    unionName: mappingKey,
    unionTerminology: mapping?.terminology || "",
    unionDescription: mapping?.description || "",
    useHotOneMapping: false,
    removeFromHierarchy: false,
    customValues,
    valueDescriptions,
  };
};

/**
 * Returns all one-hot mappings belonging to the same base name, sorted by key.
 */
export const collectOneHotFamily = (mappings, base) => {
  const found = [];
  mappings.forEach((obj) => {
    Object.entries(obj).forEach(([k, m]) => {
      if (m?.mappingType === "one-hot" && k.startsWith(base + "_")) {
        found.push({ key: k, mapping: m });
      }
    });
  });
  found.sort((a, b) => a.key.localeCompare(b.key));
  return found;
};

/**
 * Builds the initial draft state for a one-hot mapping family that is about to
 * be opened in the ColumnMapping editor.
 */
export const buildOneHotDraft = (selectedKey, mappings, columnsData) => {
  const base = selectedKey.slice(0, selectedKey.lastIndexOf("_"));
  if (!base) return null;

  const family = collectOneHotFamily(mappings, base);
  if (!family.length) return null;

  const first = family[0].mapping;

  const customValues = [];
  const valueDescriptions = {};

  family.forEach(({ key, mapping }) => {
    const suffix = key.slice(base.length + 1);
    const ones = mapping?.groups?.[0]?.values?.find((v) => v.name === "1");
    const id = makeId();

    customValues.push({
      id,
      name: suffix,
      snomedTerm: ones?.terminology || "",
      mapping: ones?.mapping || [],
    });

    valueDescriptions[id] = ones?.description || "";
  });

  return {
    groups: buildGroupsFromMapping(first, columnsData),
    unionName: base,
    unionTerminology: first?.terminology || "",
    unionDescription: first?.description || "",
    useHotOneMapping: true,
    removeFromHierarchy: false,
    customValues,
    valueDescriptions,
  };
};
