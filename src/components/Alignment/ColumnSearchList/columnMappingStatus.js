export const columnReferenceKey = (column) =>
  `${column?.nodeId ?? ""}::${column?.fileName ?? ""}::${column?.column ?? ""}`;

const mappingReferencesColumn = (mapping, column) => {
  const expected = columnReferenceKey(column);

  return (mapping?.groups || []).some((group) =>
    (group?.values || []).some((value) =>
      (value?.mapping || []).some(
        (entry) =>
          `${entry?.nodeId ?? ""}::${entry?.fileName ?? ""}::${entry?.groupColumn ?? ""}` === expected
      )
    )
  );
};

const isDefaultTarget = (mappingKey, mapping, column) =>
  mappingKey === column?.column &&
  String(mapping?.fileName || "") === String(column?.fileName || "") &&
  mappingReferencesColumn(mapping, column);

export const getColumnMappingTargets = (column, mappings) => {
  const targets = [];

  (mappings || []).forEach((mappingObject, mappingIndex) => {
    Object.entries(mappingObject || {}).forEach(([mappingKey, mapping]) => {
      if (!mappingReferencesColumn(mapping, column)) return;

      const isDefault = isDefaultTarget(mappingKey, mapping, column);
      targets.push({
        id: `${mappingIndex}::${mappingKey}`,
        mappingIndex,
        mappingKey,
        label: mappingKey,
        terminology: String(mapping?.terminology || "").trim(),
        kind: isDefault ? "default" : "custom",
      });
    });
  });

  return targets.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "custom" ? -1 : 1;
    return left.label.localeCompare(right.label);
  });
};

export const getColumnMappingStatuses = (mappings) => {
  const statuses = new Map();
  (mappings || []).forEach((mappingObject) => {
    Object.entries(mappingObject || {}).forEach(([mappingKey, mapping]) => {
      (mapping?.groups || []).forEach((group) => {
        (group?.values || []).forEach((value) => {
          (value?.mapping || []).forEach((entry) => {
            const key = `${entry?.nodeId ?? ""}::${entry?.fileName ?? ""}::${entry?.groupColumn ?? ""}`;
            const isDefault = mappingKey === entry?.groupColumn &&
              String(mapping?.fileName || "") === String(entry?.fileName || "");
            if (!isDefault || !statuses.has(key)) {
              statuses.set(key, isDefault ? "Default" : "Custom");
            }
          });
        });
      });
    });
  });
  return statuses;
};

export const parseTerminology = (terminology) => {
  const raw = String(terminology || "").trim();
  if (!raw) return { label: "", code: "" };

  const separatorIndex = raw.lastIndexOf("|");
  if (separatorIndex < 0) return { label: raw, code: "" };

  return {
    label: raw.slice(0, separatorIndex).trim(),
    code: raw.slice(separatorIndex + 1).trim(),
  };
};

export const inferColumnType = (column) => {
  const values = (column?.values || []).map((value) => String(value).trim().toLowerCase());
  if (values.includes("integer")) return "Integer";
  if (values.includes("double")) return "Decimal";
  if (values.includes("date")) return "Date";
  if (values.length && values.every((value) => value === "true" || value === "false")) {
    return "Boolean";
  }
  return "Categorical";
};
