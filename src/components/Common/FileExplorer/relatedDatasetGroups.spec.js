import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../util/colors", () => ({
  generateDistinctColors: vi.fn(),
}));

import { generateDistinctColors } from "../../../util/colors";
import { buildRelatedDatasetAnalysisFromSuggestions, resolveRelatedElementFileName } from "./relatedDatasetGroups";

describe("related dataset groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateDistinctColors.mockReturnValue(["#112233", "#445566"]);
  });

  it("uses the project color utility for generated groups", () => {
    const files = [
      { nodeId: "node-a", name: "first.csv" },
      { nodeId: "node-b", name: "second.csv" },
    ];
    const suggestionResponse = {
      hierarchy: [
        {
          demographics: {
            groups: [
              {
                values: [
                  {
                    mapping: [
                      {
                        nodeId: "node-a",
                        fileName: "first.csv",
                        groupColumn: "patient_id",
                        groupKey: "node-a::first.csv::patient_id",
                      },
                      {
                        nodeId: "node-b",
                        fileName: "second.csv",
                        groupColumn: "subject_id",
                        groupKey: "node-b::second.csv::subject_id",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        {
          sex: {
            groups: [
              {
                values: [
                  {
                    mapping: [
                      {
                        nodeId: "node-a",
                        fileName: "first.csv",
                        groupColumn: "sex",
                        groupKey: "node-a::first.csv::sex",
                      },
                      {
                        nodeId: "node-b",
                        fileName: "second.csv",
                        groupColumn: "gender",
                        groupKey: "node-b::second.csv::gender",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const result = buildRelatedDatasetAnalysisFromSuggestions(files, suggestionResponse, {
      "node-a::first.csv": 2,
      "node-b::second.csv": 2,
    });

    expect(generateDistinctColors).toHaveBeenCalledWith(1);
    expect(result.groups).toEqual([{ groupId: "G1", color: "#112233", count: 2 }]);
    expect(result.groupInfoByKey.get("node-a::first.csv").color).toBe("#112233");
  });

  it("does not group larger datasets from a single shared column", () => {
    const files = [
      { nodeId: "node-a", name: "first.csv" },
      { nodeId: "node-b", name: "second.csv" },
    ];
    const suggestionResponse = {
      hierarchy: [
        {
          demographics: {
            groups: [
              {
                values: [
                  {
                    mapping: [
                      {
                        nodeId: "node-a",
                        fileName: "first.csv",
                        groupColumn: "patient_id",
                        groupKey: "node-a::first.csv::patient_id",
                      },
                      {
                        nodeId: "node-b",
                        fileName: "second.csv",
                        groupColumn: "subject_id",
                        groupKey: "node-b::second.csv::subject_id",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const result = buildRelatedDatasetAnalysisFromSuggestions(files, suggestionResponse, {
      "node-a::first.csv": 4,
      "node-b::second.csv": 5,
    });

    expect(result.groups).toEqual([]);
    expect(result.groupInfoByKey.size).toBe(0);
  });

  it("groups single-column datasets when the only column matches", () => {
    const files = [
      { nodeId: "node-a", name: "first.csv" },
      { nodeId: "node-b", name: "second.csv" },
    ];
    const suggestionResponse = {
      hierarchy: [
        {
          age: {
            groups: [
              {
                values: [
                  {
                    mapping: [
                      {
                        nodeId: "node-a",
                        fileName: "first.csv",
                        groupColumn: "age",
                        groupKey: "node-a::first.csv::age",
                      },
                      {
                        nodeId: "node-b",
                        fileName: "second.csv",
                        groupColumn: "patient_age",
                        groupKey: "node-b::second.csv::patient_age",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const result = buildRelatedDatasetAnalysisFromSuggestions(files, suggestionResponse, {
      "node-a::first.csv": 1,
      "node-b::second.csv": 1,
    });

    expect(result.groups).toEqual([{ groupId: "G1", color: "#112233", count: 2 }]);
  });

  it("groups renamed-header datasets when their extracted element signatures strongly align", () => {
    const files = [
      { nodeId: "node-a", name: "appointment_schedule.csv" },
      { nodeId: "node-a", name: "appt_eval_alias_headers.csv" },
      { nodeId: "node-a", name: "appt_eval_reordered.csv" },
    ];

    const result = buildRelatedDatasetAnalysisFromSuggestions(
      files,
      { hierarchy: [] },
      {
        "node-a::appointment_schedule.csv": 8,
        "node-a::appt_eval_alias_headers.csv": 8,
        "node-a::appt_eval_reordered.csv": 8,
      },
      [
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "appointment_id", values: ["APT-1001", "APT-1002", "APT-1003"] },
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "patient_ref", values: ["P-42", "P-43", "P-44"] },
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "scheduled_start", values: ["integer", "min:2026", "max:2026"] },
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "scheduled_end", values: ["integer", "min:2026", "max:2026"] },
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "clinic_code", values: ["CARD-01", "INT-03"] },
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "clinician_id", values: ["CLN-900", "CLN-901", "CLN-902"] },
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "appointment_status", values: ["booked", "checked-in", "completed"] },
        { nodeId: "node-a", fileName: "appointment_schedule.csv", column: "reason_text", values: ["Blood pressure follow-up", "Dizziness assessment", "Annual cardiovascular review"] },

        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "appt_identifier", values: ["APT-1001", "APT-1002", "APT-1003"] },
        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "subject_identifier", values: ["P-42", "P-43", "P-44"] },
        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "start_time", values: ["integer", "min:2026", "max:2026"] },
        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "end_time", values: ["integer", "min:2026", "max:2026"] },
        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "unit_code", values: ["CARD-01", "INT-03"] },
        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "provider_identifier", values: ["CLN-900", "CLN-901", "CLN-902"] },
        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "status_label", values: ["booked", "checked-in", "completed"] },
        { nodeId: "node-a", fileName: "appt_eval_alias_headers.csv", column: "visit_reason", values: ["Blood pressure follow-up", "Dizziness assessment", "Annual cardiovascular review"] },

        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "appointment_id", values: ["APT-1001", "APT-1002", "APT-1003"] },
        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "patient_ref", values: ["P-42", "P-43", "P-44"] },
        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "scheduled_start", values: ["integer", "min:2026", "max:2026"] },
        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "scheduled_end", values: ["integer", "min:2026", "max:2026"] },
        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "clinic_code", values: ["CARD-01", "INT-03"] },
        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "clinician_id", values: ["CLN-900", "CLN-901", "CLN-902"] },
        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "appointment_status", values: ["booked", "checked-in", "completed"] },
        { nodeId: "node-a", fileName: "appt_eval_reordered.csv", column: "reason_text", values: ["Blood pressure follow-up", "Dizziness assessment", "Annual cardiovascular review"] },
      ]
    );

    expect(result.groups).toEqual([{ groupId: "G1", color: "#112233", count: 3 }]);
    expect(result.groupInfoByKey.get("node-a::appt_eval_alias_headers.csv")?.groupId).toBe("G1");
  });

  it("resolves dataset files against available sanitized element files", () => {
    expect(
      resolveRelatedElementFileName("DATASETS", "My File!.csv", ["My_File__elements.csv"])
    ).toBe("My_File__elements.csv");
  });

  it("prefers an exact available element file match when present", () => {
    expect(
      resolveRelatedElementFileName("DATASETS", "alpha.csv", ["alpha_elements.csv", "alpha_copy_elements.csv"])
    ).toBe("alpha_elements.csv");
  });
});
