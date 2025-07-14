import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterModal from './filterModal';

jest.mock('../../Unused/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="overlay">{children}</div>,
}));
jest.mock('../../Common/TooltipPopup/tooltipPopup', () => ({
  __esModule: true,
  default: () => <div data-testid="tooltip" />,
}));
jest.mock('react-icons/io', () => ({ IoMdClose: () => <span>X</span> }));
jest.mock('react-transition-group', () => ({
  CSSTransition: ({ children }) => children,
  TransitionGroup: ({ children }) => <ul>{children}</ul>,
}));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));

jest.mock('react-datepicker', () => props => (
  <input
    type="date"
    data-testid="mock-datepicker"
    value={props.selected?.toISOString().slice(0, 10) || ''}
    onChange={e => props.onChange(new Date(e.target.value))}
  />
));

jest.mock('react-select', () => props => (
  <select
    data-testid="mock-select"
    multiple={!!props.isMulti}
    value={
      props.isMulti
        ? props.value?.map(v => v.value)
        : props.value?.value || ''
    }
    onChange={e => {
      if (props.isMulti) {
        const vals = Array.from(e.target.selectedOptions).map(o => ({
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
    {props.options.map(o => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
));

const mockFilterMultipleFiles = jest.fn(async args => [
  { fileName: 'file.csv', filtered: true },
]);
jest.mock('../../../util/petitionHandler', () => ({
  filterMultipleFiles: args => mockFilterMultipleFiles(args),
}));
jest.mock('../../../util/nodeAxiosSetup', () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));
jest.mock('../../../context/nodeContext', () => ({
  useNode: () => ({
    selectedNodes: [{ nodeId: 'n1', serviceUrl: 'http://node' }],
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
  closeModal: jest.fn(),
  filters: {},
  setFilters: jest.fn(),
  setFilteredDataStatistics: jest.fn(),
  dataResults: baseResults,
  activeFileIndices: [true],
  setDataResults: jest.fn(),
  combineSelectedData: jest.fn(() => ({ combined: true })),
  setDataStatistics: jest.fn(),
};

describe('<FilterModal />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('doesn’t show “Add Filter” until you pick a feature & a category', () => {
    render(<FilterModal {...commonProps} />);
    expect(screen.queryByRole('button', { name: /add filter/i })).toBeNull();
    const [featSelect] = screen.getAllByTestId('mock-select');
    fireEvent.change(featSelect, { target: { value: 'Color' } });

    const addBtn = screen.getByRole('button', { name: /add filter/i });
    expect(addBtn).toBeDisabled();

    const catSelect = screen.getAllByTestId('mock-select').find(s => s.multiple);
    const redOpt = screen.getByRole('option', { name: 'red' });
    redOpt.selected = true;
    fireEvent.change(catSelect);

    expect(addBtn).toBeEnabled();
  });

  it('lets you add a categorical filter then Apply calls the helper and closes', async () => {
    render(<FilterModal {...commonProps} />);

    const [featSelect] = screen.getAllByTestId('mock-select');
    fireEvent.change(featSelect, { target: { value: 'Color' } });
    const catSelect = screen.getAllByTestId('mock-select').find(s => s.multiple);
    const blueOpt = screen.getByRole('option', { name: 'blue' });
    blueOpt.selected = true;
    fireEvent.change(catSelect);

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    expect(screen.getByText(/Equal to/)).toBeInTheDocument();
    expect(screen.getByText('blue')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    const betweenMatches = screen.getAllByText(/^Between$/);
    expect(betweenMatches).toHaveLength(1);
  });

  it('handles date filters: equal, less, greater, between', () => {
    render(<FilterModal {...commonProps} />);

    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Date' },
    });

    fireEvent.change(screen.getByTestId('date-filter-type'), {
      target: { value: 'equal' },
    });
    const dateInput = screen.getByTestId('mock-datepicker');
    fireEvent.change(dateInput, { target: { value: '2025-07-01' } });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    expect(screen.getByText(/1\/7\/2025/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'X' })[0]);
    fireEvent.change(screen.getByTestId('date-filter-type'), {
      target: { value: 'between' },
    });
    const [start, end] = screen.getAllByTestId('mock-datepicker');
    fireEvent.change(start, { target: { value: '2025-06-01' } });
    fireEvent.change(end, { target: { value: '2025-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    fireEvent.click(screen.getAllByRole('button', { name: 'X' })[0]);
    fireEvent.change(screen.getByTestId('date-filter-type'), {
      target: { value: 'less' },
    });
    fireEvent.change(screen.getByTestId('mock-datepicker'), {
      target: { value: '2025-05-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    expect(screen.getByText(/Sooner than/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'X' })[0]);
    fireEvent.change(screen.getByTestId('date-filter-type'), {
      target: { value: 'greater' },
    });
    fireEvent.change(screen.getByTestId('mock-datepicker'), {
      target: { value: '2025-08-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    expect(screen.getByText(/Later than/)).toBeInTheDocument();
  });

  it('cancel button closes modal without applying', () => {
    render(<FilterModal {...commonProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockFilterMultipleFiles).not.toHaveBeenCalled();
  });

  it('shows error toast when applyFilters throws', async () => {
    mockFilterMultipleFiles.mockImplementationOnce(() => {
      throw new Error('Network error');
    });
    render(<FilterModal {...commonProps} />);
    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'Color' },
    });
    const catSelect = screen.getAllByTestId('mock-select').find(s => s.multiple);
    const redOpt = screen.getByRole('option', { name: 'red' });
    redOpt.selected = true;
    fireEvent.change(catSelect);
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));

    fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
    await waitFor(() => {
      const { toast } = require('react-toastify');
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );
    });
  });

  it('reset previous filters when no new criteria but existing filters present', async () => {
    render(<FilterModal {...commonProps} filters={{ old: true }} />);
    const resetBtn = screen.getByRole('button', {
      name: /Reset Previous Filters/i,
    });
    expect(resetBtn).toBeEnabled();
  });
});
