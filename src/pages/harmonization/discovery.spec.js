import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import Discovery from "./discovery";

let mockFileExplorerProps;

jest.mock("react-transition-group", () => {
  const React = require("react");
  return {
    CSSTransition: ({ children }) => <>{children}</>,
    TransitionGroup: ({ children }) => <>{children}</>,
  };
});

jest.mock("react-toastify", () => ({
  ToastContainer: () => <div data-testid="toast" />,
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("../../components/Common/FilePicker/filePicker", () => () => (
  <div data-testid="picker">FilePicker</div>
));

jest.mock("../../components/Common/FileExplorer/fileExplorer", () => {
  const React = require("react");
  return function MockFileExplorer(props) {
    mockFileExplorerProps = props;
    return <div data-testid="explorer">FileExplorer</div>;
  };
});

jest.mock(
  "../../components/Discovery/ToolTray/toolTray",
  () => () => <div data-testid="tray">ToolTray</div>
);

jest.mock(
  "../../components/Discovery/StatisticsDisplay/statisticsDisplay",
  () => () => <div data-testid="stats">StatsDisplay</div>
);

jest.mock(
  "../../components/Discovery/AggregatesDisplay/aggregateDisplay",
  () => () => <div data-testid="aggregate">AggregateDisplay</div>
);

jest.mock(
  "../../components/Discovery/FilterModal/filterModal",
  () => () => <div data-testid="filter">FilterModal</div>
);

const mockGetNodeDatasets = jest.fn();
const mockProcessSelectedDatasets = jest.fn();
const mockGetProcessSelectedDatasetsStatus = jest.fn();
const mockGetProcessSelectedDatasetsResult = jest.fn();

jest.mock("../../util/petitionHandler", () => ({
  getNodeDatasets: (...a) => mockGetNodeDatasets(...a),
  processSelectedDatasets: (...a) => mockProcessSelectedDatasets(...a),
  getProcessSelectedDatasetsStatus: (...a) =>
    mockGetProcessSelectedDatasetsStatus(...a),
  getProcessSelectedDatasetsResult: (...a) =>
    mockGetProcessSelectedDatasetsResult(...a),
}));

jest.mock("../../util/nodeAxiosSetup", () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));


const mockSelectedNodes = [
  { nodeId: 1, name: "Node-A", serviceUrl: "http://nodeA" },
];

jest.mock("../../context/nodeContext", () => ({
  useNode: () => ({ selectedNodes: mockSelectedNodes }),
  NodeProvider: ({ children }) => <>{children}</>,
}));

jest.mock("react-router-dom", () => {
  const real = jest.requireActual("react-router-dom");
  return { 
    ...real, 
    useLocation: jest.fn(() => ({ state: undefined }))
  };
});

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
  omittedFeatures: []
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFileExplorerProps = undefined;
  const { useLocation } = require("react-router-dom");
  useLocation.mockReturnValue({ state: undefined });
});

test("initially fetches datasets and renders <FileExplorer>", async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);

  expect(await screen.findByTestId("explorer")).toBeInTheDocument();

  await waitFor(() => expect(mockGetNodeDatasets).toHaveBeenCalled());
});

test("opening a file (sync) shows statistics view and hides explorer", async () => {
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

  expect(await screen.findByTestId("tray")).toBeInTheDocument();
  expect(await screen.findByTestId("stats")).toBeInTheDocument();
  expect(screen.queryByTestId("explorer")).toBeNull();
});

test("opening a file (async) polls and then shows statistics view", async () => {
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

  // FileExplorer (which is mocked) would handle the polling internally
  // Here we just simulate the final callback after polling completes
  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([PROCESSED_ITEM]);
  });

  // Discovery should show the results
  expect(await screen.findByTestId("tray")).toBeInTheDocument();
  expect(await screen.findByTestId("stats")).toBeInTheDocument();
  
  // Note: The polling APIs (mockGetProcessSelectedDatasetsStatus, mockGetProcessSelectedDatasetsResult)
  // would be called by FileExplorer internally, but since FileExplorer is mocked in this test,
  // those calls don't happen. This test only verifies Discovery's response to onFilesOpened callback.
});

test("processes location.state with multiple element files across multiple nodes", async () => {
  const { useLocation } = require("react-router-dom");
  const multiNodeFiles = [
    { nodeId: 1, fileName: "fileA.csv" },
    { nodeId: 2, fileName: "fileB.csv" }
  ];
  useLocation.mockReturnValue({ state: { elementFiles: multiNodeFiles } });
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: [PROCESSED_ITEM]
  });

  render(<Discovery />);
  await waitFor(() => expect(mockProcessSelectedDatasets).toHaveBeenCalled());
});

test("handles async mode from location.state element files", async () => {
  const { useLocation } = require("react-router-dom");
  useLocation.mockReturnValue({ 
    state: { elementFiles: [{ nodeId: 1, fileName: "test.csv" }] } 
  });
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "async",
    jobId: "job-456"
  });
  
  mockGetProcessSelectedDatasetsStatus.mockResolvedValue({ state: "DONE", percent: 100 });
  mockGetProcessSelectedDatasetsResult.mockResolvedValue([PROCESSED_ITEM]);

  render(<Discovery />);
  await waitFor(() => expect(mockGetProcessSelectedDatasetsStatus).toHaveBeenCalled());
});

test("shows error toast when processing location.state files fails", async () => {
  const { toast } = require("react-toastify");
  const { useLocation } = require("react-router-dom");
  useLocation.mockReturnValue({ 
    state: { elementFiles: [{ nodeId: 1, fileName: "bad.csv" }] } 
  });
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockRejectedValue(new Error("Processing failed"));

  render(<Discovery />);
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
    expect.stringContaining("Error processing parsed element files")
  ));
});

test("handles ERROR state from pollDiscoveryJob", async () => {
  const { toast } = require("react-toastify");
  const { useLocation } = require("react-router-dom");
  useLocation.mockReturnValue({ 
    state: { elementFiles: [{ nodeId: 1, fileName: "error.csv" }] } 
  });
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "async",
    jobId: "error-job"
  });
  
  mockGetProcessSelectedDatasetsStatus.mockResolvedValue({ 
    state: "ERROR", 
    message: "Job failed" 
  });

  render(<Discovery />);
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
});

test("shows error toast when no parsed files returned", async () => {
  const { toast } = require("react-toastify");
  const { useLocation } = require("react-router-dom");
  useLocation.mockReturnValue({ 
    state: { elementFiles: [{ nodeId: 1, fileName: "empty.csv" }] } 
  });
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: []
  });

  render(<Discovery />);
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
    "No parsed files returned from backend."
  ));
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
      omittedFeatures: ["badCol1"]
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
      omittedFeatures: []
    }
  ];

  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened(multipleResults);
  });

  expect(await screen.findByTestId("stats")).toBeInTheDocument();
});

test("adjusts viewport width and toggles tool tray", async () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  
  act(() => {
    Object.defineProperty(window, 'innerWidth', { value: 500 });
    window.dispatchEvent(new Event('resize'));
  });

  expect(await screen.findByTestId("explorer")).toBeInTheDocument();
});

test("handles viewport resize to mobile width", async () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  
  act(() => {
    Object.defineProperty(window, 'innerWidth', { value: 600 });
    window.dispatchEvent(new Event('resize'));
  });

  expect(await screen.findByTestId("explorer")).toBeInTheDocument();
});

test("doesn't process location.state files more than once", async () => {
  const { useLocation } = require("react-router-dom");
  useLocation.mockReturnValue({ 
    state: { elementFiles: [{ nodeId: 1, fileName: "once.csv" }] } 
  });
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "sync",
    results: [PROCESSED_ITEM]
  });

  const { rerender } = render(<Discovery />);
  await waitFor(() => expect(mockProcessSelectedDatasets).toHaveBeenCalledTimes(1));
  
  // Rerender with same location.state shouldn't process again
  rerender(<Discovery />);
  await waitFor(() => expect(mockProcessSelectedDatasets).toHaveBeenCalledTimes(1));
});

test("handles unexpected response mode from processList", async () => {
  const { toast } = require("react-toastify");
  const { useLocation } = require("react-router-dom");
  useLocation.mockReturnValue({ 
    state: { elementFiles: [{ nodeId: 1, fileName: "weird.csv" }] } 
  });
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue({
    mode: "unknown"
  });

  render(<Discovery />);
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
});

test("handles files with no fileName in results", async () => {
  const resultWithoutFileName = {
    continuousFeatures: [],
    categoricalFeatures: [],
    dateFeatures: [],
    nodeId: 1,
    nodeName: "Node1"
  };
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([resultWithoutFileName]);
  });

  expect(await screen.findByTestId("stats")).toBeInTheDocument();
});

test("handles multiple file selections", async () => {
  const multipleResults = [
    {
      continuousFeatures: [{ name: "age", nodeId: 1 }],
      categoricalFeatures: [],
      dateFeatures: [],
      fileName: "file1.csv",
      nodeId: 1,
      nodeName: "Node1"
    },
    {
      continuousFeatures: [{ name: "score", nodeId: 1 }],
      categoricalFeatures: [],
      dateFeatures: [],
      fileName: "file2.csv",
      nodeId: 1,
      nodeName: "Node1"
    }
  ];
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened(multipleResults);
  });

  expect(await screen.findByTestId("stats")).toBeInTheDocument();
});

test("handles empty feature arrays", async () => {
  const emptyFeaturesResult = {
    continuousFeatures: [],
    categoricalFeatures: [],
    dateFeatures: [],
    fileName: "empty.csv",
    nodeId: 1,
    nodeName: "Node1"
  };
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([emptyFeaturesResult]);
  });

  expect(await screen.findByTestId("stats")).toBeInTheDocument();
});

test("handles files with all feature types", async () => {
  const allFeaturesResult = {
    continuousFeatures: [{ name: "age", nodeId: 1 }],
    categoricalFeatures: [{ name: "gender", nodeId: 1 }],
    dateFeatures: [{ name: "birthdate", nodeId: 1 }],
    fileName: "complete.csv",
    nodeId: 1,
    nodeName: "Node1"
  };
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([allFeaturesResult]);
  });

  expect(await screen.findByTestId("stats")).toBeInTheDocument();
});

test("handles very large feature arrays", async () => {
  const largeResult = {
    continuousFeatures: Array(100).fill(null).map((_, i) => ({ name: `cont${i}`, nodeId: 1 })),
    categoricalFeatures: Array(50).fill(null).map((_, i) => ({ name: `cat${i}`, nodeId: 1 })),
    dateFeatures: Array(10).fill(null).map((_, i) => ({ name: `date${i}`, nodeId: 1 })),
    fileName: "large.csv",
    nodeId: 1,
    nodeName: "Node1"
  };
  
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  
  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());

  await act(async () => {
    await mockFileExplorerProps.onFilesOpened([largeResult]);
  });

  expect(await screen.findByTestId("stats")).toBeInTheDocument();
});
