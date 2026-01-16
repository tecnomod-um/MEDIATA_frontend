import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColumnSearchList from './columnSearchList';

describe('<ColumnSearchList />', () => {
  const columnsData = [
    { column: 'Alpha', color: '#f00' },
    { column: 'Beta',  color: '#0f0' },
    { column: 'Gamma', color: '#00f' },
  ];

  it('renders all columns initially', () => {
    const handleColumnClick = jest.fn();
    const handleDragStart = jest.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    columnsData.forEach(col => {
      expect(screen.getByText(col.column)).toBeInTheDocument();
    });
  });

  it('filters columns based on search input (case-insensitive)', () => {
    const handleColumnClick = jest.fn();
    const handleDragStart = jest.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    const input = screen.getByPlaceholderText(/search columns/i);
    fireEvent.change(input, { target: { value: 'a' } });

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('calls handleColumnClick with the correct column on click', () => {
    const handleColumnClick = jest.fn();
    const handleDragStart = jest.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    const item = screen.getByText('Beta');
    fireEvent.click(item);

    expect(handleColumnClick).toHaveBeenCalledWith(columnsData[1]);
  });

  it('calls handleDragStart with event and column on dragStart', () => {
    const handleColumnClick = jest.fn();
    const handleDragStart = jest.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    const item = screen.getByText('Gamma');
    const dt = { setData: jest.fn() };
    fireEvent.dragStart(item, { dataTransfer: dt });

    expect(handleDragStart).toHaveBeenCalled();
    const [eventArg, colArg] = handleDragStart.mock.calls[0];
    expect(eventArg).toHaveProperty('dataTransfer', dt);
    expect(colArg).toEqual(columnsData[2]);
  });
});
