import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'react-toastify';
import { recalculateFeature } from '../../../util/petitionHandler';
import { updateNodeAxiosBaseURL } from '../../../util/nodeAxiosSetup';
import ToolTray from './toolTray';

jest.mock('react-switch', () => ({
  __esModule: true,
  default: ({ checked, onChange, ...rest }) => (
    <input
      type="checkbox"
      aria-label="mock-switch"
      checked={checked}
      onChange={() => onChange(!checked)}
      {...rest}
    />
  ),
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('react-icons/md', () => ({
  MdChevronRight: () => <span data-testid="chevron-right" />,
  MdChevronLeft: () => <span data-testid="chevron-left" />,
  MdSync: () => <span data-testid="sync" />,
}));

jest.mock('../DataExporter/dataExporter', () => () => <div data-testid="data-exporter" />);
jest.mock('../../Discovery/ElementExporter/elementExporter', () => () => <div data-testid="element-exporter" />);
jest.mock('../../Discovery/CompareFilesModal/compareFilesModal', () => ({ isOpen }) => (isOpen ? <div data-testid="compare-modal" /> : null));

jest.mock('../../../util/petitionHandler', () => ({ recalculateFeature: jest.fn() }));
jest.mock('../../../util/nodeAxiosSetup', () => ({ updateNodeAxiosBaseURL: jest.fn() }));
jest.mock('../../../context/nodeContext', () => ({
  useNode: () => ({ selectedNodes: [{ nodeId: 1, serviceUrl: 'http://fake' }] }),
}));
jest.mock('./toolTray.module.css', () => new Proxy({}, { get: (_, p) => p }));

jest.useFakeTimers();

const basicFeature = (name, type, file = 'fileA.csv') => ({
  featureName: name,
  type,
  fileName: file,
});

function getDefaultProps() {
  const data = {
    categoricalFeatures: [basicFeature('Fruit', 'categorical')],
    continuousFeatures: [basicFeature('Price', 'continuous')],
    dateFeatures: [],
    chiSquareTest: {},
  };

  return {
    data,
    filteredData: { ...data },
    setFilteredData: jest.fn(),
    setData: jest.fn(),
    showOutliers: false,
    setShowOutliers: jest.fn(),
    isToolTrayOpen: true,
    toggleToolTray: jest.fn(),
    selectedEntry: data.categoricalFeatures[0],
    setSelectedEntry: jest.fn(),
    showIndividualView: false,
    toggleView: jest.fn(),
    filters: [],
    toggleFilters: jest.fn(),
    dataResults: [
      { nodeId: 1, nodeName: 'Alpha', fileName: 'fileA.csv' },
      { nodeId: 2, nodeName: 'Beta', fileName: 'fileB.csv' },
    ],
    activeFileIndices: [true, false],
    toggleFileActive: jest.fn(),
  };
}

describe('<ToolTray/> comprehensive coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ripple effects', () => {
    it('creates ripple on file checkbox click', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      const label = screen.getAllByRole('checkbox', { name: /fileA\.csv/i })[0].parentElement;
      
      jest.spyOn(document, 'createElement');
      fireEvent.click(label);
      
      jest.advanceTimersByTime(600);
    });

    it('removes old ripple before adding new one', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      const label = screen.getAllByRole('checkbox', { name: /fileA\.csv/i })[0].parentElement;
      
      fireEvent.click(label);
      fireEvent.click(label);
      
      jest.advanceTimersByTime(600);
    });
  });

  describe('getEntrySet', () => {
    it('returns empty array when dataSet is null', () => {
      const props = { ...getDefaultProps(), data: null };
      render(<ToolTray {...props} />);
      expect(screen.queryByTitle('Fruit')).not.toBeInTheDocument();
    });

    it('combines all feature types into entry set', () => {
      const props = getDefaultProps();
      props.data.dateFeatures = [basicFeature('EventDate', 'date')];
      render(<ToolTray {...props} />);
      
      expect(screen.getByTitle('Fruit')).toBeInTheDocument();
      expect(screen.getByTitle('Price')).toBeInTheDocument();
      expect(screen.getByTitle('EventDate')).toBeInTheDocument();
    });

    it('handles missing feature arrays gracefully', () => {
      const props = getDefaultProps();
      props.data = { chiSquareTest: {} };
      render(<ToolTray {...props} />);
      
      expect(screen.queryByTitle('Fruit')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('filters features case-insensitively', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const search = screen.getByPlaceholderText(/search features/i);
      fireEvent.change(search, { target: { value: 'FRUIT' } });
      
      expect(screen.getByTitle('Fruit')).toBeInTheDocument();
      expect(screen.queryByTitle('Price')).not.toBeInTheDocument();
    });

    it('shows all features when search is empty', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const search = screen.getByPlaceholderText(/search features/i);
      fireEvent.change(search, { target: { value: 'fruit' } });
      fireEvent.change(search, { target: { value: '' } });
      
      expect(screen.getByTitle('Fruit')).toBeInTheDocument();
      expect(screen.getByTitle('Price')).toBeInTheDocument();
    });

    it('filters by partial match', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const search = screen.getByPlaceholderText(/search features/i);
      fireEvent.change(search, { target: { value: 'ric' } });
      
      expect(screen.queryByTitle('Fruit')).not.toBeInTheDocument();
      expect(screen.getByTitle('Price')).toBeInTheDocument();
    });
  });

  describe('toggle all features', () => {
    it('shows "Hide All" when all displayed features are checked', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      expect(screen.getByRole('button', { name: /hide all/i })).toBeInTheDocument();
    });

    it('shows "Show All" when not all displayed features are checked', () => {
      const props = getDefaultProps();
      props.filteredData.categoricalFeatures = [];
      render(<ToolTray {...props} />);
      
      expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
    });

    it('toggles all displayed features on', () => {
      const props = getDefaultProps();
      props.filteredData.categoricalFeatures = [];
      props.filteredData.continuousFeatures = [];
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /show all/i });
      fireEvent.click(btn);
      
      expect(props.setFilteredData).toHaveBeenCalled();
      const call = props.setFilteredData.mock.calls[0][0];
      const result = call(props.filteredData);
      expect(result.categoricalFeatures).toHaveLength(1);
      expect(result.continuousFeatures).toHaveLength(1);
    });

    it('toggles all displayed features off', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /hide all/i });
      fireEvent.click(btn);
      
      expect(props.setFilteredData).toHaveBeenCalled();
      const call = props.setFilteredData.mock.calls[0][0];
      const result = call(props.filteredData);
      expect(result.categoricalFeatures).toHaveLength(0);
      expect(result.continuousFeatures).toHaveLength(0);
    });

    it('only toggles filtered features from search', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const search = screen.getByPlaceholderText(/search features/i);
      fireEvent.change(search, { target: { value: 'Fruit' } });
      
      const btn = screen.getByRole('button', { name: /hide all/i });
      fireEvent.click(btn);
      
      expect(props.setFilteredData).toHaveBeenCalled();
      const call = props.setFilteredData.mock.calls[0][0];
      const result = call(props.filteredData);
      expect(result.categoricalFeatures).toHaveLength(0);
      expect(result.continuousFeatures).toHaveLength(1);
    });
  });

  describe('individual feature toggles', () => {
    it('toggles a feature on when clicking switch', () => {
      const props = getDefaultProps();
      props.filteredData.categoricalFeatures = [];
      render(<ToolTray {...props} />);
      
      const sw = screen.getByRole('checkbox', { name: 'Fruit' });
      fireEvent.click(sw);
      
      expect(props.setFilteredData).toHaveBeenCalled();
      const call = props.setFilteredData.mock.calls[0][0];
      const result = call(props.filteredData);
      expect(result.categoricalFeatures).toHaveLength(1);
    });

    it('toggles a feature off when clicking switch', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const sw = screen.getByRole('checkbox', { name: 'Fruit' });
      fireEvent.click(sw);
      
      expect(props.setFilteredData).toHaveBeenCalled();
      const call = props.setFilteredData.mock.calls[0][0];
      const result = call(props.filteredData);
      expect(result.categoricalFeatures).toHaveLength(0);
    });

    it('handles continuous feature toggle', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const sw = screen.getByRole('checkbox', { name: 'Price' });
      fireEvent.click(sw);
      
      expect(props.setFilteredData).toHaveBeenCalled();
      const call = props.setFilteredData.mock.calls[0][0];
      const result = call(props.filteredData);
      expect(result.continuousFeatures).toHaveLength(0);
    });

    it('handles date feature toggle', () => {
      const props = getDefaultProps();
      props.data.dateFeatures = [basicFeature('EventDate', 'date')];
      props.filteredData.dateFeatures = [basicFeature('EventDate', 'date')];
      render(<ToolTray {...props} />);
      
      const sw = screen.getByRole('checkbox', { name: 'EventDate' });
      fireEvent.click(sw);
      
      expect(props.setFilteredData).toHaveBeenCalled();
      const call = props.setFilteredData.mock.calls[0][0];
      const result = call(props.filteredData);
      expect(result.dateFeatures).toHaveLength(0);
    });
  });

  describe('file selection', () => {
    it('toggles file active state', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const chk = screen.getAllByRole('checkbox')[0];
      fireEvent.change(chk);
      
      expect(props.toggleFileActive).toHaveBeenCalledWith(0);
    });

    it('renders correct active state styling', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const activeFile = screen.getAllByRole('checkbox')[0];
      expect(activeFile).toBeChecked();
      
      const inactiveFile = screen.getAllByRole('checkbox')[1];
      expect(inactiveFile).not.toBeChecked();
    });

    it('groups files by node', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('handles single file without multi-selector', () => {
      const props = getDefaultProps();
      props.dataResults = [{ nodeId: 1, nodeName: 'Alpha', fileName: 'fileA.csv' }];
      render(<ToolTray {...props} />);
      
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    });
  });

  describe('toggleFeatureType', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does nothing when no selectedEntry', async () => {
      const props = { ...getDefaultProps(), selectedEntry: null };
      render(<ToolTray {...props} />);
      
      expect(screen.queryByRole('button', { name: /toggle.*type/i })).not.toBeInTheDocument();
    });

    it('shows loading spinner while processing', async () => {
      recalculateFeature.mockImplementation(() => new Promise(() => {}));
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(screen.getByRole('button', { name: /toggle.*type/i })).toBeDisabled());
    });

    it('converts categorical to continuous', async () => {
      recalculateFeature.mockResolvedValue({
        continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(recalculateFeature).toHaveBeenCalledWith('fileA.csv', 'Fruit', 'continuous'));
    });

    it('converts continuous to categorical', async () => {
      recalculateFeature.mockResolvedValue({
        categoricalFeatures: [{ featureName: 'Price', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      props.selectedEntry = props.data.continuousFeatures[0];
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(recalculateFeature).toHaveBeenCalledWith('fileA.csv', 'Price', 'categorical'));
    });

    it('handles feature with (fileName) suffix', async () => {
      recalculateFeature.mockResolvedValue({
        continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      props.selectedEntry = { ...props.selectedEntry, featureName: 'Fruit (fileA.csv)' };
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(recalculateFeature).toHaveBeenCalledWith('fileA.csv', 'Fruit (fileA.csv)', 'continuous'));
    });

    it('updates chiSquareTest when returned', async () => {
      const newChiSquare = { testResult: 'value' };
      recalculateFeature.mockResolvedValue({
        continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
        chiSquareTest: newChiSquare,
      });
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(props.setData).toHaveBeenCalled());
      const newData = props.setData.mock.calls[0][0];
      expect(newData.chiSquareTest).toEqual(newChiSquare);
    });

    it('detects date type from response', async () => {
      recalculateFeature.mockResolvedValue({
        dateFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(props.setSelectedEntry).toHaveBeenCalled());
      const call = props.setSelectedEntry.mock.calls[0][0];
      expect(call.type).toBe('continuous');
    });

    it('handles error during conversion', async () => {
      const error = new Error('Conversion failed');
      recalculateFeature.mockRejectedValue(error);
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Conversion failed')));
    });

    it('handles "cannot be converted" message', async () => {
      recalculateFeature.mockResolvedValue({ message: 'Cannot be converted to categorical' });
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('conversion failed')));
    });

    it('handles empty features array response', async () => {
      recalculateFeature.mockResolvedValue({ continuousFeatures: [] });
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('No features returned')));
    });

    it('uses nodeId from selectedEntry when available', async () => {
      recalculateFeature.mockResolvedValue({
        continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      props.selectedEntry.nodeId = 1;
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith('http://fake'));
    });

    it('falls back to dataResults nodeId when selectedEntry has none', async () => {
      recalculateFeature.mockResolvedValue({
        continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      delete props.selectedEntry.nodeId;
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith('http://fake'));
    });

    it('updates selectedEntry nodeId from fallback', async () => {
      recalculateFeature.mockResolvedValue({
        continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      delete props.selectedEntry.nodeId;
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(props.setSelectedEntry).toHaveBeenCalled());
    });

    it('aborts when no matching node found', async () => {
      jest.mock('../../../context/nodeContext', () => ({
        useNode: () => ({ selectedNodes: [] }),
      }));
      
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /toggle.*type/i });
      fireEvent.click(btn);
      
      await waitFor(() => expect(recalculateFeature).not.toHaveBeenCalled());
    });
  });

  describe('modal interactions', () => {
    it('opens compare modal on button click', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /integrity metrics/i });
      fireEvent.click(btn);
      
      expect(screen.getByTestId('compare-modal')).toBeInTheDocument();
    });

    it('closes compare modal', () => {
      const props = getDefaultProps();
      const { rerender } = render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /integrity metrics/i });
      fireEvent.click(btn);
      expect(screen.getByTestId('compare-modal')).toBeInTheDocument();
      
      rerender(<ToolTray {...props} />);
    });

    it('hides integrity metrics button with single file', () => {
      const props = getDefaultProps();
      props.dataResults = [{ nodeId: 1, nodeName: 'Alpha', fileName: 'fileA.csv' }];
      render(<ToolTray {...props} />);
      
      expect(screen.queryByRole('button', { name: /integrity metrics/i })).not.toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('toggles view mode', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /display individual metrics/i });
      fireEvent.click(btn);
      
      expect(props.toggleView).toHaveBeenCalled();
    });

    it('shows aggregate view button text when individual view active', () => {
      const props = getDefaultProps();
      props.showIndividualView = true;
      render(<ToolTray {...props} />);
      
      expect(screen.getByRole('button', { name: /display aggregate metrics/i })).toBeInTheDocument();
    });

    it('toggles filters', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const btn = screen.getByRole('button', { name: /set filters/i });
      fireEvent.click(btn);
      
      expect(props.toggleFilters).toHaveBeenCalled();
    });

    it('shows "Filters added" when filters exist', () => {
      const props = getDefaultProps();
      props.filters = [{ some: 'filter' }];
      render(<ToolTray {...props} />);
      
      expect(screen.getByRole('button', { name: /filters added/i })).toBeInTheDocument();
    });
  });

  describe('outliers toggle', () => {
    it('shows correct label when outliers shown', () => {
      const props = getDefaultProps();
      props.showOutliers = true;
      render(<ToolTray {...props} />);
      
      expect(screen.getByText(/outliers shown/i)).toBeInTheDocument();
    });

    it('shows correct label when outliers hidden', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      expect(screen.getByText(/outliers hidden/i)).toBeInTheDocument();
    });

    it('toggles outliers state', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const sw = screen.getByRole('checkbox', { name: /toggle outliers/i });
      fireEvent.click(sw);
      
      expect(props.setShowOutliers).toHaveBeenCalledWith(true);
    });
  });

  describe('accessibility', () => {
    it('has proper aria-label on toggle button', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      const toggle = screen.getByRole('button', { name: /close tool tray/i });
      expect(toggle).toBeInTheDocument();
    });

    it('has proper aria-label when closed', () => {
      const props = { ...getDefaultProps(), isToolTrayOpen: false };
      render(<ToolTray {...props} />);
      
      const toggle = screen.getByRole('button', { name: /open tool tray/i });
      expect(toggle).toBeInTheDocument();
    });

    it('feature switches have aria-labels', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      
      expect(screen.getByRole('checkbox', { name: 'Fruit' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Price' })).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty dataResults', () => {
      const props = getDefaultProps();
      props.dataResults = [];
      render(<ToolTray {...props} />);
      
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    });

    it('handles undefined activeFileIndices', () => {
      const props = getDefaultProps();
      props.activeFileIndices = undefined;
      render(<ToolTray {...props} />);
      
      expect(screen.getByTestId('data-exporter')).toBeInTheDocument();
    });

    it('handles missing nodeName in dataResults', () => {
      const props = getDefaultProps();
      props.dataResults = [
        { nodeId: 1, fileName: 'fileA.csv' },
        { nodeId: 2, fileName: 'fileB.csv' },
      ];
      render(<ToolTray {...props} />);
      
      expect(screen.getByText('Node 1')).toBeInTheDocument();
      expect(screen.getByText('Node 2')).toBeInTheDocument();
    });

    it('handles empty feature arrays', () => {
      const props = getDefaultProps();
      props.data = {
        categoricalFeatures: [],
        continuousFeatures: [],
        dateFeatures: [],
        chiSquareTest: {},
      };
      render(<ToolTray {...props} />);
      
      const search = screen.getByPlaceholderText(/search features/i);
      expect(search).toBeInTheDocument();
    });
  });
});
