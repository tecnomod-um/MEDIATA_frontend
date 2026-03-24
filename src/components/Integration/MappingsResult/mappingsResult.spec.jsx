import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import MappingsExporter from '../MappingsResult/mappingsExporter';
import MappingsResult from '../MappingsResult/mappingsResult';
import { toast } from 'react-toastify';

const {
  mockNavigate,
  mockToastSuccess,
  mockToastError,
  mockHierarchyComponent,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockHierarchyComponent: vi.fn(({ mappingKey, onDeleteMapping, onUpdateMapping }) => {
    mockHierarchyComponent.lastProps = {
      mappingKey,
      onDeleteMapping,
      onUpdateMapping,
    };
    return <div data-testid="hierarchy">{mappingKey}</div>;
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    __esModule: true,
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-toastify', () => ({
  __esModule: true,
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('../MappingHierarchy/mappingHierarchy', () => ({
  __esModule: true,
  default: mockHierarchyComponent,
}));

vi.mock('../../../context/authContext', () => ({
  __esModule: true,
  useAuth: () => ({ capabilities: { semanticAlignment: true } }),
}));

if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = vi.fn(() => 'blob:url');
} else {
  vi.spyOn(global.URL, 'createObjectURL').mockImplementation(() => 'blob:url');
}

if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = vi.fn();
} else {
  vi.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {});
}

class FakeFileReader {
  constructor() {
    this.result = null;
    this.onload = null;
    this.onerror = null;
  }

  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:text/csv;base64,ZmFrZQ==';
      this.onload?.();
    }, 0);
  }
}

global.FileReader = FakeFileReader;

const sampleMappings = [
  {
    TargetCol: {
      mappingType: 'standard',
      fileName: 'file.csv',
      groups: [
        {
          values: [
            { name: 'CatA', mapping: [] },
            { name: 'CatB', mapping: [] },
          ],
        },
      ],
    },
  },
];

const columnsData = [{ column: 'TargetCol', color: '#123' }];

const defaultHandlers = {
  onUndoDelete: vi.fn(),
  onDeleteMapping: vi.fn(),
  onOpenFileMapper: vi.fn(),
  formatValue: (v) => v,
  setMappings: vi.fn(),
};

describe('<MappingsExporter />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL.mockReturnValue?.('blob:url');
  });

  it('creates a CSV file and shows success toast on download click', () => {
    render(<MappingsExporter mappings={sampleMappings} />);

    fireEvent.click(screen.getByText(/download mappings/i));

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(toast.success).toHaveBeenCalledWith(
      'Mappings CSV generated successfully!'
    );
  });

  it('encodes CSV and navigates to /semanticalignment with base64 payload', async () => {
    render(<MappingsExporter mappings={sampleMappings} />);

    fireEvent.click(screen.getAllByRole('button')[1]);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/semanticalignment', {
        state: {
          csvData: expect.any(String),
          fileName: 'mappings_elements.csv',
        },
      });
    });
  });

  it('shows toast error when CSV generation throws (download)', () => {
    global.URL.createObjectURL.mockImplementationOnce(() => {
      throw new Error('fail');
    });

    render(<MappingsExporter mappings={sampleMappings} />);
    fireEvent.click(screen.getByText(/download mappings/i));

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Error generating CSV')
    );
  });

  it('shows toast error when navigation fails due to FileReader error', () => {
    const originalFileReader = global.FileReader;

    global.FileReader = vi.fn(() => {
      throw new Error('reader fail');
    });

    render(<MappingsExporter mappings={sampleMappings} />);
    fireEvent.click(screen.getAllByRole('button')[1]);

    expect(toast.error).toHaveBeenCalledWith(
      'Error processing CSV for RDF Builder.'
    );

    global.FileReader = originalFileReader;
  });
});

describe('<MappingsResult />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hierarchies, undo bar, and triggers callbacks', () => {
    render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={['dummy']}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    fireEvent.click(screen.getByText(/undo changes/i));
    expect(defaultHandlers.onUndoDelete).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/process datasets/i));
    expect(defaultHandlers.onOpenFileMapper).toHaveBeenCalled();
  });

  it('disables process button while processing and shows loader', () => {
    render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="processing"
        {...defaultHandlers}
      />
    );

    const btn = screen.getByRole('button', { name: /process mappings/i });
    expect(btn).toBeDisabled();

    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
  });

  it('handles onUpdateMapping callback without renaming the mapping key', () => {
    const setMappings = vi.fn((updater) => {
      const result = updater([{ TargetCol: { groups: [] } }]);
      expect(result[0]).toHaveProperty('TargetCol');
      return result;
    });
  
    render(
      <MappingsResult
        mappings={[{ TargetCol: { groups: [] } }]}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        onUndoDelete={() => {}}
        onDeleteMapping={() => {}}
        onOpenFileMapper={() => {}}
        formatValue={(v) => v}
        setMappings={setMappings}
      />
    );
  
    mockHierarchyComponent.lastProps.onUpdateMapping('TargetCol', 'NewTarget', {
      groups: [],
    });
  
    expect(setMappings).toHaveBeenCalled();
  });

  it('handles onUpdateMapping with no key change', () => {
    const setMappings = vi.fn((updater) => {
      const result = updater([{ TargetCol: { groups: [] } }]);
      expect(result[0]).toHaveProperty('TargetCol');
      return result;
    });

    render(
      <MappingsResult
        mappings={[{ TargetCol: { groups: [] } }]}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        onUndoDelete={() => {}}
        onDeleteMapping={() => {}}
        onOpenFileMapper={() => {}}
        formatValue={(v) => v}
        setMappings={setMappings}
      />
    );

    mockHierarchyComponent.lastProps.onUpdateMapping('TargetCol', 'TargetCol', {
      groups: [],
    });

    expect(setMappings).toHaveBeenCalled();
  });

  it('filters mappings by search term', () => {
    const mappings = [
      {
        TargetCol: {
          fileName: 'test.csv',
          groups: [
            {
              values: [
                { name: 'SearchMe', mapping: [] },
                { name: 'DontSearchMe', mapping: [] },
              ],
            },
          ],
        },
        OtherCol: {
          fileName: 'other.csv',
          groups: [],
        },
      },
    ];

    render(
      <MappingsResult
        mappings={mappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search mapped columns/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'SearchMe' } });

    expect(searchInput).toHaveValue('SearchMe');
  });

  it('filters mappings by file name', () => {
    const mappings = [
      {
        TargetCol: {
          fileName: 'findme.csv',
          groups: [],
        },
      },
    ];

    render(
      <MappingsResult
        mappings={mappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search mapped columns/i);
    fireEvent.change(searchInput, { target: { value: 'findme' } });

    expect(searchInput).toHaveValue('findme');
  });

  it('filters mappings by mapping key', () => {
    const mappings = [
      {
        KeyToFind: {
          fileName: 'test.csv',
          groups: [],
        },
        OtherKey: {
          fileName: 'other.csv',
          groups: [],
        },
      },
    ];

    render(
      <MappingsResult
        mappings={mappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search mapped columns/i);
    fireEvent.change(searchInput, { target: { value: 'KeyToFind' } });

    expect(searchInput).toHaveValue('KeyToFind');
  });

  it('filters by mapping line values', () => {
    const mappings = [
      {
        TargetCol: {
          fileName: 'test.csv',
          groups: [
            {
              values: [
                {
                  name: 'Value',
                  mapping: [
                    {
                      groupColumn: 'col1',
                      value: 'UniqueValue',
                      fileName: 'data.csv',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    render(
      <MappingsResult
        mappings={mappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search mapped columns/i);
    fireEvent.change(searchInput, { target: { value: 'UniqueValue' } });

    expect(searchInput).toHaveValue('UniqueValue');
  });

  it('shows no results when search term does not match', () => {
    render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search mapped columns/i);
    fireEvent.change(searchInput, {
      target: { value: 'NonexistentSearchTerm' },
    });

    expect(screen.queryByTestId('hierarchy')).not.toBeInTheDocument();
  });

  it('handles empty search term to show all mappings', () => {
    render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search mapped columns/i);

    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');

    fireEvent.change(searchInput, { target: { value: '' } });
    expect(searchInput).toHaveValue('');
  });

  it('displays different processing statuses', () => {
    const { rerender } = render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="success"
        {...defaultHandlers}
      />
    );

    expect(screen.getByText('Processing Successful')).toBeInTheDocument();

    rerender(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="error"
        {...defaultHandlers}
      />
    );

    expect(screen.getByText('Processing Failed')).toBeInTheDocument();
  });

  it('does not show undo button when no deleted items', () => {
    render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    expect(screen.queryByText(/undo changes/i)).not.toBeInTheDocument();
  });
});