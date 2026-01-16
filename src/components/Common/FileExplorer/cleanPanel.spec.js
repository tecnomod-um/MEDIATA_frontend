import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CleanPanel from './cleanPanel';

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

  it('displays selected count', () => {
    render(<CleanPanel {...defaultProps} selectedCount={3} />);
    expect(screen.getByText(/applies to/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking overlay background', () => {
    render(<CleanPanel {...defaultProps} />);
    const overlay = screen.getByRole('presentation');
    fireEvent.mouseDown(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking panel content', () => {
    render(<CleanPanel {...defaultProps} />);
    const panel = screen.getByRole('dialog');
    fireEvent.mouseDown(panel);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('toggles remove duplicates switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    // Remove duplicates is the first switch
    fireEvent.click(switches[0]);
    expect(defaultProps.setRemoveDuplicates).toHaveBeenCalledWith(true);
  });

  it('toggles remove empty rows switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    // Remove empty rows is the second switch
    fireEvent.click(switches[1]);
    expect(defaultProps.setRemoveEmptyRows).toHaveBeenCalledWith(true);
  });

  it('toggles standardize dates switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    // Standardize dates is the third switch
    fireEvent.click(switches[2]);
    expect(defaultProps.setStandardizeDates).toHaveBeenCalledWith(true);
  });

  it('toggles standardize numeric switch', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    // Standardize numeric is the fourth switch
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

  it('changes numeric mode when select is changed', () => {
    render(<CleanPanel {...defaultProps} standardizeNumeric={true} />);
    const numericSelect = screen.getByDisplayValue(/convert to double/i);
    
    fireEvent.change(numericSelect, { target: { value: 'int_round' } });
    expect(defaultProps.setNumericMode).toHaveBeenCalledWith('int_round');
  });

  it('disables numeric mode select when standardize numeric is off', () => {
    render(<CleanPanel {...defaultProps} standardizeNumeric={false} />);
    const numericSelect = screen.getByDisplayValue(/convert to double/i);
    
    expect(numericSelect).toBeDisabled();
  });

  it('calls applyClean when apply button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByTitle(/apply cleaning to selected files/i));
    expect(defaultProps.applyClean).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/cancel/i));
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
    const cancelButton = screen.getByText(/cancel/i);
    const closeButton = screen.getByLabelText(/close/i);
    
    expect(applyButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(closeButton).toBeDisabled();
  });

  it('does not close overlay when busy and clicking background', () => {
    render(<CleanPanel {...defaultProps} busy={true} />);
    const overlay = screen.getByRole('presentation');
    fireEvent.mouseDown(overlay);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('renders all date format options', () => {
    render(<CleanPanel {...defaultProps} />);
    expect(screen.getByText('YYYY-MM-DD')).toBeInTheDocument();
    expect(screen.getByText('MM/DD/YYYY')).toBeInTheDocument();
  });

  it('renders all numeric mode options', () => {
    render(<CleanPanel {...defaultProps} />);
    expect(screen.getByText(/convert to double/i)).toBeInTheDocument();
    expect(screen.getByText(/convert to integer \(round\)/i)).toBeInTheDocument();
    expect(screen.getByText(/convert to integer \(truncate\)/i)).toBeInTheDocument();
  });

  it('shows correct labels and descriptions', () => {
    render(<CleanPanel {...defaultProps} />);
    
    expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
    expect(screen.getByText('Drops duplicate rows.')).toBeInTheDocument();
    
    expect(screen.getByText('Remove empty rows')).toBeInTheDocument();
    expect(screen.getByText('Removes rows where all values are empty.')).toBeInTheDocument();
    
    expect(screen.getByText('Standardize dates')).toBeInTheDocument();
    expect(screen.getByText('Normalize date fields to a chosen output format.')).toBeInTheDocument();
    
    expect(screen.getByText('Standardize numeric fields')).toBeInTheDocument();
    expect(screen.getByText('Convert numeric columns to a consistent type.')).toBeInTheDocument();
  });
});
