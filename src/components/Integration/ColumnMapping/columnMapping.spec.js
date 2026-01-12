import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ColumnMapping from "./columnMapping";

jest.mock("../../../util/petitionHandler", () => ({
  __esModule: true,
  fetchSuggestions: jest.fn().mockResolvedValue([]),
}));

jest.mock(
  "./columnMapping.module.css",
  () => new Proxy({}, { get: (_, k) => String(k) }),
  { virtual: true }
);

jest.mock("distinct-colors", () => jest.fn(() => []));
jest.mock("react-switch", () => (props) => (
  <input
    type="checkbox"
    aria-label="switch"
    checked={!!props.checked}
    onChange={(e) => props.onChange?.(e.target.checked)}
  />
));

jest.mock("../../Common/TooltipPopup/tooltipPopup.js", () => () => null);

jest.mock("../RangePicker/rangePicker.js", () => (props) => (
  <button
    type="button"
    onClick={() => props.onRangeChange?.({ minValue: 1, maxValue: 10 })}
  >
    Mock RangePicker
  </button>
));

jest.mock("../../Common/AutoCompleteInput/autoCompleteInput.js", () => (props) => (
  <input
    type="text"
    placeholder={props.placeholder || ""}
    value={props.value || ""}
    onChange={(e) => props.onChange?.(e.target.value)}
  />
));

jest.mock("@mui/icons-material/Add", () => () => <span />);
jest.mock("@mui/icons-material/Save", () => () => <span />);
jest.mock("@mui/icons-material/Close", () => () => <span />);
jest.mock("@mui/icons-material/InfoOutlined", () => () => <span />);
jest.mock("@mui/icons-material/Description", () => () => <span />);

const makeDataTransfer = (payloadObj) => ({
  getData: jest.fn((type) => (type === "column" ? JSON.stringify(payloadObj) : "")),
  setData: jest.fn(),
  dropEffect: "move",
  effectAllowed: "all",
  files: [],
  items: [],
  types: ["column"],
});

describe("ColumnMapping", () => {
  it("renders drop area and keeps Save disabled until name + value names are set", () => {
    const onMappingChange = jest.fn();
    const onSave = jest.fn();

    render(
      <ColumnMapping
        onMappingChange={onMappingChange}
        onSave={onSave}
        groups={[]}
        schema={null}
      />
    );

    expect(screen.getByText(/click or drop columns here/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();

    const unionInput = screen.getByPlaceholderText(/new column's name/i);
    fireEvent.change(unionInput, { target: { value: "CombinedColor" } });
    expect(saveBtn).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    const valueName = screen.getByPlaceholderText(/value content/i);
    fireEvent.change(valueName, { target: { value: "Red-ish" } });

    expect(saveBtn).toBeEnabled();
  });

  it("handles drop of a new group and calls onMappingChange with appended group", () => {
    const onMappingChange = jest.fn();
    const onSave = jest.fn();

    render(
      <ColumnMapping
        onMappingChange={onMappingChange}
        onSave={onSave}
        groups={[]}
        schema={null}
      />
    );

    const dropTarget = screen.getByText(/click or drop columns here/i);

    const dropped = {
      nodeId: "n1",
      column: "color",
      values: ["red", "blue", "green"],
      fileName: "file.csv",
      color: "#336699",
    };

    fireEvent.dragOver(dropTarget);
    fireEvent.drop(dropTarget, { dataTransfer: makeDataTransfer(dropped) });

    expect(onMappingChange).toHaveBeenCalledTimes(1);
    expect(onMappingChange).toHaveBeenCalledWith([dropped]);
  });

  it("adds a categorical mapping via the sliding pane and saves the mapping payload", () => {
    const onSave = jest.fn();
    const onMappingChange = jest.fn();

    const groups = [
      {
        nodeId: "n1",
        column: "color",
        values: ["red", "blue", "green"],
        fileName: "colors.csv",
        color: "#ff0000",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={onMappingChange}
        onSave={onSave}
        groups={groups}
        schema={null}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "UnifiedColor" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.change(screen.getByPlaceholderText(/value content/i), {
      target: { value: "Warm" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add mapping/i }));
    fireEvent.click(screen.getByRole("button", { name: "red" }));

    expect(screen.getByText(/values from/i)).toBeInTheDocument();
    expect(screen.getByText(/columns mapped/i)).toBeInTheDocument();

    const switches = screen.getAllByRole("checkbox");
    fireEvent.click(switches[0]);
    fireEvent.click(switches[1]);

    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeEnabled();
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);

    const [
      savedGroups,
      unionName,
      customValues,
      removeFromHierarchy,
      useHotOneMapping,
    ] = onSave.mock.calls[0];

    expect(savedGroups).toEqual(groups);
    expect(unionName).toBe("UnifiedColor");
    expect(removeFromHierarchy).toBe(true);
    expect(useHotOneMapping).toBe(true);

    expect(customValues).toHaveLength(1);
    expect(customValues[0].name).toBe("Warm");
    expect(customValues[0].mapping).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupColumn: "color", value: "red" }),
      ])
    );
  });
});
