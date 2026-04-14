function normalizePrimitive(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeValuePayload(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      type: normalizePrimitive(value.type).toLowerCase(),
      minValue: value.minValue ?? null,
      maxValue: value.maxValue ?? null,
    };
  }

  const normalized = normalizePrimitive(value);
  const lowered = normalized.toLowerCase();

  if (lowered === "integer" || lowered === "double" || lowered === "date") {
    return lowered;
  }

  return normalized;
}

function normalizeMatchEntry(match) {
  return {
    ...(match.groupKey ? { groupKey: normalizePrimitive(match.groupKey) } : {}),
    ...(match.nodeId ? { nodeId: normalizePrimitive(match.nodeId) } : {}),
    ...(match.fileName ? { fileName: normalizePrimitive(match.fileName) } : {}),
    groupColumn: normalizePrimitive(match.groupColumn),
    value: normalizeValuePayload(match.value),
  };
}

function normalizeValue(valueObj) {
  return {
    name: normalizePrimitive(valueObj?.name),
    terminology: normalizePrimitive(valueObj?.terminology),
    description: normalizePrimitive(valueObj?.description),
    mapping: Array.isArray(valueObj?.mapping)
      ? valueObj.mapping.map(normalizeMatchEntry)
      : [],
  };
}

function normalizeGroup(group) {
  return {
    column: normalizePrimitive(group?.column),
    values: Array.isArray(group?.values)
      ? group.values.map(normalizeValue)
      : [],
  };
}

function normalizeConfigDetails(details) {
  return {
    fileName: normalizePrimitive(details?.fileName),
    mappingType: normalizePrimitive(details?.mappingType || "default"),
    columns: Array.isArray(details?.columns)
      ? details.columns.map((c) => normalizePrimitive(c))
      : [],
    terminology: normalizePrimitive(details?.terminology),
    description: normalizePrimitive(details?.description),
    groups: Array.isArray(details?.groups)
      ? details.groups.map(normalizeGroup)
      : [],
  };
}

export function buildMappingSpec({ mappings }) {
  const safeMappings = Array.isArray(mappings) ? mappings : [];

  return safeMappings.map((mappingObj) => {
    const out = {};

    Object.entries(mappingObj || {}).forEach(([mappingKey, details]) => {
      out[normalizePrimitive(mappingKey)] = normalizeConfigDetails(details);
    });

    return out;
  });
}