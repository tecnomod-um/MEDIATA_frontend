import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EntrySearch from './entrySearch';

jest.mock('../EntryTable/entryTable', () => {
  return ({ filteredLists, minCellWidth, onRowSelect, selectedEntry, type }) => (
    <div
      data-testid="entry-table"
      data-filtered={JSON.stringify(filteredLists)}
      data-min-cell-width={minCellWidth}
      data-selected-entry={selectedEntry}
      data-type={type}
      onClick={() => onRowSelect && onRowSelect('mock-row')}
    />
  );
});

describe('<EntrySearch />', () => {
  const resultData = {
    col1: ['apple', 'banana', 'cherry'],
    col2: ['x', 'yellow', 'red'],
  };
  const onRowSelect = jest.fn();

  beforeEach(() => {
    onRowSelect.mockClear();
  });

  it('shows a combined-column placeholder when data available', () => {
    render(
      <EntrySearch
        resultData={resultData}
        onRowSelect={onRowSelect}
        selectedEntry="banana"
        type="fruit"
      />
    );
    const input = screen.getByPlaceholderText('Search by col1, col2');
    expect(input).toBeInTheDocument();
  });

  it('falls back to no-elements placeholder when resultData is empty', () => {
    render(
      <EntrySearch
        resultData={{}}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type="none"
      />
    );
    const input = screen.getByPlaceholderText('No elements to display');
    expect(input).toBeInTheDocument();
    const table = screen.getByTestId('entry-table');
    expect(table).toHaveAttribute('data-filtered', JSON.stringify({}));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('passes through fixed props to EntryTable', () => {
    render(
      <EntrySearch
        resultData={resultData}
        onRowSelect={onRowSelect}
        selectedEntry="cherry"
        type="fruit"
      />
    );
    const table = screen.getByTestId('entry-table');
    expect(table).toHaveAttribute('data-min-cell-width', '100');
    expect(table).toHaveAttribute('data-selected-entry', 'cherry');
    expect(table).toHaveAttribute('data-type', 'fruit');
  });

  it('shows all rows initially and displays correct count', () => {
    render(
      <EntrySearch
        resultData={resultData}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type="fruit"
      />
    );
    const table = screen.getByTestId('entry-table');
    const filtered = JSON.parse(table.getAttribute('data-filtered'));
    expect(filtered).toEqual(resultData);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('filters rows based on search term (case-insensitive)', () => {
    render(
      <EntrySearch
        resultData={resultData}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type="fruit"
      />
    );
    const input = screen.getByPlaceholderText('Search by col1, col2');
    fireEvent.change(input, { target: { value: 'An' } });
    const table = screen.getByTestId('entry-table');
    const filtered = JSON.parse(table.getAttribute('data-filtered'));
    expect(filtered.col1).toEqual(['banana']);
    expect(filtered.col2).toEqual(['yellow']);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('forwards row-select events from EntryTable', () => {
    render(
      <EntrySearch
        resultData={resultData}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type="fruit"
      />
    );

    const table = screen.getByTestId('entry-table');
    fireEvent.click(table);
    expect(onRowSelect).toHaveBeenCalledWith('mock-row');
  });
});
