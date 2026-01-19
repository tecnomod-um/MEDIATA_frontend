import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CleanPanel from './cleanPanel';

// Mock react-switch
jest.mock("react-switch", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ checked, onChange, disabled }) => (
      <input
        type="checkbox"
        role="switch"
        checked={!!checked}
        disabled={!!disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    ),
  };
});

describe('CleanPanel', () => {
  const defaultProps = {
    show: true,
    onClose: jest.fn(),
    busy: false,
    removeDuplicates: false,
    setRemoveDuplicates: jest.fn(),
    removeEmptyRows: false,
    setRemoveEmptyRows: jest.fn(),
    standardizeDates: false,
    setStandardizeDates: jest.fn(),
    selectedDateFormat: 'YYYY-MM-DD',
    setSelectedDateFormat: jest.fn(),
    dateFormats: [
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    ],
    standardizeNumeric: false,
    setStandardizeNumeric: jest.fn(),
    numericMode: 'double',
    setNumericMode: jest.fn(),
    numericColumnsText: '',
    setNumericColumnsText: jest.fn(),
    selectedCount: 5,
    applyClean: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when show is false', () => {
    const { container } = render(<CleanPanel {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders panel when show is true', () => {
    render(<CleanPanel {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: /data cleaning/i })).toBeInTheDocument();
  });

  it('displays correct title and subtitle', () => {
    render(<CleanPanel {...defaultProps} />);
    expect(screen.getByText('Data cleaning')).toBeInTheDocument();
    expect(screen.getByText(/Configure altering preprocessing steps/i)).toBeInTheDocument();
  });

  it('displays selected count for multiple files', () => {
    render(<CleanPanel {...defaultProps} selectedCount={3} />);
    expect(screen.getByText(/Applying to the selected 3 files/i)).toBeInTheDocument();
  });

  it('displays selected count for single file', () => {
    render(<CleanPanel {...defaultProps} selectedCount={1} />);
    expect(screen.getByText(/Applying to the selected file/i)).toBeInTheDocument();
  });

  it('displays enabled steps count', () => {
    render(<CleanPanel {...defaultProps} removeDuplicates={true} standardizeDates={true} />);
    expect(screen.getByText(/2 steps selected/i)).toBeInTheDocument();
  });

  it('displays singular step count', () => {
    render(<CleanPanel {...defaultProps} removeDuplicates={true} />);
    expect(screen.getByText(/1 step selected/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles remove duplicates switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    fireEvent.click(switches[0]);
    expect(defaultProps.setRemoveDuplicates).toHaveBeenCalledWith(true);
  });

  it('toggles remove empty rows switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    fireEvent.click(switches[1]);
    expect(defaultProps.setRemoveEmptyRows).toHaveBeenCalledWith(true);
  });

  it('toggles standardize dates switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    fireEvent.click(switches[2]);
    expect(defaultProps.setStandardizeDates).toHaveBeenCalledWith(true);
  });

  it('toggles standardize numeric switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    fireEvent.click(switches[3]);
    expect(defaultProps.setStandardizeNumeric).toHaveBeenCalledWith(true);
  });

  it('changes date format when select is changed', () => {
    render(<CleanPanel {...defaultProps} standardizeDates={true} />);
    const dateSelect = screen.getByDisplayValue('YYYY-MM-DD');
    
    fireEvent.change(dateSelect, { target: { value: 'MM/DD/YYYY' } });
    expect(defaultProps.setSelectedDateFormat).toHaveBeenCalledWith('MM/DD/YYYY');
  });

  it('disables date format select when standardize dates is off', () => {
    render(<CleanPanel {...defaultProps} standardizeDates={false} />);
    const dateSelect = screen.getByDisplayValue('YYYY-MM-DD');
    
    expect(dateSelect).toBeDisabled();
  });

  it('shows hint when standardize dates is disabled', () => {
    render(<CleanPanel {...defaultProps} standardizeDates={false} />);
    expect(screen.getByText(/Turn on to select the output format/i)).toBeInTheDocument();
  });

  it('changes numeric mode when select is changed', () => {
    render(<CleanPanel {...defaultProps} standardizeNumeric={true} />);
    const numericSelect = screen.getByDisplayValue(/Convert to decimal/i);
    
    fireEvent.change(numericSelect, { target: { value: 'int_round' } });
    expect(defaultProps.setNumericMode).toHaveBeenCalledWith('int_round');
  });

  it('disables numeric mode select when standardize numeric is off', () => {
    render(<CleanPanel {...defaultProps} standardizeNumeric={false} />);
    const numericSelect = screen.getByDisplayValue(/Convert to decimal/i);
    
    expect(numericSelect).toBeDisabled();
  });

  it('shows hint when standardize numeric is disabled', () => {
    render(<CleanPanel {...defaultProps} standardizeNumeric={false} />);
    expect(screen.getByText(/Turn on to choose mode and affected columns/i)).toBeInTheDocument();
  });

  it('changes numeric columns text input', () => {
    render(<CleanPanel {...defaultProps} standardizeNumeric={true} />);
    const columnsInput = screen.getByPlaceholderText(/Comma-separated/i);
    
    fireEvent.change(columnsInput, { target: { value: 'age,height' } });
    expect(defaultProps.setNumericColumnsText).toHaveBeenCalledWith('age,height');
  });

  it('disables numeric columns input when standardize numeric is off', () => {
    render(<CleanPanel {...defaultProps} standardizeNumeric={false} />);
    const columnsInput = screen.getByPlaceholderText(/Comma-separated/i);
    
    expect(columnsInput).toBeDisabled();
  });

  it('calls applyClean when apply button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByTitle(/apply cleaning to selected files/i));
    expect(defaultProps.applyClean).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables apply button when selectedCount is 0', () => {
    render(<CleanPanel {...defaultProps} selectedCount={0} />);
    const applyButton = screen.getByTitle(/apply cleaning to selected files/i);
    expect(applyButton).toBeDisabled();
  });

  it('disables all controls when busy is true', () => {
    render(<CleanPanel {...defaultProps} busy={true} />);
    
    const applyButton = screen.getByTitle(/apply cleaning to selected files/i);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const closeButton = screen.getByLabelText(/close/i);
    
    expect(applyButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(closeButton).toBeDisabled();
  });

  it('renders all date format options', () => {
    render(<CleanPanel {...defaultProps} />);
    expect(screen.getByText('YYYY-MM-DD')).toBeInTheDocument();
    expect(screen.getByText('MM/DD/YYYY')).toBeInTheDocument();
  });

  it('renders all numeric mode options', () => {
    render(<CleanPanel {...defaultProps} />);
    expect(screen.getByText(/Convert to decimal \(double\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Convert to integer \(round\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Convert to integer \(truncate\)/i)).toBeInTheDocument();
  });

  it('shows correct labels and descriptions', () => {
    render(<CleanPanel {...defaultProps} />);
    
    expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
    expect(screen.getByText(/Keep only the first occurrence of identical rows/i)).toBeInTheDocument();
    
    expect(screen.getByText('Remove empty rows')).toBeInTheDocument();
    expect(screen.getByText(/Drop rows where every cell is blank/i)).toBeInTheDocument();
    
    expect(screen.getByText('Standardize dates')).toBeInTheDocument();
    expect(screen.getByText(/Convert recognized date columns/i)).toBeInTheDocument();
    
    expect(screen.getByText('Standardize numeric fields')).toBeInTheDocument();
    expect(screen.getByText(/Coerce selected columns into a consistent numeric type/i)).toBeInTheDocument();
  });
});
