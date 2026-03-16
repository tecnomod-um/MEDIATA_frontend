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
});