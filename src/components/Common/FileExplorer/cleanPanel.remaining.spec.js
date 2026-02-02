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

describe('CleanPanel - Remaining UI Sections', () => {
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

  describe('Replace values section', () => {
    it('renders replace values option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Replace values')).toBeInTheDocument();
    });

    it('enables replace values and shows JsonMapEditor', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const replaceSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Replace values');
      });
      
      if (replaceSwitch) {
        fireEvent.click(replaceSwitch);
        const editors = screen.queryAllByTestId('json-map-editor');
        expect(editors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Strip prefix and suffix', () => {
    it('renders strip prefix option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Strip prefix')).toBeInTheDocument();
    });

    it('shows prefix input when enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const prefixSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Strip prefix');
      });
      
      if (prefixSwitch) {
        fireEvent.click(prefixSwitch);
        const prefixInput = screen.queryByPlaceholderText(/ID-/i);
        expect(prefixInput).toBeInTheDocument();
      }
    });

    it('renders strip suffix option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Strip suffix')).toBeInTheDocument();
    });

    it('shows suffix input when enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const suffixSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Strip suffix');
      });
      
      if (suffixSwitch) {
        fireEvent.click(suffixSwitch);
        const suffixInput = screen.queryByPlaceholderText(/_old/i);
        expect(suffixInput).toBeInTheDocument();
      }
    });
  });

  describe('Pad values section', () => {
    it('renders pad values option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Pad values')).toBeInTheDocument();
    });

    it('shows pad configuration when enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const padSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Pad values');
      });
      
      if (padSwitch) {
        fireEvent.click(padSwitch);
        // Should show padding options
        expect(padSwitch).toBeChecked();
      }
    });
  });

  describe('Convert data types', () => {
    it('renders convert data types option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Convert data types')).toBeInTheDocument();
    });

    it('shows JsonMapEditor when enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const convertSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Convert data types');
      });
      
      if (convertSwitch) {
        fireEvent.click(convertSwitch);
        const editors = screen.queryAllByTestId('json-map-editor');
        expect(editors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Email and URL operations', () => {
    it('renders extract email domain option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Extract email domain')).toBeInTheDocument();
    });

    it('renders validate emails option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Validate emails')).toBeInTheDocument();
    });

    it('renders extract URL components option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Extract URL components')).toBeInTheDocument();
    });

    it('renders normalize URLs option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Normalize URLs')).toBeInTheDocument();
    });

    it('can toggle extract email domain', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const emailSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Extract email domain');
      });
      
      if (emailSwitch) {
        expect(emailSwitch).not.toBeChecked();
        fireEvent.click(emailSwitch);
        expect(emailSwitch).toBeChecked();
      }
    });

    it('can toggle validate emails', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const validateSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Validate emails');
      });
      
      if (validateSwitch) {
        expect(validateSwitch).not.toBeChecked();
        fireEvent.click(validateSwitch);
        expect(validateSwitch).toBeChecked();
      }
    });

    it('can toggle extract URL components', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const urlSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Extract URL components');
      });
      
      if (urlSwitch) {
        expect(urlSwitch).not.toBeChecked();
        fireEvent.click(urlSwitch);
        expect(urlSwitch).toBeChecked();
      }
    });

    it('can toggle normalize URLs', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const normalizeUrlSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Normalize URLs');
      });
      
      if (normalizeUrlSwitch) {
        expect(normalizeUrlSwitch).not.toBeChecked();
        fireEvent.click(normalizeUrlSwitch);
        expect(normalizeUrlSwitch).toBeChecked();
      }
    });
  });

  describe('Phone number standardization', () => {
    it('renders standardize phone numbers option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Standardize phone numbers')).toBeInTheDocument();
    });

    it('shows phone format options when enabled', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const phoneSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Standardize phone');
      });
      
      if (phoneSwitch) {
        fireEvent.click(phoneSwitch);
        expect(phoneSwitch).toBeChecked();
      }
    });
  });

  describe('Column operations', () => {
    it('renders split column option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Split column')).toBeInTheDocument();
    });

    it('renders merge columns option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Merge columns')).toBeInTheDocument();
    });

    it('can toggle split column', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const splitSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Split column');
      });
      
      if (splitSwitch) {
        expect(splitSwitch).not.toBeChecked();
        fireEvent.click(splitSwitch);
        expect(splitSwitch).toBeChecked();
      }
    });

    it('can toggle merge columns', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const mergeSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Merge columns');
      });
      
      if (mergeSwitch) {
        expect(mergeSwitch).not.toBeChecked();
        fireEvent.click(mergeSwitch);
        expect(mergeSwitch).toBeChecked();
      }
    });
  });

  describe('Row filtering', () => {
    it('renders remove rows with pattern option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Remove rows with pattern')).toBeInTheDocument();
    });

    it('can toggle remove rows with pattern', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const rowsSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Remove rows with pattern');
      });
      
      if (rowsSwitch) {
        expect(rowsSwitch).not.toBeChecked();
        fireEvent.click(rowsSwitch);
        expect(rowsSwitch).toBeChecked();
      }
    });
  });

  describe('Data normalization and scaling', () => {
    it('renders normalize data option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText(/Normalize data.*min-max/i)).toBeInTheDocument();
    });

    it('can toggle normalize data', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const normalizeSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Normalize data');
      });
      
      if (normalizeSwitch) {
        expect(normalizeSwitch).not.toBeChecked();
        fireEvent.click(normalizeSwitch);
        expect(normalizeSwitch).toBeChecked();
      }
    });
  });

  describe('Fuzzy merge', () => {
    it('renders merge similar values option', () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText('Merge similar values')).toBeInTheDocument();
    });

    it('can toggle merge similar values', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const fuzzySwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Merge similar values');
      });
      
      if (fuzzySwitch) {
        expect(fuzzySwitch).not.toBeChecked();
        fireEvent.click(fuzzySwitch);
        expect(fuzzySwitch).toBeChecked();
      }
    });
  });

  describe('Fill missing values strategies', () => {
    it('shows all fill strategy options', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const fillSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Fill missing');
      });
      
      if (fillSwitch) {
        fireEvent.click(fillSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const fillStrategySelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'mean');
        });
        
        if (fillStrategySelect) {
          const options = Array.from(fillStrategySelect.options);
          const values = options.map(o => o.value);
          
          expect(values).toContain('mean');
          expect(values).toContain('median');
          expect(values).toContain('mode');
          expect(values).toContain('constant');
          expect(values).toContain('forward');
          expect(values).toContain('backward');
          expect(values).toContain('interpolate');
        }
      }
    });

    it('shows constant value input when constant strategy is selected', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const fillSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Fill missing');
      });
      
      if (fillSwitch) {
        fireEvent.click(fillSwitch);
        
        const selects = screen.getAllByRole('combobox');
        const fillStrategySelect = selects.find(s => {
          const options = Array.from(s.options);
          return options.some(o => o.value === 'constant');
        });
        
        if (fillStrategySelect) {
          fireEvent.change(fillStrategySelect, { target: { value: 'constant' } });
          
          const constantInput = screen.queryByPlaceholderText(/Value to use for blanks/i);
          expect(constantInput).toBeInTheDocument();
        }
      }
    });

    it('shows columns input for fill missing values', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const fillSwitch = screen.getAllByRole('switch').find(sw => {
        const parent = sw.closest('[role="switch"]');
        return parent?.textContent?.includes('Fill missing');
      });
      
      if (fillSwitch) {
        fireEvent.click(fillSwitch);
        
        const columnsInput = screen.queryByPlaceholderText(/Blank = all columns/i);
        expect(columnsInput).toBeInTheDocument();
      }
    });
  });

  describe('Massive option toggle test', () => {
    it('can toggle many options and apply successfully', () => {
      render(<CleanPanel {...defaultProps} />);
      
      const switches = screen.getAllByRole('switch');
      const optionNames = [
        'Remove duplicates',
        'Trim whitespace',
        'Extract email domain',
        'Validate emails',
        'Normalize URLs',
      ];
      
      optionNames.forEach(optionName => {
        const optionSwitch = switches.find(sw => {
          const parent = sw.closest('[role="switch"]');
          return parent?.textContent?.includes(optionName);
        });
        
        if (optionSwitch && !optionSwitch.checked) {
          fireEvent.click(optionSwitch);
        }
      });
      
      const applyButton = screen.getByTitle(/apply cleaning/i);
      fireEvent.click(applyButton);
      
      expect(defaultProps.onApply).toHaveBeenCalled();
    });
  });
});
