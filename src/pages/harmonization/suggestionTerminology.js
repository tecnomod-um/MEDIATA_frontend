const sourceColumnKey = ({ nodeId, fileName, column, groupColumn } = {}) =>
  `${nodeId ?? ""}::${fileName ?? ""}::${column ?? groupColumn ?? ""}`;

const normalizeValue = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const conceptKey = (terminology) => {
  const term = String(terminology ?? "").trim();
  if (!term) return "";

  const codeMatch = term.match(/(?:^|\||\/id\/)\s*(\d{6,})\s*$/);
  if (codeMatch) return `sctid:${codeMatch[1]}`;

  return `label:${term.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ")}`;
};

const addEvidence = (index, key, terminology) => {
  const term = String(terminology ?? "").trim();
  const concept = conceptKey(term);
  if (!key || !concept) return;

  if (!index.has(key)) index.set(key, new Map());
  index.get(key).set(concept, term);
};

const unambiguousTerm = (evidence) => {
  if (!evidence || evidence.size !== 1) return "";
  return evidence.values().next().value || "";
};

const collectMappingAnnotations = (mappings) => {
  const columns = new Map();
  const values = new Map();

  (mappings || []).forEach((mappingObject) => {
    Object.values(mappingObject || {}).forEach((mapping) => {
      const mappedColumnKeys = new Set();

      (mapping?.groups || []).forEach((group) => {
        (group?.values || []).forEach((value) => {
          (value?.mapping || []).forEach((reference) => {
            const columnKey = sourceColumnKey(reference);
            mappedColumnKeys.add(columnKey);

            if (reference?.value == null || typeof reference.value === "object") return;
            const normalizedValue = normalizeValue(reference.value);
            if (!normalizedValue) return;
            addEvidence(values, `${columnKey}::${normalizedValue}`, value?.terminology);
          });
        });
      });

      mappedColumnKeys.forEach((key) => addEvidence(columns, key, mapping?.terminology));
    });
  });

  return { columns, values };
};

export const attachTerminologyToSuggestionSources = (elementFiles, mappings) => {
  const annotations = collectMappingAnnotations(mappings);

  return (elementFiles || []).map((element) => {
    const columnKey = sourceColumnKey(element);
    const columnEvidence = new Map(annotations.columns.get(columnKey) || []);
    const existingColumnTerm = String(element?.terminology ?? "").trim();
    const existingColumnConcept = conceptKey(existingColumnTerm);
    if (existingColumnConcept) columnEvidence.set(existingColumnConcept, existingColumnTerm);

    const terminology = unambiguousTerm(columnEvidence);
    const valueTerminologies = {};
    const sourceValueTerminologies = element?.valueTerminologies || {};

    (element?.values || []).forEach((value) => {
      const normalizedValue = normalizeValue(value);
      if (!normalizedValue) return;

      const evidence = new Map(annotations.values.get(`${columnKey}::${normalizedValue}`) || []);
      const existing = sourceValueTerminologies[value] ?? sourceValueTerminologies[normalizedValue];
      const existingConcept = conceptKey(existing);
      if (existingConcept) evidence.set(existingConcept, String(existing).trim());

      const resolved = unambiguousTerm(evidence);
      if (resolved) valueTerminologies[String(value)] = resolved;
    });

    const enriched = { ...element };
    if (terminology) enriched.terminology = terminology;
    else delete enriched.terminology;

    if (Object.keys(valueTerminologies).length) enriched.valueTerminologies = valueTerminologies;
    else delete enriched.valueTerminologies;

    return enriched;
  });
};
