import React from 'react';
import { render, fireEvent, screen, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColumnMapping from './columnMapping.js';

const makeDataTransfer = payload => ({
  getData: key => (key === 'column' ? JSON.stringify(payload) : ''),
  setData: jest.fn(),
  dropEffect: 'move',
  effectAllowed: 'all',
  files: [],
  items: [],
  types: ['column'],
});

jest.mock('react-switch', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ checked, onChange, ...rest }) => (
      <input
        type="checkbox"
        data-testid="mock-switch"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        {...rest}
      />
    ),
  };
});
jest.mock('../../Common/TooltipPopup/tooltipPopup.js', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ message }) => <div data-testid="tooltip-popup">{message}</div>,
  };
});
jest.mock('@mui/icons-material/Add', () => () => <span data-testid="icon-add" />);
jest.mock('@mui/icons-material/Save', () => () => <span data-testid="icon-save" />);
jest.mock('@mui/icons-material/Close', () => () => <span data-testid="icon-close" />);
jest.mock('react-transition-group', () => {
  const React = require('react');
  return {
    CSSTransition: ({ children }) => <>{children}</>,
    TransitionGroup: ({ children }) => <>{children}</>,
  };
});
jest.mock('../RangePicker/rangePicker.js', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onRangeChange }) => {
      const fired = React.useRef(false);
      React.useEffect(() => {
        if (!fired.current) {
          fired.current = true;
          onRangeChange({ minValue: 1, maxValue: 2, type: 'integer' });
        }
      }, [onRangeChange]);
      return <div data-testid="range-picker" />;
    },
  };
});
jest.mock('../../Common/AutoCompleteInput/autoCompleteInput.js', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ value, onChange, ...rest }) => (
      <input
        data-testid="autocomplete"
        value={value}
        onChange={e => onChange(e.target.value)}
        {...rest}
      />
    ),
  };
});
jest.mock('./columnMapping.module.css', () => new Proxy({}, { get: (_, p) => p }));

const makeGroup = (
  column,
  values,
  fileName = 'fileA.csv',
  color = '#f00'
) => ({ column, values, fileName, color });

const categorical = makeGroup('Fruit', ['Apple', 'Banana']);
const numericGroup = makeGroup('Num', ['integer']);
const schemaJSON = JSON.stringify({
  properties: { Fruit: { enum: ['Apple', 'Banana'] } },
});

const baseProps = {
  schema: schemaJSON,
  groups: [categorical],
  onMappingChange: jest.fn(),
  onSave: jest.fn(),
};

describe('<ColumnMapping />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds a group via drag-and-drop when groups start empty', () => {
    const props = { ...baseProps, groups: [] };
    render(<ColumnMapping {...props} />);
    const placeholder = screen.getByText(/click or drop columns here/i);
    const dropTarget = placeholder.parentElement;
    expect(dropTarget).toBeTruthy();

    const newGroup = makeGroup('Extra', ['X', 'Y']);
    fireEvent.drop(dropTarget, { dataTransfer: makeDataTransfer(newGroup) });
    expect(props.onMappingChange).toHaveBeenCalledWith([newGroup]);
  });

  it('deletes a group with the close icon', () => {
    render(<ColumnMapping {...baseProps} />);
    fireEvent.click(screen.getAllByTestId('icon-close')[0].parentElement);
    expect(baseProps.onMappingChange).toHaveBeenCalledWith([]);
  });

  it('enables “Save” only when union + value names are present', () => {
    render(<ColumnMapping {...baseProps} />);
    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByTestId('autocomplete'), {
      target: { value: 'Union' },
    });
    fireEvent.click(screen.getByTestId('icon-add').parentElement);
    expect(save).toBeDisabled();

    fireEvent.change(screen.getAllByTestId('autocomplete')[1], {
      target: { value: 'Val' },
    });
    expect(save).toBeEnabled();
  });

  it('propagates switch flags in onSave', () => {
    render(<ColumnMapping {...baseProps} />);
    const [removeChk, hotChk] = screen.getAllByTestId('mock-switch');
    fireEvent.click(removeChk);
    fireEvent.click(hotChk);

    fireEvent.change(screen.getByTestId('autocomplete'), {
      target: { value: 'U' },
    });
    fireEvent.click(screen.getByTestId('icon-add').parentElement);
    fireEvent.change(screen.getAllByTestId('autocomplete')[1], {
      target: { value: 'V' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(baseProps.onSave).toHaveBeenCalledWith(
      baseProps.groups,
      'U',
      expect.any(Array),
      true,
      true,
    );
  });

  it('shows tooltip when trying to map with no groups', () => {
    jest.useFakeTimers();
    render(<ColumnMapping {...baseProps} groups={[]} />);
    fireEvent.click(screen.getByTestId('icon-add').parentElement);
    fireEvent.click(screen.getByText(/add mapping/i));
    act(() => jest.advanceTimersByTime(15));
    expect(screen.getByTestId('tooltip-popup')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('categorical mapping adds the chosen value to the list', () => {
    render(<ColumnMapping {...baseProps} />);
    fireEvent.click(screen.getByTestId('icon-add').parentElement);
    fireEvent.change(screen.getAllByTestId('autocomplete')[1], {
      target: { value: 'Label' },
    });
    fireEvent.click(screen.getByText(/add mapping/i));
    fireEvent.click(screen.getByRole('button', { name: 'Apple' }));

    const row = screen.getByText(/from fruit:/i).parentElement;
    expect(within(row).getByText('Apple')).toBeInTheDocument();
  });

  it('numeric column renders RangePicker and records range once', () => {
    render(<ColumnMapping {...baseProps} groups={[numericGroup]} />);
    fireEvent.click(screen.getByTestId('icon-add').parentElement);
    fireEvent.change(screen.getAllByTestId('autocomplete')[1], {
      target: { value: 'NumVal' },
    });
    fireEvent.click(screen.getByText(/add mapping/i));
    expect(screen.getByTestId('range-picker')).toBeInTheDocument();
    expect(screen.getByText(/values from/i)).toHaveTextContent(
      '1 values from'
    );
  });
});
