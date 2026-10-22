import { describe, expect, it } from "vitest";
import {
  getColumnMappingStatuses,
  getColumnMappingTargets,
  inferColumnType,
  parseTerminology,
} from "./columnMappingStatus";

const source = {
  column: "Age",
  nodeId: "node-1",
  fileName: "elements.csv",
  values: ["integer", "min:18", "max:90"],
};

const reference = {
  nodeId: "node-1",
  fileName: "elements.csv",
  groupColumn: "Age",
  value: "integer",
};

describe("column mapping status", () => {
  it("distinguishes custom and default targets and puts custom targets first", () => {
    const mappings = [
      {
        Age: {
          fileName: "elements.csv",
          groups: [{ values: [{ mapping: [reference] }] }],
        },
      },
      {
        AgeAtAdmission: {
          fileName: "custom_mapping",
          terminology: "Age at admission | 424144002",
          groups: [{ values: [{ mapping: [reference] }] }],
        },
      },
    ];

    expect(getColumnMappingTargets(source, mappings)).toEqual([
      expect.objectContaining({ mappingKey: "AgeAtAdmission", kind: "custom" }),
      expect.objectContaining({ mappingKey: "Age", kind: "default" }),
    ]);
  });

  it("counts referenced source variables and keeps custom status ahead of default", () => {
    const mappings = [
      { Age: { fileName: "elements.csv", groups: [{ values: [{ mapping: [reference] }] }] } },
      { AgeAtAdmission: { fileName: "custom_mapping", groups: [{ values: [{ mapping: [reference] }] }] } },
      { Age: { fileName: "elements.csv", groups: [{ values: [{ mapping: [
        { ...reference, nodeId: "node-2" },
      ] }] }] } },
    ];

    const statuses = getColumnMappingStatuses(mappings);
    expect(statuses.get("node-1::elements.csv::Age")).toBe("Custom");
    expect(statuses.get("node-2::elements.csv::Age")).toBe("Default");
    expect(statuses.size).toBe(2);
  });

  it("parses a stored label and SCTID without losing embedded punctuation", () => {
    expect(parseTerminology("Ability to dress | 165235000")).toEqual({
      label: "Ability to dress",
      code: "165235000",
    });
  });

  it("infers the source type from element metadata markers", () => {
    expect(inferColumnType(source)).toBe("Integer");
    expect(inferColumnType({ values: ["true", "false"] })).toBe("Boolean");
    expect(inferColumnType({ values: ["Male", "Female"] })).toBe("Categorical");
  });
});
