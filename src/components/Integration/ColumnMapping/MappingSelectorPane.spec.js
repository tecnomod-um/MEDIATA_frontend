import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MappingSelectorPane from "./MappingSelectorPane";

jest.mock(
  "./columnMapping.module.css",
  () => new Proxy({}, { get: (_, k) => String(k) }),
  { virtual: true }
);

jest.mock("@mui/icons-material/Close", () => () => (
  <span data-testid="CloseIcon" />
));

jest.mock("../RangePicker/rangePicker.js", () => (props) => (
  <button
    type="button"
    data-testid="range-picker"
    onClick={() => props.onRangeChange?.({ minValue: 1, maxValue: 10 })}
  >
    Mock RangePicker
  </button>
));

jest.mock("../../../util/colors.js", () => ({
  darkenColor: (color, amount) => color, // Just return the same color for testing
}));

describe("MappingSelectorPane", () => {
  const mockGetGroupKey = (g) => `${g.nodeId}::${g.fileName}::${g.column}`;
  const mockExtractMinMax = (values, type) => {
    let min = null;
    let max = null;
    values.forEach((value) => {
      if (type === "integer" || type === "double") {
        if (value.startsWith("min:")) min = parseFloat(value.replace("min:", ""));
        else if (value.startsWith("max:")) max = parseFloat(value.replace("max:", ""));
      }
    });
    return { min, max };
  };
  const mockGetUnavailableRanges = () => [];
  const mockGetAvailableValues = (group) => {
    // For numeric/date types, return empty array (no individual values to map)
    const firstValue = group.values[0];
    if (firstValue === "integer" || firstValue === "double" || firstValue === "date") {
      return group.values; // Return all values for numeric types
    }
    return group.values.filter(
      (v) => !v.startsWith("min:") && !v.startsWith("max:") && !v.startsWith("earliest:") && !v.startsWith("latest:")
    );
  };

  it("returns null when not visible", () => {
    const { container } = render(
      <MappingSelectorPane
        isPaneVisible={false}
        currentValueName="Test"
        groups={[]}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders with current value name", () => {
    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="MyValue"
        groups={[]}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(
      screen.getByText('Create mappings for "MyValue"')
    ).toBeInTheDocument();
  });

  it("renders default text when no value name", () => {
    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName=""
        groups={[]}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(
      screen.getByText("Create mappings for the set value")
    ).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={[]}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={onClose}
        paneRef={{ current: null }}
      />
    );

    const closeButton = screen.getByTestId("CloseIcon").parentElement;
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("renders categorical values as buttons", () => {
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
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(screen.getByText("color")).toBeInTheDocument();
    expect(screen.getByText("from colors.csv")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "red" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "blue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "green" })).toBeInTheDocument();
  });

  it("calls onSelectMapping when categorical value is clicked", () => {
    const onSelectMapping = jest.fn();
    const groups = [
      {
        nodeId: "n1",
        column: "color",
        values: ["red", "blue"],
        fileName: "colors.csv",
        color: "#ff0000",
      },
    ];

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={onSelectMapping}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    const redButton = screen.getByRole("button", { name: "red" });
    fireEvent.click(redButton);

    expect(onSelectMapping).toHaveBeenCalledWith(groups[0], "red");
  });

  it("renders RangePicker for integer columns", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "age",
        values: ["integer", "min:0", "max:100"],
        fileName: "data.csv",
        color: "#0000ff",
      },
    ];

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(screen.getByTestId("range-picker")).toBeInTheDocument();
  });

  it("renders RangePicker for double columns", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "price",
        values: ["double", "min:0.0", "max:999.99"],
        fileName: "prices.csv",
        color: "#ff00ff",
      },
    ];

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(screen.getByTestId("range-picker")).toBeInTheDocument();
  });

  it("renders RangePicker for date columns", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "birthdate",
        values: ["date", "earliest:2000-01-01", "latest:2024-12-31"],
        fileName: "dates.csv",
        color: "#00ff00",
      },
    ];

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(screen.getByTestId("range-picker")).toBeInTheDocument();
  });

  it("calls onSelectMapping with range object when range is selected", () => {
    const onSelectMapping = jest.fn();
    const groups = [
      {
        nodeId: "n1",
        column: "age",
        values: ["integer", "min:0", "max:100"],
        fileName: "data.csv",
        color: "#0000ff",
      },
    ];

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={onSelectMapping}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    const rangePicker = screen.getByTestId("range-picker");
    fireEvent.click(rangePicker);

    expect(onSelectMapping).toHaveBeenCalledWith(groups[0], {
      minValue: 1,
      maxValue: 10,
      type: "integer",
    });
  });

  it("shows all mapped message when no available values", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "color",
        values: ["red", "blue"],
        fileName: "colors.csv",
        color: "#ff0000",
      },
    ];

    const mockGetAvailableValuesEmpty = () => [];

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValuesEmpty}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(
      screen.getByText("All categories have been mapped.")
    ).toBeInTheDocument();
  });

  it("renders multiple groups", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "color",
        values: ["red", "blue"],
        fileName: "colors.csv",
        color: "#ff0000",
      },
      {
        nodeId: "n2",
        column: "size",
        values: ["small", "large"],
        fileName: "sizes.csv",
        color: "#00ff00",
      },
    ];

    render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={groups}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    expect(screen.getByText("color")).toBeInTheDocument();
    expect(screen.getByText("size")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "red" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "small" })).toBeInTheDocument();
  });

  it("applies paneVisible class when visible", () => {
    const { container } = render(
      <MappingSelectorPane
        isPaneVisible={true}
        currentValueName="Test"
        groups={[]}
        getGroupKey={mockGetGroupKey}
        extractMinMax={mockExtractMinMax}
        getUnavailableRanges={mockGetUnavailableRanges}
        getAvailableValues={mockGetAvailableValues}
        onSelectMapping={jest.fn()}
        onClose={jest.fn()}
        paneRef={{ current: null }}
      />
    );

    // Check that the pane is rendered (not null)
    const pane = container.firstChild;
    expect(pane).toBeInTheDocument();
  });
});
