import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import Discovery from "./discovery";
import { vi } from "vitest";

let mockFileExplorerProps;

const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockedRouterState = vi.hoisted(() => ({
  location: { state: undefined },
}));

vi.mock("../../components/Common/FilePicker/filePicker", () => ({
  __esModule: true,
  default: ({ files, onFilesSelected, isProcessing, modalTitle }) => (
    <div
      data-testid="FilePicker"
      data-files={JSON.stringify(files)}
      data-is-processing={String(isProcessing)}
      data-modal-title={modalTitle}
      onClick={() => onFilesSelected({})}
    />
  ),
}));

vi.mock("../../components/Common/FileExplorer/fileExplorer", () => ({
  __esModule: true,
  default: (props) => {
    mockFileExplorerProps = props;

    const {
      nodes,
      category,
      isOpen,
      preSelectedFiles,
      autoProcess,
      onFilesOpened,
    } = props;

    return (
      <div
        data-testid="FileExplorer"
        data-nodes={JSON.stringify(nodes)}
        data-category={category}
        data-is-open={String(isOpen)}
        data-pre-selected-files={JSON.stringify(preSelectedFiles)}
        data-auto-process={String(autoProcess)}
        onClick={() => onFilesOpened && onFilesOpened([])}
      />
    );
  },
}));

vi.mock("../../components/Integration/MappingsResult/mappingsResult", () => ({
  __esModule: true,
  default: () => <div data-testid="MappingsResult" />,
}));

vi.mock("react-transition-group", () => ({
  __esModule: true,
  CSSTransition: ({ in: inProp, children }) => (inProp ? <>{children}</> : null),
  TransitionGroup: ({ children }) => <>{children}</>,
}));

const mockToastInfo = vi.hoisted(() => vi.fn());

vi.mock("react-toastify", () => ({
  __esModule: true,
  ToastContainer: () => <div data-testid="ToastContainer" />,
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  },
}));

vi.mock("../../components/Discovery/ToolTray/toolTray", () => ({
  __esModule: true,
  default: () => <div data-testid="tray">ToolTray</div>,
}));

vi.mock("../../components/Discovery/StatisticsDisplay/statisticsDisplay", () => ({
  __esModule: true,
  default: () => <div data-testid="stats">StatsDisplay</div>,
}));

vi.mock("../../components/Discovery/AggregatesDisplay/aggregateDisplay", () => ({
  __esModule: true,
  default: () => <div data-testid="aggregate">AggregateDisplay</div>,
}));

vi.mock("../../components/Discovery/FilterModal/filterModal", () => ({
  __esModule: true,
  default: () => <div data-testid="filter">FilterModal</div>,
}));

const mockGetNodeDatasets = vi.fn();
const mockProcessSelectedDatasets = vi.fn();
const mockGetProcessSelectedDatasetsStatus = vi.fn();
const mockGetProcessSelectedDatasetsResult = vi.fn();

vi.mock("../../util/petitionHandler", () => ({
  __esModule: true,
  getNodeDatasets: (...a) => mockGetNodeDatasets(...a),
  processSelectedDatasets: (...a) => mockProcessSelectedDatasets(...a),
  getProcessSelectedDatasetsStatus: (...a) =>
    mockGetProcessSelectedDatasetsStatus(...a),
  getProcessSelectedDatasetsResult: (...a) =>
    mockGetProcessSelectedDatasetsResult(...a),
  cancelProcessSelectedDatasetsJob: (...a) =>
    mockCancelProcessSelectedDatasetsJob(...a),
}));

vi.mock("../../util/nodeAxiosSetup", () => ({
  __esModule: true,
  updateNodeAxiosBaseURL: vi.fn(),
}));

const mockSelectedNodes = [
  { nodeId: 1, name: "Node-A", serviceUrl: "http://nodeA" },
];

vi.mock("../../context/nodeContext", () => ({
  __esModule: true,
  useNode: () => ({ selectedNodes: mockSelectedNodes }),
  NodeProvider: ({ children }) => <>{children}</>,
}));

vi.mock("react-router-dom", () => ({
  __esModule: true,
  useLocation: () => mockedRouterState.location,
}));

const DATASETS_FIXTURE = ["file1.csv", "file2.csv"];

const PROCESSED_ITEM = {
  fileName: "file1.csv",
  continuousFeatures: [],
  categoricalFeatures: [],
  dateFeatures: [],
  chiSquareTest: [],
  covariances: {},
  pearsonCorrelations: {},
  spearmanCorrelations: {},
  omittedFeatures: [],
};

const mockCancelProcessSelectedDatasetsJob = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  mockFileExplorerProps = undefined;
  mockedRouterState.location = { state: undefined };
});

const expectProcessedView = async () => {
  expect(await screen.findByTestId("tray")).toBeInTheDocument();
  expect(screen.queryByTestId("FileExplorer")).toBeNull();
};

test("initially fetches datasets and renders <FileExplorer>", async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);

  expect(await screen.findByTestId("FileExplorer")).toBeInTheDocument();
  await waitFor(() => expect(mockGetNodeDatasets).toHaveBeenCalled());
});

test("opening a file (sync) shows processed view and hides explorer", async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: [PROCESSED_ITEM],
  });

  render(<Discovery />);

  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([PROCESSED_ITEM]);
  });

  await expectProcessedView();
});

test("opening a file (async) polls and then shows processed view", async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "async",
    jobId: "job-123",
  });

  mockGetProcessSelectedDatasetsStatus
    .mockResolvedValueOnce({ state: "RUNNING", percent: 25 })
    .mockResolvedValueOnce({ state: "RUNNING", percent: 80 })
    .mockResolvedValueOnce({ state: "DONE", percent: 100 });

  mockGetProcessSelectedDatasetsResult.mockResolvedValue([PROCESSED_ITEM]);

  render(<Discovery />);

  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([PROCESSED_ITEM]);
  });

  await expectProcessedView();
});

test("processes location.state with multiple element files across multiple nodes", async () => {
  const multiNodeFiles = [
    { nodeId: 1, fileName: "fileA.csv" },
    { nodeId: 2, fileName: "fileB.csv" },
  ];

  mockedRouterState.location = {
    state: { elementFiles: multiNodeFiles },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: [PROCESSED_ITEM],
  });

  render(<Discovery />);
  await waitFor(() => expect(mockProcessSelectedDatasets).toHaveBeenCalled());
});

test("handles async mode from location.state element files", async () => {
  mockedRouterState.location = {
    state: { elementFiles: [{ nodeId: 1, fileName: "test.csv" }] },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "async",
    jobId: "job-456",
  });

  mockGetProcessSelectedDatasetsStatus.mockResolvedValue({
    state: "DONE",
    percent: 100,
  });
  mockGetProcessSelectedDatasetsResult.mockResolvedValue([PROCESSED_ITEM]);

  render(<Discovery />);
  await waitFor(() =>
    expect(mockGetProcessSelectedDatasetsStatus).toHaveBeenCalled()
  );
});

test("shows error toast when processing location.state files fails", async () => {
  mockedRouterState.location = {
    state: { elementFiles: [{ nodeId: 1, fileName: "bad.csv" }] },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockRejectedValue(new Error("Processing failed"));

  render(<Discovery />);
  await waitFor(() =>
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Error processing parsed element files")
    )
  );
});

test("handles ERROR state from pollDiscoveryJob", async () => {
  mockedRouterState.location = {
    state: { elementFiles: [{ nodeId: 1, fileName: "error.csv" }] },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "async",
    jobId: "error-job",
  });

  mockGetProcessSelectedDatasetsStatus.mockResolvedValue({
    state: "ERROR",
    message: "Job failed",
  });

  render(<Discovery />);
  await waitFor(() => expect(mockToastError).toHaveBeenCalled());
});

test("shows error toast when no parsed files returned", async () => {
  mockedRouterState.location = {
    state: { elementFiles: [{ nodeId: 1, fileName: "empty.csv" }] },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: [],
  });

  render(<Discovery />);
  await waitFor(() =>
    expect(mockToastError).toHaveBeenCalledWith(
      "No parsed files returned from backend."
    )
  );
});

test("combines multiple data results with different feature types", async () => {
  const multipleResults = [
    {
      fileName: "file1.csv",
      continuousFeatures: [{ featureName: "age", mean: 30 }],
      categoricalFeatures: [{ featureName: "gender", categories: ["M", "F"] }],
      dateFeatures: [{ featureName: "birthDate", min: "2000-01-01" }],
      chiSquareTest: [{ test: "result1" }],
      covariances: { age: { height: 0.5 } },
      pearsonCorrelations: { age: { height: 0.7 } },
      spearmanCorrelations: { age: { height: 0.65 } },
      omittedFeatures: ["badCol1"],
    },
    {
      fileName: "file2.csv",
      continuousFeatures: [{ featureName: "height", mean: 170 }],
      categoricalFeatures: [],
      dateFeatures: [],
      chiSquareTest: [],
      covariances: {},
      pearsonCorrelations: {},
      spearmanCorrelations: {},
      omittedFeatures: [],
    },
  ];

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened(multipleResults);
  });

  await expectProcessedView();
});

test("adjusts viewport width and toggles tool tray", async () => {
  Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);

  act(() => {
    Object.defineProperty(window, "innerWidth", { value: 500 });
    window.dispatchEvent(new Event("resize"));
  });

  expect(await screen.findByTestId("FileExplorer")).toBeInTheDocument();
});

test("handles viewport resize to mobile width", async () => {
  Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);

  act(() => {
    Object.defineProperty(window, "innerWidth", { value: 600 });
    window.dispatchEvent(new Event("resize"));
  });

  expect(await screen.findByTestId("FileExplorer")).toBeInTheDocument();
});

test("doesn't process location.state files more than once", async () => {
  mockedRouterState.location = {
    state: { elementFiles: [{ nodeId: 1, fileName: "once.csv" }] },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: [PROCESSED_ITEM],
  });

  const { rerender } = render(<Discovery />);
  await waitFor(() =>
    expect(mockProcessSelectedDatasets).toHaveBeenCalledTimes(1)
  );

  rerender(<Discovery />);
  await waitFor(() =>
    expect(mockProcessSelectedDatasets).toHaveBeenCalledTimes(1)
  );
});

test("handles unexpected response mode from processList", async () => {
  mockedRouterState.location = {
    state: { elementFiles: [{ nodeId: 1, fileName: "weird.csv" }] },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "unknown",
  });

  render(<Discovery />);
  await waitFor(() => expect(mockToastError).toHaveBeenCalled());
});

test("handles files with no fileName in results", async () => {
  const resultWithoutFileName = {
    continuousFeatures: [],
    categoricalFeatures: [],
    dateFeatures: [],
    nodeId: 1,
    nodeName: "Node1",
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([resultWithoutFileName]);
  });

  await expectProcessedView();
});

test("handles multiple file selections", async () => {
  const multipleResults = [
    {
      continuousFeatures: [{ name: "age", nodeId: 1 }],
      categoricalFeatures: [],
      dateFeatures: [],
      fileName: "file1.csv",
      nodeId: 1,
      nodeName: "Node1",
    },
    {
      continuousFeatures: [{ name: "score", nodeId: 1 }],
      categoricalFeatures: [],
      dateFeatures: [],
      fileName: "file2.csv",
      nodeId: 1,
      nodeName: "Node1",
    },
  ];

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened(multipleResults);
  });

  await expectProcessedView();
});

test("handles empty feature arrays", async () => {
  const emptyFeaturesResult = {
    continuousFeatures: [],
    categoricalFeatures: [],
    dateFeatures: [],
    fileName: "empty.csv",
    nodeId: 1,
    nodeName: "Node1",
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([emptyFeaturesResult]);
  });

  await expectProcessedView();
});

test("handles files with all feature types", async () => {
  const allFeaturesResult = {
    continuousFeatures: [{ name: "age", nodeId: 1 }],
    categoricalFeatures: [{ name: "gender", nodeId: 1 }],
    dateFeatures: [{ name: "birthdate", nodeId: 1 }],
    fileName: "complete.csv",
    nodeId: 1,
    nodeName: "Node1",
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([allFeaturesResult]);
  });

  await expectProcessedView();
});

test("handles very large feature arrays", async () => {
  const largeResult = {
    continuousFeatures: Array(100)
      .fill(null)
      .map((_, i) => ({ name: `cont${i}`, nodeId: 1 })),
    categoricalFeatures: Array(50)
      .fill(null)
      .map((_, i) => ({ name: `cat${i}`, nodeId: 1 })),
    dateFeatures: Array(10)
      .fill(null)
      .map((_, i) => ({ name: `date${i}`, nodeId: 1 })),
    fileName: "large.csv",
    nodeId: 1,
    nodeName: "Node1",
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([largeResult]);
  });

  await expectProcessedView();
});

test("handles error when fetching datasets", async () => {
  mockGetNodeDatasets.mockRejectedValue(new Error("Network error"));
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  render(<Discovery />);

  await waitFor(() => expect(mockGetNodeDatasets).toHaveBeenCalled());
  expect(consoleSpy).toHaveBeenCalledWith(
    "Error fetching datasets:",
    expect.any(Error)
  );

  consoleSpy.mockRestore();
});

test("renders with multiple files and toolTray can access toggleFileActive", async () => {
  const results = [
    { ...PROCESSED_ITEM, fileName: "file1.csv" },
    { ...PROCESSED_ITEM, fileName: "file2.csv" },
  ];

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened(results);
  });

  expect(await screen.findByTestId("tray")).toBeInTheDocument();
});

test("handles location.state with no files for a node", async () => {
  mockedRouterState.location = {
    state: {
      elementFiles: [{ nodeId: 999, fileName: "test.csv" }],
    },
  };

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: [],
  });

  render(<Discovery />);

  await waitFor(() => expect(mockProcessSelectedDatasets).not.toHaveBeenCalled());
  await waitFor(() =>
    expect(mockToastError).toHaveBeenCalledWith(
      "No parsed files returned from backend."
    )
  );
});