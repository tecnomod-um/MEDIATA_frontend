import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import MappingSelectorPane from "./mappingSelectorPane";

vi.mock(
  "./columnMapping.module.css",
  () => ({
    __esModule: true,
    default: new Proxy(
      {},
      {
        get: (_, k) => String(k),
      }
    ),
  }),
  { virtual: true }
);

vi.mock("@mui/icons-material/Close", () => ({
  __esModule: true,
  default: () => <span data-testid="CloseIcon" />,
}));

vi.mock("../RangePicker/rangePicker", () => ({
  __esModule: true,
  default: (props) => (
    <button
      type="button"
      data-testid="range-picker"
      onClick={() =>
        props.onRangeChange?.({
          minValue: 1,
          maxValue: 10,
        })
      }
    >
      Mock RangePicker
    </button>
  ),
}));

vi.mock("../../../util/colors", () => ({
  __esModule: true,
  darkenColor: (color) => color,
}));

describe("MappingSelectorPane", () => {
  const mockGetGroupKey = (g) => `${g.nodeId}::${g.fileName}::${g.column}`;

  const mockExtractMinMax = (values, type) => {
    let min = null;
    let max = null;

    values.forEach((value) => {
      if (type === "integer" || type === "double") {
        if (value.startsWith("min:")) {
          min = parseFloat(value.replace("min:", ""));
        } else if (value.startsWith("max:")) {
          max = parseFloat(value.replace("max:", ""));
        }
      } else if (type === "date") {
        if (value.startsWith("earliest:")) {
          min = new Date(value.replace("earliest:", "")).getTime();
        } else if (value.startsWith("latest:")) {
          max = new Date(value.replace("latest:", "")).getTime();
        }
      }
    });

    return { min, max };
  };

  const mockGetUnavailableRanges = () => [];

  const mockGetAvailableValues = (group) => {
    const firstValue = group.values[0];

    if (
      firstValue === "integer" ||
      firstValue === "double" ||
      firstValue === "date"
    ) {
      return group.values;
    }

    return group.values.filter(
      (v) =>
        !v.startsWith("min:") &&
        !v.startsWith("max:") &&
        !v.startsWith("earliest:") &&
        !v.startsWith("latest:")
    );
  };

  const baseProps = {
    isPaneVisible: true,
    currentValueName: "Test",
    groups: [],
    getGroupKey: mockGetGroupKey,
    extractMinMax: mockExtractMinMax,
    getUnavailableRanges: mockGetUnavailableRanges,
    getAvailableValues: mockGetAvailableValues,
    onSelectMapping: vi.fn(),
    onClose: vi.fn(),
    paneRef: { current: null },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when not visible", () => {
    const { container } = render(
      <MappingSelectorPane {...baseProps} isPaneVisible={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders with current value name", () => {
    render(
      <MappingSelectorPane {...baseProps} currentValueName="MyValue" />
    );

    expect(
      screen.getByText('Create mappings for "MyValue"')
    ).toBeInTheDocument();
  });

  it("renders default text when no value name", () => {
    render(
      <MappingSelectorPane {...baseProps} currentValueName="" />
    );

    expect(
      screen.getByText("Create mappings for the set value")
    ).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();

    render(
      <MappingSelectorPane {...baseProps} onClose={onClose} />
    );

    fireEvent.click(screen.getByTestId("CloseIcon").parentElement);

    expect(onClose).toHaveBeenCalledTimes(1);
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
      <MappingSelectorPane {...baseProps} groups={groups} />
    );

    expect(screen.getByText("color")).toBeInTheDocument();
    expect(screen.getByText("from colors.csv")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "red" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "blue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "green" })).toBeInTheDocument();
  });

  it("calls onSelectMapping when categorical value is clicked", () => {
    const onSelectMapping = vi.fn();
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
        {...baseProps}
        groups={groups}
        onSelectMapping={onSelectMapping}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "red" }));

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
      <MappingSelectorPane {...baseProps} groups={groups} />
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
      <MappingSelectorPane {...baseProps} groups={groups} />
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
      <MappingSelectorPane {...baseProps} groups={groups} />
    );

    expect(screen.getByTestId("range-picker")).toBeInTheDocument();
  });

  it("calls onSelectMapping with range object when range is selected", () => {
    const onSelectMapping = vi.fn();
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
        {...baseProps}
        groups={groups}
        onSelectMapping={onSelectMapping}
      />
    );

    fireEvent.click(screen.getByTestId("range-picker"));

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

    render(
      <MappingSelectorPane
        {...baseProps}
        groups={groups}
        getAvailableValues={() => []}
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
      <MappingSelectorPane {...baseProps} groups={groups} />
    );

    expect(screen.getByText("color")).toBeInTheDocument();
    expect(screen.getByText("size")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "red" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "small" })).toBeInTheDocument();
  });

  it("renders the pane when visible", () => {
    const { container } = render(
      <MappingSelectorPane {...baseProps} />
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});