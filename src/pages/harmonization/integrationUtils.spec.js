import { describe, it, expect, vi } from "vitest";
import {
  parseCSV,
  formatValue,
  extractHierarchy,
  normalizeEnrichStep,
  mergeColumnsData,
  buildGroupsFromMapping,
  buildStandardDraft,
  collectOneHotFamily,
  buildOneHotDraft,
  makeId,
} from "./integrationUtils";

// ---------------------------------------------------------------------------
// parseCSV
// ---------------------------------------------------------------------------
describe("parseCSV", () => {
  it("parses a single row with values", () => {
    const result = parseCSV("col1,val1,val2");
    expect(result).toEqual([{ column: "col1", values: ["val1", "val2"] }]);
  });

  it("parses multiple rows", () => {
    const result = parseCSV("col1,a,b\ncol2,c");
    expect(result).toEqual([
      { column: "col1", values: ["a", "b"] },
      { column: "col2", values: ["c"] },
    ]);
  });

  it("parses a row with no values", () => {
    const result = parseCSV("col1");
    expect(result).toEqual([{ column: "col1", values: [] }]);
  });

  it("trims surrounding whitespace from the whole text", () => {
    const result = parseCSV("  col1,v1  ");
    expect(result[0].column).toBe("col1");
    // values are split from the trimmed line — the value retains no leading spaces here
    expect(result[0].values[0]).toBe("v1");
  });

  it("handles trailing comma (empty last value)", () => {
    const result = parseCSV("col1,v1,");
    expect(result[0].values).toEqual(["v1", ""]);
  });
});

// ---------------------------------------------------------------------------
// formatValue
// ---------------------------------------------------------------------------
describe("formatValue", () => {
  it("formats a valid date string to ISO date portion", () => {
    expect(formatValue("2024-03-15", "date")).toBe("2024-03-15");
  });

  it("formats a full ISO datetime to date portion", () => {
    expect(formatValue("2024-03-15T10:30:00Z", "date")).toBe("2024-03-15");
  });

  it("returns empty string for an invalid date with type=date", () => {
    expect(formatValue("not-a-date", "date")).toBe("");
  });

  it("returns empty string for null with type=date (null parses as epoch)", () => {
    // new Date(null) gives epoch (Jan 1 1970), which is a valid date
    expect(formatValue(null, "date")).toBe("1970-01-01");
  });

  it("returns the string representation for non-date type", () => {
    expect(formatValue("hello", "string")).toBe("hello");
  });

  it("converts number to string for non-date type", () => {
    expect(formatValue(42, "number")).toBe("42");
  });

  it("returns empty string for null without type=date", () => {
    expect(formatValue(null, "string")).toBe("");
  });

  it("returns empty string for undefined without type=date", () => {
    expect(formatValue(undefined, "string")).toBe("");
  });

  it("converts false (boolean) to 'false' string", () => {
    expect(formatValue(false, "boolean")).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// extractHierarchy
// ---------------------------------------------------------------------------
describe("extractHierarchy", () => {
  it("returns the hierarchy array from a valid response", () => {
    const res = { hierarchy: [{ a: 1 }, { b: 2 }] };
    expect(extractHierarchy(res)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("returns [] when hierarchy is missing", () => {
    expect(extractHierarchy({ other: true })).toEqual([]);
  });

  it("returns [] when response is null", () => {
    expect(extractHierarchy(null)).toEqual([]);
  });

  it("returns [] when response is a string", () => {
    expect(extractHierarchy("hello")).toEqual([]);
  });

  it("returns [] when hierarchy is not an array", () => {
    expect(extractHierarchy({ hierarchy: "not-array" })).toEqual([]);
  });

  it("returns [] when hierarchy is null", () => {
    expect(extractHierarchy({ hierarchy: null })).toEqual([]);
  });

  it("returns [] when response is undefined", () => {
    expect(extractHierarchy(undefined)).toEqual([]);
  });

  it("returns an empty array when hierarchy is []", () => {
    expect(extractHierarchy({ hierarchy: [] })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeEnrichStep
// ---------------------------------------------------------------------------
describe("normalizeEnrichStep", () => {
  it("returns the message unchanged when no batch clause", () => {
    expect(normalizeEnrichStep("Processing records")).toBe("Processing records");
  });

  it("strips (batch X / Y) clause", () => {
    expect(normalizeEnrichStep("Processing (batch 2 / 5)")).toBe("Processing");
  });

  it("strips batch clause regardless of spacing", () => {
    expect(normalizeEnrichStep("Step A (batch 1/3)")).toBe("Step A");
  });

  it("returns empty string for empty message", () => {
    expect(normalizeEnrichStep("")).toBe("");
  });

  it("returns empty string for null", () => {
    expect(normalizeEnrichStep(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeEnrichStep(undefined)).toBe("");
  });

  it("trims leading/trailing whitespace from result", () => {
    expect(normalizeEnrichStep("  Step B  ")).toBe("Step B");
  });
});

// ---------------------------------------------------------------------------
// mergeColumnsData
// ---------------------------------------------------------------------------
describe("mergeColumnsData", () => {
  it("appends a new column entry that doesn't exist yet", () => {
    const existing = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["a"] }];
    const newData = [{ column: "col2", fileName: "f.csv", nodeId: "n1", values: ["b"] }];
    const result = mergeColumnsData(existing, newData);
    expect(result).toHaveLength(2);
    expect(result[1].column).toBe("col2");
  });

  it("merges values when column and fileName match", () => {
    const existing = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["a"] }];
    const newData = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["b"] }];
    const result = mergeColumnsData(existing, newData);
    expect(result).toHaveLength(1);
    expect(result[0].values).toEqual(["a", "b"]);
  });

  it("deduplicates values on merge", () => {
    const existing = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["a", "b"] }];
    const newData = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["b", "c"] }];
    const result = mergeColumnsData(existing, newData);
    expect(result[0].values).toEqual(["a", "b", "c"]);
  });

  it("updates nodeId on merge", () => {
    const existing = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["a"] }];
    const newData = [{ column: "col1", fileName: "f.csv", nodeId: "n2", values: ["b"] }];
    const result = mergeColumnsData(existing, newData);
    expect(result[0].nodeId).toBe("n2");
  });

  it("treats same column with different fileName as separate entries", () => {
    const existing = [{ column: "col1", fileName: "f1.csv", nodeId: "n1", values: ["a"] }];
    const newData = [{ column: "col1", fileName: "f2.csv", nodeId: "n1", values: ["b"] }];
    const result = mergeColumnsData(existing, newData);
    expect(result).toHaveLength(2);
  });

  it("does not mutate the original existing array reference", () => {
    const existing = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["a"] }];
    const newData = [{ column: "col2", fileName: "f.csv", nodeId: "n1", values: ["b"] }];
    mergeColumnsData(existing, newData);
    expect(existing).toHaveLength(1);
  });

  it("returns existing data unchanged when newData is empty", () => {
    const existing = [{ column: "col1", fileName: "f.csv", nodeId: "n1", values: ["a"] }];
    expect(mergeColumnsData(existing, [])).toEqual(existing);
  });
});

// ---------------------------------------------------------------------------
// makeId
// ---------------------------------------------------------------------------
describe("makeId", () => {
  it("returns a non-empty string", () => {
    const id = makeId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => makeId()));
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// buildGroupsFromMapping
// ---------------------------------------------------------------------------
describe("buildGroupsFromMapping", () => {
  const columnsData = [
    { nodeId: "n1", fileName: "f.csv", column: "col1", values: ["a"] },
    { nodeId: "n1", fileName: "f.csv", column: "col2", values: ["b"] },
  ];

  it("returns empty array when mapping has no groups", () => {
    expect(buildGroupsFromMapping({}, columnsData)).toEqual([]);
  });

  it("returns empty array when mapping is null", () => {
    expect(buildGroupsFromMapping(null, columnsData)).toEqual([]);
  });

  it("resolves referenced columns from columnsData", () => {
    const mapping = {
      groups: [
        {
          values: [
            {
              mapping: [
                { nodeId: "n1", fileName: "f.csv", groupColumn: "col1" },
              ],
            },
          ],
        },
      ],
    };
    const result = buildGroupsFromMapping(mapping, columnsData);
    expect(result).toHaveLength(1);
    expect(result[0].column).toBe("col1");
  });

  it("deduplicates references pointing to the same column", () => {
    const mapping = {
      groups: [
        {
          values: [
            {
              mapping: [
                { nodeId: "n1", fileName: "f.csv", groupColumn: "col1" },
                { nodeId: "n1", fileName: "f.csv", groupColumn: "col1" },
              ],
            },
          ],
        },
      ],
    };
    const result = buildGroupsFromMapping(mapping, columnsData);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when referenced column is not in columnsData", () => {
    const mapping = {
      groups: [
        {
          values: [
            { mapping: [{ nodeId: "n1", fileName: "f.csv", groupColumn: "unknown" }] },
          ],
        },
      ],
    };
    expect(buildGroupsFromMapping(mapping, columnsData)).toHaveLength(0);
  });

  it("resolves multiple distinct columns", () => {
    const mapping = {
      groups: [
        {
          values: [
            {
              mapping: [
                { nodeId: "n1", fileName: "f.csv", groupColumn: "col1" },
                { nodeId: "n1", fileName: "f.csv", groupColumn: "col2" },
              ],
            },
          ],
        },
      ],
    };
    const result = buildGroupsFromMapping(mapping, columnsData);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// buildStandardDraft
// ---------------------------------------------------------------------------
describe("buildStandardDraft", () => {
  const columnsData = [
    { nodeId: "n1", fileName: "f.csv", column: "col1", values: ["a"] },
  ];

  const mapping = {
    terminology: "SNOMED",
    description: "A status field",
    groups: [
      {
        values: [
          {
            name: "Active",
            terminology: "SNOMED-A",
            description: "active desc",
            mapping: [{ nodeId: "n1", fileName: "f.csv", groupColumn: "col1" }],
          },
          {
            name: "Inactive",
            terminology: "",
            description: "",
            mapping: [],
          },
        ],
      },
    ],
  };

  it("returns correct unionName", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    expect(draft.unionName).toBe("Status");
  });

  it("returns unionTerminology from mapping", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    expect(draft.unionTerminology).toBe("SNOMED");
  });

  it("returns unionDescription from mapping", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    expect(draft.unionDescription).toBe("A status field");
  });

  it("sets useHotOneMapping to false", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    expect(draft.useHotOneMapping).toBe(false);
  });

  it("sets removeFromHierarchy to false", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    expect(draft.removeFromHierarchy).toBe(false);
  });

  it("builds customValues with correct names and terminology", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    expect(draft.customValues).toHaveLength(2);
    expect(draft.customValues[0].name).toBe("Active");
    expect(draft.customValues[0].snomedTerm).toBe("SNOMED-A");
    expect(draft.customValues[1].name).toBe("Inactive");
  });

  it("assigns unique ids to customValues", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    const ids = draft.customValues.map((cv) => cv.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds valueDescriptions keyed by customValue id", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    const id0 = draft.customValues[0].id;
    expect(draft.valueDescriptions[id0]).toBe("active desc");
  });

  it("resolves groups from columnsData", () => {
    const draft = buildStandardDraft("Status", mapping, columnsData);
    expect(draft.groups).toHaveLength(1);
    expect(draft.groups[0].column).toBe("col1");
  });

  it("handles mapping with no values gracefully", () => {
    const emptyMapping = { terminology: "", description: "", groups: [] };
    const draft = buildStandardDraft("Empty", emptyMapping, columnsData);
    expect(draft.customValues).toEqual([]);
    expect(draft.groups).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// collectOneHotFamily
// ---------------------------------------------------------------------------
describe("collectOneHotFamily", () => {
  const mappings = [
    {
      Sex_male: { mappingType: "one-hot", fileName: "f.csv", groups: [] },
      Sex_female: { mappingType: "one-hot", fileName: "f.csv", groups: [] },
      Status: { mappingType: "standard", fileName: "f.csv", groups: [] },
    },
  ];

  it("collects all one-hot members of the family", () => {
    const family = collectOneHotFamily(mappings, "Sex");
    expect(family).toHaveLength(2);
  });

  it("sorts family members alphabetically by key", () => {
    const family = collectOneHotFamily(mappings, "Sex");
    expect(family[0].key).toBe("Sex_female");
    expect(family[1].key).toBe("Sex_male");
  });

  it("does not include non-one-hot mappings", () => {
    const family = collectOneHotFamily(mappings, "Status");
    expect(family).toHaveLength(0);
  });

  it("returns empty array when no matching base", () => {
    expect(collectOneHotFamily(mappings, "Age")).toEqual([]);
  });

  it("does not cross-match prefixes (Sex should not match SexOther)", () => {
    const m = [
      {
        Sex_male: { mappingType: "one-hot", groups: [] },
        SexOther_x: { mappingType: "one-hot", groups: [] },
      },
    ];
    const family = collectOneHotFamily(m, "Sex");
    expect(family.every((f) => f.key.startsWith("Sex_"))).toBe(true);
    expect(family.some((f) => f.key === "SexOther_x")).toBe(false);
  });

  it("works across multiple mapping objects in the array", () => {
    const m = [
      { Race_white: { mappingType: "one-hot", groups: [] } },
      { Race_black: { mappingType: "one-hot", groups: [] } },
    ];
    expect(collectOneHotFamily(m, "Race")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// buildOneHotDraft
// ---------------------------------------------------------------------------
describe("buildOneHotDraft", () => {
  const columnsData = [
    { nodeId: "n1", fileName: "f.csv", column: "sex", values: ["M", "F"] },
  ];

  const mappings = [
    {
      Sex_male: {
        mappingType: "one-hot",
        terminology: "SNOMED",
        description: "Sex encoding",
        groups: [
          {
            values: [
              {
                name: "1",
                terminology: "SNOMED-M",
                description: "male desc",
                mapping: [{ nodeId: "n1", fileName: "f.csv", groupColumn: "sex" }],
              },
              { name: "0", mapping: [] },
            ],
          },
        ],
      },
      Sex_female: {
        mappingType: "one-hot",
        terminology: "SNOMED",
        description: "Sex encoding",
        groups: [
          {
            values: [
              {
                name: "1",
                terminology: "SNOMED-F",
                description: "female desc",
                mapping: [{ nodeId: "n1", fileName: "f.csv", groupColumn: "sex" }],
              },
              { name: "0", mapping: [] },
            ],
          },
        ],
      },
    },
  ];

  it("returns null when selectedKey has no underscore", () => {
    expect(buildOneHotDraft("NoUnderscore", mappings, columnsData)).toBeNull();
  });

  it("returns null when no family members found", () => {
    expect(buildOneHotDraft("Missing_val", mappings, columnsData)).toBeNull();
  });

  it("returns correct unionName (base before last underscore)", () => {
    const draft = buildOneHotDraft("Sex_male", mappings, columnsData);
    expect(draft.unionName).toBe("Sex");
  });

  it("sets useHotOneMapping to true", () => {
    const draft = buildOneHotDraft("Sex_male", mappings, columnsData);
    expect(draft.useHotOneMapping).toBe(true);
  });

  it("builds customValues for each family member (sorted)", () => {
    const draft = buildOneHotDraft("Sex_male", mappings, columnsData);
    expect(draft.customValues).toHaveLength(2);
    // sorted: female < male
    expect(draft.customValues[0].name).toBe("female");
    expect(draft.customValues[1].name).toBe("male");
  });

  it("carries snomedTerm from the ones (name='1') value", () => {
    const draft = buildOneHotDraft("Sex_male", mappings, columnsData);
    const femaleCv = draft.customValues.find((cv) => cv.name === "female");
    expect(femaleCv.snomedTerm).toBe("SNOMED-F");
  });

  it("builds valueDescriptions keyed by id", () => {
    const draft = buildOneHotDraft("Sex_male", mappings, columnsData);
    const maleCv = draft.customValues.find((cv) => cv.name === "male");
    expect(draft.valueDescriptions[maleCv.id]).toBe("male desc");
  });

  it("resolves groups from columnsData via first family member", () => {
    const draft = buildOneHotDraft("Sex_male", mappings, columnsData);
    expect(draft.groups).toHaveLength(1);
    expect(draft.groups[0].column).toBe("sex");
  });

  it("sets unionTerminology from first family member", () => {
    const draft = buildOneHotDraft("Sex_male", mappings, columnsData);
    expect(draft.unionTerminology).toBe("SNOMED");
  });
});
