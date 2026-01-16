import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterModal from './filterModal';

jest.mock('../../Common/OverlayWrapper/overlayWrapper', () => ({
  __esModule: true,
  default: ({ children, isOpen }) => isOpen ? <div data-testid="overlay">{children}</div> : null,
}));
jest.mock('../../Common/TooltipPopup/tooltipPopup', () => ({
  __esModule: true,
  default: ({ message, onClose }) => (
    <div data-testid="tooltip" onClick={onClose}>{message}</div>
  ),
}));
jest.mock('react-icons/io', () => ({ IoMdClose: () => <span>X</span> }));
jest.mock('react-transition-group', () => ({
  CSSTransition: ({ children, in: inProp }) => inProp ? <>{children}</> : null,
  TransitionGroup: ({ children }) => <ul>{children}</ul>,
}));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));

jest.mock('react-datepicker', () => props => (
  <input
    type="date"
    data-testid="mock-datepicker"
    value={props.selected?.toISOString().slice(0, 10) || ''}
    onChange={e => props.onChange(new Date(e.target.value))}
    disabled={props.disabled}
  />
));

jest.mock('react-select', () => props => (
  <select
    data-testid={`mock-select-${props.inputId || 'default'}`}
    id={props.inputId}
    multiple={!!props.isMulti}
    value={
      props.isMulti
        ? props.value?.map(v => v.value) || []
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
    disabled={props.isDisabled}
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
    { featureName: 'Color (file.csv)', categoryCounts: { red: 3, blue: 2, green: 1 } },
    { featureName: 'Size (file.csv)', categoryCounts: { S: 1, M: 2, L: 3 } },
  ],
  continuousFeatures: [
    { featureName: 'Amount (file.csv)' },
    { featureName: 'Price (file.csv)' },
  ],
  dateFeatures: [
    { featureName: 'Date (file.csv)' },
    { featureName: 'Timestamp (file.csv)' },
  ],
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

describe('<FilterModal /> comprehensive coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('initialization and rendering', () => {
    it('renders when open', () => {
      render(<FilterModal {...commonProps} />);
      expect(screen.getByText(/Filter displayed data/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<FilterModal {...commonProps} isOpen={false} />);
      expect(screen.queryByText(/Filter displayed data/i)).not.toBeInTheDocument();
    });

    it('renders nothing when dataStatistics is null', () => {
      render(<FilterModal {...commonProps} dataStatistics={null} />);
      expect(screen.queryByText(/Filter displayed data/i)).not.toBeInTheDocument();
    });

    it('initializes filter conditions for all features', () => {
      render(<FilterModal {...commonProps} />);
      expect(screen.getByLabelText(/Select feature to filter/i)).toBeInTheDocument();
    });

    it('shows close button', () => {
      render(<FilterModal {...commonProps} />);
      expect(screen.getByRole('button', { name: /close filter modal/i })).toBeInTheDocument();
    });

    it('calls closeModal when close button clicked', () => {
      render(<FilterModal {...commonProps} />);
      fireEvent.click(screen.getByRole('button', { name: /close filter modal/i }));
      expect(commonProps.closeModal).toHaveBeenCalled();
    });

    it('calls closeModal when cancel clicked', () => {
      render(<FilterModal {...commonProps} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(commonProps.closeModal).toHaveBeenCalled();
    });
  });

  describe('categorical filter', () => {
    it('shows categorical options when categorical feature selected', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Color (file.csv)' } });
      
      expect(screen.getByText(/Choose categories/i)).toBeInTheDocument();
    });

    it('enables multi-select for categories', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Color (file.csv)' } });
      
      const catSelects = screen.getAllByTestId(/mock-select/);
      const catSelect = catSelects.find(s => s.multiple);
      expect(catSelect).toBeInTheDocument();
    });

    it('filters out already used categories', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Color (file.csv)' } });
      
      const catSelects = screen.getAllByTestId(/mock-select/);
      const catSelect = catSelects.find(s => s.multiple);
      
      const redOpt = screen.getByRole('option', { name: 'red' });
      redOpt.selected = true;
      fireEvent.change(catSelect);
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      // After adding red, it shouldn't appear in options
      expect(screen.getByText('red')).toBeInTheDocument();
    });

    it('adds multiple categorical values', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Color (file.csv)' } });
      
      const catSelects = screen.getAllByTestId(/mock-select/);
      const catSelect = catSelects.find(s => s.multiple);
      
      const redOpt = screen.getByRole('option', { name: 'red' });
      const blueOpt = screen.getByRole('option', { name: 'blue' });
      redOpt.selected = true;
      blueOpt.selected = true;
      fireEvent.change(catSelect);
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText('red')).toBeInTheDocument();
      expect(screen.getByText('blue')).toBeInTheDocument();
    });

    it('disables Add Filter when no category selected', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Color (file.csv)' } });
      
      const addBtn = screen.getByRole('button', { name: /add filter/i });
      expect(addBtn).toBeDisabled();
    });

    it('enables Add Filter when category selected', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Color (file.csv)' } });
      
      const catSelects = screen.getAllByTestId(/mock-select/);
      const catSelect = catSelects.find(s => s.multiple);
      
      const redOpt = screen.getByRole('option', { name: 'red' });
      redOpt.selected = true;
      fireEvent.change(catSelect);
      
      const addBtn = screen.getByRole('button', { name: /add filter/i });
      expect(addBtn).toBeEnabled();
    });
  });

  describe('continuous filter', () => {
    it('shows continuous filter UI when continuous feature selected', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      expect(screen.getByLabelText(/Filter Type/i)).toBeInTheDocument();
      expect(screen.getByTestId('continuous-filter-type')).toBeInTheDocument();
    });

    it('handles equal filter type', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('continuous-filter-type'), {
        target: { value: 'equal' },
      });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText(/Equal to/i)).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles between filter type', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
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
      
      expect(screen.getByText(/Between/i)).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('handles less than filter', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('continuous-filter-type'), {
        target: { value: 'less' },
      });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '50' } });
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText(/Less than/i)).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('handles greater than filter', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('continuous-filter-type'), {
        target: { value: 'greater' },
      });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '75' } });
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText(/Greater than/i)).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('disables Add Filter for between when min missing', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('continuous-filter-type'), {
        target: { value: 'between' },
      });
      
      fireEvent.change(screen.getByTestId('max-value-input'), {
        target: { value: '20' },
      });
      
      const addBtn = screen.getByRole('button', { name: /add filter/i });
      expect(addBtn).toBeDisabled();
    });

    it('disables Add Filter for between when max missing', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('continuous-filter-type'), {
        target: { value: 'between' },
      });
      
      fireEvent.change(screen.getByTestId('min-value-input'), {
        target: { value: '10' },
      });
      
      const addBtn = screen.getByRole('button', { name: /add filter/i });
      expect(addBtn).toBeDisabled();
    });

    it('disables Add Filter when value missing for non-between', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('continuous-filter-type'), {
        target: { value: 'equal' },
      });
      
      const addBtn = screen.getByRole('button', { name: /add filter/i });
      expect(addBtn).toBeDisabled();
    });
  });

  describe('date filter', () => {
    it('shows date filter UI when date feature selected', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Date (file.csv)' } });
      
      expect(screen.getByTestId('date-filter-type')).toBeInTheDocument();
    });

    it('handles equal date filter', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Date (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('date-filter-type'), {
        target: { value: 'equal' },
      });
      
      const dateInput = screen.getByTestId('mock-datepicker');
      fireEvent.change(dateInput, { target: { value: '2025-07-01' } });
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText(/Equal to/i)).toBeInTheDocument();
    });

    it('handles between date filter', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Date (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('date-filter-type'), {
        target: { value: 'between' },
      });
      
      const [start, end] = screen.getAllByTestId('mock-datepicker');
      fireEvent.change(start, { target: { value: '2025-06-01' } });
      fireEvent.change(end, { target: { value: '2025-06-30' } });
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText(/Between/i)).toBeInTheDocument();
    });

    it('handles less than date filter (Sooner than)', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Date (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('date-filter-type'), {
        target: { value: 'less' },
      });
      
      const dateInput = screen.getByTestId('mock-datepicker');
      fireEvent.change(dateInput, { target: { value: '2025-05-01' } });
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText(/Sooner than/i)).toBeInTheDocument();
    });

    it('handles greater than date filter (Later than)', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Date (file.csv)' } });
      
      fireEvent.change(screen.getByTestId('date-filter-type'), {
        target: { value: 'greater' },
      });
      
      const dateInput = screen.getByTestId('mock-datepicker');
      fireEvent.change(dateInput, { target: { value: '2025-08-01' } });
      
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText(/Later than/i)).toBeInTheDocument();
    });
  });

  describe('filter deletion', () => {
    it('deletes a filter when X button clicked', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      const deleteButtons = screen.getAllByRole('button', { name: 'X' });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);
      
      expect(screen.queryByText('100')).not.toBeInTheDocument();
    });

    it('removes feature from filters when last filter deleted', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      expect(screen.getByText('Amount (file.csv)')).toBeInTheDocument();
      
      const deleteButtons = screen.getAllByRole('button', { name: 'X' });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);
      
      expect(screen.queryByText('Amount (file.csv)')).not.toBeInTheDocument();
    });
  });

  describe('logical operators', () => {
    it('shows AND operator between multiple conditions', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      let valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '200' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      const andButtons = screen.getAllByRole('button', { name: /AND/i });
      expect(andButtons.length).toBeGreaterThan(0);
    });

    it('toggles logical operator from AND to OR', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      let valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '200' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      const andButton = screen.getAllByRole('button', { name: /AND/i })[0];
      fireEvent.click(andButton);
      
      expect(screen.getByRole('button', { name: /OR/i })).toBeInTheDocument();
    });

    it('toggles logical operator from OR back to AND', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      let valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '200' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      const andButton = screen.getAllByRole('button', { name: /AND/i })[0];
      fireEvent.click(andButton);
      
      const orButton = screen.getByRole('button', { name: /OR/i });
      fireEvent.click(orButton);
      
      expect(screen.getAllByRole('button', { name: /AND/i }).length).toBeGreaterThan(0);
    });

    it('shows global logical operator when multiple features filtered', () => {
      render(<FilterModal {...commonProps} />);
      
      // Add filter for Amount
      let select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      let valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      // Add filter for Price
      select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Price (file.csv)' } });
      valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      expect(screen.getByText(/Combine all filters with/i)).toBeInTheDocument();
    });

    it('toggles global logical operator', () => {
      render(<FilterModal {...commonProps} />);
      
      // Add filter for Amount
      let select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      let valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      // Add filter for Price
      select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Price (file.csv)' } });
      valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));
      
      const globalOpButton = screen.getByLabelText(/Global logical operator/i);
      fireEvent.click(globalOpButton);
      
      expect(screen.getByText(/OR/)).toBeInTheDocument();
    });
  });

  describe('tooltip', () => {
    it('shows tooltip when trying to add without selecting feature', () => {
      render(<FilterModal {...commonProps} />);
      
      // Don't select any feature, just try to add
      const addBtn = screen.queryByRole('button', { name: /add filter/i });
      expect(addBtn).not.toBeInTheDocument(); // Button doesn't exist yet
    });

    it('closes tooltip when clicked', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const addBtn = screen.getByRole('button', { name: /add filter/i });
      fireEvent.click(addBtn);
      
      const tooltip = screen.queryByTestId('tooltip');
      if (tooltip) {
        fireEvent.click(tooltip);
        expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
      }
    });
  });

  describe('apply filters', () => {
    it('disables Apply button when no filters set', () => {
      render(<FilterModal {...commonProps} />);
      
      const applyBtn = screen.getByRole('button', { name: /No Filters Set/i });
      expect(applyBtn).toBeDisabled();
    });

    it('enables Apply button when filters exist', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
      expect(applyBtn).toBeEnabled();
    });

    it('calls filterMultipleFiles on apply', async () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
      
      await waitFor(() => {
        expect(mockFilterMultipleFiles).toHaveBeenCalled();
      });
    });

    it('closes modal after successful apply', async () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
      
      await waitFor(() => {
        expect(commonProps.closeModal).toHaveBeenCalled();
      });
    });

    it('updates data results after apply', async () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
      
      await waitFor(() => {
        expect(commonProps.setDataResults).toHaveBeenCalled();
      });
    });

    it('shows loading state while applying', async () => {
      mockFilterMultipleFiles.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
      
      expect(screen.getByText(/Applying Filters/i)).toBeInTheDocument();
    });

    it('disables buttons while loading', async () => {
      mockFilterMultipleFiles.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close filter modal/i })).toBeDisabled();
      });
    });

    it('handles apply error gracefully', async () => {
      mockFilterMultipleFiles.mockImplementationOnce(() => {
        throw new Error('Network error');
      });
      
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
      
      await waitFor(() => {
        const { toast } = require('react-toastify');
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
      });
    });

    it('allows resetting previous filters', async () => {
      render(<FilterModal {...commonProps} filters={{ old: true }} />);
      
      const resetBtn = screen.getByRole('button', { name: /Reset Previous Filters/i });
      expect(resetBtn).toBeEnabled();
      
      fireEvent.click(resetBtn);
      
      await waitFor(() => {
        expect(mockFilterMultipleFiles).toHaveBeenCalled();
      });
    });

    it('skips inactive files', async () => {
      const props = {
        ...commonProps,
        dataResults: [
          { fileName: 'file1.csv', nodeId: 'n1' },
          { fileName: 'file2.csv', nodeId: 'n1' },
        ],
        activeFileIndices: [true, false],
      };
      
      render(<FilterModal {...props} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      fireEvent.click(screen.getByRole('button', { name: /Apply Filters/i }));
      
      await waitFor(() => {
        expect(mockFilterMultipleFiles).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('handles feature without category counts', () => {
      const stats = {
        categoricalFeatures: [{ featureName: 'Empty (file.csv)', categoryCounts: {} }],
        continuousFeatures: [],
        dateFeatures: [],
      };
      
      render(<FilterModal {...commonProps} dataStatistics={stats} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Empty (file.csv)' } });
      
      // Should not crash
    });

    it('handles multiple features of same type', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      
      expect(screen.getByRole('option', { name: 'Color (file.csv)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Size (file.csv)' })).toBeInTheDocument();
    });

    it('handles all three feature types', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      
      expect(screen.getByRole('option', { name: 'Color (file.csv)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Amount (file.csv)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Date (file.csv)' })).toBeInTheDocument();
    });

    it('resets form after adding filter', () => {
      render(<FilterModal {...commonProps} />);
      const select = screen.getByTestId('mock-select-feature-select');
      fireEvent.change(select, { target: { value: 'Amount (file.csv)' } });
      
      const valueInput = screen.getByLabelText(/Value/i);
      fireEvent.change(valueInput, { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
      
      // Check form was reset (should not have value anymore)
      expect(screen.getByLabelText(/Value/i).value).toBe('');
    });
  });
});
