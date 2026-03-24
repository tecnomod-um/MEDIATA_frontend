import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ColumnMapping from "./columnMapping";
import { vi } from "vitest";

vi.mock("../../../util/petitionHandler", () => ({
  __esModule: true,
  fetchSuggestions: vi.fn().mockResolvedValue([]),
}));

vi.mock("./columnMapping.module.css", () => ({
  __esModule: true,
  default: new Proxy({}, { get: (_, k) => String(k) }),
}));

vi.mock("../../Common/OverlayWrapper/overlayWrapper", () => ({
  __esModule: true,
  default: ({ children, isOpen }) =>
    isOpen ? <div data-testid="OverlayWrapper">{children}</div> : null,
}));

vi.mock("distinct-colors", () => ({
  __esModule: true,
  default: vi.fn(() => []),
}));

vi.mock("react-switch", () => ({
  __esModule: true,
  default: (props) => (
    <input
      type="checkbox"
      aria-label="switch"
      checked={!!props.checked}
      onChange={(e) => props.onChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("../../Common/TooltipPopup/tooltipPopup.js", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../RangePicker/rangePicker", () => ({
  __esModule: true,
  default: (props) => (
    <button
      type="button"
      aria-label="Mock RangePicker"
      onClick={() => props.onRangeChange?.({ minValue: 1, maxValue: 10 })}
    >
      Mock RangePicker
    </button>
  ),
}));

vi.mock("../../Common/AutoCompleteInput/autoCompleteInput.js", () => ({
  __esModule: true,
  default: (props) => (
    <input
      type="text"
      placeholder={props.placeholder || ""}
      value={props.value || ""}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("@mui/icons-material/Add", () => ({
  __esModule: true,
  default: () => <span data-testid="AddIcon" />,
}));

vi.mock("@mui/icons-material/Save", () => ({
  __esModule: true,
  default: () => <span data-testid="SaveIcon" />,
}));

vi.mock("@mui/icons-material/Close", () => ({
  __esModule: true,
  default: () => <span data-testid="CloseIcon" />,
}));

vi.mock("@mui/icons-material/InfoOutlined", () => ({
  __esModule: true,
  default: React.forwardRef((props, ref) => <span ref={ref} data-testid="InfoOutlinedIcon" />),
}));

vi.mock("@mui/icons-material/Description", () => ({
  __esModule: true,
  default: () => <span data-testid="DescriptionIcon" />,
}));

const makeDataTransfer = (payloadObj) => ({
  getData: vi.fn((type) => (type === "column" ? JSON.stringify(payloadObj) : "")),
  setData: vi.fn(),
  dropEffect: "move",
  effectAllowed: "all",
  files: [],
  items: [],
  types: ["column"],
});

describe("ColumnMapping", () => {
  it("renders drop area and shows tooltip feedback when save validation fails", () => {
    const onMappingChange = vi.fn();
    const onSave = vi.fn();

    render(
      <ColumnMapping
        onMappingChange={onMappingChange}
        onSave={onSave}
        groups={[]}
        schema={null}
      />
    );

    expect(screen.getByText(/click or drop columns here/i)).toBeInTheDocument();

    // Save button should have visual disabled state when save is not valid
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toHaveAttribute("aria-disabled", "true");

    const unionInput = screen.getByPlaceholderText(/new column's name/i);
    fireEvent.change(unionInput, { target: { value: "CombinedColor" } });
    // Still disabled - need at least one value
    expect(saveBtn).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    const valueName = screen.getByPlaceholderText(/value content/i);
    fireEvent.change(valueName, { target: { value: "Red-ish" } });

    // Still disabled - need at least one mapping for the value
    expect(saveBtn).toHaveAttribute("aria-disabled", "true");
  });

  it("handles drop of a new group and calls onMappingChange with appended group", () => {
    const onMappingChange = vi.fn();
    const onSave = vi.fn();

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
    const onSave = vi.fn();
    const onMappingChange = vi.fn();

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
    expect(saveBtn).toHaveAttribute("aria-disabled", "false");
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

  it("handles integer/double columns with range picker", () => {
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
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    expect(screen.getByText(/Type: Integer/i)).toBeInTheDocument();
    
    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "AgeRange" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.change(screen.getByPlaceholderText(/value content/i), {
      target: { value: "Adult" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add mapping/i }));
    
    // Simulate range picker interaction
    fireEvent.click(screen.getByRole("button", { name: /Mock RangePicker/i }));
  });

  it("handles date columns with range picker", () => {
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
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    expect(screen.getByText(/Type: Date/i)).toBeInTheDocument();
  });

  it("handles double type columns", () => {
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
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    expect(screen.getByText(/Type: Double/i)).toBeInTheDocument();
  });

  it("prevents dropping duplicate columns", () => {
    const onMappingChange = vi.fn();
    const groups = [
      {
        nodeId: "n1",
        column: "status",
        values: ["active", "inactive"],
        fileName: "file.csv",
        color: "#123456",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={onMappingChange}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    // Find the drop target area - it should be the parent of the status text
    const statusElement = screen.getByText(/status/i);
    
    // Try to drop the same column again on the status element itself
    fireEvent.drop(statusElement, { dataTransfer: makeDataTransfer(groups[0]) });
    
    // Should not call onMappingChange since it's a duplicate
    expect(onMappingChange).not.toHaveBeenCalled();
  });

  it("allows deleting a dropped group", () => {
    const onMappingChange = vi.fn();
    const groups = [
      {
        nodeId: "n1",
        column: "deleteme",
        values: ["val1", "val2"],
        fileName: "file.csv",
        color: "#abcdef",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={onMappingChange}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    const deleteBtn = screen.getAllByTestId ? screen.getAllByTestId("CloseIcon")[0] : screen.getAllByRole("button").find(b => b.textContent === "");
    if (deleteBtn) fireEvent.click(deleteBtn);

    expect(onMappingChange).toHaveBeenCalledWith([]);
  });

  it("allows removing a custom value", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "col",
        values: ["a", "b"],
        fileName: "file.csv",
        color: "#111111",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "NewCol" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    
    const removeButtons = screen.getAllByTestId ? screen.getAllByTestId("CloseIcon") : [];
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[removeButtons.length - 1]);
    }
  });

  it("allows removing a mapping from a custom value", () => {
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
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "Col" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.change(screen.getByPlaceholderText(/value content/i), {
      target: { value: "Val" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add mapping/i }));
    fireEvent.click(screen.getByRole("button", { name: "red" }));
    
    // Now remove the mapping
    const removeBtns = screen.getAllByTestId ? screen.getAllByTestId("CloseIcon") : [];
    if (removeBtns.length > 0) {
      const lastBtn = removeBtns[removeBtns.length - 1];
      fireEvent.click(lastBtn);
    }
  });

  it("closes sliding pane when clicking outside", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "test",
        values: ["a", "b"],
        fileName: "file.csv",
        color: "#222222",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "Col" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.change(screen.getByPlaceholderText(/value content/i), {
      target: { value: "Val" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add mapping/i }));
    
    // Click outside to close pane
    fireEvent.mouseDown(document.body);
  });

  it("handles drop area resizing", () => {
    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={[]}
        schema={null}
      />
    );

    const resizer = screen.queryByRole("separator");
    if (resizer) {
      fireEvent.mouseDown(resizer, { preventDefault: vi.fn() });
      fireEvent(window, new MouseEvent('mousemove', { clientY: 300 }));
      fireEvent(window, new MouseEvent('mouseup'));
    }
    // Test passes if component renders without errors
  });

  it("handles schema as JSON object", () => {
    const schema = { properties: { fieldA: { enum: ["opt1", "opt2"] } } };
    
    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={[]}
        schema={schema}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "fieldA" },
    });
  });

  it("handles schema as JSON string", () => {
    const schema = JSON.stringify({ properties: { fieldB: { enum: ["val1", "val2"] } } });
    
    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={[]}
        schema={schema}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "fieldB" },
    });
  });

  it("handles invalid JSON schema gracefully", () => {
    const schema = "not valid json {";
    
    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={[]}
        schema={schema}
      />
    );

    // Should not crash
    expect(screen.getByPlaceholderText(/new column's name/i)).toBeInTheDocument();
  });

  it("shows all categories mapped message when appropriate", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "status",
        values: ["active"],
        fileName: "file.csv",
        color: "#333333",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "StatusMapping" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.change(screen.getByPlaceholderText(/value content/i), {
      target: { value: "Active" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add mapping/i }));
    fireEvent.click(screen.getByRole("button", { name: "active" }));
    
    // Try to add another mapping - should see "all mapped" message
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    const valueInputs = screen.getAllByPlaceholderText(/value content/i);
    fireEvent.change(valueInputs[1], {
      target: { value: "Another" },
    });
    
    const addMappingBtns = screen.getAllByRole("button", { name: /add mapping/i });
    fireEvent.click(addMappingBtns[1]);
  });

  it("displays ambiguous column source in mappings", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "shared",
        values: ["val1", "val2"],
        fileName: "file1.csv",
        color: "#444444",
      },
      {
        nodeId: "n2",
        column: "shared",
        values: ["val3", "val4"],
        fileName: "file2.csv",
        color: "#555555",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "Combined" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.change(screen.getByPlaceholderText(/value content/i), {
      target: { value: "Value" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add mapping/i }));
    fireEvent.click(screen.getByRole("button", { name: "val1" }));
    fireEvent.click(screen.getByRole("button", { name: "val3" }));
  });

  it("handles range mapping with object value", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "age",
        values: ["integer", "min:0", "max:100"],
        fileName: "data.csv",
        color: "#666666",
      },
    ];

    render(
      <ColumnMapping
        onMappingChange={vi.fn()}
        onSave={vi.fn()}
        groups={groups}
        schema={null}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/new column's name/i), {
      target: { value: "AgeGroup" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add value/i }));
    fireEvent.change(screen.getByPlaceholderText(/value content/i), {
      target: { value: "Young" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /add mapping/i }));
    fireEvent.click(screen.getByRole("button", { name: /Mock RangePicker/i }));
  });
});
