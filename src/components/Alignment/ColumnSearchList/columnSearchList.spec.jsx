import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from "vitest";
import { fetchSuggestions } from '../../../util/petitionHandler';
import ColumnSearchList from './columnSearchList';

vi.mock('../../../util/petitionHandler', () => ({
  fetchSuggestions: vi.fn(),
}));

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
    expect(screen.queryByRole('heading', { name: /source variables/i })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search source variables by name/i })).toBeInTheDocument();
    const columnGroups = screen.getByRole('list', { name: /column groups/i });
    const status = screen.getByLabelText(/source variable status/i);
    expect(status).toHaveTextContent('Total 3');
    expect(status).toHaveTextContent('Annotated 0');
    expect(status).toHaveTextContent('Mapped 0');
    expect(screen.getAllByLabelText('SNOMED CT not annotated')[0]).toHaveAttribute('title', 'SNOMED CT: Not annotated');
    expect(columnGroups.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

    const input = screen.getByPlaceholderText(/search source variables/i);
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

    const input = screen.getByPlaceholderText(/search source variables/i);
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

  it('uses a native button for keyboard-accessible column selection', () => {
    const handleColumnClick = vi.fn();
    const handleDragStart = vi.fn();

    render(
      <ColumnSearchList
        columnsData={columnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    expect(screen.getByText('Beta').closest('button')).toHaveAttribute('type', 'button');
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

    const { container } = render(
      <ColumnSearchList
        columnsData={groupedColumnsData}
        handleColumnClick={handleColumnClick}
        handleDragStart={handleDragStart}
      />
    );

    expect(screen.getByText('file1.csv')).toBeInTheDocument();
    expect(container.querySelector('[data-column-key]')).toHaveStyle({ '--file-accent': '#ff0000' });
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

    const appleGroup = screen.getByText('apple.csv');
    const bananaGroup = screen.getByText('banana.csv');
    const zebraGroup = screen.getByText('zebra.csv');
    
    expect(appleGroup).toBeInTheDocument();
    expect(bananaGroup).toBeInTheDocument();
    expect(zebraGroup).toBeInTheDocument();
  });

  it('shows source annotation and custom-mapping state independently', () => {
    const mappedColumn = {
      column: 'ToiletBART1',
      color: '#0aa',
      nodeId: 'node-1',
      fileName: 'SCUBA_elements.csv',
      values: ['integer'],
      terminology: 'Ability to use toilet | 284899001',
    };
    const mappings = [{
      ToiletUse: {
        fileName: 'custom_mapping',
        terminology: 'Activities of daily living | 129018000',
        groups: [{
          values: [{
            name: 'integer',
            mapping: [{
              nodeId: 'node-1',
              fileName: 'SCUBA_elements.csv',
              groupColumn: 'ToiletBART1',
              value: 'integer',
            }],
          }],
        }],
      },
    }];

    const { container } = render(
      <ColumnSearchList
        columnsData={[mappedColumn]}
        mappings={mappings}
        handleColumnClick={vi.fn()}
        handleDragStart={vi.fn()}
      />
    );

    const status = screen.getByLabelText(/source variable status/i);
    expect(status).toHaveTextContent('Total 1');
    expect(status).toHaveTextContent('Annotated 1');
    expect(status).toHaveTextContent('Mapped 1');
    expect(screen.getByText('Ability to use toilet')).toBeInTheDocument();
    expect(screen.getByLabelText('SNOMED CT annotated: Ability to use toilet')).toBeInTheDocument();
    expect(screen.getByLabelText('SNOMED CT annotated: Ability to use toilet')).toHaveAttribute(
      'title', 'SNOMED CT: Ability to use toilet (284899001)'
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Integer')).toBeInTheDocument();
    expect(container.querySelector('[data-column-key]').className).toMatch(/columnItemAnnotated/);
    expect(container.querySelector('[data-column-key]').className).toMatch(/columnItemCustom/);
  });

  it('searches Snowstorm and applies a selected annotation to the source variable', async () => {
    fetchSuggestions.mockResolvedValueOnce([{
      label: 'Ability to use toilet',
      iri: 'http://snomed.info/id/284899001',
    }]);
    const onTerminologyChange = vi.fn();
    const mappedColumn = {
      column: 'Toilet_BART1',
      nodeId: 'node-1',
      fileName: 'SCUBA_elements.csv',
      values: ['integer'],
    };
    const mappings = [{
      Toilet_BART1: {
        fileName: 'SCUBA_elements.csv',
        groups: [{
          values: [{
            name: 'integer',
            mapping: [{
              nodeId: 'node-1',
              fileName: 'SCUBA_elements.csv',
              groupColumn: 'Toilet_BART1',
              value: 'integer',
            }],
          }],
        }],
      },
    }];

    render(
      <ColumnSearchList
        columnsData={[mappedColumn]}
        mappings={mappings}
        onTerminologyChange={onTerminologyChange}
        handleColumnClick={vi.fn()}
        handleDragStart={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /annotate toilet_bart1/i }));

    await waitFor(() => {
      expect(fetchSuggestions).toHaveBeenCalledWith('Toilet BART1', 'snomed');
    });
    fireEvent.click(await screen.findByRole('option', { name: /ability to use toilet/i }));

    expect(onTerminologyChange).toHaveBeenCalledWith(
      mappedColumn,
      'Ability to use toilet | 284899001'
    );
  });

  it('uses the trimmed search input as uncoded terminology when no concepts match', async () => {
    fetchSuggestions.mockResolvedValue([]);
    const onTerminologyChange = vi.fn();
    const sourceColumn = {
      column: 'Unknown assessment',
      nodeId: 'node-1',
      fileName: 'elements.csv',
      values: ['integer'],
    };
    const props = {
      columnsData: [sourceColumn],
      onTerminologyChange,
      handleColumnClick: vi.fn(),
      handleDragStart: vi.fn(),
    };
    const { rerender } = render(<ColumnSearchList {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /annotate unknown assessment/i }));
    const search = screen.getByRole('searchbox', { name: /search snomed ct concepts/i });
    fireEvent.change(search, { target: { value: '  Local clinical term  ' } });
    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalledWith('Local clinical term', 'snomed'));
    fireEvent.click(await screen.findByRole('button', { name: 'Use "Local clinical term" as terminology' }));

    expect(onTerminologyChange).toHaveBeenCalledWith(sourceColumn, 'Local clinical term');
    rerender(<ColumnSearchList {...props} columnsData={[{ ...sourceColumn, terminology: 'Local clinical term' }]} />);
    expect(screen.getByLabelText('Terminology annotated: Local clinical term')).toHaveTextContent('Term');
  });

  it('starts the initial column-name lookup without the typing debounce', async () => {
    vi.useFakeTimers();
    fetchSuggestions.mockClear();
    fetchSuggestions.mockResolvedValue([]);
    const sourceColumn = {
      column: 'Mobility',
      nodeId: 'node-1',
      fileName: 'elements.csv',
      values: ['integer'],
    };
    const mappings = [{
      Mobility: {
        groups: [{ values: [{ mapping: [{
          nodeId: 'node-1',
          fileName: 'elements.csv',
          groupColumn: 'Mobility',
          value: 'integer',
        }] }] }],
      },
    }];

    try {
      render(
        <ColumnSearchList
          columnsData={[sourceColumn]}
          mappings={mappings}
          handleColumnClick={vi.fn()}
          handleDragStart={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /annotate mobility/i }));

      await act(async () => {
        vi.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(fetchSuggestions).toHaveBeenCalledWith('Mobility', 'snomed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not expose target-mapping controls while annotating a source variable', async () => {
    fetchSuggestions.mockResolvedValueOnce([{
      label: 'Age at admission',
      iri: 'http://snomed.info/id/424144002',
    }]);
    const onTerminologyChange = vi.fn();
    const sourceColumn = {
      column: 'Age',
      nodeId: 'node-1',
      fileName: 'elements.csv',
      values: ['integer'],
    };
    const sourceReference = {
      nodeId: 'node-1',
      fileName: 'elements.csv',
      groupColumn: 'Age',
      value: 'integer',
    };
    const mappings = [
      {
        Age: {
          fileName: 'elements.csv',
          groups: [{ values: [{ mapping: [sourceReference] }] }],
        },
      },
      {
        AgeAtAdmission: {
          fileName: 'custom_mapping',
          groups: [{ values: [{ mapping: [sourceReference] }] }],
        },
      },
    ];

    render(
      <ColumnSearchList
        columnsData={[sourceColumn]}
        mappings={mappings}
        onTerminologyChange={onTerminologyChange}
        handleColumnClick={vi.fn()}
        handleDragStart={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /annotate age/i }));
    expect(screen.queryByText('Mapping target')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: /search snomed ct concepts/i }), {
      target: { value: 'age admission' },
    });
    fireEvent.click(await screen.findByRole('option', { name: /age at admission/i }));

    expect(onTerminologyChange).toHaveBeenCalledWith(
      sourceColumn,
      'Age at admission | 424144002'
    );
  });

  it('removes the current annotation from the source variable', () => {
    const onTerminologyChange = vi.fn();
    const sourceColumn = {
      column: 'Age',
      nodeId: 'node-1',
      fileName: 'elements.csv',
      values: ['integer'],
      terminology: 'Age at admission | 424144002',
    };
    const mappings = [{
      Age: {
        fileName: 'elements.csv',
        terminology: 'Age at admission | 424144002',
        groups: [{
          values: [{
            mapping: [{
              nodeId: 'node-1',
              fileName: 'elements.csv',
              groupColumn: 'Age',
              value: 'integer',
            }],
          }],
        }],
      },
    }];

    render(
      <ColumnSearchList
        columnsData={[sourceColumn]}
        mappings={mappings}
        onTerminologyChange={onTerminologyChange}
        handleColumnClick={vi.fn()}
        handleDragStart={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /annotate age/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove snomed ct annotation from age/i }));

    expect(onTerminologyChange).toHaveBeenCalledWith(sourceColumn, '');
  });
});
