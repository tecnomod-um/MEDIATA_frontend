import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./petitionHandler", () => ({
  getNodeElements: vi.fn(),
  fetchElementFile: vi.fn(),
}));

vi.mock("./nodeAxiosSetup", () => ({
  updateNodeAxiosBaseURL: vi.fn(),
}));

import { getNodeElements, fetchElementFile } from "./petitionHandler";
import { updateNodeAxiosBaseURL } from "./nodeAxiosSetup";
import {
  analyzeUploadedSpecAvailabilityLive,
  checkReplacementFileCompatibility,
  fetchLiveElementFilesByNode,
} from "./uploadedMappingResolution";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchLiveElementFilesByNode", () => {
  it("collects live files and falls back to an empty list when a node fetch fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    getNodeElements
      .mockResolvedValueOnce(["elements_a.csv", "elements_b.csv"])
      .mockRejectedValueOnce(new Error("boom"));

    const result = await fetchLiveElementFilesByNode([
      { nodeId: "node-a", name: "Node A", serviceUrl: "https://node-a.example" },
      { nodeId: "node-b", name: "Node B", serviceUrl: "https://node-b.example" },
    ]);

    expect(updateNodeAxiosBaseURL).toHaveBeenNthCalledWith(1, "https://node-a.example");
    expect(updateNodeAxiosBaseURL).toHaveBeenNthCalledWith(2, "https://node-b.example");
    expect(result.get("node-a")).toEqual({
      nodeId: "node-a",
      nodeName: "Node A",
      files: ["elements_a.csv", "elements_b.csv"],
    });
    expect(result.get("node-b")).toEqual({
      nodeId: "node-b",
      nodeName: "Node B",
      files: [],
    });

    consoleErrorSpy.mockRestore();
  });
});

describe("analyzeUploadedSpecAvailabilityLive", () => {
  it("offers all selected nodes as replacement candidates when a file is missing on an existing node", async () => {
    const spec = {
      mappings: [
        {
          targetField: "TargetA",
          mappingType: "standard",
          rules: [
            {
              logic: {
                "==": [
                  { var: "node-a::missing_elements.csv::shared_col" },
                  "Yes",
                ],
              },
              then: { kind: "constant", value: "Yes" },
            },
          ],
        },
      ],
    };

    const liveFilesByNode = new Map([
      [
        "node-a",
        {
          nodeId: "node-a",
          nodeName: "Node A",
          files: ["node-a_elements.csv"],
        },
      ],
      [
        "node-b",
        {
          nodeId: "node-b",
          nodeName: "Node B",
          files: ["replacement_elements.csv"],
        },
      ],
    ]);

    const result = await analyzeUploadedSpecAvailabilityLive(
      spec,
      [
        { nodeId: "node-a", name: "Node A" },
        { nodeId: "node-b", name: "Node B" },
      ],
      liveFilesByNode
    );

    expect(result.requiresResolution).toBe(true);
    expect(result.missing[0].reason).toBe("missing-file");
    expect(result.missing[0].candidateNodes).toEqual([
      {
        nodeId: "node-a",
        nodeName: "Node A",
        files: ["node-a_elements.csv"],
      },
      {
        nodeId: "node-b",
        nodeName: "Node B",
        files: ["replacement_elements.csv"],
      },
    ]);
  });

  it("fetches live files when not provided and adds required columns to missing refs", async () => {
    getNodeElements
      .mockResolvedValueOnce(["other_elements.csv"])
      .mockResolvedValueOnce(["present_elements.csv"]);

    const spec = {
      mappings: [
        {
          targetField: "TargetA",
          mappingType: "standard",
          rules: [
            {
              logic: {
                "==": [
                  { var: "node-a::missing_elements.csv::shared_col" },
                  "Yes",
                ],
              },
              then: { kind: "constant", value: "Yes" },
            },
          ],
        },
        {
          groupName: "Family",
          mappingType: "one-hot",
          outputs: [
            {
              targetField: "TargetB",
              logic: {
                is_integer: [{ var: "node-b::present_elements.csv::age" }],
              },
            },
          ],
        },
      ],
    };

    const result = await analyzeUploadedSpecAvailabilityLive(spec, [
      { nodeId: "node-a", name: "Node A", serviceUrl: "https://node-a.example" },
      { nodeId: "node-b", name: "Node B", serviceUrl: "https://node-b.example" },
    ]);

    expect(result.requiresResolution).toBe(true);
    expect(result.resolved).toEqual([
      expect.objectContaining({
        nodeId: "node-b",
        fileName: "present_elements.csv",
        sourceId: "node-b::present_elements.csv",
        displayNodeName: "Node B",
      }),
    ]);
    expect(result.missing).toEqual([
      expect.objectContaining({
        sourceId: "node-a::missing_elements.csv",
        reason: "missing-file",
        requiredColumns: ["shared_col"],
      }),
    ]);
    expect(result.requiredColumnsBySource).toEqual({
      "node-a::missing_elements.csv": ["shared_col"],
      "node-b::present_elements.csv": ["age"],
    });
  });
});

describe("checkReplacementFileCompatibility", () => {
  it("returns a warning when no replacement file is selected", async () => {
    const result = await checkReplacementFileCompatibility({
      selectedNodes: [],
      sourceId: "node-a::missing_elements.csv",
      replacementNodeId: "",
      replacementFileName: "",
      requiredColumnsBySource: {
        "node-a::missing_elements.csv": ["shared_col"],
      },
    });

    expect(result).toEqual({
      compatible: false,
      requiredColumns: ["shared_col"],
      candidateColumns: [],
      missingColumns: ["shared_col"],
      warning: "No replacement file selected.",
    });
  });

  it("returns a warning when the replacement node is unavailable", async () => {
    const result = await checkReplacementFileCompatibility({
      selectedNodes: [{ nodeId: "node-a", serviceUrl: "https://node-a.example" }],
      sourceId: "node-a::missing_elements.csv",
      replacementNodeId: "node-b",
      replacementFileName: "replacement.csv",
      requiredColumnsBySource: {
        "node-a::missing_elements.csv": ["shared_col"],
      },
    });

    expect(result).toEqual({
      compatible: false,
      requiredColumns: ["shared_col"],
      candidateColumns: [],
      missingColumns: ["shared_col"],
      warning: "Selected node is not available.",
    });
  });

  it("detects missing required columns in the replacement file", async () => {
    fetchElementFile.mockResolvedValueOnce("shared_col\noptional_col\n");

    const result = await checkReplacementFileCompatibility({
      selectedNodes: [{ nodeId: "node-b", serviceUrl: "https://node-b.example" }],
      sourceId: "node-a::missing_elements.csv",
      replacementNodeId: "node-b",
      replacementFileName: "replacement.csv",
      requiredColumnsBySource: {
        "node-a::missing_elements.csv": ["shared_col", "age"],
      },
    });

    expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith("https://node-b.example");
    expect(fetchElementFile).toHaveBeenCalledWith("replacement.csv");
    expect(result).toEqual({
      compatible: false,
      requiredColumns: ["shared_col", "age"],
      candidateColumns: ["shared_col", "optional_col"],
      missingColumns: ["age"],
      warning: "Selected file is missing 1 required column.",
    });
  });

  it("marks the replacement file as compatible when all required columns are present", async () => {
    fetchElementFile.mockResolvedValueOnce("shared_col\nage\n");

    const result = await checkReplacementFileCompatibility({
      selectedNodes: [{ nodeId: "node-b", serviceUrl: "https://node-b.example" }],
      sourceId: "node-a::missing_elements.csv",
      replacementNodeId: "node-b",
      replacementFileName: "replacement.csv",
      requiredColumnsBySource: {
        "node-a::missing_elements.csv": ["shared_col", "age"],
      },
    });

    expect(result).toEqual({
      compatible: true,
      requiredColumns: ["shared_col", "age"],
      candidateColumns: ["shared_col", "age"],
      missingColumns: [],
      warning: "",
    });
  });
});
