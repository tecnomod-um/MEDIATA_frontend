import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileTable from './fileTable';

// Mock the FileTypeIcon component
jest.mock('./fileTypeIcon', () => {
  return function FileTypeIcon({ fileName }) {
    return <span data-testid="file-icon">{fileName}</span>;
  };
});

describe('FileTable', () => {
  const mockFiles = [
    { id: '1', name: 'file1.csv', size: 1024, modified: new Date('2024-01-01') },
    { id: '2', name: 'file2.txt', size: 2048, modified: new Date('2024-01-02') },
    { id: '3', name: 'file3.json', size: 512, modified: new Date('2024-01-03') },
  ];

  const mockProps = {
    files: mockFiles,
    selectedFiles: [],
    onFileSelect: jest.fn(),
    onFileDoubleClick: jest.fn(),
    sortBy: 'name',
    sortOrder: 'asc',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file table with files', () => {
    render(<FileTable {...mockProps} />);
    expect(screen.getByText('file1.csv')).toBeInTheDocument();
    expect(screen.getByText('file2.txt')).toBeInTheDocument();
    expect(screen.getByText('file3.json')).toBeInTheDocument();
  });

  it('renders empty table when no files', () => {
    render(<FileTable {...mockProps} files={[]} />);
    expect(screen.queryByText('file1.csv')).not.toBeInTheDocument();
  });

  it('handles file selection', () => {
    render(<FileTable {...mockProps} />);
    const firstFile = screen.getByText('file1.csv').closest('tr');
    if (firstFile) {
      fireEvent.click(firstFile);
      expect(mockProps.onFileSelect).toHaveBeenCalled();
    }
  });

  it('handles file double click', () => {
    render(<FileTable {...mockProps} />);
    const firstFile = screen.getByText('file1.csv').closest('tr');
    if (firstFile) {
      fireEvent.doubleClick(firstFile);
      expect(mockProps.onFileDoubleClick).toHaveBeenCalled();
    }
  });

  it('shows selected files with highlight', () => {
    render(<FileTable {...mockProps} selectedFiles={[mockFiles[0]]} />);
    const firstRow = screen.getByText('file1.csv').closest('tr');
    expect(firstRow).toHaveClass('selected');
  });

  it('renders file icons for each file', () => {
    render(<FileTable {...mockProps} />);
    const icons = screen.getAllByTestId('file-icon');
    expect(icons).toHaveLength(3);
  });

  it('handles multiple selected files', () => {
    render(<FileTable {...mockProps} selectedFiles={[mockFiles[0], mockFiles[1]]} />);
    const firstRow = screen.getByText('file1.csv').closest('tr');
    const secondRow = screen.getByText('file2.txt').closest('tr');
    expect(firstRow).toHaveClass('selected');
    expect(secondRow).toHaveClass('selected');
  });

  it('renders with ascending sort order', () => {
    render(<FileTable {...mockProps} sortBy="name" sortOrder="asc" />);
    expect(screen.getByText('file1.csv')).toBeInTheDocument();
  });

  it('renders with descending sort order', () => {
    render(<FileTable {...mockProps} sortBy="name" sortOrder="desc" />);
    expect(screen.getByText('file1.csv')).toBeInTheDocument();
  });

  it('handles sort by size', () => {
    render(<FileTable {...mockProps} sortBy="size" sortOrder="asc" />);
    expect(screen.getByText('file1.csv')).toBeInTheDocument();
  });

  it('handles sort by modified date', () => {
    render(<FileTable {...mockProps} sortBy="modified" sortOrder="desc" />);
    expect(screen.getByText('file1.csv')).toBeInTheDocument();
  });

  it('renders files with special characters in names', () => {
    const specialFiles = [
      { id: '1', name: 'file with spaces.csv', size: 1024, modified: new Date() },
      { id: '2', name: 'file-with-dashes.txt', size: 2048, modified: new Date() },
      { id: '3', name: 'file_with_underscores.json', size: 512, modified: new Date() },
    ];
    render(<FileTable {...mockProps} files={specialFiles} />);
    expect(screen.getByText('file with spaces.csv')).toBeInTheDocument();
    expect(screen.getByText('file-with-dashes.txt')).toBeInTheDocument();
    expect(screen.getByText('file_with_underscores.json')).toBeInTheDocument();
  });

  it('renders files with very long names', () => {
    const longFiles = [
      { id: '1', name: 'a'.repeat(100) + '.csv', size: 1024, modified: new Date() },
    ];
    render(<FileTable {...mockProps} files={longFiles} />);
    expect(screen.getByText('a'.repeat(100) + '.csv')).toBeInTheDocument();
  });

  it('handles files with zero size', () => {
    const zeroSizeFiles = [
      { id: '1', name: 'empty.txt', size: 0, modified: new Date() },
    ];
    render(<FileTable {...mockProps} files={zeroSizeFiles} />);
    expect(screen.getByText('empty.txt')).toBeInTheDocument();
  });

  it('handles files with very large sizes', () => {
    const largeFiles = [
      { id: '1', name: 'large.bin', size: 1024 * 1024 * 1024, modified: new Date() },
    ];
    render(<FileTable {...mockProps} files={largeFiles} />);
    expect(screen.getByText('large.bin')).toBeInTheDocument();
  });

  it('handles files with old modification dates', () => {
    const oldFiles = [
      { id: '1', name: 'old.txt', size: 1024, modified: new Date('2000-01-01') },
    ];
    render(<FileTable {...mockProps} files={oldFiles} />);
    expect(screen.getByText('old.txt')).toBeInTheDocument();
  });

  it('handles undefined onFileSelect callback', () => {
    render(<FileTable {...mockProps} onFileSelect={undefined} />);
    const firstFile = screen.getByText('file1.csv').closest('tr');
    if (firstFile) {
      // Should not crash when clicked
      fireEvent.click(firstFile);
    }
  });

  it('handles undefined onFileDoubleClick callback', () => {
    render(<FileTable {...mockProps} onFileDoubleClick={undefined} />);
    const firstFile = screen.getByText('file1.csv').closest('tr');
    if (firstFile) {
      // Should not crash when double-clicked
      fireEvent.doubleClick(firstFile);
    }
  });
});
