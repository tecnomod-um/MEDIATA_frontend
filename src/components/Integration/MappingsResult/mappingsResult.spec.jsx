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
  mockUseAuth,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockHierarchyComponent: vi.fn(({ mappingKey, onDeleteMapping, onUpdateMapping, onSelect, autoOpen }) => {
    mockHierarchyComponent.lastProps = {
      mappingKey,
      onDeleteMapping,
      onUpdateMapping,
      onSelect,
      autoOpen,
    };
    return <div data-testid="hierarchy">{mappingKey}</div>;
  }),
  mockUseAuth: vi.fn(() => ({ capabilities: { semanticAlignment: true } })),
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
  useAuth: mockUseAuth,
}));

vi.mock('../../Common/TooltipPopup/tooltipPopup', () => ({
  __esModule: true,
  default: ({ message, onClose }) => (
    <div data-testid="tooltip-popup" role="tooltip">
      {message}
      <button data-testid="tooltip-close" onClick={onClose}>close</button>
    </div>
  ),
}));

function captureBlobContent() {
  const originalBlob = global.Blob;
  const allContents = [];
  global.Blob = function(content, options) {
    allContents.push(content);
    return new originalBlob(content, options);
  };
  return {
    // Returns the content array of the blob at the given index (default: 0 = first blob = CSV).
    getContent: (index = 0) => allContents[index],
    getAllContents: () => allContents,
    restore: () => { global.Blob = originalBlob; },
  };
}

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
    mockUseAuth.mockImplementation(() => ({ capabilities: { semanticAlignment: true } }));
    global.URL.createObjectURL.mockReturnValue?.('blob:url');
  });

  it('creates a CSV file and shows success toast on download click', () => {
    render(<MappingsExporter mappings={sampleMappings} />);

    fireEvent.click(screen.getByText(/download mappings/i));

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(toast.success).toHaveBeenCalledWith(
      'Mappings CSV and mapping spec downloaded successfully!'
    );
  });

  it('encodes CSV and navigates to /semanticalignment with base64 payload', async () => {
    render(<MappingsExporter mappings={sampleMappings} />);

    fireEvent.click(screen.getAllByRole('button')[2]);

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
      expect.stringContaining('Error generating downloads')
    );
  });

  it('shows toast error when navigation fails due to FileReader error', () => {
    const originalFileReader = global.FileReader;

    global.FileReader = vi.fn(() => {
      throw new Error('reader fail');
    });

    render(<MappingsExporter mappings={sampleMappings} />);
    fireEvent.click(screen.getAllByRole('button')[2]);

    expect(toast.error).toHaveBeenCalledWith(
      'Error processing CSV for RDF Builder.'
    );

    global.FileReader = originalFileReader;
  });

  it('renders arrow button as disabled when semanticAlignment is false', () => {
    mockUseAuth.mockImplementation(() => ({ capabilities: { semanticAlignment: false } }));
    render(<MappingsExporter mappings={sampleMappings} />);

    const arrowBtn = screen.getAllByRole('button')[2];
    expect(arrowBtn).toBeDisabled();
    expect(arrowBtn).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not navigate when arrow button is clicked with semanticAlignment disabled', () => {
    mockUseAuth.mockImplementation(() => ({ capabilities: { semanticAlignment: false } }));
    render(<MappingsExporter mappings={sampleMappings} />);

    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows tooltip on hover when semanticAlignment is disabled and hides on mouseleave', () => {
    mockUseAuth.mockImplementation(() => ({ capabilities: { semanticAlignment: false } }));
    render(<MappingsExporter mappings={sampleMappings} />);

    const arrowBtn = screen.getAllByRole('button')[2];
    fireEvent.mouseEnter(arrowBtn.parentElement);

    expect(screen.getByTestId('tooltip-popup')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-popup')).toHaveTextContent(
      'This deployment does not include Semantic Alignment.'
    );

    fireEvent.mouseLeave(arrowBtn.parentElement);
    expect(screen.queryByTestId('tooltip-popup')).not.toBeInTheDocument();
  });

  it('hides tooltip via its onClose callback', () => {
    mockUseAuth.mockImplementation(() => ({ capabilities: { semanticAlignment: false } }));
    render(<MappingsExporter mappings={sampleMappings} />);

    const arrowBtn = screen.getAllByRole('button')[2];
    fireEvent.mouseEnter(arrowBtn.parentElement);
    expect(screen.getByTestId('tooltip-popup')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tooltip-close'));
    expect(screen.queryByTestId('tooltip-popup')).not.toBeInTheDocument();
  });

  it('does not show tooltip on hover when semanticAlignment is enabled', () => {
    render(<MappingsExporter mappings={sampleMappings} />);

    const arrowBtn = screen.getAllByRole('button')[2];
    fireEvent.mouseEnter(arrowBtn.parentElement);

    expect(screen.queryByTestId('tooltip-popup')).not.toBeInTheDocument();
  });

  it('generates correct CSV for integer mappings with min and max', () => {
    const numericMappings = [
      {
        Amount: {
          groups: [
            {
              values: [
                { name: 'integer' },
                { name: 'min:5' },
                { name: 'max:100' },
              ],
            },
          ],
        },
      },
    ];

    const blobSpy = captureBlobContent();
    render(<MappingsExporter mappings={numericMappings} />);
    fireEvent.click(screen.getByText(/download mappings/i));
    blobSpy.restore();

    expect(blobSpy.getContent()?.[0]).toBe('Amount,integer,min:5,max:100');
    expect(toast.success).toHaveBeenCalled();
  });

  it('generates correct CSV for double mappings without min/max', () => {
    const doubleMappings = [
      {
        Score: {
          groups: [{ values: [{ name: 'double' }] }],
        },
      },
    ];

    const blobSpy = captureBlobContent();
    render(<MappingsExporter mappings={doubleMappings} />);
    fireEvent.click(screen.getByText(/download mappings/i));
    blobSpy.restore();

    expect(blobSpy.getContent()?.[0]).toBe('Score,double,min:,max:');
  });

  it('generates correct CSV for date mappings with earliest and latest', () => {
    const dateMappings = [
      {
        DateCol: {
          groups: [
            {
              values: [
                { name: 'date' },
                { name: 'earliest:2020-01-01' },
                { name: 'latest:2023-12-31' },
              ],
            },
          ],
        },
      },
    ];

    const blobSpy = captureBlobContent();
    render(<MappingsExporter mappings={dateMappings} />);
    fireEvent.click(screen.getByText(/download mappings/i));
    blobSpy.restore();

    expect(blobSpy.getContent()?.[0]).toBe('DateCol,date,earliest:2020-01-01,latest:2023-12-31');
  });

  it('creates both a CSV blob and a JSON spec blob on download', () => {
    const blobSpy = captureBlobContent();
    render(<MappingsExporter mappings={sampleMappings} />);
    fireEvent.click(screen.getByText(/download mappings/i));
    blobSpy.restore();

    const allContents = blobSpy.getAllContents();
    expect(allContents).toHaveLength(2);
    // First blob is CSV
    expect(typeof allContents[0][0]).toBe('string');
    // Second blob is the JSON mapping spec
    expect(() => JSON.parse(allContents[1][0])).not.toThrow();
    const spec = JSON.parse(allContents[1][0]);
    expect(spec).toHaveProperty('specVersion', '2.0.0');
    expect(spec).toHaveProperty('ruleLanguage', 'json-logic');
    expect(spec).toHaveProperty('mappings');
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('includes the schema in the mapping spec when provided', () => {
    const schema = { type: 'object', properties: { TargetCol: { type: 'string' } } };
    const blobSpy = captureBlobContent();
    render(<MappingsExporter mappings={sampleMappings} schema={schema} />);
    fireEvent.click(screen.getByText(/download mappings/i));
    blobSpy.restore();

    const spec = JSON.parse(blobSpy.getAllContents()[1][0]);
    expect(spec.targetSchema).toEqual(schema);
  });

  it('calls onUploadMappings with parsed JSON when a valid file is uploaded', async () => {
    const onUploadMappings = vi.fn();
    const validSpec = { specVersion: '2.0.0', mappings: [] };
    const jsonString = JSON.stringify(validSpec);
    // jsdom does not implement File.prototype.text, so we mock it on the instance
    const file = new File([jsonString], 'spec.json', { type: 'application/json' });
    file.text = vi.fn().mockResolvedValue(jsonString);

    render(<MappingsExporter mappings={sampleMappings} onUploadMappings={onUploadMappings} />);

    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(onUploadMappings).toHaveBeenCalledWith(validSpec);
    });
  });

  it('shows error toast when uploaded file contains invalid JSON', async () => {
    const onUploadMappings = vi.fn();
    const file = new File(['not-json'], 'bad.json', { type: 'application/json' });
    // jsdom does not implement File.prototype.text, so we mock it on the instance
    file.text = vi.fn().mockResolvedValue('not-json');

    render(<MappingsExporter mappings={sampleMappings} onUploadMappings={onUploadMappings} />);

    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Error loading mapping spec'));
    });
    expect(onUploadMappings).not.toHaveBeenCalled();
  });

  it('clicking upload button triggers the hidden file input', () => {
    render(<MappingsExporter mappings={sampleMappings} />);

    const fileInput = document.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByText(/upload mappings/i));
    expect(clickSpy).toHaveBeenCalled();
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

  it('auto-opens a newly added mapping', async () => {
    const { rerender } = render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    const extendedMappings = [
      ...sampleMappings,
      { ExtraCol: { groups: [], fileName: 'extra.csv' } },
    ];

    rerender(
      <MappingsResult
        mappings={extendedMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        {...defaultHandlers}
      />
    );

    await waitFor(() => {
      const extraColCalls = mockHierarchyComponent.mock.calls
        .filter((call) => call[0].mappingKey === 'ExtraCol');
      const lastCall = extraColCalls[extraColCalls.length - 1];
      expect(lastCall?.[0]?.autoOpen).toBe(true);
    });
  });

  it('calls onSelectMapping when a hierarchy onSelect is triggered', () => {
    const onSelectMapping = vi.fn();

    render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        onSelectMapping={onSelectMapping}
        {...defaultHandlers}
      />
    );

    mockHierarchyComponent.lastProps.onSelect();
    expect(onSelectMapping).toHaveBeenCalledWith(0, 'TargetCol');
  });

  it('renames the mapping key when onUpdateMapping is called with a new key', () => {
    let updaterResult;
    const setMappings = vi.fn((updater) => {
      updaterResult = updater([{ TargetCol: { groups: [] } }]);
      return updaterResult;
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

    mockHierarchyComponent.lastProps.onUpdateMapping(0, 'TargetCol', { groups: [] }, 'RenamedCol');

    expect(setMappings).toHaveBeenCalled();
    expect(updaterResult[0]).not.toHaveProperty('TargetCol');
    expect(updaterResult[0]).toHaveProperty('RenamedCol');
  });
});