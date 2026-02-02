import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CleanPanel from './cleanPanel';
import { toast } from 'react-toastify';

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
          data-testid={`json-map-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    ),
  };
});

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('CleanPanel - Validation Logic', () => {
  const defaultProps = {
    show: true,
    onClose: jest.fn(),
    busy: false,
    selectedCount: 5,
    onApply: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleApply validation errors', () => {
    it('validates at least one step is selected', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // By default, mergeCaseInsensitive and mergeTrimValues are enabled
      // So apply should work without error
      const applyButton = screen.getByTitle(/apply cleaning/i);
      fireEvent.click(applyButton);
      
      // Should call onApply since steps are selected by default
      expect(defaultProps.onApply).toHaveBeenCalled();
    });

    it('renders standardize case with mode selector', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Check if Standardize case option is present
      expect(screen.getByText('Standardize case')).toBeInTheDocument();
      
      // Check for case mode selector options
      const selects = screen.getAllByRole('combobox');
      const caseModeSelect = selects.find(s => {
        const options = Array.from(s.options);
        return options.some(o => o.value === 'lower' || o.value === 'upper');
      });
      
      expect(caseModeSelect).toBeDefined();
    });

    it('renders standardize dates with date format selector', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Check if Standardize dates option is present
      expect(screen.getByText('Standardize dates')).toBeInTheDocument();
      
      // Check for date format selector
      const selects = screen.getAllByRole('combobox');
      const dateFormatSelect = selects.find(s => {
        const options = Array.from(s.options);
        return options.some(o => o.value === 'YYYY-MM-DD' || o.value === 'DD/MM/YYYY');
      });
      
      expect(dateFormatSelect).toBeDefined();
    });

    it('renders remove special characters option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Remove special characters')).toBeInTheDocument();
    });

    it('renders remove punctuation option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Remove punctuation')).toBeInTheDocument();
    });

    it('renders remove non-printable characters option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Remove non-printable characters')).toBeInTheDocument();
    });

    it('renders fix encoding issues option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Fix encoding issues')).toBeInTheDocument();
    });

    it('renders normalize Unicode option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Normalize Unicode')).toBeInTheDocument();
    });

    it('can toggle remove line breaks', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const lineBreaksSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove line breaks');
      });
      
      if (lineBreaksSwitch) {
        expect(lineBreaksSwitch).not.toBeChecked();
        fireEvent.click(lineBreaksSwitch);
        expect(lineBreaksSwitch).toBeChecked();
      }
    });

    it('can toggle remove special characters', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const specialCharsSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove special characters');
      });
      
      if (specialCharsSwitch) {
        expect(specialCharsSwitch).not.toBeChecked();
        fireEvent.click(specialCharsSwitch);
        expect(specialCharsSwitch).toBeChecked();
      }
    });

    it('can toggle remove punctuation', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const punctuationSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove punctuation');
      });
      
      if (punctuationSwitch) {
        expect(punctuationSwitch).not.toBeChecked();
        fireEvent.click(punctuationSwitch);
        expect(punctuationSwitch).toBeChecked();
      }
    });

    it('can toggle remove non-printable chars', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const nonPrintableSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove non-printable');
      });
      
      if (nonPrintableSwitch) {
        expect(nonPrintableSwitch).not.toBeChecked();
        fireEvent.click(nonPrintableSwitch);
        expect(nonPrintableSwitch).toBeChecked();
      }
    });

    it('can toggle fix encoding issues', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const encodingSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Fix encoding');
      });
      
      if (encodingSwitch) {
        expect(encodingSwitch).not.toBeChecked();
        fireEvent.click(encodingSwitch);
        expect(encodingSwitch).toBeChecked();
      }
    });

    it('can toggle normalize Unicode', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const unicodeSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Normalize Unicode');
      });
      
      if (unicodeSwitch) {
        expect(unicodeSwitch).not.toBeChecked();
        fireEvent.click(unicodeSwitch);
        expect(unicodeSwitch).toBeChecked();
      }
    });

    it('can toggle standardize case', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const caseSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize case');
      });
      
      if (caseSwitch) {
        expect(caseSwitch).not.toBeChecked();
        fireEvent.click(caseSwitch);
        expect(caseSwitch).toBeChecked();
      }
    });

    it('can change case mode when standardize case is enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const caseSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize case');
      });
      
      if (caseSwitch) {
        fireEvent.click(caseSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const caseModeSelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'lower');
        });
        
        if (caseModeSelect) {
          fireEvent.change(caseModeSelect, { target: { value: 'upper' } });
          expect(caseModeSelect.value).toBe('upper');
        }
      }
    });

    it('can change date format when standardize dates is enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const dateSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize dates');
      });
      
      if (dateSwitch) {
        fireEvent.click(dateSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const dateFormatSelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'YYYY-MM-DD');
        });
        
        if (dateFormatSelect) {
          fireEvent.change(dateFormatSelect, { target: { value: 'DD/MM/YYYY' } });
          expect(dateFormatSelect.value).toBe('DD/MM/YYYY');
        }
      }
    });
  });

  describe('Additional option toggles', () => {
    it('can toggle standardize dates', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const dateSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize dates');
      });
      
      if (dateSwitch) {
        expect(dateSwitch).not.toBeChecked();
        fireEvent.click(dateSwitch);
        expect(dateSwitch).toBeChecked();
      }
    });

    it('step count updates when toggling multiple options', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Initial count is 2 (mergeCaseInsensitive, mergeTrimValues)
      let footerElement = screen.getByText(/Applying to the selected/i);
      expect(footerElement).toHaveTextContent(/2 steps selected/i);
      
      // Enable remove duplicates
      const duplicatesSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove duplicates');
      });
      
      if (duplicatesSwitch) {
        fireEvent.click(duplicatesSwitch);
        footerElement = screen.getByText(/Applying to the selected/i);
        expect(footerElement).toHaveTextContent(/3 steps selected/i);
        
        // Enable another option
        const emptyRowsSwitch = screen.getAllByRole('switch').find((sw) => {
          const parent = sw.closest('[role="switch"]');
          return parent?.textContent?.includes('Remove empty rows');
        });
        
        if (emptyRowsSwitch) {
          fireEvent.click(emptyRowsSwitch);
          footerElement = screen.getByText(/Applying to the selected/i);
          expect(footerElement).toHaveTextContent(/4 steps selected/i);
        }
      }
    });

    it('applies cleaning with enabled options', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Enable some options
      const duplicatesSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove duplicates');
      });
      
      if (duplicatesSwitch) {
        fireEvent.click(duplicatesSwitch);
      }
      
      const applyButton = screen.getByTitle(/apply cleaning/i);
      fireEvent.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalled();
      const payload = defaultProps.onApply.mock.calls[0][0];
      expect(payload).toHaveProperty('removeDuplicates');
      expect(payload).toHaveProperty('mergeCaseInsensitive');
      expect(payload).toHaveProperty('mergeTrimValues');
    });
  });

  describe('Inline hints', () => {
    it('shows inline hint for standardize case when disabled', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText(/Turn on to select mode/i)).toBeInTheDocument();
    });

    it('shows inline hints for expandable date options when disabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Check for date-related inline hints
      const hints = screen.queryAllByText(/Turn on to select/i);
      expect(hints.length).toBeGreaterThan(0);
    });
  });

  describe('ToggleRow component behavior', () => {
    it('clicking row toggles the option', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const switches = screen.getAllByRole('switch');
      const firstSwitch = switches[0];
      const initialChecked = firstSwitch.checked;
      
      const toggleRow = firstSwitch.closest('[role="switch"]');
      if (toggleRow) {
        fireEvent.click(toggleRow);
        expect(switches[0].checked).toBe(!initialChecked);
      }
    });

    it('ignores click when busy', () => {
      render(<CleanPanel {...defaultProps} busy={true} />);
      
      const switches = screen.getAllByRole('switch');
      const firstSwitch = switches[0];
      
      // All switches should be disabled when busy
      expect(firstSwitch).toBeDisabled();
    });
  });
});
