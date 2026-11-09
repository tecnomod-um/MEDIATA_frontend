import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Discovery from "./discovery";
import { vi } from "vitest";

// Exercise page interactions with the shared calculator; the hook tests cover the worker lifecycle.
vi.mock("../../components/Discovery/CombinedStatistics/useRelationshipStatistics", async () => {
  const {combineMappedRelationships} = await import("../../components/Discovery/CombinedStatistics/pairedStatistics");
  const {visibleRelationships} = await import("../../components/Discovery/discoveryStatistics");
  return {default: (table, sources, combined, enabled) => ({
    statistics: enabled && table ? combined ? combineMappedRelationships(table, sources) : visibleRelationships(table) : {},
    pending:false, error:null, retry:vi.fn(),
  })};
});

let mockFileExplorerProps;
let mockAggregateProps;
let mockTrayProps;
let mockStatsProps;
let mockFilterProps;

test('keeps an opened mobile sidebar open during a keyboard or same-breakpoint resize', async () => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', {writable:true, configurable:true, value:390});
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  const view = render(<Discovery />);
  await screen.findByTestId('FileExplorer');
  act(() => mockFileExplorerProps.onFilesOpened([PROCESSED_ITEM]));
  await screen.findByTestId('tray');
  expect(mockTrayProps.isToolTrayOpen).toBe(false);
  act(() => mockTrayProps.toggleToolTray());
  expect(mockTrayProps.isToolTrayOpen).toBe(true);
  act(() => window.dispatchEvent(new Event('resize')));
  expect(mockTrayProps.isToolTrayOpen).toBe(true);
  act(() => {
    window.innerWidth = 1024;
    window.dispatchEvent(new Event('resize'));
    window.innerWidth = 600;
    window.dispatchEvent(new Event('resize'));
  });
  expect(mockTrayProps.isToolTrayOpen).toBe(false);
  view.unmount();
  window.innerWidth = originalWidth;
});

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

vi.mock("../../components/Alignment/MappingsResult/mappingsResult", () => ({
  __esModule: true,
  default: () => <div data-testid="MappingsResult" />,
}));

vi.mock("react-transition-group", () => ({
  __esModule: true,
  CSSTransition: ({ in: inProp = true, children }) => (inProp ? <>{children}</> : null),
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
  default: props => { mockTrayProps = props; return <div data-testid="tray"><button onClick={props.toggleView}>Display aggregate metrics</button></div>; },
}));

vi.mock("../../components/Discovery/StatisticsDisplay/statisticsDisplay", () => ({
  __esModule: true,
  default: props => { mockStatsProps = props; return <div data-testid="stats" data-result={JSON.stringify(props.tableData)}>{props.numericalTableActions}StatsDisplay</div>; },
}));

vi.mock("../../components/Discovery/AggregatesDisplay/aggregateDisplay", () => ({
  __esModule: true,
  default: props => { mockAggregateProps = props; return <div data-testid="aggregate">AggregateDisplay</div>; },
}));

vi.mock("../../components/Discovery/FilterModal/filterModal", () => ({
  __esModule: true,
  default: props => { mockFilterProps=props; return <div data-testid="filter">FilterModal</div>; },
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

test("combines table rows in place while retaining the existing aggregate metrics control", async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  render(<Discovery />);
  await waitFor(() => expect(mockFileExplorerProps).toBeDefined());
  const first = {
    ...PROCESSED_ITEM, nodeId: 1, nodeName: 'Alpha',
    covariances: { Age: { Age: 2 } },
    relationshipSummaryVersion: 1,
    numericPairSummaries: [{ featureX: 'Age', featureY: 'Age', count: 10, meanX: 50, meanY: 50, m2X: 0, m2Y: 0, crossMoment: 0 }],
    continuousFeatures: [{ featureName: 'Age', mean: 50, count: 10, stdDev: 0, min: 50, max: 50, missingValuesCount: 0 }],
  };
  await act(async () => mockFileExplorerProps.onFilesOpened([first, { ...first, nodeId: 2, nodeName: 'Beta', covariances: { Age: { Age: 8 } } }]));
  expect(screen.queryByRole('combobox', { name: 'Statistics view' })).not.toBeInTheDocument();
  expect(screen.getByTestId('stats')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Numerical table options: separate rows' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Combined rows' }));
  const table = JSON.parse(screen.getByTestId('stats').getAttribute('data-result'));
  expect(table.continuousFeatures).toHaveLength(1);
  expect(table.continuousFeatures[0]).toMatchObject({ featureName: 'Age', count: 20, mean: 50, pooled: true });
  fireEvent.click(screen.getByRole('button', { name: 'Numerical table options: combined rows' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Separate rows' }));
  expect(JSON.parse(screen.getByTestId('stats').getAttribute('data-result')).continuousFeatures).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Numerical table options: separate rows' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Combined rows' }));
  fireEvent.click(screen.getByRole('button', { name: 'Display aggregate metrics' }));
  expect(screen.getByTestId('aggregate')).toBeInTheDocument();
  expect(mockAggregateProps.covariances.Age.Age).toBe(0);
  expect(mockAggregateProps.pearsonCorrelations.Age.Age).toBeNull();
  expect(mockAggregateProps.relationshipDetails.covariance.Age.Age.count).toBe(20);
  expect(mockAggregateProps.datasets).toBeUndefined();
  expect(mockTrayProps.relationshipExport.data.covariances).toBe(mockAggregateProps.covariances);
  fireEvent.click(screen.getByRole('button', { name: 'Display aggregate metrics' }));
  expect(screen.getByTestId('stats')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Numerical table options: combined rows' })).toBeInTheDocument();
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

test("type changes update saved mappings, relationships, exports and source metadata without restoring hidden features", async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  render(<Discovery />);
  await screen.findByTestId('FileExplorer');
  const feature = (featureName, mean) => ({featureName, count:12, missingValuesCount:0, mean, stdDev:0, min:mean, max:mean});
  const makeSource = (nodeId, nodeName, mean) => ({...PROCESSED_ITEM, nodeId, nodeName,
    relationshipSummaryVersion:1,
    continuousFeatures:[feature('Age',mean),feature('Score',2)],
    numericPairSummaries:[{featureX:'Age',featureY:'Age',count:12,meanX:mean,meanY:mean,m2X:0,m2Y:0,crossMoment:0}],
  });
  const alpha=makeSource(1,'Alpha',10), beta=makeSource(2,'Beta',20);
  act(() => mockFileExplorerProps.onFilesOpened([alpha,beta]));
  await screen.findByTestId('tray');
  act(() => mockTrayProps.setFilteredData(current => ({...current,continuousFeatures:current.continuousFeatures.filter(feature => !(feature.nodeId===1 && feature.originalName==='Score'))})));
  fireEvent.click(screen.getByRole('button',{name:'Numerical table options: separate rows'}));
  fireEvent.click(screen.getByRole('menuitem',{name:'Combine features',exact:false}));
  fireEvent.click(screen.getByRole('button',{name:'Apply combinations'}));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(JSON.parse(screen.getByTestId('stats').getAttribute('data-result')).continuousFeatures.find(feature=>feature.featureName==='Age')).toMatchObject({count:24,mean:15});
  const response={...alpha,featureTypeSummaryVersion:1,featureTypes:{Age:'categorical'},
    continuousFeatures:[feature('Score',2)],categoricalFeatures:[{featureName:'Age',count:12,missingValuesCount:0,categoryCounts:{'10':12}}],numericPairSummaries:[],covariances:{}};
  act(() => mockTrayProps.onFeatureRecalculated([{nodeId:1,fileName:alpha.fileName,featureName:'Age',response}]));
  await waitFor(() => expect(mockTrayProps.data.categoricalFeatures).toHaveLength(1));
  expect(mockTrayProps.dataResults[0].featureTypes).toEqual({Age:'categorical'});
  expect(mockTrayProps.data.continuousFeatures.some(feature=>feature.nodeId===1 && feature.originalName==='Age')).toBe(false);
  expect(mockTrayProps.filteredData.continuousFeatures.some(feature=>feature.nodeId===1 && feature.originalName==='Score')).toBe(false);
  const pooled=JSON.parse(screen.getByTestId('stats').getAttribute('data-result')).continuousFeatures.find(feature=>feature.featureName==='Age');
  expect(pooled.count).toBeNull();
  expect(pooled.status).toContain('Different variable types');
  fireEvent.click(screen.getByRole('button',{name:'Display aggregate metrics'}));
  await waitFor(() => expect(mockAggregateProps.covariances.Age.Age).toBeNull());
  expect(mockTrayProps.relationshipExport.data.covariances.Age.Age).toBeNull();
  act(() => mockTrayProps.toggleFileActive(0));
  act(() => mockTrayProps.toggleFileActive(0));
  expect(mockTrayProps.filteredData.continuousFeatures.some(feature=>feature.nodeId===1 && feature.originalName==='Score')).toBe(false);
});


test("selects multiple source features, preselects their filters, and reconciles batch types and disabled datasets", async () => {
  mockGetNodeDatasets.mockResolvedValue([]);
  render(<Discovery />);
  await screen.findByTestId("FileExplorer");
  const source = nodeId => ({...PROCESSED_ITEM,nodeId,nodeName:String(nodeId),
    continuousFeatures:[{featureName:"Age",count:12},{featureName:"Score",count:12}],
    categoricalFeatures:[{featureName:"Sex",count:12,categoryCounts:{F:6,M:6}}]});
  act(()=>mockFileExplorerProps.onFilesOpened([source(1),source(2)]));
  await screen.findByTestId("tray");
  const age=mockTrayProps.data.continuousFeatures.find(f=>f.nodeId===1&&f.originalName==="Age");
  const score=mockTrayProps.data.continuousFeatures.find(f=>f.nodeId===1&&f.originalName==="Score");
  act(()=>mockStatsProps.onSelectFeature({...age,type:"continuous"}));
  act(()=>mockStatsProps.onSelectFeature({...score,type:"continuous"},{ctrlKey:true}));
  expect(mockTrayProps.selectedEntries.map(f=>f.originalName)).toEqual(["Age","Score"]);
  act(()=>mockTrayProps.toggleFilters());
  expect(mockFilterProps.isOpen).toBe(true);
  expect(mockFilterProps.selectedEntries.map(f=>f.originalName)).toEqual(["Age","Score"]);
  const response={...source(1),continuousFeatures:[],categoricalFeatures:[...source(1).categoricalFeatures,
    {featureName:"Age",count:12,categoryCounts:{10:12}},{featureName:"Score",count:12,categoryCounts:{2:12}}]};
  act(()=>mockTrayProps.onFeatureRecalculated([{nodeId:1,fileName:response.fileName,response}]));
  expect(mockTrayProps.selectedEntries.every(f=>f.type==="categorical")).toBe(true);
  act(()=>mockTrayProps.toggleFileActive(0));
  expect(mockTrayProps.selectedEntries).toEqual([]);
});


test("keeps adding after a long press, preserves selection on controls, and clears it on empty space", async () => {
  mockGetNodeDatasets.mockResolvedValue([]);
  render(<Discovery />);
  await screen.findByTestId("FileExplorer");
  act(()=>mockFileExplorerProps.onFilesOpened([{...PROCESSED_ITEM,nodeId:1,nodeName:"Alpha",
    continuousFeatures:[{featureName:"Age",count:12},{featureName:"Score",count:12}],
    categoricalFeatures:[{featureName:"Sex",count:12,categoryCounts:{F:6,M:6}}]}]));
  await screen.findByTestId("tray");
  const age={...mockTrayProps.data.continuousFeatures.find(feature=>feature.originalName==="Age"),type:"continuous"};
  const score={...mockTrayProps.data.continuousFeatures.find(feature=>feature.originalName==="Score"),type:"continuous"};
  const sex={...mockTrayProps.data.categoricalFeatures.find(feature=>feature.originalName==="Sex"),type:"categorical"};
  act(()=>mockStatsProps.onSelectFeature(age));
  act(()=>mockStatsProps.onSelectFeature(score,{additive:true}));
  act(()=>mockStatsProps.onSelectFeature(sex));
  expect(mockTrayProps.selectedEntries.map(entry=>entry.originalName)).toEqual(["Age","Score","Sex"]);
  fireEvent.click(screen.getByRole("button",{name:"Display aggregate metrics"}));
  expect(mockTrayProps.selectedEntries).toHaveLength(3);
  fireEvent.click(screen.getByTestId("aggregate"));
  expect(mockTrayProps.selectedEntries).toEqual([]);
  act(()=>mockStatsProps.onSelectFeature(age));
  act(()=>mockStatsProps.onSelectFeature(score));
  expect(mockTrayProps.selectedEntries.map(entry=>entry.originalName)).toEqual(["Score"]);
  fireEvent.click(screen.getByTestId("aggregate"));
  expect(mockTrayProps.selectedEntries).toEqual([]);
});
