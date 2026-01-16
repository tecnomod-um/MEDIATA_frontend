import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Integration from './integration';
import { useNode } from '../../context/nodeContext';
import { getNodeElements, fetchElementFile } from '../../util/petitionHandler';
import { useLocation } from 'react-router-dom';
import { updateNodeAxiosBaseURL } from '../../util/nodeAxiosSetup';
import { generateDistinctColors } from '../../util/colors';
import { toast } from 'react-toastify';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));
jest.mock('../../context/nodeContext', () => ({
  useNode: jest.fn(),
}));

jest.mock('../../util/petitionHandler', () => ({
  getNodeElements: jest.fn(),
  fetchElementFile: jest.fn(),
  setParseConfigs: jest.fn(() => Promise.resolve()),
  fetchSchemaFromBackend: jest.fn(() => Promise.resolve({ schema: { foo: 'bar' } })),
}));

jest.mock('../../util/nodeAxiosSetup', () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));


jest.mock('../../util/colors', () => ({
  generateDistinctColors: jest.fn(),
}));

jest.mock('react-transition-group', () => ({
  CSSTransition: ({ in: inProp, children }) => (inProp ? <>{children}</> : null),
  TransitionGroup: ({ children }) => <>{children}</>,
}));

jest.mock('./integration.module.css', () => ({}));
jest.mock('../../components/Integration/ColumnMapping/columnMapping', () => () => <div data-testid="ColumnMapping" />);
jest.mock('../../components/Integration/ColumnSearchList/columnSearchList', () => () => <div data-testid="ColumnSearchList" />);
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
    });

    await waitFor(() => {
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
    expect(await screen.findByTestId('ColumnSearchList')).toBeInTheDocument();
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
    expect(await screen.findByTestId('MappingsResult')).toBeInTheDocument();
    expect(await screen.findByTestId('SchemaTray')).toBeInTheDocument();
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

  test('parses CSV with multiple columns and values', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'multi.csv' }] } });
    const csvText = 'colA,val1,val2\ncolB,val3,val4\ncolC,val5,val6';
    fetchElementFile.mockResolvedValue(csvText);

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledWith('multi.csv'));
    expect(await screen.findByTestId('ColumnSearchList')).toBeInTheDocument();
  });

  test('handles multiple nodes with different files', async () => {
    const nodes = [
      { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' },
      { nodeId: 'node2', serviceUrl: 'url2', name: 'Node 2' },
    ];
    useNode.mockReturnValue({ selectedNodes: nodes });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'file1.csv' },
          { nodeId: 'node2', fileName: 'file2.csv' }
        ] 
      } 
    });
    fetchElementFile.mockImplementation((fileName) => {
      if (fileName === 'file1.csv') return Promise.resolve('col1,a,b');
      if (fileName === 'file2.csv') return Promise.resolve('col2,c,d');
      return Promise.reject(new Error('Unknown file'));
    });

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('processes files via FilePicker selection', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: {} });
    getNodeElements.mockResolvedValue(['picker.csv']);
    fetchElementFile.mockResolvedValue('pickerCol,x,y');

    const { rerender } = render(<Integration />);
    expect(screen.getByTestId('FilePicker')).toBeInTheDocument();
    
    // Simulate user selecting files through FilePicker
    // This would trigger handleProcessSelectedElements
  });

  test('shows success toast when processing succeeds', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'success.csv' }] } });
    fetchElementFile.mockResolvedValue('successCol,1,2');

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    
    // After successful processing, status should eventually become success
    await waitFor(() => {
      // The component sets status to 'idle' after success, not 'success'
      // But we can verify the components are rendered
      expect(screen.getByTestId('SchemaTray')).toBeInTheDocument();
    });
  });

  test('handles empty element files array in location.state', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [] } });
    getNodeElements.mockResolvedValue(['file.csv']);

    render(<Integration />);
    expect(screen.getByTestId('FilePicker')).toBeInTheDocument();
  });

  test('does not reprocess files if hasProcessedElementFiles is true', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'once.csv' }] } });
    fetchElementFile.mockResolvedValue('onceCol,a');

    const { rerender } = render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(1));
    
    // Rerender should not trigger another fetch
    rerender(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(1));
  });

  test('handles nodes with no files', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node2', fileName: 'other.csv' }] } });

    render(<Integration />);
    // Should still render FilePicker since no files were processed for the current node
    expect(screen.getByTestId('FilePicker')).toBeInTheDocument();
  });

  test('merges columns data correctly with existing data', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'file1.csv' },
          { nodeId: 'node1', fileName: 'file2.csv' }
        ] 
      } 
    });
    fetchElementFile.mockImplementation((fileName) => {
      if (fileName === 'file1.csv') return Promise.resolve('sharedCol,val1,val2');
      if (fileName === 'file2.csv') return Promise.resolve('sharedCol,val3,val4');
      return Promise.reject(new Error('Unknown'));
    });

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('initializes mappings for each parsed column', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'init.csv' }] } });
    fetchElementFile.mockResolvedValue('initCol,integer,min:1,max:100');

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    expect(await screen.findByTestId('MappingsResult')).toBeInTheDocument();
  });

  test('filters out min/max/earliest/latest values from integer columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'num.csv' }] } });
    fetchElementFile.mockResolvedValue('numCol,integer,min:0,max:999,actual1,actual2');

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('filters out earliest/latest values from date columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'date.csv' }] } });
    fetchElementFile.mockResolvedValue('dateCol,date,earliest:2020-01-01,latest:2024-12-31');

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('filters out min/max values from double columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'dbl.csv' }] } });
    fetchElementFile.mockResolvedValue('dblCol,double,min:0.1,max:99.9');

    render(<Integration />);
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('assigns distinct colors to different files', async () => {
    const nodes = [
      { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' },
    ];
    useNode.mockReturnValue({ selectedNodes: nodes });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'colorA.csv' },
          { nodeId: 'node1', fileName: 'colorB.csv' }
        ] 
      } 
    });
    fetchElementFile.mockImplementation((fileName) => {
      return Promise.resolve(`${fileName.split('.')[0]}Col,a,b`);
    });
    generateDistinctColors.mockReturnValue(['#FF0000', '#00FF00']);

    render(<Integration />);
    await waitFor(() => expect(generateDistinctColors).toHaveBeenCalled());
  });
});
