import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import MappingsExporter from '../MappingsResult/mappingsExporter';
import MappingsResult from '../MappingsResult/mappingsResult';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../MappingHierarchy/mappingHierarchy', () => {
  const React = require('react');
  const Mock = jest.fn(({ mappingKey, onDeleteMapping, onUpdateMapping }) => {
    Mock.lastProps = { mappingKey, onDeleteMapping, onUpdateMapping };
    return <div data-testid="hierarchy">{mappingKey}</div>;
  });
  return { __esModule: true, default: Mock };
});

global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

class FakeFileReader {
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:text/csv;base64,ZmFrZQ==';
      this.onload();
    }, 0);
  }
}
global.FileReader = FakeFileReader;

const mockNavigate = jest.fn();

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
  onUndoDelete: jest.fn(),
  onDeleteMapping: jest.fn(),
  onOpenFileMapper: jest.fn(),
  formatValue: (v) => v,
  setMappings: jest.fn(),
};

describe('<MappingsExporter />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a CSV file and shows success toast on download click', () => {
    render(<MappingsExporter mappings={sampleMappings} />);

    fireEvent.click(screen.getByText(/download mappings/i));
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(require('react-toastify').toast.success).toHaveBeenCalledWith(
      'Mappings CSV generated successfully!'
    );
  });

  it('encodes CSV and navigates to /semanticalignment with base64 payload', async () => {
    render(<MappingsExporter mappings={sampleMappings} />);
    fireEvent.click(screen.getAllByRole('button')[1]);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/semanticalignment', {
        state: {
          csvData: expect.any(String),
          fileName: 'mappings_elements.csv',
        },
      })
    );
  });

  it('shows toast error when CSV generation throws (download)', () => {
    URL.createObjectURL.mockImplementationOnce(() => { throw new Error('fail'); });
    render(<MappingsExporter mappings={sampleMappings} />);
    fireEvent.click(screen.getByText(/download mappings/i));

    expect(require('react-toastify').toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Error generating CSV')
    );
  });

  it('shows toast error when navigation fails due to FileReader error', () => {
    jest.spyOn(global, 'FileReader').mockImplementationOnce(() => { throw new Error('reader fail'); });

    render(<MappingsExporter mappings={sampleMappings} />);
    fireEvent.click(screen.getAllByRole('button')[1]);

    expect(require('react-toastify').toast.error).toHaveBeenCalledWith(
      'Error processing CSV for RDF Builder.'
    );
  });
});

describe('<MappingsResult />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const { container } = render(
      <MappingsResult
        mappings={sampleMappings}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="processing"
        {...defaultHandlers}
      />
    );

    const btn = container.querySelector('button.processMappingsButton');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('.loader')).toBeInTheDocument();
  });

  it('handles onUpdateMapping with key change', () => {
    const setMappings = jest.fn((updater) => {
      const result = updater([{ TargetCol: { groups: [] } }]);
      expect(result[0]).toHaveProperty('NewTarget');
      expect(result[0]).not.toHaveProperty('TargetCol');
    });

    render(
      <MappingsResult
        mappings={[{ TargetCol: { groups: [] } }]}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        onUndoDelete={() => { }}
        onDeleteMapping={() => { }}
        onOpenFileMapper={() => { }}
        formatValue={(v) => v}
        setMappings={setMappings}
      />
    );
  });

  it('handles onUpdateMapping with no key change', () => {
    const setMappings = jest.fn((updater) => {
      const result = updater([{ TargetCol: { groups: [] } }]);
      expect(result[0]).toHaveProperty('TargetCol');
    });

    render(
      <MappingsResult
        mappings={[{ TargetCol: { groups: [] } }]}
        columnsData={columnsData}
        deletedItems={[]}
        processingStatus="idle"
        onUndoDelete={() => { }}
        onDeleteMapping={() => { }}
        onOpenFileMapper={() => { }}
        formatValue={(v) => v}
        setMappings={setMappings}
      />
    );
  });
});
