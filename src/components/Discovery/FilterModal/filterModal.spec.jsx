import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import FilterModal from './filterModal';
import { toast } from 'react-toastify';

const {
  mockFilterMultipleFiles,
  mockUpdateNodeAxiosBaseURL,
  mockCloseModal,
  mockSetFilters,
  mockSetFilteredDataStatistics,
  mockSetDataResults,
  mockCombineSelectedData,
  mockSetDataStatistics,
  mockToastError,
} = vi.hoisted(() => ({
  mockFilterMultipleFiles: vi.fn(async () => [
    { fileName: 'file.csv', filtered: true },
  ]),
  mockUpdateNodeAxiosBaseURL: vi.fn(),
  mockCloseModal: vi.fn(),
  mockSetFilters: vi.fn(),
  mockSetFilteredDataStatistics: vi.fn(),
  mockSetDataResults: vi.fn(),
  mockCombineSelectedData: vi.fn(() => ({ combined: true })),
  mockSetDataStatistics: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../../Common/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="overlay">{children}</div>,
}));

vi.mock('../../Common/TooltipPopup/tooltipPopup', () => ({
  __esModule: true,
  default: () => <div data-testid="tooltip" />,
}));

vi.mock('react-icons/io', () => ({
  __esModule: true,
  IoMdClose: () => <span>X</span>,
}));

vi.mock('react-transition-group', () => ({
  __esModule: true,
  CSSTransition: ({ children }) => children,
  TransitionGroup: ({ children }) => <ul>{children}</ul>,
}));

vi.mock('react-toastify', () => ({
  __esModule: true,
  toast: {
    error: mockToastError,
  },
}));

vi.mock('react-datepicker', () => ({
  __esModule: true,
  default: (props) => (
    <input
      type="date"
      data-testid="mock-datepicker"
      value={props.selected?.toISOString().slice(0, 10) || ''}
      onChange={(e) => props.onChange(new Date(e.target.value))}
    />
  ),
}));

vi.mock('react-select', () => ({
  __esModule: true,
  default: (props) => (
    <select
      data-testid="mock-select"
      multiple={!!props.isMulti}
      value={
        props.isMulti
          ? props.value?.map((v) => v.value) ?? []
          : props.value?.value || ''
      }
      onChange={(e) => {
        if (props.isMulti) {
          const vals = Array.from(e.target.selectedOptions).map((o) => ({
            value: o.value,
            label: o.value,
          }));
          props.onChange(vals);
        } else {
          props.onChange({ value: e.target.value, label: e.target.value });
        }
      }}
    >
      <option value="">--</option>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('../../../util/petitionHandler', () => ({
  __esModule: true,
  filterMultipleFiles: (...args) => mockFilterMultipleFiles(...args),
}));

vi.mock('../../../util/nodeAxiosSetup', () => ({
  __esModule: true,
  updateNodeAxiosBaseURL: (...args) => mockUpdateNodeAxiosBaseURL(...args),
}));

vi.mock('../../../context/nodeContext', () => ({
  __esModule: true,
  useNode: () => ({
    selectedNodes: [{ nodeId: 'n1', serviceUrl: 'http://node' }, { nodeId: 'n2', serviceUrl: 'http://node2' }],
  }),
}));

const baseStats = {
  categoricalFeatures: [
    { featureName: 'Color', categoryCounts: { red: 3, blue: 2 } },
  ],
  continuousFeatures: [{ featureName: 'Amount' }],
  dateFeatures: [{ featureName: 'Date' }],
};

const baseResults = [{ fileName: 'file.csv', nodeId: 'n1', data: [] }];

const commonProps = {
  isOpen: true,
  dataStatistics: baseStats,
  closeModal: mockCloseModal,
  filters: {},
  setFilters: mockSetFilters,
  setFilteredDataStatistics: mockSetFilteredDataStatistics,
  dataResults: baseResults,
  activeFileIndices: [true],
  setDataResults: mockSetDataResults,
  combineSelectedData: mockCombineSelectedData,
  setDataStatistics: mockSetDataStatistics,
};

describe('<FilterModal />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilterMultipleFiles.mockResolvedValue([
      { fileName: 'file.csv', filtered: true },
    ]);
    mockCombineSelectedData.mockReturnValue({ combined: true });
  });

  it("doesn't show enabled Add Filter until you pick a feature and a category", () => {
    render(<FilterModal {...commonProps} />);

    const [featSelect] = screen.getAllByTestId('mock-select');
    fireEvent.change(featSelect, { target: { value: 'Color' } });

    const addBtn = screen.getByRole('button', { name: /add filter/i });
    expect(addBtn).toBeDisabled();

    const catSelect = screen
      .getAllByTestId('mock-select')
      .find((s) => s.multiple);

    const redOpt = screen.getByRole('option', { name: 'red' });
    redOpt.selected = true;
    fireEvent.change(catSelect);

    expect(addBtn).toBeEnabled();
  });

  it('lets you add a categorical filter then Apply calls the helper and closes', async () => {
    render(<FilterModal {...commonProps} />);

    const [featSelect] = screen.getAllByTestId('mock-select');
    fireEvent.change(featSelect, { target: { value: 'Color' } });

    const catSelect = screen
      .getAllByTestId('mock-select')
      .find((s) => s.multiple);

    const blueOpt = screen.getByRole('option', { name: 'blue' });
    blueOpt.selected = true;
    fireEvent.change(catSelect);

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    expect(screen.getByText(/Equal to/i)).toBeInTheDocument();
    expect(screen.getByText('blue')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(mockFilterMultipleFiles).toHaveBeenCalledWith(expect.any(Object), 'http://node');
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('adds and removes a continuous "between" filter correctly', () => {
    render(<FilterModal {...commonProps} />);
  
    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Amount' },
    });
  
    fireEvent.change(screen.getByTestId('continuous-filter-type'), {
      target: { value: 'between' },
    });
  
    fireEvent.change(screen.getByTestId('min-value-input'), {
      target: { value: '10' },
    });
  
    fireEvent.change(screen.getByTestId('max-value-input'), {
      target: { value: '20' },
    });
  
    fireEvent.click(
      screen.getByRole('button', { name: /add filter|add more criteria/i })
    );
  
    const summaryTitle = screen.getByText('Amount', { selector: 'strong' });
    const summaryItem = summaryTitle.closest('li');
  
    expect(summaryItem).toBeInTheDocument();
    expect(summaryItem).toHaveTextContent('Between');
    expect(summaryItem).toHaveTextContent('10');
    expect(summaryItem).toHaveTextContent('20');
  
    const deleteBtn = summaryItem.querySelector('button');
    fireEvent.click(deleteBtn);
  
    expect(
      screen.queryByText('Amount', { selector: 'strong' })
    ).not.toBeInTheDocument();
  });

  it('cancel button closes modal without applying', () => {
    render(<FilterModal {...commonProps} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockFilterMultipleFiles).not.toHaveBeenCalled();
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('shows error toast when applyFilters throws', async () => {
    mockFilterMultipleFiles.mockRejectedValueOnce(new Error('Network error'));

    render(<FilterModal {...commonProps} />);

    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Color' },
    });

    const catSelect = screen
      .getAllByTestId('mock-select')
      .find((s) => s.multiple);

    const redOpt = screen.getByRole('option', { name: 'red' });
    redOpt.selected = true;
    fireEvent.change(catSelect);

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );
    });
  });

  it('shows reset previous filters button when existing filters are present', () => {
    render(<FilterModal {...commonProps} filters={{ old: true }} />);

    const resetBtn = screen.getByRole('button', {
      name: /reset previous filters/i,
    });

    expect(resetBtn).toBeEnabled();
  });

  it('adds a date equal filter and displays it in summary', () => {
    render(<FilterModal {...commonProps} />);

    // Select the Date feature
    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Date' },
    });

    // default type is "equal" and default date is set — button should be enabled
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    const summary = screen.getByText('Date', { selector: 'strong' }).closest('li');
    expect(summary).toHaveTextContent('Equal to');
  });

  it('adds a date between filter', () => {
    render(<FilterModal {...commonProps} />);

    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Date' },
    });

    // Switch to between
    fireEvent.change(screen.getByTestId('date-filter-type'), {
      target: { value: 'between' },
    });

    // Set start date
    const datePickers = screen.getAllByTestId('mock-datepicker');
    fireEvent.change(datePickers[0], { target: { value: '2024-01-01' } });
    fireEvent.change(datePickers[1], { target: { value: '2024-12-31' } });

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    const summary = screen.getByText('Date', { selector: 'strong' }).closest('li');
    expect(summary).toHaveTextContent('Between');
  });

  it('adds a date greater filter', async () => {
    render(<FilterModal {...commonProps} />);

    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Date' },
    });

    fireEvent.change(screen.getByTestId('date-filter-type'), {
      target: { value: 'greater' },
    });

    const datePicker = screen.getByTestId('mock-datepicker');
    fireEvent.change(datePicker, { target: { value: '2024-06-01' } });

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    const summary = screen.getByText('Date', { selector: 'strong' }).closest('li');
    expect(summary).toHaveTextContent('Greater than');
  });

  it('continuous less-than filter adds correctly', () => {
    render(<FilterModal {...commonProps} />);

    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Amount' },
    });

    fireEvent.change(screen.getByTestId('continuous-filter-type'), {
      target: { value: 'less' },
    });

    // The less-than path shows the single-value input (not min/max)
    const valueInput = document.getElementById('continuous-value');
    expect(valueInput).toBeTruthy();
    fireEvent.change(valueInput, { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    const summary = screen.getByText('Amount', { selector: 'strong' }).closest('li');
    expect(summary).toHaveTextContent('Less than');
  });

  it('continuous greater-than filter adds correctly', () => {
    render(<FilterModal {...commonProps} />);

    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Amount' },
    });

    fireEvent.change(screen.getByTestId('continuous-filter-type'), {
      target: { value: 'greater' },
    });

    const valueInput = document.getElementById('continuous-value');
    expect(valueInput).toBeTruthy();
    fireEvent.change(valueInput, { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    const summary = screen.getByText('Amount', { selector: 'strong' }).closest('li');
    expect(summary).toHaveTextContent('Greater than');
  });

  it('shows global logical operator toggle when two different features have filters', () => {
    render(<FilterModal {...commonProps} />);

    // Add filter for Amount (continuous)
    fireEvent.change(screen.getAllByTestId('mock-select')[0], { target: { value: 'Amount' } });
    const amountInput = document.getElementById('continuous-value');
    fireEvent.change(amountInput, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    // Add filter for Date
    fireEvent.change(screen.getAllByTestId('mock-select')[0], { target: { value: 'Date' } });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    // Now hasAtLeastTwoFilters() = true → global logical operator button renders
    expect(
      screen.getByRole('button', {
        name: /global logical operator/i,
      })
    ).toBeInTheDocument();
  });

  it('toggles global logical operator from AND to OR on click', () => {
    render(<FilterModal {...commonProps} />);

    fireEvent.change(screen.getAllByTestId('mock-select')[0], { target: { value: 'Amount' } });
    const amountInput = document.getElementById('continuous-value');
    fireEvent.change(amountInput, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    fireEvent.change(screen.getAllByTestId('mock-select')[0], { target: { value: 'Date' } });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    const globalBtn = screen.getByRole('button', { name: /global logical operator/i });
    expect(globalBtn).toHaveTextContent('AND');

    fireEvent.click(globalBtn);
    expect(globalBtn).toHaveTextContent('OR');
  });
});

it('filters the correct site when filenames are identical and sends the original column name', async () => {
  vi.clearAllMocks();
  const betaLabel = 'Age (patients.csv · Beta)';
  const stats = { continuousFeatures: [
    {featureName:'Age (patients.csv · Alpha)', originalName:'Age', fileName:'patients.csv', nodeId:'n1'},
    {featureName:betaLabel, originalName:'Age', fileName:'patients.csv', nodeId:'n2'},
  ], categoricalFeatures:[], dateFeatures:[] };
  mockFilterMultipleFiles.mockImplementation(async (_, url) => [{fileName:'patients.csv', marker:url}]);
  render(<FilterModal {...commonProps} dataStatistics={stats} dataResults={[
    {fileName:'patients.csv',nodeId:'n1'}, {fileName:'patients.csv',nodeId:'n2'},
  ]} activeFileIndices={[true,true]} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Apply to matching columns in other datasets' }));
  fireEvent.change(screen.getAllByTestId('mock-select')[0], {target:{value:betaLabel}});
  fireEvent.change(screen.getByLabelText('Value'), {target:{value:'25'}});
  fireEvent.click(screen.getByRole('button', {name:/add filter/i}));
  fireEvent.click(screen.getByRole('button', {name:/apply filters/i}));
  await waitFor(() => expect(mockSetDataResults).toHaveBeenCalled());
  const updated = mockSetDataResults.mock.calls.at(-1)[0];
  expect(updated.map(r=>r.marker)).toEqual(['http://node','http://node2']);
  const betaCall = mockFilterMultipleFiles.mock.calls.find(call=>call[1]==='http://node2');
  expect(Object.keys(betaCall[0].multipleFileFilters[0].filters.conditions)).toEqual(['Age']);
  expect(mockFilterMultipleFiles.mock.calls.find(call=>call[1]==='http://node')[0].multipleFileFilters[0].filters).toBeNull();
});

it('copies a normal cluster filter to matching columns at every loaded site, including a hidden dataset', async () => {
  vi.clearAllMocks();
  const sources = [{ nodeId: 'n1', fileName: 'patients.csv' }, { nodeId: 'n2', fileName: 'patients.csv' }];
  const stats = { continuousFeatures: sources.map((source, index) => ({ ...source, originalName: 'cluster', featureName: `cluster (${index})` })) };
  mockFilterMultipleFiles.mockImplementation(async () => [{ fileName: 'patients.csv' }]);
  render(<FilterModal {...commonProps} dataStatistics={stats} dataResults={sources} activeFileIndices={[true, false]} />);
  expect(screen.queryByRole('option', { name: /all datasets/i })).not.toBeInTheDocument();
  fireEvent.change(screen.getAllByTestId('mock-select')[0], { target: { value: 'cluster (0)' } });
  fireEvent.change(screen.getByLabelText('Value'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
  expect(mockFilterMultipleFiles).toHaveBeenCalledTimes(2);
  for (const [payload] of mockFilterMultipleFiles.mock.calls) {
    expect(payload.multipleFileFilters[0].filters.conditions.cluster.conditions).toEqual([{ type: 'equal', value: '1', filterType: 'continuous' }]);
  }
});

it('restores applied criteria and logical operators without mutating them when editing', async () => {
  vi.clearAllMocks();
  mockFilterMultipleFiles.mockResolvedValue([{ fileName: 'file.csv' }]);
  const filters = { Amount: [{ type: 'less', value: '10' }, { type: 'greater', value: '20' }] };
  const logic = { operator: 'OR', operators: { Amount: ['OR'] } };
  const setFilterLogic = vi.fn();
  render(<FilterModal {...commonProps} filters={filters} filterLogic={logic} setFilterLogic={setFilterLogic} />);
  expect(screen.getByText('10')).toBeInTheDocument();
  expect(screen.getByText('20')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'OR' }));
  expect(logic.operators.Amount).toEqual(['OR']);
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  await waitFor(() => expect(setFilterLogic).toHaveBeenCalledWith({ operator: 'OR', operators: { Amount: ['AND'] }, matchColumns: true }));
  expect(filters.Amount).toHaveLength(2);
});

it('resets the prior cohort when all restored criteria are removed', async () => {
  vi.clearAllMocks();
  mockFilterMultipleFiles.mockResolvedValue([{ fileName: 'file.csv' }]);
  const filters = { Amount: [{ type: 'equal', value: '10' }] };
  render(<FilterModal {...commonProps} filters={filters} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove criterion 1 for Amount' }));
  expect(filters.Amount).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Reset Previous Filters' }));
  await waitFor(() => expect(mockFilterMultipleFiles).toHaveBeenCalledWith({ multipleFileFilters: [{ fileName: 'file.csv', filters: null }] }, 'http://node'));
  expect(mockSetFilters).toHaveBeenCalledWith([]);
});
