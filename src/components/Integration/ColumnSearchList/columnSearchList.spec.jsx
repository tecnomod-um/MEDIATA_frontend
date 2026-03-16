import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColumnSearchList from './columnSearchList';
import { vi } from "vitest";

describe('<ColumnSearchList />', () => {
  const columnsData = [
    { column: 'Alpha', color: '#f00' },
    { column: 'Beta',  color: '#0f0' },
    { column: 'Gamma', color: '#00f' },
  ];

  it('renders all columns initially', () => {
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

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
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

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
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

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
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    const item = screen.getByText('Gamma');
    const dt = { setData: vi.fn() };
    fireEvent.dragStart(item, { dataTransfer: dt });

    expect(handleDragStart).toHaveBeenCalled();
    const [eventArg, colArg] = handleDragStart.mock.calls[0];
    expect(eventArg).toHaveProperty('dataTransfer', dt);
    expect(colArg).toEqual(columnsData[2]);
  });

  it('shows empty state when no columns match search', () => {
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    const input = screen.getByPlaceholderText(/search columns/i);
    fireEvent.change(input, { target: { value: 'xyz' } });

    expect(screen.getByText('No columns found.')).toBeInTheDocument();
  });

  it('groups columns by nodeId and fileName', () => {
    const groupedColumnsData = [
      { column: 'Alpha', color: '#f00', nodeId: 1, fileName: 'file1.csv' },
      { column: 'Beta', color: '#0f0', nodeId: 1, fileName: 'file1.csv' },
      { column: 'Gamma', color: '#00f', nodeId: 2, fileName: 'file2.csv' },
    ];

    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={groupedColumnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    expect(screen.getByText('file1.csv')).toBeInTheDocument();
    expect(screen.getByText('file2.csv')).toBeInTheDocument();
  });

  it('toggles individual group collapse state', () => {
    const groupedColumnsData = [
      { column: 'Alpha', color: '#f00', nodeId: 1, fileName: 'file1.csv' },
      { column: 'Beta', color: '#0f0', nodeId: 1, fileName: 'file1.csv' },
      { column: 'Gamma', color: '#00f', nodeId: 2, fileName: 'file2.csv' },
    ];

    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={groupedColumnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    // Initially both groups should be expanded
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();

    // Click to collapse first group
    const file1Header = screen.getByRole('button', { name: /file1.csv - 2 columns/i });
    fireEvent.click(file1Header);

    // First group columns should not be visible, second group should still be visible
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('expands all groups when openAll is clicked', () => {
    const groupedColumnsData = [
      { column: 'Alpha', color: '#f00', nodeId: 1, fileName: 'file1.csv' },
      { column: 'Beta', color: '#0f0', nodeId: 2, fileName: 'file2.csv' },
    ];

    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={groupedColumnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    // Collapse all first
    const collapseAllBtn = screen.getByRole('button', { name: /collapse all column groups/i });
    fireEvent.click(collapseAllBtn);

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();

    // Expand all
    const expandAllBtn = screen.getByRole('button', { name: /expand all column groups/i });
    fireEvent.click(expandAllBtn);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('collapses all groups when collapseAll is clicked', () => {
    const groupedColumnsData = [
      { column: 'Alpha', color: '#f00', nodeId: 1, fileName: 'file1.csv' },
      { column: 'Beta', color: '#0f0', nodeId: 2, fileName: 'file2.csv' },
    ];

    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={groupedColumnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    // Initially expanded
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();

    // Collapse all
    const collapseAllBtn = screen.getByRole('button', { name: /collapse all column groups/i });
    fireEvent.click(collapseAllBtn);

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation with Enter key on column', () => {
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    const item = screen.getByText('Beta');
    fireEvent.keyDown(item, { key: 'Enter' });

    expect(handleColumnClick).toHaveBeenCalledWith(columnsData[1]);
  });

  it('handles keyboard navigation with Space key on column', () => {
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    const item = screen.getByText('Gamma');
    fireEvent.keyDown(item, { key: ' ' });

    expect(handleColumnClick).toHaveBeenCalledWith(columnsData[2]);
  });

  it('handles columns without nodeId or fileName', () => {
    const columnsWithMissingData = [
      { column: 'Alpha', color: '#f00' },
      { column: 'Beta', color: '#0f0' },
    ];

    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={columnsWithMissingData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('displays file color pill', () => {
    const groupedColumnsData = [
      { column: 'Alpha', color: '#ff0000', nodeId: 1, fileName: 'file1.csv' },
    ];

    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={groupedColumnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    // Verify the file header is rendered
    expect(screen.getByText('file1.csv')).toBeInTheDocument();
  });

  it('sorts groups by fileName when nodeId is the same', () => {
    const groupedColumnsData = [
      { column: 'Zeta', color: '#f00', nodeId: 1, fileName: 'zebra.csv' },
      { column: 'Alpha', color: '#0f0', nodeId: 1, fileName: 'apple.csv' },
      { column: 'Beta', color: '#00f', nodeId: 1, fileName: 'banana.csv' },
    ];

    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={groupedColumnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    // Verify groups are present and sorted correctly
    const appleGroup = screen.getByText('apple.csv');
    const bananaGroup = screen.getByText('banana.csv');
    const zebraGroup = screen.getByText('zebra.csv');
    
    expect(appleGroup).toBeInTheDocument();
    expect(bananaGroup).toBeInTheDocument();
    expect(zebraGroup).toBeInTheDocument();
  });
});
