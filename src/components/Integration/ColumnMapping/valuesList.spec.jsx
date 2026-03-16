import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ValuesList from "./valuesList";
import { vi } from "vitest";

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

vi.mock("../../Common/AutoCompleteInput/autoCompleteInput.js", () => ({
  __esModule: true,
  default: (props) => (
    <input
      type="text"
      role="combobox"
      aria-label={props.placeholder || ""}
      aria-autocomplete="list"
      aria-expanded="false"
      id={props.id || "mock-autocomplete"}
      placeholder={props.placeholder || ""}
      value={props.value || ""}
      onChange={(e) => props.onChange?.(e.target.value)}
      disabled={props.disabled}
      className={props.className}
    />
  ),
}));

vi.mock("../../Common/TooltipPopup/tooltipPopup.js", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("react-transition-group", () => ({
  __esModule: true,
  CSSTransition: ({ children }) => children,
  TransitionGroup: ({ children, component: Component = "div" }) => {
    return React.createElement(Component, null, children);
  },
}));

vi.mock("@mui/icons-material/Add", () => ({
  __esModule: true,
  default: () => <span data-testid="AddIcon" />,
}));

vi.mock("@mui/icons-material/Close", () => ({
  __esModule: true,
  default: () => <span data-testid="CloseIcon" />,
}));

vi.mock("@mui/icons-material/Description", () => ({
  __esModule: true,
  default: () => <span data-testid="DescriptionIcon" />,
}));

describe("ValuesList", () => {
  const mockButtonRefs = { current: [React.createRef(), React.createRef()] };

  const baseProps = {
    groups: [],
    valueContentSuggestions: [],
    valueTerminologySuggestionLabelsFor: vi.fn(() => []),
    snomedValueTerminologySuggestions: {},
    isTooltipShown: false,
    tooltipRef: null,
    tooltipMessage: "",
    onTooltipClose: vi.fn(),
    onValueNameChange: vi.fn(),
    onValueSnomedChange: vi.fn(),
    onAddMapping: vi.fn(),
    onRemoveMapping: vi.fn(),
    onRemoveValue: vi.fn(),
    onOpenDescription: vi.fn(),
    isLockedNumericValue: vi.fn(() => false),
    buttonRefs: mockButtonRefs,
  };

  it("renders empty TransitionGroup when no custom values", () => {
    const { container } = render(
      <ValuesList
        {...baseProps}
        customValues={[]}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders custom value with name and terminology inputs", () => {
    const customValues = [
      {
        id: 1,
        name: "TestValue",
        snomedTerm: "TestTerm",
        mapping: [],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
      />
    );

    expect(screen.getByPlaceholderText("Value content")).toHaveValue("TestValue");
    expect(screen.getByPlaceholderText("Value terminology")).toHaveValue("TestTerm");
  });

  it("calls onValueNameChange when value name is changed", () => {
    const onValueNameChange = vi.fn();
    const customValues = [
      {
        id: 1,
        name: "OldName",
        snomedTerm: "",
        mapping: [],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
        onValueNameChange={onValueNameChange}
      />
    );

    const nameInput = screen.getByPlaceholderText("Value content");
    fireEvent.change(nameInput, { target: { value: "NewName" } });

    expect(onValueNameChange).toHaveBeenCalledWith(1, "NewName");
  });

  it("calls onValueSnomedChange when terminology is changed", () => {
    const onValueSnomedChange = vi.fn();
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
        onValueSnomedChange={onValueSnomedChange}
      />
    );

    const termInput = screen.getByPlaceholderText("Value terminology");
    fireEvent.change(termInput, { target: { value: "NewTerm" } });

    expect(onValueSnomedChange).toHaveBeenCalledWith(1, "NewTerm");
  });

  it("calls onAddMapping when Add Mapping button is clicked", () => {
    const onAddMapping = vi.fn();
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
        onAddMapping={onAddMapping}
      />
    );

    const addMappingBtn = screen.getByRole("button", { name: /add mapping/i });
    fireEvent.click(addMappingBtn);

    expect(onAddMapping).toHaveBeenCalledWith(0);
  });

  it("calls onRemoveValue when delete button is clicked", () => {
    const onRemoveValue = vi.fn();
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
        onRemoveValue={onRemoveValue}
      />
    );

    const closeIcons = screen.getAllByTestId("CloseIcon");
    fireEvent.click(closeIcons[closeIcons.length - 1].parentElement);

    expect(onRemoveValue).toHaveBeenCalledWith(0);
  });

  it("calls onOpenDescription when Description button is clicked", () => {
    const onOpenDescription = vi.fn();
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
        onOpenDescription={onOpenDescription}
      />
    );

    const descriptionBtn = screen.getByRole("button", { name: /description/i });
    fireEvent.click(descriptionBtn);

    expect(onOpenDescription).toHaveBeenCalledWith(0);
  });

  it("displays mapping summary when mappings exist", () => {
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [
          { groupColumn: "color", value: "red" },
          { groupColumn: "size", value: "large" },
        ],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
      />
    );

    expect(screen.getByText("2 values from 2 columns mapped")).toBeInTheDocument();
  });

  it("displays individual mappings", () => {
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [
          {
            groupColumn: "color",
            value: "red",
            fileName: "colors.csv",
            groupKey: "n1::colors.csv::color",
          },
        ],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
      />
    );

    expect(screen.getByText("From color:")).toBeInTheDocument();
    expect(screen.getByText("red")).toBeInTheDocument();
  });

  it("calls onRemoveMapping when mapping delete is clicked", () => {
    const onRemoveMapping = vi.fn();
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [
          {
            groupColumn: "color",
            value: "red",
            fileName: "colors.csv",
            groupKey: "n1::colors.csv::color",
          },
        ],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
        onRemoveMapping={onRemoveMapping}
      />
    );

    const mappingLabel = screen.getByText("From color:");
    const mappingRow =
      mappingLabel.closest("li") ||
      mappingLabel.closest("div");

    expect(mappingRow).toBeInTheDocument();

    const buttonsInRow = within(mappingRow).getAllByRole("button");
    const deleteButton = buttonsInRow[buttonsInRow.length - 1];

    fireEvent.click(deleteButton);

    expect(onRemoveMapping).toHaveBeenCalledWith(0, 0);
  });

  it("shows locked value for numeric types", () => {
    const customValues = [
      {
        id: 1,
        name: "age",
        snomedTerm: "",
        mapping: [{ value: "integer" }],
      },
    ];

    const isLockedNumericValue = vi.fn(() => true);

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
        isLockedNumericValue={isLockedNumericValue}
      />
    );

    const nameInput = screen.getByPlaceholderText("Value content");
    expect(nameInput).toHaveValue("[age range]");

    expect(
      screen.queryByRole("button", { name: /add mapping/i })
    ).not.toBeInTheDocument();
  });

  it("formats date values correctly", () => {
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [
          {
            groupColumn: "date",
            value: {
              minValue: new Date("2020-01-01").getTime(),
              maxValue: new Date("2020-12-31").getTime(),
              type: "date",
            },
            fileName: "dates.csv",
            groupKey: "n1::dates.csv::date",
          },
        ],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
      />
    );

    expect(screen.getByText(/2020-01-01 - 2020-12-31/)).toBeInTheDocument();
  });

  it("shows ambiguous source when same column from different files", () => {
    const customValues = [
      {
        id: 1,
        name: "Test",
        snomedTerm: "",
        mapping: [
          {
            groupColumn: "shared",
            value: "val1",
            fileName: "file1.csv",
            groupKey: "n1::file1.csv::shared",
          },
          {
            groupColumn: "shared",
            value: "val2",
            fileName: "file2.csv",
            groupKey: "n2::file2.csv::shared",
          },
        ],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
      />
    );

    expect(screen.getByText("From shared (from file1.csv):")).toBeInTheDocument();
    expect(screen.getByText("From shared (from file2.csv):")).toBeInTheDocument();
  });

  it("renders multiple custom values", () => {
    const customValues = [
      {
        id: 1,
        name: "Value1",
        snomedTerm: "",
        mapping: [],
      },
      {
        id: 2,
        name: "Value2",
        snomedTerm: "",
        mapping: [],
      },
    ];

    render(
      <ValuesList
        {...baseProps}
        customValues={customValues}
      />
    );

    const inputs = screen.getAllByPlaceholderText("Value content");
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue("Value1");
    expect(inputs[1]).toHaveValue("Value2");
  });
});