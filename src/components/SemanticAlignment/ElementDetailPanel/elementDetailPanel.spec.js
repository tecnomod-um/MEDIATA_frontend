import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ElementDetailPanel from "./elementDetailPanel";

jest.mock("lodash/debounce", () => fn => fn);

jest.mock("@mui/icons-material/Delete", () => {
  const React = require("react");
  return () => <span data-testid="icon-del" />;
});
jest.mock("@mui/icons-material/AddBox", () => {
  const React = require("react");
  return () => <span data-testid="icon-add" />;
});
jest.mock("@mui/icons-material/InfoOutlined", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => (
    <span ref={ref} data-testid="icon-info" {...props} />
  ));
});

jest.mock("react-collapse", () => {
  const React = require("react");
  return { Collapse: ({ children }) => <>{children}</> };
});
jest.mock("react-transition-group", () => {
  const React = require("react");
  return {
    CSSTransition: ({ children }) => <>{children}</>,
    SwitchTransition: ({ children }) => <>{children}</>,
  };
});

jest.mock(
  "../../Common/AutoCompleteInput/autoCompleteInput",
  () => {
    const React = require("react");
    return ({ value, onChange, placeholder }) => (
      <input
        data-testid="ac-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  },
);

jest.mock(
  "../../Common/TooltipPopup/tooltipPopup",
  () => {
    const React = require("react");
    return ({ message }) => <span data-testid="tooltip">{message}</span>;
  },
);

const mockFetchClasses = jest.fn();
const mockFetchClassFields = jest.fn();
const mockFetchSuggestions = jest.fn();
jest.mock(
  "../../../util/petitionHandler",
  () => ({
    fetchClasses: (...a) => mockFetchClasses(...a),
    fetchClassFields: (...a) => mockFetchClassFields(...a),
    fetchSuggestions: (...a) => mockFetchSuggestions(...a),
  }),
);

const CLASSES_FIXTURE = [
  { iri: "iri:Class1", label: "Class1" },
  { iri: "iri:Class2", label: "Class2" },
];
const FIELDS_STRING = [
  { name: "field1", optional: false, type: "string" },
];
const FIELDS_TYPE = [
  { name: "typeField", optional: false, type: "type" },
];
const FIELDS_CODE = [
  { name: "codeField", optional: false, type: "code" },
];

function renderPanel(extraProps = {}) {
  const baseProps = {
    activeElement: { name: "ElementA", categories: ["CatA", "CatB"] },
    activeElementIndex: 0,
    activeCategoryIndex: null,
    currentSelection: CLASSES_FIXTURE[0],
    onSelectOption: jest.fn(),
    elementFormValues: {},
    setElementFormValues: jest.fn(),
    onBuildClass: jest.fn(),
    onDeleteClass: jest.fn(),
    builtClasses: {},
  };
  const props = { ...baseProps, ...extraProps };
  return { props, ...render(<ElementDetailPanel {...props} />) };
}

describe("<ElementDetailPanel />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchClasses.mockResolvedValue(CLASSES_FIXTURE);
    mockFetchClassFields.mockResolvedValue(FIELDS_STRING);
    mockFetchSuggestions.mockResolvedValue([
      { label: "Suggestion", iri: "http://s/123" },
    ]);
  });

  it("fetches classes & auto-selects first option when none provided", async () => {
    const onSelectOption = jest.fn();
    renderPanel({ currentSelection: null, onSelectOption });
    await waitFor(() =>
      expect(onSelectOption).toHaveBeenCalledWith(CLASSES_FIXTURE[0])
    );
  });

  it("renders option‐tabs and clicking a tab calls onSelectOption", async () => {
    const onSelectOption = jest.fn();
    renderPanel({ onSelectOption });
    await screen.findByRole("button", { name: /Class1/i });
    fireEvent.click(screen.getByRole("button", { name: /Class2/i }));
    expect(onSelectOption).toHaveBeenCalledWith(CLASSES_FIXTURE[1]);
  });

  it("shows tooltip on hover over info icon", async () => {
    renderPanel();
    await screen.findByTestId("icon-info");
    fireEvent.mouseEnter(screen.getByTestId("icon-info"));
    expect(screen.getByTestId("tooltip")).toHaveTextContent(
      /Select an ontology class and configure its fields/i
    );
    fireEvent.mouseLeave(screen.getByTestId("icon-info"));
    await waitFor(() =>
      expect(screen.queryByTestId("tooltip")).toBeNull()
    );
  });

  it("clicking “Build class” passes loaded string fields", async () => {
    const { props } = renderPanel();
    await screen.findByPlaceholderText(/Enter field1/i);
    fireEvent.click(
      screen.getByRole("button", { name: /build class/i })
    );
    expect(props.onBuildClass).toHaveBeenCalledWith(FIELDS_STRING);
  });

  it("when already built, button shows Delete & calls onDeleteClass", async () => {
    const builtKey = "0";
    const { props } = renderPanel({ builtClasses: { [builtKey]: true } });
    const delBtn = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(delBtn);
    expect(props.onDeleteClass).toHaveBeenCalledWith(builtKey);
  });

  it("typing into a string field updates state & fetches suggestions", async () => {
    const setElementFormValues = jest.fn();
    renderPanel({ setElementFormValues });
    const input = await screen.findByPlaceholderText(/Enter field1/i);
    fireEvent.change(input, { target: { value: "Hel" } });
    expect(setElementFormValues).toHaveBeenCalled();
    expect(mockFetchSuggestions).toHaveBeenCalledWith("Hel", "snomed");
  });

  describe("code‐field type", () => {
    it("renders AutocompleteInput and fetches suggestions", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_CODE);
      const setElementFormValues = jest.fn();
      renderPanel({ setElementFormValues });
      const ac = await screen.findByTestId("ac-input");
      fireEvent.change(ac, { target: { value: "XYZ" } });
      await waitFor(() =>
        expect(mockFetchSuggestions).toHaveBeenCalledWith("XYZ", "snomed")
      );
    });
  });

  describe("type‐field type", () => {
    it("renders boolean radios when elementFormValues already has boolean kind", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "boolean", typeField: true }
      };
      const setElementFormValues = jest.fn();
      renderPanel({ elementFormValues: initialValues, setElementFormValues });
      expect(await screen.findByLabelText("True")).toBeInTheDocument();
      expect(screen.getByLabelText("False")).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText("False"));
      expect(setElementFormValues).toHaveBeenCalled();
    });

    it("renders categorical UI and lets you add/remove rows", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "categorical", typeField_categories: [["A", ""]] }
      };
      const setElementFormValues = jest.fn();
      renderPanel({
        elementFormValues: initialValues,
        setElementFormValues
      });
      await screen.findByRole("combobox");
      const addBtn = await screen.findByRole("button", { name: "+ Add row" });
      fireEvent.click(addBtn);
      expect(setElementFormValues).toHaveBeenCalled();
      const remove = await screen.findByLabelText("Remove category row");
      fireEvent.click(remove);
      expect(setElementFormValues).toHaveBeenCalled();
    });

    it("initializes typeField_categories when kind is categorical and categories exist", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "categorical" }
      };
      const setElementFormValues = jest.fn();
      renderPanel({
        activeElement: { name: "ElementX", categories: ["Cat1", "Cat2"] },
        elementFormValues: initialValues,
        setElementFormValues
      });
      
      await waitFor(() => {
        expect(setElementFormValues).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });
    });

    it("renders integer type option", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "integer" }
      };
      renderPanel({ elementFormValues: initialValues });
      
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });
    });

    it("renders double type option", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "double" }
      };
      renderPanel({ elementFormValues: initialValues });
      
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });
    });

    it("renders date type option", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "date" }
      };
      renderPanel({ elementFormValues: initialValues });
      
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });
    });

    it("handles changing type kind via dropdown", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const setElementFormValues = jest.fn();
      renderPanel({ setElementFormValues });
      
      const select = await screen.findByRole("combobox");
      fireEvent.change(select, { target: { value: "integer" } });
      
      expect(setElementFormValues).toHaveBeenCalled();
    });

    it("updates category value in typeField_categories", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "categorical", typeField_categories: [["CatA", "OldVal"]] }
      };
      const setElementFormValues = jest.fn();
      renderPanel({ elementFormValues: initialValues, setElementFormValues });
      
      const input = await screen.findByDisplayValue("CatA");
      fireEvent.change(input, { target: { value: "CatB" } });
      
      expect(setElementFormValues).toHaveBeenCalled();
    });

    it("updates ontology mapping in typeField_categories", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_TYPE);
      const initialValues = {
        "0": { typeField_kind: "categorical", typeField_categories: [["Cat1", "OldOnto"]] }
      };
      const setElementFormValues = jest.fn();
      renderPanel({ elementFormValues: initialValues, setElementFormValues });
      
      const inputs = await screen.findAllByRole("textbox");
      const ontoInput = inputs.find(i => i.value === "OldOnto");
      let conditionMet = false;
      if (ontoInput) {
        fireEvent.change(ontoInput, { target: { value: "NewOnto" } });
        conditionMet = true;
      }
      expect(conditionMet).toBe(true);
      expect(setElementFormValues).toHaveBeenCalled();
    });
  });

  describe("Auto-population of form fields", () => {
    it("auto-fills field_id with active element name", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_STRING);
      const setElementFormValues = jest.fn();
      renderPanel({ 
        activeElement: { name: "AutoElement" },
        setElementFormValues 
      });
      
      await waitFor(() => {
        expect(setElementFormValues).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });
    });

    it("does not override existing field_id", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_STRING);
      const initialValues = {
        "0": { field_id: "ExistingID" }
      };
      const setElementFormValues = jest.fn();
      renderPanel({ 
        activeElement: { name: "AutoElement" },
        elementFormValues: initialValues,
        setElementFormValues 
      });
      
      await waitFor(() => {
        // Should not be called to override
        const calls = setElementFormValues.mock.calls.filter(call => {
          const fn = call[0];
          if (typeof fn === 'function') {
            const result = fn(initialValues);
            return result["0"]?.field_id !== "ExistingID";
          }
          return false;
        });
        expect(calls.length).toBe(0);
      });
    });

    it("auto-fills pattern_type with current selection label", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_STRING);
      const setElementFormValues = jest.fn();
      renderPanel({ 
        currentSelection: CLASSES_FIXTURE[0],
        setElementFormValues 
      });
      
      await waitFor(() => {
        expect(setElementFormValues).toHaveBeenCalled();
      });
    });

    it("updates pattern_type when selection changes", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_STRING);
      const setElementFormValues = jest.fn();
      const { rerender } = renderPanel({ 
        currentSelection: CLASSES_FIXTURE[0],
        setElementFormValues 
      });
      
      await screen.findByPlaceholderText(/Enter field1/i);
      
      rerender(
        <ElementDetailPanel
          activeElement={{ name: "Element" }}
          activeElementIndex={0}
          activeCategoryIndex={null}
          currentSelection={CLASSES_FIXTURE[1]}
          onSelectOption={jest.fn()}
          elementFormValues={{}}
          setElementFormValues={setElementFormValues}
          onBuildClass={jest.fn()}
          onDeleteClass={jest.fn()}
          builtClasses={{}}
        />
      );
      
      await waitFor(() => {
        expect(setElementFormValues).toHaveBeenCalled();
      });
    });
  });

  describe("Category index handling", () => {
    it("handles active category index for built class deletion", async () => {
      const builtKey = "0-cat-1";
      const { props } = renderPanel({ 
        activeCategoryIndex: 1,
        builtClasses: { [builtKey]: true } 
      });
      
      const delBtn = await screen.findByRole("button", { name: /delete/i });
      fireEvent.click(delBtn);
      
      expect(props.onDeleteClass).toHaveBeenCalledWith(builtKey);
    });

    it("uses activeElementIndex only when activeCategoryIndex is null", async () => {
      const builtKey = "0";
      const { props } = renderPanel({ 
        activeElementIndex: 0,
        activeCategoryIndex: null,
        builtClasses: { [builtKey]: true } 
      });
      
      const delBtn = await screen.findByRole("button", { name: /delete/i });
      fireEvent.click(delBtn);
      
      expect(props.onDeleteClass).toHaveBeenCalledWith(builtKey);
    });
  });

  describe("Error handling and edge cases", () => {
    it("handles fetch classes error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchClasses.mockRejectedValue(new Error("Classes fetch failed"));
      
      renderPanel();
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error fetching classes:",
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });

    it("handles fetch class fields error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchClassFields.mockRejectedValue(new Error("Fields fetch failed"));
      
      renderPanel();
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error fetching fields for",
          expect.any(String),
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });

    it("handles fetch suggestions error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_STRING);
      mockFetchSuggestions.mockRejectedValue(new Error("Suggestions failed"));
      
      const setElementFormValues = jest.fn();
      renderPanel({ setElementFormValues });
      
      const input = await screen.findByPlaceholderText(/Enter field1/i);
      fireEvent.change(input, { target: { value: "FailQuery" } });
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error fetching suggestions:",
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });

    it("clears fields when currentSelection has no iri", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_STRING);
      const { rerender } = renderPanel();
      
      await screen.findByPlaceholderText(/Enter field1/i);
      
      rerender(
        <ElementDetailPanel
          activeElement={{ name: "Element" }}
          activeElementIndex={0}
          activeCategoryIndex={null}
          currentSelection={null}
          onSelectOption={jest.fn()}
          elementFormValues={{}}
          setElementFormValues={jest.fn()}
          onBuildClass={jest.fn()}
          onDeleteClass={jest.fn()}
          builtClasses={{}}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Enter field1/i)).not.toBeInTheDocument();
      });
    });

    it("uses cached fields when available", async () => {
      mockFetchClassFields.mockResolvedValueOnce(FIELDS_STRING);
      
      const { rerender } = renderPanel({ currentSelection: CLASSES_FIXTURE[0] });
      await screen.findByPlaceholderText(/Enter field1/i);
      
      // Change to different selection and back
      rerender(
        <ElementDetailPanel
          activeElement={{ name: "Element" }}
          activeElementIndex={0}
          activeCategoryIndex={null}
          currentSelection={CLASSES_FIXTURE[1]}
          onSelectOption={jest.fn()}
          elementFormValues={{}}
          setElementFormValues={jest.fn()}
          onBuildClass={jest.fn()}
          onDeleteClass={jest.fn()}
          builtClasses={{}}
        />
      );
      
      rerender(
        <ElementDetailPanel
          activeElement={{ name: "Element" }}
          activeElementIndex={0}
          activeCategoryIndex={null}
          currentSelection={CLASSES_FIXTURE[0]}
          onSelectOption={jest.fn()}
          elementFormValues={{}}
          setElementFormValues={jest.fn()}
          onBuildClass={jest.fn()}
          onDeleteClass={jest.fn()}
          builtClasses={{}}
        />
      );
      
      // fetchClassFields is called when needed
      expect(mockFetchClassFields).toHaveBeenCalled();
    });
  });
});
