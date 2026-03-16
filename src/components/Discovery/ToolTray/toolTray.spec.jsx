import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { toast } from 'react-toastify';
import { recalculateFeature } from '../../../util/petitionHandler';
import { updateNodeAxiosBaseURL } from '../../../util/nodeAxiosSetup';
import ToolTray from './toolTray';

vi.mock('react-switch', () => ({
  __esModule: true,
  default: ({ checked, onChange, ...rest }) => (
    <input
      type="checkbox"
      aria-label={rest['aria-label'] || 'mock-switch'}
      checked={checked}
      onChange={() => onChange(!checked)}
      {...rest}
    />
  ),
}));

vi.mock('react-toastify', () => ({
  __esModule: true,
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-icons/md', () => ({
  __esModule: true,
  MdChevronRight: () => <span data-testid="chevron-right" />,
  MdChevronLeft: () => <span data-testid="chevron-left" />,
  MdSync: () => <span data-testid="sync" />,
}));

vi.mock('../DataExporter/dataExporter', () => ({
  __esModule: true,
  default: () => <div data-testid="data-exporter" />,
}));

vi.mock('../ElementExporter/elementExporter', () => ({
  __esModule: true,
  default: () => <div data-testid="element-exporter" />,
}));

vi.mock('../CompareFilesModal/compareFilesModal', () => ({
  __esModule: true,
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="compare-modal" /> : null,
}));

vi.mock('../../../util/petitionHandler', () => ({
  __esModule: true,
  recalculateFeature: vi.fn(),
}));

vi.mock('../../../util/nodeAxiosSetup', () => ({
  __esModule: true,
  updateNodeAxiosBaseURL: vi.fn(),
}));

vi.mock('../../../context/nodeContext', () => ({
  __esModule: true,
  useNode: () => ({
    selectedNodes: [{ nodeId: 1, serviceUrl: 'http://fake' }],
  }),
}));

vi.mock('./toolTray.module.css', () => ({
  __esModule: true,
  default: new Proxy(
    {},
    {
      get: (_, prop) => String(prop),
    }
  ),
}));

vi.useFakeTimers();

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
    setFilteredData: vi.fn(),
    setData: vi.fn(),
    showOutliers: false,
    setShowOutliers: vi.fn(),
    isToolTrayOpen: true,
    toggleToolTray: vi.fn(),
    selectedEntry: data.categoricalFeatures[0],
    setSelectedEntry: vi.fn(),
    showIndividualView: false,
    toggleView: vi.fn(),
    filters: [],
    toggleFilters: vi.fn(),
    dataResults: [
      { nodeId: 1, nodeName: 'Alpha', fileName: 'fileA.csv' },
      { nodeId: 2, nodeName: 'Beta', fileName: 'fileB.csv' },
    ],
    activeFileIndices: [true, false],
    toggleFileActive: vi.fn(),
  };
}

describe('<ToolTray/>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    beforeEach(() => {
      vi.clearAllMocks();
    });

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

      fireEvent.click(
        screen.getByRole('button', {
          name: /display individual metrics/i,
        })
      );

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
      const dateFeat = {
        featureName: 'DateFeature',
        type: 'date',
        fileName: 'fileA.csv',
      };

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

      const btn = screen.getByRole('button', {
        name: /toggle the selected feature's type between categorical and continuous/i,
      });

      fireEvent.click(btn);

      await waitFor(() =>
        expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith('http://fake')
      );

      expect(recalculateFeature).toHaveBeenCalledWith(
        'fileA.csv',
        'Fruit',
        'continuous'
      );
    });

    describe('toggleFeatureType error handling', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it('toasts an error when recalc response has "cannot be converted"', async () => {
        recalculateFeature.mockResolvedValue({
          message: 'Cannot be converted to categorical',
        });

        const props = getDefaultProps();
        render(<ToolTray {...props} />);

        const btn = screen.getByRole('button', {
          name: /toggle the selected feature's type between categorical and continuous/i,
        });

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

        const btn = screen.getByRole('button', {
          name: /toggle the selected feature's type between categorical and continuous/i,
        });

        fireEvent.click(btn);

        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('No features returned')
          )
        );
      });

      it('toasts error when toggleFeatureType throws exception', async () => {
        recalculateFeature.mockRejectedValue(new Error('Network error'));

        const props = getDefaultProps();
        render(<ToolTray {...props} />);

        const btn = screen.getByRole('button', {
          name: /toggle the selected feature's type between categorical and continuous/i,
        });

        fireEvent.click(btn);

        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Feature recalculation failed')
          )
        );
      });

      it('handles missing fileName in lookupFileName', async () => {
        const props = getDefaultProps();
        props.selectedEntry = { featureName: 'Unknown', type: 'categorical' };

        render(<ToolTray {...props} />);

        const btn = screen.getByRole('button', {
          name: /toggle the selected feature's type between categorical and continuous/i,
        });

        fireEvent.click(btn);

        await waitFor(() => {
          expect(recalculateFeature).not.toHaveBeenCalled();
        });
      });

      it('handles missing node with serviceUrl', async () => {
        recalculateFeature.mockResolvedValue({
          continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileC.csv' }],
        });

        const props = getDefaultProps();
        props.selectedEntry = {
          featureName: 'Fruit',
          type: 'categorical',
          fileName: 'fileC.csv',
        };
        props.dataResults = [
          { nodeId: 99, nodeName: 'Unknown', fileName: 'fileC.csv' },
        ];

        render(<ToolTray {...props} />);

        const btn = screen.getByRole('button', {
          name: /toggle the selected feature's type between categorical and continuous/i,
        });

        fireEvent.click(btn);

        await waitFor(() => {
          expect(recalculateFeature).not.toHaveBeenCalled();
        });
      });

      it('updates selectedEntry nodeId from dataResults fallback', async () => {
        recalculateFeature.mockResolvedValue({
          continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
        });

        const props = getDefaultProps();
        props.selectedEntry = {
          featureName: 'Fruit',
          type: 'categorical',
          fileName: 'fileA.csv',
        };

        render(<ToolTray {...props} />);

        const btn = screen.getByRole('button', {
          name: /toggle the selected feature's type between categorical and continuous/i,
        });

        fireEvent.click(btn);

        await waitFor(() => {
          expect(props.setSelectedEntry).toHaveBeenCalled();
        });
      });

      it('handles conversion with chiSquareTest data', async () => {
        recalculateFeature.mockResolvedValue({
          continuousFeatures: [{ featureName: 'Fruit', fileName: 'fileA.csv' }],
          chiSquareTest: { test: 'data' },
        });

        const props = getDefaultProps();
        render(<ToolTray {...props} />);

        const btn = screen.getByRole('button', {
          name: /toggle the selected feature's type between categorical and continuous/i,
        });

        fireEvent.click(btn);

        await waitFor(() => {
          expect(recalculateFeature).toHaveBeenCalled();
        });
      });
    });

    it('toggles individual feature on/off', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);

      const fruitSwitch = screen.getByRole('checkbox', { name: 'Fruit' });
      fireEvent.click(fruitSwitch);

      expect(props.setFilteredData).toHaveBeenCalled();
    });

    it('creates ripple effect on file toggle click', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);

      const fileLabel = screen.getByText('fileA.csv').closest('label');
      fireEvent.click(fileLabel);

      expect(props.toggleFileActive).toHaveBeenCalled();
    });

    it('displays "Show All" when not all features are checked', () => {
      const props = getDefaultProps();
      props.filteredData = {
        ...props.data,
        categoricalFeatures: [],
      };

      render(<ToolTray {...props} />);
      expect(
        screen.getByRole('button', { name: /show all/i })
      ).toBeInTheDocument();
    });

    it('renders single file without multi-file selector', () => {
      const props = getDefaultProps();
      props.dataResults = [
        { nodeId: 1, nodeName: 'Single', fileName: 'file.csv' },
      ];

      render(<ToolTray {...props} />);
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    });

    it('does not render integrity metrics button for single file', () => {
      const props = getDefaultProps();
      props.dataResults = [
        { nodeId: 1, nodeName: 'Single', fileName: 'file.csv' },
      ];

      render(<ToolTray {...props} />);
      expect(
        screen.queryByRole('button', { name: /integrity metrics/i })
      ).not.toBeInTheDocument();
    });

    it('shows "Filters added" when filters exist', () => {
      const props = getDefaultProps();
      props.filters = [{ filter: 'data' }];

      render(<ToolTray {...props} />);
      expect(
        screen.getByRole('button', { name: /filters added/i })
      ).toBeInTheDocument();
    });

    it('shows "Display aggregate metrics" when in individual view', () => {
      const props = getDefaultProps();
      props.showIndividualView = true;

      render(<ToolTray {...props} />);
      expect(
        screen.getByRole('button', { name: /display aggregate metrics/i })
      ).toBeInTheDocument();
    });
  });
});