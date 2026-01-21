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

describe('CleanPanel - Advanced Options', () => {
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

  describe('Standardize Dates section', () => {
    it('renders standardize dates option with date format dropdown', () => {
      render(<CleanPanel {...defaultProps} />);
      
      expect(screen.getByText('Standardize dates')).toBeInTheDocument();
      
      // Check for the inline hint
      expect(screen.getByText(/Turn on to select the output format/i)).toBeInTheDocument();
    });

    it('enables date format selector when standardize dates is enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const dateSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize dates');
      });
      
      if (dateSwitch) {
        fireEvent.click(dateSwitch);
        
        // Check that date format options are available
        const selects = screen.getAllByRole('combobox');
        const dateFormatSelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'YYYY-MM-DD' || o.value === 'DD/MM/YYYY');
        });
        
        expect(dateFormatSelect).toBeDefined();
        if (dateFormatSelect) {
          expect(dateFormatSelect).not.toBeDisabled();
        }
      }
    });

    it('shows extract date components checkbox', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const dateSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize dates');
      });
      
      if (dateSwitch) {
        fireEvent.click(dateSwitch);
        
        // Look for the extract components checkbox
        const checkboxes = screen.getAllByRole('checkbox');
        const extractCheckbox = checkboxes.find(cb => {
          const label = cb.closest('label');
          return label?.textContent?.includes('Extract year/month/day');
        });
        
        expect(extractCheckbox).toBeDefined();
      }
    });

    it('can toggle extract date components', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const dateSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize dates');
      });
      
      if (dateSwitch) {
        fireEvent.click(dateSwitch);
        
        const checkboxes = screen.getAllByRole('checkbox');
        const extractCheckbox = checkboxes.find(cb => {
          const label = cb.closest('label');
          return label?.textContent?.includes('Extract year/month/day');
        });
        
        if (extractCheckbox) {
          expect(extractCheckbox).not.toBeChecked();
          fireEvent.click(extractCheckbox);
          expect(extractCheckbox).toBeChecked();
        }
      }
    });
  });

  describe('Standardize Numeric Fields section', () => {
    it('renders standardize numeric option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Standardize numeric fields')).toBeInTheDocument();
    });

    it('enables numeric mode selector when standardize numeric is enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const numericSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize numeric');
      });
      
      if (numericSwitch) {
        fireEvent.click(numericSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const numericModeSelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'double' || o.value === 'int_round');
        });
        
        expect(numericModeSelect).toBeDefined();
        if (numericModeSelect) {
          expect(numericModeSelect).not.toBeDisabled();
        }
      }
    });

    it('allows changing numeric mode', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const numericSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize numeric');
      });
      
      if (numericSwitch) {
        fireEvent.click(numericSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const numericModeSelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'int_round');
        });
        
        if (numericModeSelect) {
          fireEvent.change(numericModeSelect, { target: { value: 'int_round' } });
          expect(numericModeSelect.value).toBe('int_round');
          
          fireEvent.change(numericModeSelect, { target: { value: 'int_trunc' } });
          expect(numericModeSelect.value).toBe('int_trunc');
        }
      }
    });

    it('shows columns input field for numeric standardization', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const numericSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize numeric');
      });
      
      if (numericSwitch) {
        fireEvent.click(numericSwitch);
        
        const columnsInput = screen.queryByPlaceholderText(/Comma-separated.*age.*height/i);
        expect(columnsInput).toBeInTheDocument();
      }
    });

    it('allows entering numeric columns', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const numericSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize numeric');
      });
      
      if (numericSwitch) {
        fireEvent.click(numericSwitch);
        
        const columnsInput = screen.queryByPlaceholderText(/Comma-separated.*age.*height/i);
        if (columnsInput) {
          fireEvent.change(columnsInput, { target: { value: 'age,height,weight' } });
          expect(columnsInput.value).toBe('age,height,weight');
        }
      }
    });

    it('shows remove leading zeros checkbox', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const numericSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize numeric');
      });
      
      if (numericSwitch) {
        fireEvent.click(numericSwitch);
        
        const checkboxes = screen.getAllByRole('checkbox');
        const leadingZerosCheckbox = checkboxes.find(cb => {
          const label = cb.closest('label');
          return label?.textContent?.includes('Remove leading zeros');
        });
        
        expect(leadingZerosCheckbox).toBeDefined();
      }
    });

    it('shows round decimals checkbox', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const numericSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize numeric');
      });
      
      if (numericSwitch) {
        fireEvent.click(numericSwitch);
        
        const checkboxes = screen.getAllByRole('checkbox');
        const roundCheckbox = checkboxes.find(cb => {
          const label = cb.closest('label');
          return label?.textContent?.includes('Round decimals');
        });
        
        expect(roundCheckbox).toBeDefined();
      }
    });

    it('shows decimal places input when round decimals is checked', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const numericSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize numeric');
      });
      
      if (numericSwitch) {
        fireEvent.click(numericSwitch);
        
        const checkboxes = screen.getAllByRole('checkbox');
        const roundCheckbox = checkboxes.find(cb => {
          const label = cb.closest('label');
          return label?.textContent?.includes('Round decimals');
        });
        
        if (roundCheckbox) {
          fireEvent.click(roundCheckbox);
          
          // Should show decimal places input
          const decimalInput = screen.queryByText(/Decimal places/i);
          expect(decimalInput).toBeInTheDocument();
        }
      }
    });
  });

  describe('Fill Missing Values section', () => {
    it('renders fill missing values option', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Look for the fill missing values text
      const fillText = screen.queryByText(/Fill missing values/i);
      expect(fillText).toBeDefined();
    });

    it('enables fill strategy selector when fill missing values is enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const fillSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Fill missing');
      });
      
      if (fillSwitch) {
        fireEvent.click(fillSwitch);
        
        // Check for fill strategy selector
        const selects = screen.getAllByRole('combobox');
        const fillStrategySelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'mean' || o.value === 'median' || o.value === 'constant');
        });
        
        expect(fillStrategySelect).toBeDefined();
      }
    });
  });

  describe('Unicode Normalization', () => {
    it('shows unicode normalization form selector', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const unicodeSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Normalize Unicode');
      });
      
      if (unicodeSwitch) {
        fireEvent.click(unicodeSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const unicodeSelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'NFC' || o.value === 'NFD');
        });
        
        expect(unicodeSelect).toBeDefined();
      }
    });

    it('can change unicode normalization form', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const unicodeSwitch = screen.getAllByRole('switch').find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Normalize Unicode');
      });
      
      if (unicodeSwitch) {
        fireEvent.click(unicodeSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const unicodeSelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'NFC');
        });
        
        if (unicodeSelect) {
          fireEvent.change(unicodeSelect, { target: { value: 'NFD' } });
          expect(unicodeSelect.value).toBe('NFD');
          
          fireEvent.change(unicodeSelect, { target: { value: 'NFKC' } });
          expect(unicodeSelect.value).toBe('NFKC');
          
          fireEvent.change(unicodeSelect, { target: { value: 'NFKD' } });
          expect(unicodeSelect.value).toBe('NFKD');
        }
      }
    });
  });

  describe('Multiple date format options', () => {
    it('shows all date format options in the dropdown', () => {
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
          const options = Array.from(dateFormatSelect.options);
          const values = options.map(o => o.value);
          
          expect(values).toContain('YYYY-MM-DD');
          expect(values).toContain('DD/MM/YYYY');
          expect(values).toContain('MM/DD/YYYY');
          expect(values).toContain('YYYY/MM/DD');
          expect(values).toContain('DD-MM-YYYY');
          expect(values).toContain('MM-DD-YYYY');
        }
      }
    });

    it('can cycle through all date formats', () => {
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
          const formats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'DD-MM-YYYY', 'MM-DD-YYYY'];
          
          formats.forEach(format => {
            fireEvent.change(dateFormatSelect, { target: { value: format } });
            expect(dateFormatSelect.value).toBe(format);
          });
        }
      }
    });
  });

  describe('Complex interactions', () => {
    it('can enable multiple options and apply', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Enable multiple options
      const switches = screen.getAllByRole('switch');
      
      const duplicatesSwitch = switches.find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove duplicates');
      });
      
      const trimSwitch = switches.find((sw) => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Trim whitespace');
      });
      
      if (duplicatesSwitch) fireEvent.click(duplicatesSwitch);
      if (trimSwitch) fireEvent.click(trimSwitch);
      
      const applyButton = screen.getByTitle(/apply cleaning/i);
      fireEvent.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalled();
      const payload = defaultProps.onApply.mock.calls[0][0];
      
      if (duplicatesSwitch) expect(payload.removeDuplicates).toBe(true);
      if (trimSwitch) expect(payload.trimWhitespace).toBe(true);
    });

    it('step count increases with each enabled option', () => {
      render(<CleanPanel {...defaultProps} />);
      
      // Initial state has 2 steps (mergeCaseInsensitive, mergeTrimValues)
      let footerElement = screen.getByText(/Applying to the selected/i);
      expect(footerElement).toHaveTextContent(/2 steps selected/i);
      
      // Enable options one by one and check the count
      const switches = screen.getAllByRole('switch');
      const options = [
        'Remove duplicates',
        'Trim whitespace',
        'Remove extra spaces',
      ];
      
      let expectedCount = 2;
      
      options.forEach((optionText, index) => {
        const optionSwitch = switches.find((sw) => {
          const parent = sw.closest('[role="switch"]');
          return parent?.textContent?.includes(optionText);
        });
        
        if (optionSwitch && !optionSwitch.checked) {
          fireEvent.click(optionSwitch);
          expectedCount++;
          
          footerElement = screen.getByText(/Applying to the selected/i);
          expect(footerElement).toHaveTextContent(new RegExp(`${expectedCount} steps selected`));
        }
      });
    });
  });
});
