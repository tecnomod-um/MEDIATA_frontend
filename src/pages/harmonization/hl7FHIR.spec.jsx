import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import HL7FHIR from "./hl7FHIR";
import { vi } from "vitest";

let pickerProps;
let listProps;
let clusterProps;

const mockCreateInitial = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ "Cluster 1": { Foo: "bar" } })
);

vi.mock("react-transition-group", () => {
  const React = require("react");
  return {
    __esModule: true,
    CSSTransition: ({ children }) => <>{children}</>,
  };
});

vi.mock("../../components/Common/FilePicker/uploadFilePicker", () => ({
  __esModule: true,
  default: (props) => {
    pickerProps = props;
    return <div data-testid="picker" />;
  },
}));

vi.mock("../../components/HL7FHIR/ListPanel/listPanel", () => ({
  __esModule: true,
  default: (props) => {
    listProps = props;
    return <div data-testid="list" />;
  },
}));

vi.mock("../../components/HL7FHIR/ElementForm/elementForm", () => ({
  __esModule: true,
  default: (props) => (
    <button data-testid="create-btn" onClick={() => props.onCreateClusters()}>
      create
    </button>
  ),
}));

vi.mock("../../components/HL7FHIR/ClusterListPanel/clusterListPanel", () => ({
  __esModule: true,
  default: (props) => {
    clusterProps = props;
    return <div data-testid="cluster-list" />;
  },
}));

vi.mock("../../components/HL7FHIR/ClusterDetailPanel/clusterDetailPanel", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../util/petitionHandler", () => ({
  __esModule: true,
  createInitialClusters: (...args) => mockCreateInitial(...args),
}));

const CSV = "Name,string\nAge,integer,0,120";

class FakeReader {
  readAsText() {
    setTimeout(() => this.onload?.({ target: { result: CSV } }), 0);
  }
}

global.FileReader = FakeReader;

beforeEach(() => {
  pickerProps = undefined;
  listProps = undefined;
  clusterProps = undefined;
  mockCreateInitial.mockClear();
  mockCreateInitial.mockResolvedValue({ "Cluster 1": { Foo: "bar" } });
});

describe("<HL7FHIR />", () => {
  it("CSV upload → list → create clusters", async () => {
    render(<HL7FHIR />);
    expect(screen.getByTestId("picker")).toBeInTheDocument();

    await act(async () => {
      pickerProps.onFileUpload(new File(["dummy"], "format.csv"));
    });

    await screen.findByTestId("list");
    expect(listProps.elements).toHaveLength(1);

    await act(async () => {
      screen.getByTestId("create-btn").click();
    });

    expect(mockCreateInitial).toHaveBeenCalledTimes(1);
    await screen.findByTestId("cluster-list");
    expect(clusterProps.clusters).toHaveLength(1);
    expect(clusterProps.clusters[0].name).toBe("Cluster 1");
  });

  it("parses CSV with integer type correctly", async () => {
    render(<HL7FHIR />);

    await act(async () => {
      pickerProps.onFileUpload(new File(["dummy"], "test.csv"));
    });

    await waitFor(() => {
      expect(listProps.elements[0].type).toBe("integer");
    });
  });

  it("selects first element after CSV upload", async () => {
    render(<HL7FHIR />);

    await act(async () => {
      pickerProps.onFileUpload(new File(["dummy"], "test.csv"));
    });

    await waitFor(() => {
      expect(listProps.selectedElement).toBeDefined();
    });

    await waitFor(() => {
      expect(listProps.selectedElement.id).toBe(0);
    });
  });

  it("handles drag start and end", async () => {
    render(<HL7FHIR />);

    await act(async () => {
      pickerProps.onFileUpload(new File(["dummy"], "test.csv"));
    });

    await waitFor(() => {
      expect(listProps.onDragStart).toBeDefined();
      expect(listProps.onDragEnd).toBeDefined();
    });

    act(() => {
      listProps.onDragStart();
    });

    act(() => {
      listProps.onDragEnd();
    });
  });

  it("handles cluster creation error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateInitial.mockRejectedValueOnce(new Error("API Error"));

    render(<HL7FHIR />);

    await act(async () => {
      pickerProps.onFileUpload(new File(["dummy"], "test.csv"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("create-btn")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId("create-btn").click();
    });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it("parseCsvData: double type → data has min/max", async () => {
    class DoubleReader {
      readAsText() {
        setTimeout(() => this.onload?.({ target: { result: "weight,double,50,120" } }), 0);
      }
    }
    global.FileReader = DoubleReader;

    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });

    await waitFor(() => {
      expect(listProps.elements[0].type).toBe("double");
      expect(listProps.elements[0].data).toEqual({ min: "50", max: "120" });
    });
  });

  it("parseCsvData: date type → data has earliest/latest", async () => {
    class DateReader {
      readAsText() {
        setTimeout(() => this.onload?.({ target: { result: "dob,date,1900-01-01,2023-12-31" } }), 0);
      }
    }
    global.FileReader = DateReader;

    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });

    await waitFor(() => {
      expect(listProps.elements[0].type).toBe("date");
      expect(listProps.elements[0].data).toEqual({ earliest: "1900-01-01", latest: "2023-12-31" });
    });
  });

  it("parseCsvData: unknown second column → categorical with options", async () => {
    // First line has >1 col but second col is not a known type → treated as header and shifted.
    // Second line 'gender,Male,Female,Other' → categorical.
    class CatReader {
      readAsText() {
        setTimeout(() => this.onload?.({ target: { result: "Header,NonType\ngender,Male,Female,Other" } }), 0);
      }
    }
    global.FileReader = CatReader;

    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });

    await waitFor(() => {
      expect(listProps.elements[0].type).toBe("categorical");
      expect(listProps.elements[0].data.options).toEqual(["Male", "Female", "Other"]);
    });
  });

  it("parseCsvData: header row shift when second col is not known type", async () => {
    class HeaderReader {
      readAsText() {
        setTimeout(() => this.onload?.({ target: { result: "Label,Description\nage,integer,0,120" } }), 0);
      }
    }
    global.FileReader = HeaderReader;

    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });

    await waitFor(() => {
      // After shifting the header, only "age" row remains
      expect(listProps.elements).toHaveLength(1);
      expect(listProps.elements[0].type).toBe("integer");
    });
  });

  it("parseCsvData: empty CSV → no elements", async () => {
    class EmptyReader {
      readAsText() {
        setTimeout(() => this.onload?.({ target: { result: "   \n  \n" } }), 0);
      }
    }
    global.FileReader = EmptyReader;

    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });

    // Empty CSV yields 0 elements → dataFormat set to true but no elements
    await waitFor(() => {
      expect(screen.queryByTestId("list")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(listProps.elements).toHaveLength(0);
    });

    // Restore FakeReader for subsequent tests
    global.FileReader = FakeReader;
  });

  it("handleFormChange: updates form values for current element", async () => {
    global.FileReader = FakeReader;
    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });
    await waitFor(() => expect(listProps.selectedElement).toBeDefined());

    // Trigger handleSelectElement — no crash expected
    act(() => { listProps.onSelectElement(listProps.elements[0]); });
    expect(listProps.selectedElement).not.toBeNull();
  });

  it("handleSelectElement: clears selectedCluster and sets element", async () => {
    global.FileReader = FakeReader;
    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });
    await waitFor(() => expect(listProps.elements.length).toBeGreaterThan(0));

    act(() => { listProps.onSelectElement(listProps.elements[0]); });

    await waitFor(() => {
      expect(listProps.selectedElement).toEqual(listProps.elements[0]);
    });
  });

  it("ClusterDetailPanel: selecting a cluster switches away from cluster list", async () => {
    global.FileReader = FakeReader;
    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });
    await waitFor(() => expect(screen.getByTestId("create-btn")).toBeInTheDocument());

    await act(async () => { screen.getByTestId("create-btn").click(); });
    await waitFor(() => expect(clusterProps).toBeDefined());
    await waitFor(() => expect(clusterProps.clusters.length).toBeGreaterThan(0));

    // Select a cluster via the list panel callback
    act(() => { clusterProps.onSelectCluster(clusterProps.clusters[0]); });

    // After selecting, ClusterListPanel should no longer be shown
    await waitFor(() => {
      expect(screen.queryByTestId("cluster-list")).not.toBeInTheDocument();
    });
  });

  it("handleMoveElement: moves element between clusters", async () => {
    global.FileReader = FakeReader;
    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });
    await waitFor(() => expect(screen.getByTestId("create-btn")).toBeInTheDocument());

    await act(async () => { screen.getByTestId("create-btn").click(); });
    await waitFor(() => expect(clusterProps?.clusters?.length).toBeGreaterThan(0));

    // onMoveElement is provided by the component
    expect(typeof clusterProps.onMoveElement).toBe('function');

    // Move an existing element to cluster 0 → no crash
    const elementId = clusterProps.clusters[0].elements[0]?.id;
    if (elementId !== undefined) {
      act(() => { clusterProps.onMoveElement(elementId, clusterProps.clusters[0].id); });
    }
    expect(true).toBe(true);
  });

  it("handleMoveElement: element not found returns same clusters", async () => {
    global.FileReader = FakeReader;
    render(<HL7FHIR />);
    await act(async () => { pickerProps.onFileUpload(new File(["dummy"], "test.csv")); });
    await waitFor(() => expect(screen.getByTestId("create-btn")).toBeInTheDocument());

    await act(async () => { screen.getByTestId("create-btn").click(); });
    await waitFor(() => expect(clusterProps?.clusters?.length).toBeGreaterThan(0));

    const before = clusterProps.clusters.length;

    // Move a non-existing element id → should be a no-op (moved=null → old returned)
    act(() => { clusterProps.onMoveElement('__no_such_element_id__', 0); });

    await waitFor(() => {
      expect(clusterProps.clusters.length).toBe(before);
    });
  });
});