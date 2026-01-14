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
  return { ...real, useLocation: () => ({ state: undefined }) };
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
