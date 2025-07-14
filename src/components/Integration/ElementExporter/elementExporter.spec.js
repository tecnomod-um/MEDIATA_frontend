import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ElementExporter from './elementExporter';
import { saveDatasetElements } from '../../../util/petitionHandler';
import { updateNodeAxiosBaseURL } from '../../../util/nodeAxiosSetup';
import { toast } from 'react-toastify';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock('../../../util/petitionHandler', () => ({
  saveDatasetElements: jest.fn(),
}));
jest.mock('../../../util/nodeAxiosSetup', () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));
jest.mock('../../../context/nodeContext', () => ({
  useNode: () => ({
    selectedNodes: [{ nodeId: 'n1', serviceUrl: 'http://node1' }],
  }),
}));
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('<ElementExporter />', () => {
  const combinedData = {
    categoricalFeatures: [
      { featureName: 'CatCol (file.csv)', fileName: 'file.csv', categoryCounts: { A: 2, B: 3 } },
    ],
    continuousFeatures: [
      { featureName: 'ContCol (file.csv)', fileName: 'file.csv', min: 0, max: 10 },
    ],
    dateFeatures: [
      { featureName: 'DateCol (file.csv)', fileName: 'file.csv', earliestDate: '2020-01-01', latestDate: '2020-01-05' },
    ],
    omittedFeatures: [
      { featureName: 'OmitCol (file.csv)', fileName: 'file.csv' },
    ],
  };

  const filteredData = combinedData;
  const dataResults = [{ fileName: 'file.csv', nodeId: 'n1' }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads CSV on "Upload Elements" click and shows success toast', async () => {
    saveDatasetElements.mockResolvedValue({});

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

      const expectedCSV =
        [
          'CatCol,A,B',
          'ContCol,integer,min:0,max:10',
          'DateCol,date,earliest:2020-01-01,latest:2020-01-05',
          'OmitCol,Natural Language',
        ].join('\n');

      expect(saveDatasetElements).toHaveBeenCalledWith('file.csv', expectedCSV);
      expect(toast.success).toHaveBeenCalledWith('file.csv saved on server.');
    });
  });

  it('navigates when small button clicked and uploads exist', async () => {
    saveDatasetElements.mockResolvedValue({});

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
        state: { elementFiles: [{ nodeId: 'n1', fileName: 'file_elements.csv' }] },
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
      expect(toast.info).toHaveBeenCalledWith('No element files were selected or uploaded.');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('handles save failure and shows error toast', async () => {
    saveDatasetElements.mockRejectedValue(new Error('oops'));

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
      expect(toast.error).toHaveBeenCalledWith('Failed to upload file file.csv: oops');
    });
  });
});
