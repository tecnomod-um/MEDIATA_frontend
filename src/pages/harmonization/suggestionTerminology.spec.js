import { describe, expect, it } from "vitest";
import { attachTerminologyToSuggestionSources } from "./suggestionTerminology";

const ref = (nodeId, fileName, groupColumn, value) => ({
  nodeId,
  fileName,
  groupColumn,
  value,
});

describe("attachTerminologyToSuggestionSources", () => {
  it("adds column and value annotations to their exact source references", () => {
    const elementFiles = [
      { nodeId: "n1", fileName: "a.csv", column: "StrokeType", values: ["I", "H"] },
      { nodeId: "n2", fileName: "b.csv", column: "Etiology", values: ["Isch", "Hem"] },
    ];
    const mappings = [
      {
        Stroke_Type: {
          terminology: "Cerebrovascular accident | 230690007",
          groups: [{
            values: [
              {
                name: "Ischemic",
                terminology: "Cerebral infarction | 432504007",
                mapping: [ref("n1", "a.csv", "StrokeType", "I"), ref("n2", "b.csv", "Etiology", "Isch")],
              },
              {
                name: "Non-Ischemic",
                terminology: "Intracranial hemorrhage | 274100004",
                mapping: [ref("n1", "a.csv", "StrokeType", "H"), ref("n2", "b.csv", "Etiology", "Hem")],
              },
            ],
          }],
        },
      },
    ];

    expect(attachTerminologyToSuggestionSources(elementFiles, mappings)).toEqual([
      {
        ...elementFiles[0],
        terminology: "Cerebrovascular accident | 230690007",
        valueTerminologies: {
          I: "Cerebral infarction | 432504007",
          H: "Intracranial hemorrhage | 274100004",
        },
      },
      {
        ...elementFiles[1],
        terminology: "Cerebrovascular accident | 230690007",
        valueTerminologies: {
          Isch: "Cerebral infarction | 432504007",
          Hem: "Intracranial hemorrhage | 274100004",
        },
      },
    ]);
  });

  it("omits ambiguous annotations when one source participates in conflicting mappings", () => {
    const elementFiles = [{ nodeId: "n1", fileName: "a.csv", column: "Status", values: ["Y"] }];
    const mappings = [
      {
        First: {
          terminology: "Clinical status | 106229004",
          groups: [{ values: [{ terminology: "Present | 52101004", mapping: [ref("n1", "a.csv", "Status", "Y")] }] }],
        },
      },
      {
        Second: {
          terminology: "Finding | 404684003",
          groups: [{ values: [{ terminology: "Absent | 2667000", mapping: [ref("n1", "a.csv", "Status", "Y")] }] }],
        },
      },
    ];

    expect(attachTerminologyToSuggestionSources(elementFiles, mappings)).toEqual(elementFiles);
  });

  it("treats labels with the same SCTID as the same concept", () => {
    const elementFiles = [{
      nodeId: "n1",
      fileName: "a.csv",
      column: "Status",
      values: ["Y"],
      terminology: "Clinical status | 106229004",
    }];
    const mappings = [{
      Status: {
        terminology: "clinical finding status | 106229004",
        groups: [{ values: [{ mapping: [ref("n1", "a.csv", "Status", "Y")] }] }],
      },
    }];

    expect(attachTerminologyToSuggestionSources(elementFiles, mappings)[0].terminology)
      .toBe("Clinical status | 106229004");
  });

  it("treats a SNOMED URI and a label-code value as the same concept", () => {
    const elementFiles = [{
      nodeId: "n1",
      fileName: "a.csv",
      column: "Status",
      values: ["Y"],
      valueTerminologies: { Y: "http://snomed.info/id/52101004" },
    }];
    const mappings = [{
      Status: {
        groups: [{
          values: [{
            terminology: "Present | 52101004",
            mapping: [ref("n1", "a.csv", "Status", "Y")],
          }],
        }],
      },
    }];

    expect(attachTerminologyToSuggestionSources(elementFiles, mappings)[0].valueTerminologies)
      .toEqual({ Y: "http://snomed.info/id/52101004" });
  });
});
