function normalizeSchema(schema) {
  if (!schema) return null;

  if (typeof schema === "string") {
    try {
      return JSON.parse(schema);
    } catch {
      return null;
    }
  }

  return schema;
}

function makeSourceId(nodeId, fileName) {
  return `${nodeId}::${fileName}`;
}

function makeVarName(sourceId, column) {
  return `${sourceId}::${column}`;
}

function normalizePrimitive(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildInputFromMappingEntry(mappingEntry) {
  return {
    sourceId: makeSourceId(mappingEntry.nodeId, mappingEntry.fileName),
    column: mappingEntry.groupColumn,
  };
}

function buildExactLogic(mappingEntry) {
  const sourceId = makeSourceId(mappingEntry.nodeId, mappingEntry.fileName);

  return {
    "==": [
      { var: makeVarName(sourceId, mappingEntry.groupColumn) },
      normalizePrimitive(mappingEntry.value),
    ],
  };
}

function buildTypeLogic(mappingEntry) {
  const sourceId = makeSourceId(mappingEntry.nodeId, mappingEntry.fileName);
  const valueType = normalizePrimitive(mappingEntry.value).trim().toLowerCase();
  const variableRef = { var: makeVarName(sourceId, mappingEntry.groupColumn) };

  if (valueType === "integer") {
    return { is_integer: [variableRef] };
  }

  if (valueType === "double") {
    return { is_number: [variableRef] };
  }

  if (valueType === "date") {
    return { is_date: [variableRef] };
  }

  return { "==": [variableRef, normalizePrimitive(mappingEntry.value)] };
}

function buildRangeLogic(mappingEntry) {
  const sourceId = makeSourceId(mappingEntry.nodeId, mappingEntry.fileName);
  const valueType = normalizePrimitive(mappingEntry.value?.type).trim().toLowerCase();
  const variableRef = { var: makeVarName(sourceId, mappingEntry.groupColumn) };

  if (valueType === "date") {
    return {
      and: [
        {
          ">=": [
            { to_date: [variableRef] },
            normalizePrimitive(mappingEntry.value?.minValue),
          ],
        },
        {
          "<=": [
            { to_date: [variableRef] },
            normalizePrimitive(mappingEntry.value?.maxValue),
          ],
        },
      ],
    };
  }

  return {
    and: [
      {
        ">=": [
          { to_number: [variableRef] },
          normalizeNumber(mappingEntry.value?.minValue),
        ],
      },
      {
        "<=": [
          { to_number: [variableRef] },
          normalizeNumber(mappingEntry.value?.maxValue),
        ],
      },
    ],
  };
}

function buildLogicClause(mappingEntry) {
  const rawValue = mappingEntry?.value;

  if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
    return buildRangeLogic(mappingEntry);
  }

  if (typeof rawValue === "string") {
    const lowered = rawValue.trim().toLowerCase();
    if (lowered === "integer" || lowered === "double" || lowered === "date") {
      return buildTypeLogic(mappingEntry);
    }
  }

  return buildExactLogic(mappingEntry);
}

function combineLogicWithOr(clauses) {
  const cleanClauses = (clauses || []).filter(Boolean);

  if (cleanClauses.length === 0) return null;
  if (cleanClauses.length === 1) return cleanClauses[0];

  return { or: cleanClauses };
}

function collectInputsFromEntries(mappingEntries) {
  const dedup = new Map();

  (mappingEntries || []).forEach((entry) => {
    const input = buildInputFromMappingEntry(entry);
    const key = `${input.sourceId}::${input.column}`;

    if (!dedup.has(key)) {
      dedup.set(key, input);
    }
  });

  return Array.from(dedup.values());
}

function collectSourcesFromEntries(mappingEntries) {
  const dedup = new Map();

  (mappingEntries || []).forEach((entry) => {
    const sourceId = makeSourceId(entry.nodeId, entry.fileName);
    const sep = sourceId.indexOf("::");
    const nodeId = sep >= 0 ? sourceId.slice(0, sep) : "";
    const fileName = sep >= 0 ? sourceId.slice(sep + 2) : sourceId;

    if (!dedup.has(sourceId)) {
      dedup.set(sourceId, {
        sourceId,
        nodeId,
        fileName,
      });
    }
  });

  return Array.from(dedup.values());
}

function isTypePassthroughEntry(mappingEntry) {
  const rawValue = mappingEntry?.value;
  if (typeof rawValue !== "string") return false;

  const lowered = rawValue.trim().toLowerCase();
  return lowered === "integer" || lowered === "double" || lowered === "date";
}

function buildStandardRule(valueObj, ruleIndex) {
  const mappingEntries = valueObj?.mapping || [];
  const logicClauses = mappingEntries.map(buildLogicClause);
  const logic = combineLogicWithOr(logicClauses);

  const passthroughEntry = mappingEntries.find(isTypePassthroughEntry);

  return {
    id: `rule-${ruleIndex}`,
    logic,
    then: passthroughEntry
      ? {
          kind: "source-value",
          sourceId: makeSourceId(passthroughEntry.nodeId, passthroughEntry.fileName),
          column: passthroughEntry.groupColumn,
        }
      : {
          kind: "constant",
          value: normalizePrimitive(valueObj?.name),
        },
    metadata: {
      terminology: normalizePrimitive(valueObj?.terminology),
      description: normalizePrimitive(valueObj?.description),
    },
  };
}

function buildTypePassthroughRule(valueObj, mappingEntry, ruleIndex) {
  return {
    id: `rule-${ruleIndex}`,
    logic: buildTypeLogic(mappingEntry),
    then: {
      kind: "source-value",
      sourceId: makeSourceId(mappingEntry.nodeId, mappingEntry.fileName),
      column: mappingEntry.groupColumn,
    },
    metadata: {
      terminology: normalizePrimitive(valueObj?.terminology),
      description: normalizePrimitive(valueObj?.description),
    },
  };
}

function buildStandardRules(valueObj, ruleIndexPrefix) {
  const mappingEntries = valueObj?.mapping || [];
  const passthroughEntries = mappingEntries.filter(isTypePassthroughEntry);

  if (passthroughEntries.length > 0) {
    return passthroughEntries.map((entry, entryIndex) =>
      buildTypePassthroughRule(valueObj, entry, `${ruleIndexPrefix}-${entryIndex}`)
    );
  }

  return [buildStandardRule(valueObj, ruleIndexPrefix)];
}

function buildStandardMapping(mappingKey, mapping, mappingIndex) {
  const values = mapping?.groups?.flatMap((group) => group?.values || []) || [];
  const rules = values.flatMap((valueObj, valueIndex) =>
    buildStandardRules(valueObj, `${mappingIndex}-${valueIndex}`)
  );

  const allEntries = values.flatMap((valueObj) => valueObj?.mapping || []);
  const inputs = collectInputsFromEntries(allEntries);

  return {
    id: `map-${mappingIndex}-${mappingKey}`,
    targetField: mappingKey,
    mappingType: "standard",
    sourceConfigFile: normalizePrimitive(mapping?.fileName),
    inputs,
    rules,
    metadata: {
      terminology: normalizePrimitive(mapping?.terminology),
      description: normalizePrimitive(mapping?.description),
    },
    removeSourceColumns: false,
  };
}

function buildOneHotOutput(mappingKey, mapping) {
  const oneValue = (mapping?.groups?.[0]?.values || []).find((v) => v?.name === "1");
  const mappingEntries = oneValue?.mapping || [];
  const logicClauses = mappingEntries.map(buildLogicClause);

  return {
    targetField: mappingKey,
    logic: combineLogicWithOr(logicClauses),
    trueValue: "1",
    falseValue: "0",
    metadata: {
      terminology: normalizePrimitive(oneValue?.terminology),
      description: normalizePrimitive(oneValue?.description),
    },
  };
}

function groupOneHotFamilies(mappings) {
  const families = new Map();

  mappings.forEach((mappingObj, mappingIndex) => {
    Object.entries(mappingObj || {}).forEach(([mappingKey, mapping]) => {
      if (mapping?.mappingType !== "one-hot") return;

      const pos = mappingKey.lastIndexOf("_");
      const base = pos >= 0 ? mappingKey.slice(0, pos) : mappingKey;

      if (!families.has(base)) {
        families.set(base, []);
      }

      families.get(base).push({
        mappingIndex,
        mappingKey,
        mapping,
      });
    });
  });

  return families;
}

function buildOneHotFamilyMapping(baseName, familyEntries, familyIndex) {
  const sortedFamily = familyEntries
    .slice()
    .sort((a, b) => a.mappingKey.localeCompare(b.mappingKey));

  const outputs = sortedFamily.map((entry) =>
    buildOneHotOutput(entry.mappingKey, entry.mapping)
  );

  const allEntries = sortedFamily.flatMap((entry) => {
    const oneValue = (entry.mapping?.groups?.[0]?.values || []).find((v) => v?.name === "1");
    return oneValue?.mapping || [];
  });

  const inputs = collectInputsFromEntries(allEntries);
  const first = sortedFamily[0]?.mapping;

  return {
    id: `onehot-${familyIndex}-${baseName}`,
    groupName: baseName,
    mappingType: "one-hot",
    inputs,
    outputs,
    metadata: {
      terminology: normalizePrimitive(first?.terminology),
      description: normalizePrimitive(first?.description),
    },
    removeSourceColumns: false,
  };
}

function buildDatasetBindings(selectedDatasets) {
  const bindings = [];

  Object.entries(selectedDatasets || {}).forEach(([sourceKey, datasets]) => {
    if (!Array.isArray(datasets) || datasets.length === 0) return;

    const sep = String(sourceKey).indexOf("::");
    const nodeId = sep >= 0 ? String(sourceKey).slice(0, sep) : "";
    const elementFileName = sep >= 0 ? String(sourceKey).slice(sep + 2) : String(sourceKey);

    bindings.push({
      sourceId: makeSourceId(nodeId, elementFileName),
      nodeId,
      elementFileName,
      datasets: Array.from(
        new Set(
          datasets.map((x) => normalizePrimitive(x).trim()).filter(Boolean)
        )
      ),
    });
  });

  return bindings;
}

export function buildMappingSpec({ mappings, schema, selectedDatasets }) {
  const safeMappings = Array.isArray(mappings) ? mappings : [];

  const oneHotFamilies = groupOneHotFamilies(safeMappings);
  const consumedOneHotKeys = new Set();
  const specMappings = [];
  const allReferencedEntries = [];

  safeMappings.forEach((mappingObj, mappingIndex) => {
    Object.entries(mappingObj || {}).forEach(([mappingKey, mapping]) => {
      if (!mapping || typeof mapping !== "object") return;

      if (mapping.mappingType === "one-hot") {
        const pos = mappingKey.lastIndexOf("_");
        const base = pos >= 0 ? mappingKey.slice(0, pos) : mappingKey;

        if (consumedOneHotKeys.has(base)) return;

        const family = oneHotFamilies.get(base) || [];
        if (!family.length) return;

        specMappings.push(buildOneHotFamilyMapping(base, family, mappingIndex));

        family.forEach((entry) => {
          const oneValue = (entry.mapping?.groups?.[0]?.values || []).find((v) => v?.name === "1");
          allReferencedEntries.push(...(oneValue?.mapping || []));
        });

        consumedOneHotKeys.add(base);
        return;
      }

      specMappings.push(buildStandardMapping(mappingKey, mapping, mappingIndex));

      const values = mapping?.groups?.flatMap((group) => group?.values || []) || [];
      values.forEach((valueObj) => {
        allReferencedEntries.push(...(valueObj?.mapping || []));
      });
    });
  });

  const sources = collectSourcesFromEntries(allReferencedEntries);
  const datasetBindings = buildDatasetBindings(selectedDatasets);

  return {
    specVersion: "2.0.0",
    ruleLanguage: "json-logic",
    targetSchema: normalizeSchema(schema),
    sources,
    datasetBindings,
    mappings: specMappings,
  };
}
