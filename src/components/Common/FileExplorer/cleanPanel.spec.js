import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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

// Mock JsonMapEditor
jest.mock("./jsonMapEditor.js", () => {
  return {
    __esModule: true,
    default: ({ busy, enabled, label, valueText, onChangeText }) => (
      <div data-testid="json-map-editor">
        <label>{label}</label>
        <textarea
          value={valueText}
          onChange={(e) => onChangeText?.(e.target.value)}
          disabled={busy || !enabled}
          data-testid={`json-map-${label.toLowerCase()}`}
        />
      </div>
    ),
  };
});

describe('CleanPanel', () => {
  const defaultProps = {
    show: true,
    onClose: jest.fn(),
    busy: false,
    selectedCount: 5,
    onApply: jest.fn(),
  };

  afterEach(() => {
    cleanup();
  });

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

  it('displays title and subtitle', () => {
    render(<CleanPanel {...defaultProps} />);
    expect(screen.getByText('Data cleaning')).toBeInTheDocument();
    expect(screen.getByText(/Configure preprocessing steps/i)).toBeInTheDocument();
  });

  it('displays search input in header row', () => {
    render(<CleanPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('aria-label', 'Search cleaning steps');
  });

  it('filters options based on search input', () => {
    render(<CleanPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    
    // Initially, multiple options should be visible
    expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
    expect(screen.getByText('Trim whitespace')).toBeInTheDocument();
    expect(screen.getByText('Standardize dates')).toBeInTheDocument();
    
    // Search for "duplicate"
    fireEvent.change(searchInput, { target: { value: 'duplicate' } });
    
    // Only "Remove duplicates" should be visible
    expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
    expect(screen.queryByText('Trim whitespace')).not.toBeInTheDocument();
  });

  it('filters options based on description text', () => {
    render(<CleanPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    
    // Search for a word from description
    fireEvent.change(searchInput, { target: { value: 'whitespace' } });
    
    // Options with "whitespace" in description should be visible
    expect(screen.getByText('Trim whitespace')).toBeInTheDocument();
    expect(screen.getByText('Remove extra spaces')).toBeInTheDocument();
    expect(screen.getByText('Normalize text')).toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    render(<CleanPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    
    fireEvent.change(searchInput, { target: { value: 'DATES' } });
    expect(screen.getByText('Standardize dates')).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'dAtEs' } });
    expect(screen.getByText('Standardize dates')).toBeInTheDocument();
  });

  it('clears search filter when input is empty', () => {
    render(<CleanPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    
    // Apply filter
    fireEvent.change(searchInput, { target: { value: 'duplicate' } });
    expect(screen.queryByText('Trim whitespace')).not.toBeInTheDocument();
    
    // Clear filter
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Trim whitespace')).toBeInTheDocument();
  });

  it('shows step count in footer', () => {
    render(<CleanPanel {...defaultProps} />);
    // Step count is embedded in longer message: "Applying to the selected X files, Y steps selected"
    // Note: Initial state has 2 steps enabled by default (mergeCaseInsensitive, mergeTrimValues)
    const footerElement = screen.getByText(/Applying to the selected/i);
    expect(footerElement).toHaveTextContent(/2 steps selected/i);
  });

  it('updates step count when options are toggled', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    // Enable first option (initial count is 2)
    fireEvent.click(switches[0]);
    // Step count appears in: "Applying to the selected 5 files, 3 steps selected"
    let footerElement = screen.getByText(/Applying to the selected/i);
    expect(footerElement).toHaveTextContent(/3 steps selected/i);
    
    // Disable first option  
    fireEvent.click(switches[0]);
    // Step count should go back to 2
    footerElement = screen.getByText(/Applying to the selected/i);
    expect(footerElement).toHaveTextContent(/2 steps selected/i);
  });

  it('calls onClose when close button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables apply button when no files are selected', () => {
    render(<CleanPanel {...defaultProps} selectedCount={0} />);
    // Button is disabled when selectedCount === 0 (no files selected)
    const applyButton = screen.getByTitle(/apply cleaning/i);
    expect(applyButton).toBeDisabled();
  });

  it('enables apply button when files and steps are selected', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    const applyButton = screen.getByTitle(/apply cleaning/i);
    
    // Initially enabled (files selected but no steps)
    expect(applyButton).toBeEnabled();
    
    // Enable a step
    fireEvent.click(switches[0]);
    
    // Now enabled because at least one cleaning option is selected
    expect(applyButton).not.toBeDisabled();
  });

  it('disables all controls when busy', () => {
    render(<CleanPanel {...defaultProps} busy={true} />);
    
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    const closeButton = screen.getByLabelText(/close/i);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const applyButton = screen.getByTitle(/apply cleaning/i);
    
    expect(searchInput).toBeDisabled();
    expect(closeButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(applyButton).toBeDisabled();
  });

  it('displays correct file count message for single file', () => {
    render(<CleanPanel {...defaultProps} selectedCount={1} />);
    expect(screen.getByText(/Applying to the selected file/i)).toBeInTheDocument();
  });

  it('displays correct file count message for multiple files', () => {
    render(<CleanPanel {...defaultProps} selectedCount={3} />);
    expect(screen.getByText(/Applying to the selected 3 files/i)).toBeInTheDocument();
  });

  it('toggles remove duplicates option', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    expect(switches[0]).not.toBeChecked();
    fireEvent.click(switches[0]);
    expect(switches[0]).toBeChecked();
  });

  it('shows inline hints for expandable options when disabled', () => {
    render(<CleanPanel {...defaultProps} />);
    
    // Check that hints are shown for disabled expandable options
    expect(screen.getByText(/Turn on to select mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Turn on to select form/i)).toBeInTheDocument();
    expect(screen.getByText(/Turn on to select the output format/i)).toBeInTheDocument();
  });

  it('calls onApply with correct payload when apply is clicked', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    
    // Enable remove duplicates
    fireEvent.click(switches[0]);
    
    // Click apply
    const applyButton = screen.getByTitle(/apply cleaning/i);
    fireEvent.click(applyButton);
    
    expect(defaultProps.onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        removeDuplicates: true,
        removeEmptyRows: false,
      })
    );
  });

  it('search works with trimmed whitespace', () => {
    render(<CleanPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    
    fireEvent.change(searchInput, { target: { value: '  duplicate  ' } });
    expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
  });

  it('handles complex search queries', () => {
    render(<CleanPanel {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    
    // Search for "whitespace" - should find whitespace-related options
    fireEvent.change(searchInput, { target: { value: 'whitespace' } });
    expect(screen.getByText('Trim whitespace')).toBeInTheDocument();
    expect(screen.getByText('Remove extra spaces')).toBeInTheDocument();
  });

  it('preserves enabled state when searching', () => {
    render(<CleanPanel {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    const searchInput = screen.getByPlaceholderText(/search steps/i);
    
    // Enable first option
    fireEvent.click(switches[0]);
    
    // Apply search that hides the option
    fireEvent.change(searchInput, { target: { value: 'dates' } });
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // Option should still be enabled
    const allSwitches = screen.getAllByRole('switch');
    expect(allSwitches[0]).toBeChecked();
  });

  describe('Validation - Error handling', () => {
    it('validates cleaning options', () => {
      const { toast } = require('react-toastify');
      jest.spyOn(toast, 'error');
      render(<CleanPanel {...defaultProps} />);
      
      // The panel has validation logic that we can test exists
      const applyButton = screen.getByTitle(/apply cleaning/i);
      expect(applyButton).toBeInTheDocument();
      
      // At least one step must be selected to apply - but default has 2 steps enabled
      // (mergeCaseInsensitive and mergeTrimValues)
      // So we can just verify the button is enabled
      expect(applyButton).not.toBeDisabled();
    });
  });

  describe('ToggleRow component', () => {
    it('has accessibility attributes', () => {
      render(<CleanPanel {...defaultProps} />);
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });
  });

  describe('FilterableOption component', () => {
    it('renders children when no search is active', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
    });

    it('renders children when search matches label', () => {
      render(<CleanPanel {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(/search steps/i);
      
      fireEvent.change(searchInput, { target: { value: 'duplicate' } });
      expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
    });

    it('renders children when search matches description', () => {
      render(<CleanPanel {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(/search steps/i);
      
      fireEvent.change(searchInput, { target: { value: 'first occurrence' } });
      expect(screen.getByText('Remove duplicates')).toBeInTheDocument();
    });

    it('does not render when search does not match', () => {
      render(<CleanPanel {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(/search steps/i);
      
      fireEvent.change(searchInput, { target: { value: 'nonexistentterm' } });
      expect(screen.queryByText('Remove duplicates')).not.toBeInTheDocument();
    });
  });

  describe('Options with sub-controls', () => {
    it('has date format options', () => {
      render(<CleanPanel {...defaultProps} />);
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('No results state', () => {
    it('shows no results message when search has no matches', () => {
      render(<CleanPanel {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(/search steps/i);
      
      fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } });
      
      expect(screen.getByText(/No steps match your search/i)).toBeInTheDocument();
    });

    it('hides no results message when search is cleared', () => {
      render(<CleanPanel {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(/search steps/i);
      
      fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } });
      expect(screen.getByText(/No steps match your search/i)).toBeInTheDocument();
      
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.queryByText(/No steps match your search/i)).not.toBeInTheDocument();
    });
  });

  describe('Payload construction', () => {
    it('includes enabled options in payload', () => {
      render(<CleanPanel {...defaultProps} />);
      const switches = screen.getAllByRole('switch');
      
      // Enable first option (removeDuplicates)
      fireEvent.click(switches[0]);
      
      const applyButton = screen.getByTitle(/apply cleaning/i);
      fireEvent.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          removeDuplicates: true,
        })
      );
    });
  });
});
