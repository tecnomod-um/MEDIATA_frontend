import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColumnSearch from './columnSearch';

describe('<ColumnSearch />', () => {
  const columnsData = [
    { column: 'Alpha', color: '#f00' },
    { column: 'Beta', color: '#0f0' },
    { column: 'Gamma', color: '#00f' },
  ];
  let handleColumnClick, handleDragStart;

  beforeEach(() => {
    handleColumnClick = jest.fn();
    handleDragStart = jest.fn();
    render(
      <ColumnSearch
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );
  });

  it('renders all columns initially', () => {
    columnsData.forEach(col => {
      expect(screen.getByText(col.column)).toBeInTheDocument();
    });
  });

  it('filters columns based on search input (case-insensitive)', () => {
    const input = screen.getByPlaceholderText(/search columns/i);
    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('calls handleColumnClick with the correct column on click', () => {
    const item = screen.getByText('Beta');
    fireEvent.click(item);
    expect(handleColumnClick).toHaveBeenCalledWith(columnsData[1]);
  });

  it('calls handleDragStart with event and column on dragStart', () => {
    const item = screen.getByText('Gamma');
    const dt = { setData: jest.fn() };
    fireEvent.dragStart(item, { dataTransfer: dt });
    expect(handleDragStart).toHaveBeenCalled();
    const [eventArg, colArg] = handleDragStart.mock.calls[0];
    expect(eventArg).toHaveProperty('dataTransfer', dt);
    expect(colArg).toEqual(columnsData[2]);
  });
});
