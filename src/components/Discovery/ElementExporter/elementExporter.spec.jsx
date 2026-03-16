import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ElementExporter from './elementExporter';
import { saveDatasetElements } from '../../../util/petitionHandler';
import { updateNodeAxiosBaseURL } from '../../../util/nodeAxiosSetup';
import { toast } from 'react-toastify';

const {
  mockNavigate,
  mockSaveDatasetElements,
  mockUpdateNodeAxiosBaseURL,
  mockToastSuccess,
  mockToastError,
  mockToastInfo,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSaveDatasetElements: vi.fn(),
  mockUpdateNodeAxiosBaseURL: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../util/petitionHandler', () => ({
  __esModule: true,
  saveDatasetElements: mockSaveDatasetElements,
}));

vi.mock('../../../util/nodeAxiosSetup', () => ({
  __esModule: true,
  updateNodeAxiosBaseURL: mockUpdateNodeAxiosBaseURL,
}));

vi.mock('../../../context/nodeContext', () => ({
  __esModule: true,
  useNode: () => ({
    selectedNodes: [{ nodeId: 'n1', serviceUrl: 'http://node1' }],
  }),
}));

vi.mock('react-toastify', () => ({
  __esModule: true,
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  },
}));

describe('<ElementExporter />', () => {
  const combinedData = {
    categoricalFeatures: [
      {
        featureName: 'CatCol (file.csv)',
        fileName: 'file.csv',
        categoryCounts: { A: 2, B: 3 },
      },
    ],
    continuousFeatures: [
      {
        featureName: 'ContCol (file.csv)',
        fileName: 'file.csv',
        min: 0,
        max: 10,
      },
    ],
    dateFeatures: [
      {
        featureName: 'DateCol (file.csv)',
        fileName: 'file.csv',
        earliestDate: '2020-01-01',
        latestDate: '2020-01-05',
      },
    ],
    omittedFeatures: [
      {
        featureName: 'OmitCol (file.csv)',
        fileName: 'file.csv',
      },
    ],
  };

  const filteredData = combinedData;
  const dataResults = [{ fileName: 'file.csv', nodeId: 'n1' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads CSV on "Upload Elements" click and shows success toast', async () => {
    mockSaveDatasetElements.mockResolvedValue({});

    render(
      <ElementExporter
        dataResults={dataResults}
        activeFileIndices={[true]}
        combinedData={combinedData}
        filteredData={filteredData}
      />
    );

    fireEvent.click(screen.getByText('Upload Elements'));

    await waitFor(() => {
      expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith('http://node1');
    });

    const expectedCSV = [
      'CatCol,A,B',
      'ContCol,integer,min:0,max:10',
      'DateCol,date,earliest:2020-01-01,latest:2020-01-05',
      'OmitCol,Natural Language',
    ].join('\n');

    await waitFor(() => {
      expect(saveDatasetElements).toHaveBeenCalledWith('file.csv', expectedCSV);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('file.csv saved on server.');
    });
  });

  it('navigates when small button clicked and uploads exist', async () => {
    mockSaveDatasetElements.mockResolvedValue({});

    render(
      <ElementExporter
        dataResults={dataResults}
        activeFileIndices={[true]}
        combinedData={combinedData}
        filteredData={filteredData}
      />
    );

    fireEvent.click(screen.getAllByRole('button')[1]);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/integration', {
        state: {
          elementFiles: [{ nodeId: 'n1', fileName: 'file_elements.csv' }],
        },
      });
    });
  });

  it('does not upload when no files active and shows info toast', async () => {
    render(
      <ElementExporter
        dataResults={dataResults}
        activeFileIndices={[false]}
        combinedData={combinedData}
        filteredData={filteredData}
      />
    );

    fireEvent.click(screen.getAllByRole('button')[1]);

    await waitFor(() => {
      expect(saveDatasetElements).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'No element files were selected or uploaded.'
      );
    });

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('handles save failure and shows error toast', async () => {
    mockSaveDatasetElements.mockRejectedValue(new Error('oops'));

    render(
      <ElementExporter
        dataResults={dataResults}
        activeFileIndices={[true]}
        combinedData={combinedData}
        filteredData={filteredData}
      />
    );

    fireEvent.click(screen.getByText('Upload Elements'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to upload file file.csv: oops'
      );
    });
  });

  it('handles feature name without file label', async () => {
    const dataWithoutLabel = {
      categoricalFeatures: [
        {
          featureName: 'SimpleName',
          fileName: 'file.csv',
          categoryCounts: { A: 2 },
        },
      ],
      continuousFeatures: [],
      dateFeatures: [],
      omittedFeatures: [],
    };

    mockSaveDatasetElements.mockResolvedValue({});

    render(
      <ElementExporter
        dataResults={dataResults}
        activeFileIndices={[true]}
        combinedData={dataWithoutLabel}
        filteredData={dataWithoutLabel}
      />
    );

    fireEvent.click(screen.getByText('Upload Elements'));

    await waitFor(() => {
      expect(saveDatasetElements).toHaveBeenCalled();
    });
  });

  it('handles missing serviceUrl for node', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dataResultsNoService = [{ fileName: 'file.csv', nodeId: 'unknown' }];

    render(
      <ElementExporter
        dataResults={dataResultsNoService}
        activeFileIndices={[true]}
        combinedData={combinedData}
        filteredData={filteredData}
      />
    );

    fireEvent.click(screen.getByText('Upload Elements'));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No serviceUrl found')
      );
    });

    consoleErrorSpy.mockRestore();
  });
});