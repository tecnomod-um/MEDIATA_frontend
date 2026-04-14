function normalizeUploadedSpec(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("Uploaded file is not a valid mapping spec object.");
  }

  if (!Array.isArray(spec.mappings)) {
    throw new Error("Uploaded file does not contain a valid mappings array.");
  }

  return spec;
}

function parseSourceId(sourceId) {
  const raw = String(sourceId || "");
  const sep = raw.indexOf("::");

  if (sep < 0) {
    return {
      nodeId: "",
      fileName: raw,
    };
  }

  return {
    nodeId: raw.slice(0, sep),
    fileName: raw.slice(sep + 2),
  };
}

function parseVarName(varName) {
  const raw = String(varName || "");
  const lastSep = raw.lastIndexOf("::");

  if (lastSep < 0) {
    return {
      sourceId: "",
      nodeId: "",
      fileName: "",
      column: raw,
    };
  }

  const sourceId = raw.slice(0, lastSep);
  const column = raw.slice(lastSep + 2);
  const { nodeId, fileName } = parseSourceId(sourceId);

  return {
    sourceId,
    nodeId,
    fileName,
    column,
  };
}

function unwrapJsonLogicArgs(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function extractLogicEntries(logic) {
  if (!logic || typeof logic !== "object" || Array.isArray(logic)) {
    return [];
  }

  if (logic.or) {
    return unwrapJsonLogicArgs(logic.or).flatMap(extractLogicEntries);
  }

  if (logic["=="]) {
    const args = unwrapJsonLogicArgs(logic["=="]);
    if (args.length !== 2) return [];

    const [left, right] = args;

    if (left?.var) {
      const ref = parseVarName(left.var);
      return [
        {
          nodeId: ref.nodeId,
          fileName: ref.fileName,
          groupColumn: ref.column,
          value: String(right ?? ""),
        },
      ];
    }

    if (right?.var) {
      const ref = parseVarName(right.var);
      return [
        {
          nodeId: ref.nodeId,
          fileName: ref.fileName,
          groupColumn: ref.column,
          value: String(left ?? ""),
        },
      ];
    }

    return [];
  }

  if (logic.is_integer) {
    const args = unwrapJsonLogicArgs(logic.is_integer);
    const refArg = args[0];
    if (!refArg?.var) return [];
    const ref = parseVarName(refArg.var);

    return [
      {
        nodeId: ref.nodeId,
        fileName: ref.fileName,
        groupColumn: ref.column,
        value: "integer",
      },
    ];
  }

  if (logic.is_number) {
    const args = unwrapJsonLogicArgs(logic.is_number);
    const refArg = args[0];
    if (!refArg?.var) return [];
    const ref = parseVarName(refArg.var);

    return [
      {
        nodeId: ref.nodeId,
        fileName: ref.fileName,
        groupColumn: ref.column,
        value: "double",
      },
    ];
  }

  if (logic.is_date) {
    const args = unwrapJsonLogicArgs(logic.is_date);
    const refArg = args[0];
    if (!refArg?.var) return [];
    const ref = parseVarName(refArg.var);

    return [
      {
        nodeId: ref.nodeId,
        fileName: ref.fileName,
        groupColumn: ref.column,
        value: "date",
      },
    ];
  }

  if (logic.and) {
    const clauses = unwrapJsonLogicArgs(logic.and);

    let lower = null;
    let upper = null;

    clauses.forEach((clause) => {
      if (!clause || typeof clause !== "object" || Array.isArray(clause)) return;

      if (clause[">="]) {
        const args = unwrapJsonLogicArgs(clause[">="]);
        if (args.length === 2) lower = args;
      }

      if (clause["<="]) {
        const args = unwrapJsonLogicArgs(clause["<="]);
        if (args.length === 2) upper = args;
      }
    });

    if (!lower || !upper) return [];

    const lowerLeft = lower[0];
    const upperLeft = upper[0];

    const lowerVar = lowerLeft?.to_number?.[0]?.var
      || lowerLeft?.to_date?.[0]?.var
      || lowerLeft?.var;

    const upperVar = upperLeft?.to_number?.[0]?.var
      || upperLeft?.to_date?.[0]?.var
      || upperLeft?.var;

    if (!lowerVar || !upperVar || lowerVar !== upperVar) return [];

    const ref = parseVarName(lowerVar);
    const isDateRange = !!(lowerLeft?.to_date || upperLeft?.to_date);

    return [
      {
        nodeId: ref.nodeId,
        fileName: ref.fileName,
        groupColumn: ref.column,
        value: {
          type: isDateRange ? "date" : "double",
          minValue: lower[1] ?? null,
          maxValue: upper[1] ?? null,
        },
      },
    ];
  }

  return [];
}

function collectSpecSources(spec) {
  const found = new Map();

  (spec?.sources || []).forEach((source) => {
    const sourceId = String(source?.sourceId || "");
    if (!sourceId) return;

    const { nodeId, fileName } = parseSourceId(sourceId);
    if (!nodeId || !fileName) return;

    found.set(`${nodeId}::${fileName}`, { nodeId, fileName });
  });

  (spec?.mappings || []).forEach((mappingDef) => {
    (mappingDef?.inputs || []).forEach((input) => {
      const sourceId = String(input?.sourceId || "");
      if (!sourceId) return;

      const { nodeId, fileName } = parseSourceId(sourceId);
      if (!nodeId || !fileName) return;

      found.set(`${nodeId}::${fileName}`, { nodeId, fileName });
    });

    (mappingDef?.rules || []).forEach((rule) => {
      extractLogicEntries(rule?.logic).forEach((entry) => {
        if (!entry.nodeId || !entry.fileName) return;
        found.set(`${entry.nodeId}::${entry.fileName}`, {
          nodeId: entry.nodeId,
          fileName: entry.fileName,
        });
      });
    });

    (mappingDef?.outputs || []).forEach((output) => {
      extractLogicEntries(output?.logic).forEach((entry) => {
        if (!entry.nodeId || !entry.fileName) return;
        found.set(`${entry.nodeId}::${entry.fileName}`, {
          nodeId: entry.nodeId,
          fileName: entry.fileName,
        });
      });
    });
  });

  return Array.from(found.values());
}

function buildGroupsFromLoadedEntries(entries) {
  const grouped = new Map();

  (entries || []).forEach((entry) => {
    const key = `${entry.nodeId}::${entry.fileName}::${entry.groupColumn}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        column: entry.groupColumn,
        nodeId: entry.nodeId,
        fileName: entry.fileName,
        values: [],
      });
    }

    const group = grouped.get(key);
    const alreadyExists = group.values.some((v) => {
      if (typeof v === "object" && typeof entry.value === "object") {
        return JSON.stringify(v) === JSON.stringify(entry.value);
      }
      return v === entry.value;
    });

    if (!alreadyExists) {
      group.values.push(entry.value);
    }
  });

  return Array.from(grouped.values());
}

function rebuildStandardMappingFromSpec(mappingDef) {
  const targetField = String(mappingDef?.targetField || "").trim();
  if (!targetField) return null;

  const values = (mappingDef?.rules || []).map((rule) => {
    const entries = extractLogicEntries(rule?.logic);
    const thenObj = rule?.then || {};

    return {
      name: thenObj?.kind === "constant" ? String(thenObj?.value ?? "") : "",
      mapping: entries.map((entry) => ({
        groupKey: `${entry.nodeId}::${entry.fileName}::${entry.groupColumn}`,
        groupColumn: entry.groupColumn,
        fileName: entry.fileName,
        nodeId: entry.nodeId,
        value: entry.value,
      })),
      terminology: rule?.metadata?.terminology || "",
      description: rule?.metadata?.description || "",
    };
  });

  const allEntries = values.flatMap((v) => v.mapping || []);
  const groups = buildGroupsFromLoadedEntries(allEntries);

  return {
    [targetField]: {
      mappingType: "standard",
      fileName: mappingDef?.sourceConfigFile || "custom_mapping",
      columns: groups.map((g) => g.column),
      terminology: mappingDef?.metadata?.terminology || "",
      description: mappingDef?.metadata?.description || "",
      groups: [
        {
          column: targetField,
          values,
        },
      ],
    },
  };
}

function rebuildOneHotMappingsFromSpec(mappingDef) {
  const baseName = String(mappingDef?.groupName || "").trim();
  if (!baseName) return null;

  const family = {};

  (mappingDef?.outputs || []).forEach((output) => {
    const targetField = String(output?.targetField || "").trim();
    if (!targetField) return;

    const entries = extractLogicEntries(output?.logic);
    const groups = buildGroupsFromLoadedEntries(entries);

    family[targetField] = {
      mappingType: "one-hot",
      fileName: "custom_mapping",
      columns: groups.map((g) => g.column),
      terminology: mappingDef?.metadata?.terminology || "",
      description: mappingDef?.metadata?.description || "",
      groups: [
        {
          column: targetField,
          values: [
            {
              name: String(output?.trueValue ?? "1"),
              mapping: entries.map((entry) => ({
                groupKey: `${entry.nodeId}::${entry.fileName}::${entry.groupColumn}`,
                groupColumn: entry.groupColumn,
                fileName: entry.fileName,
                nodeId: entry.nodeId,
                value: entry.value,
              })),
              terminology: output?.metadata?.terminology || "",
              description: output?.metadata?.description || "",
            },
            {
              name: String(output?.falseValue ?? "0"),
              mapping: [],
              terminology: "",
              description: "",
            },
          ],
        },
      ],
    };
  });

  return Object.keys(family).length ? family : null;
}

function rebuildMappingsFromSpec(spec) {
  const rebuilt = [];

  (spec?.mappings || []).forEach((mappingDef) => {
    const type = String(mappingDef?.mappingType || "").toLowerCase();

    if (type === "one-hot") {
      const family = rebuildOneHotMappingsFromSpec(mappingDef);
      if (family) rebuilt.push(family);
      return;
    }

    const standard = rebuildStandardMappingFromSpec(mappingDef);
    if (standard) rebuilt.push(standard);
  });

  return rebuilt;
}

export {
  normalizeUploadedSpec,
  collectSpecSources,
  rebuildMappingsFromSpec,
};