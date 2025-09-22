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

jest.mock('../DataExporter/dataExporter',
  () => () => <div data-testid="data-exporter" />);
jest.mock('../../Integration/ElementExporter/elementExporter',
  () => () => <div data-testid="element-exporter" />);
jest.mock('../../Integration/CompareFilesModal/compareFilesModal',
  () => ({ isOpen }) => (isOpen ? <div data-testid="compare-modal" /> : null));

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

describe('<ToolTray/>', () => {

  it('renders core sections & children when open', () => {
    render(<ToolTray {...getDefaultProps()} />);
    expect(screen.getByTestId('chevron-left')).toBeInTheDocument();
    expect(screen.getByTitle('Fruit')).toBeInTheDocument();
    expect(screen.getByTitle('Price')).toBeInTheDocument();
    expect(screen.getByTestId('data-exporter')).toBeInTheDocument();
    expect(screen.getByTestId('element-exporter')).toBeInTheDocument();
  });

  it('search box filters visible features', () => {
    render(<ToolTray {...getDefaultProps()} />);
    const search = screen.getByPlaceholderText(/search features/i);
    fireEvent.change(search, { target: { value: 'fruit' } });

    expect(screen.getByTitle('Fruit')).toBeInTheDocument();
    expect(screen.queryByTitle('Price')).not.toBeInTheDocument();
  });

  it('“Show/Hide All” button toggles current filtered rows', () => {
    const props = getDefaultProps();
    render(<ToolTray {...props} />);

    const btn = screen.getByRole('button', { name: /hide all/i });
    fireEvent.click(btn);
    expect(props.setFilteredData).toHaveBeenCalledTimes(1);
  });

  it('outliers switch calls setShowOutliers', () => {
    const props = getDefaultProps();
    render(<ToolTray {...props} />);

    const sw = screen.getByRole('checkbox', { name: /toggle outliers/i });
    fireEvent.click(sw);

    expect(props.setShowOutliers).toHaveBeenCalledWith(true);
  });

  it('opens integrity metrics modal on button click', () => {
    render(<ToolTray {...getDefaultProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /integrity metrics/i }));

    expect(screen.getByTestId('compare-modal')).toBeInTheDocument();
  });

  it('file checkbox invokes toggleFileActive callback', () => {
    const props = getDefaultProps();
    render(<ToolTray {...props} />);
    const chk = screen.getByRole('checkbox', { name: /fileA\.csv/i });
    fireEvent.click(chk);
    expect(props.toggleFileActive).toHaveBeenCalledTimes(1);
  });

  it('arrow button calls toggleToolTray (open/close)', () => {
    const props = getDefaultProps();
    render(<ToolTray {...props} />);

    fireEvent.click(screen.getByTestId('chevron-left'));
    expect(props.toggleToolTray).toHaveBeenCalled();
  });

  describe('<ToolTray/> (extra coverage)', () => {
    it('renders closed state with right-chevron when isToolTrayOpen=false', () => {
      const props = { ...getDefaultProps(), isToolTrayOpen: false };
      render(<ToolTray {...props} />);
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    });

    it('shows "No entry selected" when selectedEntry is null', () => {
      const props = { ...getDefaultProps(), selectedEntry: null };
      render(<ToolTray {...props} />);
      expect(screen.getByText(/no entry selected/i)).toBeInTheDocument();
    });

    it('calls toggleView when you click the view toggle button', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      fireEvent.click(screen.getByRole('button', { name: /display individual metrics/i }));
      expect(props.toggleView).toHaveBeenCalled();
    });

    it('calls toggleFilters when you click the filters button', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      fireEvent.click(screen.getByRole('button', { name: /set filters/i }));
      expect(props.toggleFilters).toHaveBeenCalled();
    });

    it('renders file groups with correct node names', () => {
      render(<ToolTray {...getDefaultProps()} />);
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('renders dateFeatures when provided and filters them', () => {
      const base = getDefaultProps();
      const dateFeat = { featureName: 'DateFeature', type: 'date', fileName: 'fileA.csv' };
      const props = {
        ...base,
        data: {
          ...base.data,
          dateFeatures: [dateFeat],
        },
        filteredData: {
          ...base.filteredData,
          dateFeatures: [dateFeat],
        },
      };
      render(<ToolTray {...props} />);
      expect(screen.getByTitle('DateFeature')).toBeInTheDocument();
      const search = screen.getByPlaceholderText(/search features/i);
      fireEvent.change(search, { target: { value: 'Date' } });
      expect(screen.getByTitle('DateFeature')).toBeInTheDocument();
      expect(screen.queryByTitle('Fruit')).not.toBeInTheDocument();
    });

    it('calls recalculateFeature and updateNodeAxiosBaseURL on successful toggleFeatureType', async () => {
      recalculateFeature.mockResolvedValue({
        continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
      });
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      const btn = screen.getByRole('button', { name: /toggle the selected feature's type between categorical and continuous/i });
      fireEvent.click(btn);
      await waitFor(() => expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith('http://fake'));
      expect(recalculateFeature).toHaveBeenCalledWith('fileA.csv', 'Fruit', 'continuous');
    });

    describe('toggleFeatureType error handling', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('toasts an error when recalc response has "cannot be converted"', async () => {
        recalculateFeature.mockResolvedValue({ message: 'Cannot be converted to categorical' });
        const props = getDefaultProps();
        render(<ToolTray {...props} />);
        const btn = screen.getByRole('button', { name: /Toggle the selected feature's type between categorical and continuous/i });
        fireEvent.click(btn);

        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Feature conversion failed')
          )
        );
      });

      it('toasts an error when recalc returns no features', async () => {
        recalculateFeature.mockResolvedValue({});
        const props = getDefaultProps();
        render(<ToolTray {...props} />);

        const btn = screen.getByRole('button', { name: /Toggle the selected feature's type between categorical and continuous/i });
        fireEvent.click(btn);

        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('No features returned')
          )
        );
      });
    });
  });
});
