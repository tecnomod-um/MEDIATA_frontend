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
      expect(mockUpdateNodeAxiosBaseURL).toHaveBeenCalledWith('http://node');
      expect(mockFilterMultipleFiles).toHaveBeenCalled();
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
});
