import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Integration from './integration';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));
import { useLocation } from 'react-router-dom';

jest.mock('../../context/nodeContext', () => ({
  useNode: jest.fn(),
}));
import { useNode } from '../../context/nodeContext';

jest.mock('../../util/petitionHandler', () => ({
  getNodeElements: jest.fn(),
  fetchElementFile: jest.fn(),
  setParseConfigs: jest.fn(() => Promise.resolve()),
  fetchSchemaFromBackend: jest.fn(() => Promise.resolve({ schema: { foo: 'bar' } })),
}));
import { getNodeElements, fetchElementFile } from '../../util/petitionHandler';

jest.mock('../../util/nodeAxiosSetup', () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));
import { updateNodeAxiosBaseURL } from '../../util/nodeAxiosSetup';

jest.mock('../../util/colors', () => ({
  generateDistinctColors: jest.fn(),
}));
import { generateDistinctColors } from '../../util/colors';


jest.mock('./integration.module.css', () => ({}));
jest.mock('../../components/Integration/ColumnMapping/columnMapping', () => () => <div data-testid="ColumnMapping" />);
jest.mock('../../components/Integration/ColumnSearch/columnSearch', () => () => <div data-testid="ColumnSearch" />);
jest.mock('../../components/Integration/FileMapperModal/fileMapperModal', () => () => <div data-testid="FileMapperModal" />);
jest.mock('../../components/Common/FilePicker/filePicker', () => ({ files, onFilesSelected, isProcessing, modalTitle }) => (
  <div
    data-testid="FilePicker"
    data-files={JSON.stringify(files)}
    data-is-processing={isProcessing}
    data-modal-title={modalTitle}
    onClick={() => onFilesSelected({ /* nodeId:file list mapping */ })}
  />
));

jest.mock('../../components/Common/SchemaTray/schemaTray', () => () => <div data-testid="SchemaTray" />);
jest.mock('../../components/Integration/MappingsResult/mappingsResult', () => () => <div data-testid="MappingsResult" />);
jest.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="ToastContainer" />,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
import { toast } from 'react-toastify';

describe('Integration Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateDistinctColors.mockReturnValue(['#123']);
  });

  test('renders FilePicker when no columns are processed', () => {
    useLocation.mockReturnValue({ state: {} });
    useNode.mockReturnValue({ selectedNodes: [] });

    render(<Integration />);

    expect(screen.getByTestId('FilePicker')).toBeInTheDocument();
  });

  test('fetches element files for each selected node', async () => {
    const nodes = [
      { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' },
      { nodeId: 'node2', serviceUrl: 'url2', name: 'Node 2' },
    ];
    useNode.mockReturnValue({ selectedNodes: nodes });
    useLocation.mockReturnValue({ state: {} });
    getNodeElements.mockResolvedValue(['a.csv']);

    render(<Integration />);
    await waitFor(() => {
      expect(updateNodeAxiosBaseURL).toHaveBeenCalledTimes(nodes.length);
      expect(getNodeElements).toHaveBeenCalledTimes(nodes.length);
    });
  });

  test('processes files from location.state.elementFiles and shows child components', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'file.csv' }] } });
    const csvText = 'col1,1,2\ncol2,3,4';
    fetchElementFile.mockResolvedValue(csvText);

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledWith('file.csv'));
    expect(screen.getByTestId('ColumnSearch')).toBeInTheDocument();
    expect(screen.getByTestId('ColumnMapping')).toBeInTheDocument();
    expect(screen.getByTestId('MappingsResult')).toBeInTheDocument();
    expect(screen.getByTestId('SchemaTray')).toBeInTheDocument();
  });

  test('shows error toast when file processing fails', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'bad.csv' }] } });
    fetchElementFile.mockRejectedValue(new Error('Fetch failed'));
    render(<Integration />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('An error occurred during processing.');
    });
    expect(screen.getByTestId('FilePicker')).toBeInTheDocument();
  });
});
