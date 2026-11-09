import React from 'react';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { toast } from 'react-toastify';
import { requestFeatureTypeChanges } from '../featureTypeChanges';

import ToolTray from './toolTray';

vi.mock('react-switch', () => ({
  __esModule: true,
  default: ({ checked, onChange, 'aria-label': ariaLabel }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel || 'mock-switch'}
      checked={checked}
      onChange={() => onChange(!checked)}
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
  default: ({ isOpen, closeModal }) =>
    isOpen ? (
      <div data-testid="compare-modal">
        <button data-testid="close-modal-btn" onClick={closeModal}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../featureTypeChanges', () => ({ requestFeatureTypeChanges: vi.fn() }));
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
    selectedEntries: [data.categoricalFeatures[0]],
    setSelectedEntry: vi.fn(),
    onFeatureRecalculated: vi.fn(),
    onTypeChanging: vi.fn(),
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
  it('marks filtered datasets and feature cohorts while keeping checkbox names stable', () => {
    const props = getDefaultProps();
    props.data.categoricalFeatures[0].nodeId = 1;
    props.appliedFilters = new Map([[JSON.stringify(['1', 'fileA.csv']), 'cluster (= 1)']]);
    render(<ToolTray {...props} />);
    expect(screen.getByRole('checkbox', { name: 'fileA.csv' })).toHaveAttribute('aria-description', 'Filtered records: cluster (= 1)');
    expect(screen.getAllByRole('img', { name: 'Filtered records: cluster (= 1)' }).length).toBeGreaterThan(1);
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders core sections & children when open', () => {
    render(<ToolTray {...getDefaultProps()} />);

    expect(screen.getByTestId('chevron-left')).toBeInTheDocument();
    expect(within(screen.getByRole('region', {name: 'Features'})).getByTitle('Fruit')).toBeInTheDocument();
    expect(screen.getByTitle('Price')).toBeInTheDocument();
    expect(screen.getByTestId('data-exporter')).toBeInTheDocument();
    expect(screen.getByTestId('element-exporter')).toBeInTheDocument();
  });

  it('search box filters visible features', () => {
    render(<ToolTray {...getDefaultProps()} />);

    const search = screen.getByPlaceholderText(/search features/i);
    fireEvent.change(search, { target: { value: 'fruit' } });

    expect(within(screen.getByRole('region', {name: 'Features'})).getByTitle('Fruit')).toBeInTheDocument();
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

  it('renders closed state with right-chevron when isToolTrayOpen=false', () => {
      const props = { ...getDefaultProps(), isToolTrayOpen: false };
      render(<ToolTray {...props} />);

      expect(screen.getByRole('button', { name: 'Open tool tray' }).querySelector('[data-testid="chevron-right"]')).toBeInTheDocument();
    });

    it('shows "No entry selected" when selectedEntries is null', () => {
      const props = { ...getDefaultProps(), selectedEntries: [] };
      render(<ToolTray {...props} />);

      expect(screen.getByText(/no entry selected/i)).toBeInTheDocument();
    });

    it('retains the original aggregate metrics control without adding a combined view button', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /display individual metrics/i }));
      expect(props.toggleView).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /combined statistics/i })).not.toBeInTheDocument();
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
      expect(within(screen.getByRole('region', {name: 'Features'})).queryByTitle('Fruit')).not.toBeInTheDocument();
    });

    it('commits one full source response and brackets the request with the shared busy state', async () => {
      const change = {nodeId: 1, fileName: 'fileA.csv', featureName: 'Fruit', type: 'continuous', response: {featureTypeSummaryVersion: 1}};
      requestFeatureTypeChanges.mockResolvedValue([change]);
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      fireEvent.click(screen.getByRole('button', {name: /toggle the selected feature's type/i}));
      await waitFor(() => expect(props.onFeatureRecalculated).toHaveBeenCalledWith([change]));
      expect(props.onTypeChanging.mock.calls).toEqual([[true], [false]]);
      expect(props.setData).not.toHaveBeenCalled();
      expect(props.setFilteredData).not.toHaveBeenCalled();

    });

    it('retains prior statistics and restores the busy state on a refused or failed type change', async () => {
      requestFeatureTypeChanges.mockRejectedValue(new Error('Statistics withheld'));
      const props = getDefaultProps();
      render(<ToolTray {...props} />);
      fireEvent.click(screen.getByRole('button', {name: /toggle the selected feature\x27s type/i}));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Statistics withheld')));
      expect(props.onFeatureRecalculated).not.toHaveBeenCalled();
      expect(props.setFilteredData).not.toHaveBeenCalled();
      expect(props.onTypeChanging).toHaveBeenLastCalledWith(false);
    });

    it.each([{isCombining: true}])('blocks type changes for a pending refresh', extra => {
      render(<ToolTray {...getDefaultProps()} {...extra} />);
      expect(screen.getByRole('button', {name: /toggle the selected feature\x27s type/i})).toBeDisabled();
      expect(requestFeatureTypeChanges).not.toHaveBeenCalled();
    });
    it('toggles individual feature on/off', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);

      const fruitSwitch = screen.getByRole('checkbox', { name: 'Fruit' });
      fireEvent.click(fruitSwitch);

      expect(props.setFilteredData).toHaveBeenCalled();
    });

    it('switch updater removes feature from filteredData when it is already present', () => {
      const props = getDefaultProps();
      let capturedUpdater = null;
      props.setFilteredData = vi.fn((updater) => {
        if (typeof updater === 'function') capturedUpdater = updater;
      });

      render(<ToolTray {...props} />);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Fruit' }));

      expect(capturedUpdater).not.toBeNull();
      const result = capturedUpdater(props.filteredData);
      // Fruit was in categoricalFeatures → it should be removed
      expect(result.categoricalFeatures.some((f) => f.featureName === 'Fruit')).toBe(false);
    });

    it('switch updater adds feature to filteredData when it is absent', () => {
      const props = getDefaultProps();
      // Remove Fruit from filteredData so clicking adds it back
      props.filteredData = { ...props.data, categoricalFeatures: [] };
      let capturedUpdater = null;
      props.setFilteredData = vi.fn((updater) => {
        if (typeof updater === 'function') capturedUpdater = updater;
      });

      render(<ToolTray {...props} />);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Fruit' }));

      expect(capturedUpdater).not.toBeNull();
      const result = capturedUpdater(props.filteredData);
      // Fruit was absent → it should now be added
      expect(result.categoricalFeatures.some((f) => f.featureName === 'Fruit')).toBe(true);
    });

    it('closes the compare modal when its closeModal callback is invoked', () => {
      render(<ToolTray {...getDefaultProps()} />);

      fireEvent.click(screen.getByRole('button', { name: /integrity metrics/i }));
      expect(screen.getByTestId('compare-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-modal-btn'));
      expect(screen.queryByTestId('compare-modal')).not.toBeInTheDocument();
    });

    it('toggles the file when its full label is clicked', () => {
      const props = getDefaultProps();
      render(<ToolTray {...props} />);

      const fileLabel = screen.getByRole('checkbox', { name: 'fileA.csv' }).closest('label');
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

    it('retains the existing aggregate metrics button label', () => {
      const props = getDefaultProps();
      props.showIndividualView = true;

      render(<ToolTray {...props} />);
      expect(
        screen.getByRole('button', { name: /display aggregate metrics/i })
      ).toBeInTheDocument();
    });

    it('toggleAllDisplayedFeatures updater removes features when all are currently checked', () => {
      const props = getDefaultProps();
      let capturedUpdater = null;
      props.setFilteredData = vi.fn((updater) => {
        if (typeof updater === 'function') capturedUpdater = updater;
      });

      render(<ToolTray {...props} />);
      fireEvent.click(screen.getByRole('button', { name: /hide all/i }));

      expect(capturedUpdater).not.toBeNull();
      // All features are checked → updater should remove them
      const result = capturedUpdater(props.filteredData);
      expect(result.categoricalFeatures).toHaveLength(0);
    });

    it('toggleAllDisplayedFeatures updater adds features when not all are checked', () => {
      const props = getDefaultProps();
      // Remove Fruit from filteredData so not all features are checked
      props.filteredData = { ...props.data, categoricalFeatures: [] };
      let capturedUpdater = null;
      props.setFilteredData = vi.fn((updater) => {
        if (typeof updater === 'function') capturedUpdater = updater;
      });

      render(<ToolTray {...props} />);
      // Button now shows "Show All" → clicking it adds features
      fireEvent.click(screen.getByRole('button', { name: /show all/i }));

      expect(capturedUpdater).not.toBeNull();
      const result = capturedUpdater(props.filteredData);
      // Fruit should be added back
      expect(result.categoricalFeatures.some((f) => f.featureName === 'Fruit')).toBe(true);
    });

});
// A type recalculation reads the unfiltered file, so it must not mix cohorts.
it('requires clearing cohort filters before recalculating a variable type', () => {
  render(<ToolTray {...getDefaultProps()} filters={{ Age: [{ type: 'equal', value: 25 }] }} />);
  expect(screen.getByRole('button', { name: "Toggle the selected feature's type between categorical and continuous" })).toBeDisabled();
});


it("lists multiple names and converts a mixed selection to categorical in one batch", async () => {
  vi.useRealTimers();
  const props=getDefaultProps();
  props.selectedEntries=[props.data.continuousFeatures[0],props.data.categoricalFeatures[0]];
  requestFeatureTypeChanges.mockResolvedValue([]);
  render(<ToolTray {...props} />);
  expect(screen.getByRole("heading",{name:"Price, Fruit"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Set selected features to categorical"}));
  await waitFor(()=>expect(props.onFeatureRecalculated).toHaveBeenCalledWith([]));
  expect(requestFeatureTypeChanges).toHaveBeenCalledWith(expect.objectContaining({entries:props.selectedEntries,targetType:"categorical"}));
});


it("shows combined provenance in place of the type control", () => {
  const props=getDefaultProps();
  props.selectedEntries=[{featureName:"Age",pooled:true,combinedSummary:{contributions:[{source:{nodeName:"Alpha",fileName:"a.csv"},columnName:"Age"},{source:{nodeName:"Beta",fileName:"b.csv"},columnName:"PatientAge"}]}}];
  props.selectedSourceFeatures=[{featureName:"Age",nodeName:"Alpha",fileName:"a.csv"},{featureName:"PatientAge",nodeName:"Beta",fileName:"b.csv"}];
  render(<ToolTray {...props} />);
  expect(screen.getByText("Alpha ↔ Beta · 2 datasets")).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:/selected feature.*type/})).not.toBeInTheDocument();
});
