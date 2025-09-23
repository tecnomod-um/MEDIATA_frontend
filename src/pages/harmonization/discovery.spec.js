import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Discovery from './discovery';

let mockFilePickerProps;

jest.mock('react-transition-group', () => {
  const React = require('react');
  return {
    CSSTransition: ({ children }) => <>{children}</>,
    TransitionGroup: ({ children }) => <>{children}</>,
  };
});

jest.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast" />,
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock(
  '../../components/Common/FilePicker/filePicker',
  () => {
    const React = require('react');
    return function MockFilePicker(props) {
      mockFilePickerProps = props;
      return <div data-testid="picker">FilePicker</div>;
    };
  },
);

jest.mock(
  '../../components/Discovery/ToolTray/toolTray',
  () => () => <div data-testid="tray">ToolTray</div>,
);

jest.mock(
  '../../components/Discovery/StatisticsDisplay/statisticsDisplay',
  () => () => <div data-testid="stats">StatsDisplay</div>,
);

jest.mock(
  '../../components/Discovery/AggregatesDisplay/aggregateDisplay',
  () => () => <div data-testid="aggregate">AggregateDisplay</div>,
);

jest.mock(
  '../../components/Discovery/FilterModal/filterModal',
  () => () => <div data-testid="filter">FilterModal</div>,
);

const mockGetNodeDatasets = jest.fn();
const mockProcessSelectedDatasets = jest.fn();
jest.mock(
  '../../util/petitionHandler',
  () => ({
    getNodeDatasets: (...a) => mockGetNodeDatasets(...a),
    processSelectedDatasets: (...a) => mockProcessSelectedDatasets(...a),
  }),
);
jest.mock('../../util/nodeAxiosSetup', () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));

const mockSelectedNodes = [
  { nodeId: 1, name: 'Node-A', serviceUrl: 'http://nodeA' },
];
jest.mock('../../context/nodeContext', () => ({
  useNode: () => ({ selectedNodes: mockSelectedNodes }),
  NodeProvider: ({ children }) => <>{children}</>,
}));

jest.mock('react-router-dom', () => {
  const real = jest.requireActual('react-router-dom');
  return { ...real, useLocation: () => ({ state: undefined }) };
});

const DATASETS_FIXTURE = ['file1.csv', 'file2.csv'];
const PROCESSED_RESULT = [{
  fileName: 'file1.csv',
  continuousFeatures: [],
  categoricalFeatures: [],
  dateFeatures: [],
  chiSquareTest: [],
  covariances: {},
  pearsonCorrelations: {},
  spearmanCorrelations: {},
  omittedFeatures: [],
}];

beforeEach(() => {
  jest.clearAllMocks();
  mockFilePickerProps = undefined;
});

test('initially fetches datasets and renders <FilePicker>', async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);

  render(<Discovery />);

  await waitFor(async () => {
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    await waitFor(async () => {
      expect(mockFilePickerProps).toBeDefined();
    });
    await waitFor(async () => {
      expect(mockFilePickerProps.files?.[0]?.files).toEqual(DATASETS_FIXTURE);
    });
  });
});

test('after onFilesSelected resolves, statistics view is shown', async () => {
  mockGetNodeDatasets.mockResolvedValue(DATASETS_FIXTURE);
  mockProcessSelectedDatasets.mockResolvedValue(PROCESSED_RESULT);

  render(<Discovery />);
  await waitFor(() => expect(mockFilePickerProps).toBeDefined());
  await act(async () => {
    await mockFilePickerProps.onFilesSelected({ 1: DATASETS_FIXTURE });
  });

  await waitFor(() => {
    expect(screen.getByTestId('tray')).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByTestId('stats')).toBeInTheDocument();
  });
  expect(screen.queryByTestId('picker')).toBeNull();
});
