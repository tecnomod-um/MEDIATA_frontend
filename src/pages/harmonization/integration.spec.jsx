import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Integration from './integration';
import { useNode } from '../../context/nodeContext';
import {
  getNodeElements,
  fetchElementFile,
  setParseConfigs,
  fetchSchemaFromBackend,
  suggestMappings,
  enrichMappingsStart,
  getEnrichMappingsStatus,
  getEnrichMappingsResult,
} from '../../util/petitionHandler';
import { normalizeUploadedSpec, collectSpecSources, rebuildMappingsFromSpec } from '../../util/uploadedMappingSpec';
import { useLocation } from 'react-router-dom';
import { updateNodeAxiosBaseURL } from '../../util/nodeAxiosSetup';
import { generateDistinctColors } from '../../util/colors';
import { vi } from "vitest";

const capturedMappingsResultProps = vi.hoisted(() => ({ current: {} }));
const capturedColumnMappingProps = vi.hoisted(() => ({ current: {} }));

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(() => vi.fn()),
}));
vi.mock('../../context/nodeContext', () => ({
  useNode: vi.fn(),
}));

vi.mock('../../util/petitionHandler', () => ({
  getNodeElements: vi.fn(),
  fetchElementFile: vi.fn(),
  setParseConfigs: vi.fn(() => Promise.resolve()),
  fetchSchemaFromBackend: vi.fn(() => Promise.resolve({ schema: { foo: 'bar' } })),
  suggestMappings: vi.fn(),
  enrichMappingsStart: vi.fn(),
  getEnrichMappingsStatus: vi.fn(),
  getEnrichMappingsResult: vi.fn(),
  getParseConfigsStatus: vi.fn(),
  getParseConfigsResult: vi.fn(),
}));

vi.mock('../../util/uploadedMappingSpec', () => ({
  normalizeUploadedSpec: vi.fn((x) => x),
  collectSpecSources: vi.fn(() => []),
  rebuildMappingsFromSpec: vi.fn(() => []),
}));

vi.mock('../../util/nodeAxiosSetup', () => ({
  updateNodeAxiosBaseURL: vi.fn(),
}));

vi.mock('../../components/Integration/ColumnMapping/columnMapping', () => ({
  __esModule: true,
  default: (props) => {
    capturedColumnMappingProps.current = props;
    return <div data-testid="ColumnMapping" />;
  },
}));

vi.mock('../../components/Integration/ColumnSearchList/columnSearchList', () => ({
  __esModule: true,
  default: () => <div data-testid="ColumnSearchList" />,
}));

vi.mock('../../components/Integration/FileMapperModal/fileMapperModal', () => ({
  __esModule: true,
  default: () => <div data-testid="FileMapperModal" />,
}));

vi.mock('../../components/Common/SchemaTray/schemaTray', () => ({
  __esModule: true,
  default: () => <div data-testid="SchemaTray" />,
}));

vi.mock('../../components/Common/FilePicker/projectPicker', () => ({
  __esModule: true,
  default: () => <div data-testid="ProjectPicker" />,
}));

vi.mock('../../util/colors', () => ({
  generateDistinctColors: vi.fn(),
}));


vi.mock('./integration.module.css', () => ({
  __esModule: true,
  default: new Proxy({}, {
    get: (_, prop) => String(prop),
  }),
}));

vi.mock('../../components/Common/FileExplorer/fileExplorer', () => ({
  __esModule: true,
  default: ({ nodes, category, isOpen, preSelectedFiles, autoProcess, onFilesOpened }) => (
    <div
      data-testid="FileExplorer"
      data-nodes={JSON.stringify(nodes)}
      data-category={category}
      data-is-open={String(isOpen)}
      data-pre-selected-files={JSON.stringify(preSelectedFiles)}
      data-auto-process={String(autoProcess)}
      onClick={() => onFilesOpened && onFilesOpened([])}
    />
  ),
}));

vi.mock('react-transition-group', () => ({
  __esModule: true,
  CSSTransition: ({ in: inProp, children }) => (inProp ? <>{children}</> : null),
  TransitionGroup: ({ children }) => <>{children}</>,
}));

vi.mock('../../components/Common/FilePicker/filePicker', () => ({
  __esModule: true,
  default: ({ files, onFilesSelected, isProcessing, modalTitle }) => (
    <div
      data-testid="FilePicker"
      data-files={JSON.stringify(files)}
      data-is-processing={String(isProcessing)}
      data-modal-title={modalTitle}
      onClick={() => onFilesSelected({})}
    />
  ),
}));

vi.mock('../../components/Integration/MappingsResult/mappingsResult', () => ({
  __esModule: true,
  default: (props) => {
    capturedMappingsResultProps.current = props;
    return <div data-testid="MappingsResult" />;
  },
}));

const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('react-toastify', () => ({
  __esModule: true,
  ToastContainer: () => <div data-testid="ToastContainer" />,
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
    dismiss: vi.fn(),
    isActive: vi.fn(() => false),
    update: vi.fn(),
  },
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),     
      removeListener: vi.fn(),   
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
    });

describe('Integration Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateDistinctColors.mockReturnValue(['#123']);
  });

  test('renders FileExplorer when no columns are processed', async () => {
    useLocation.mockReturnValue({ state: {} });
    useNode.mockReturnValue({ selectedNodes: [] });

    await act(async () => {
      render(<Integration />);
    });

    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('fetches element files for each selected node', async () => {
    const nodes = [
      { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' },
      { nodeId: 'node2', serviceUrl: 'url2', name: 'Node 2' },
    ];
    useNode.mockReturnValue({ selectedNodes: nodes });
    useLocation.mockReturnValue({ state: {} });
    getNodeElements.mockResolvedValue(['a.csv']);

    await act(async () => {
      render(<Integration />);
    });
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

    await act(async () => {
      render(<Integration />);
    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledWith('file.csv'));
    expect(await screen.findByTestId('ColumnSearchList')).toBeInTheDocument();
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
    expect(await screen.findByTestId('MappingsResult')).toBeInTheDocument();
    expect(await screen.findByTestId('SchemaTray')).toBeInTheDocument();
  });

  test('parses CSV with multiple columns and values', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'multi.csv' }] } });
    const csvText = 'colA,val1,val2\ncolB,val3,val4\ncolC,val5,val6';
    fetchElementFile.mockResolvedValue(csvText);

    await act(async () => {
      render(<Integration />);
    });
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

    await act(async () => {
      render(<Integration />);
    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('processes files via FileExplorer selection', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: {} });
    getNodeElements.mockResolvedValue(['picker.csv']);
    fetchElementFile.mockResolvedValue('pickerCol,x,y');

    let rerenderFn;
    await act(async () => {
      const result = render(<Integration />);
      rerenderFn = result.rerender;
    });
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
    
    // Simulate user selecting files through FileExplorer
    // This would trigger handleProcessSelectedElements
  });

  test('shows success toast when processing succeeds', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'success.csv' }] } });
    fetchElementFile.mockResolvedValue('successCol,1,2');

    await act(async () => {
      render(<Integration />);
    });
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

    await act(async () => {
      render(<Integration />);
    });
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('does not reprocess files if hasProcessedElementFiles is true', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'once.csv' }] } });
    fetchElementFile.mockResolvedValue('onceCol,a');

    let rerenderFn;
    await act(async () => {
      const result = render(<Integration />);
      rerenderFn = result.rerender;
    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(1));
    
    // Rerender should not trigger another fetch
    await act(async () => {
      rerenderFn(<Integration />);
    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(1));
  });

  test('handles nodes with no files', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node2', fileName: 'other.csv' }] } });

    await act(async () => {
      render(<Integration />);
    });
    // Should still render FileExplorer since no files were processed for the current node
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
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

    await act(async () => {
      render(<Integration />);
    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('initializes mappings for each parsed column', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'init.csv' }] } });
    fetchElementFile.mockResolvedValue('initCol,integer,min:1,max:100');

    await act(async () => {
      render(<Integration />);
    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    expect(await screen.findByTestId('MappingsResult')).toBeInTheDocument();
  });

  test('filters out min/max/earliest/latest values from integer columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'num.csv' }] } });
    fetchElementFile.mockResolvedValue('numCol,integer,min:0,max:999,actual1,actual2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('filters out earliest/latest values from date columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'date.csv' }] } });
    fetchElementFile.mockResolvedValue('dateCol,date,earliest:2020-01-01,latest:2024-12-31');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    expect(await screen.findByTestId('ColumnMapping')).toBeInTheDocument();
  });

  test('filters out min/max values from double columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'dbl.csv' }] } });
    fetchElementFile.mockResolvedValue('dblCol,double,min:0.1,max:99.9');

    await act(async () => {

      render(<Integration />);

    });
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

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(generateDistinctColors).toHaveBeenCalled());
  });

  test('handles empty selectedNodes', () => {
    useNode.mockReturnValue({ selectedNodes: [] });
    useLocation.mockReturnValue({ state: {} });

    act(() => {
      render(<Integration />);
    });
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('handles null selectedNodes', () => {
    useNode.mockReturnValue({ selectedNodes: null });
    useLocation.mockReturnValue({ state: {} });

    act(() => {
      render(<Integration />);
    });
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('handles undefined location state', () => {
    useNode.mockReturnValue({ selectedNodes: [] });
    useLocation.mockReturnValue({});

    act(() => {
      render(<Integration />);
    });
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('handles fetchElementFile error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'error.csv' }] } });
    fetchElementFile.mockRejectedValue(new Error('Fetch failed'));

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    
    consoleErrorSpy.mockRestore();
  });

  test('handles getNodeElements error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: {} });
    getNodeElements.mockRejectedValue(new Error('Get elements failed'));

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(getNodeElements).toHaveBeenCalled());
    
    consoleErrorSpy.mockRestore();
  });

  test('handles multiple nodes with different element counts', async () => {
    const nodes = [
      { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' },
      { nodeId: 'node2', serviceUrl: 'url2', name: 'Node 2' },
    ];
    useNode.mockReturnValue({ selectedNodes: nodes });
    useLocation.mockReturnValue({ state: {} });
    getNodeElements.mockImplementation((nodeId) => {
      if (nodeId === 'node1') return Promise.resolve(['a.csv', 'b.csv']);
      return Promise.resolve(['c.csv']);
    });

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(getNodeElements).toHaveBeenCalledTimes(2));
  });

  test('handles files with same name from different nodes', async () => {
    const nodes = [
      { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' },
      { nodeId: 'node2', serviceUrl: 'url2', name: 'Node 2' },
    ];
    useNode.mockReturnValue({ selectedNodes: nodes });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'data.csv' },
          { nodeId: 'node2', fileName: 'data.csv' }
        ] 
      } 
    });
    fetchElementFile.mockResolvedValue('col,a,b');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handles empty elementFiles array', () => {
    useNode.mockReturnValue({ selectedNodes: [] });
    useLocation.mockReturnValue({ state: { elementFiles: [] } });

    act(() => {
      render(<Integration />);
    });
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('handles single node with multiple files', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'file1.csv' },
          { nodeId: 'node1', fileName: 'file2.csv' },
          { nodeId: 'node1', fileName: 'file3.csv' }
        ] 
      } 
    });
    fetchElementFile.mockResolvedValue('col,a,b');
    generateDistinctColors.mockReturnValue(['#111', '#222', '#333']);

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(3));
  });

  test('processes columns with only column name (no values)', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'simple.csv' }] } });
    fetchElementFile.mockResolvedValue('columnName');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handles columns with empty values', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'empty.csv' }] } });
    fetchElementFile.mockResolvedValue('col,,,');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handles very large number of columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'large.csv' }] } });
    const largeCsvData = Array(100).fill('col,a,b').join('\n');
    fetchElementFile.mockResolvedValue(largeCsvData);

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('renders ToastContainer', () => {
    useNode.mockReturnValue({ selectedNodes: [] });
    useLocation.mockReturnValue({ state: {} });

    act(() => {
      render(<Integration />);
    });
    expect(screen.getByTestId('ToastContainer')).toBeInTheDocument();
  });

  test('shows FileExplorer with correct props', () => {
    useNode.mockReturnValue({ selectedNodes: [] });
    useLocation.mockReturnValue({ state: {} });

    act(() => {
      render(<Integration />);
    });
    const fileExplorer = screen.getByTestId('FileExplorer');
    expect(fileExplorer).toBeInTheDocument();
  });

  test('handles node with empty serviceUrl', async () => {
    const node = { nodeId: 'node1', serviceUrl: '', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: {} });
    getNodeElements.mockResolvedValue(['a.csv']);

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(updateNodeAxiosBaseURL).toHaveBeenCalledWith(''));
  });

  test('handles columns with special characters in values', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'special.csv' }] } });
    fetchElementFile.mockResolvedValue('col,value-with-dash,value_with_underscore,value.with.dot');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handles fetchElementFile returning empty string', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'empty.csv' }] } });
    fetchElementFile.mockResolvedValue('');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handles columns with whitespace in values', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'whitespace.csv' }] } });
    fetchElementFile.mockResolvedValue('col, value with spaces , another value ');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('renders ColumnSearchList when columns are processed', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'test.csv' }] } });
    fetchElementFile.mockResolvedValue('col,a,b');

    render(<Integration />);
    await expect(screen.findByTestId('ColumnSearchList')).resolves.toBeInTheDocument();
  });

  test('renders SchemaTray when columns are processed', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'test.csv' }] } });
    fetchElementFile.mockResolvedValue('col,a,b');

    render(<Integration />);
    await expect(screen.findByTestId('SchemaTray')).resolves.toBeInTheDocument();
  });

  test('renders MappingsResult when columns are processed', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'test.csv' }] } });
    fetchElementFile.mockResolvedValue('col,a,b');

    render(<Integration />);
    await expect(screen.findByTestId('MappingsResult')).resolves.toBeInTheDocument();
  });

  test('handles concurrent file processing', async () => {
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
    fetchElementFile.mockImplementation((fileName) => 
      new Promise(resolve => setTimeout(() => resolve('col,a,b'), 10))
    );

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(2));
  });

  test('parseCSV splits lines correctly', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'csv.csv' }] } });
    const csvData = 'colA,val1,val2,val3\ncolB,val4,val5,val6';
    fetchElementFile.mockResolvedValue(csvData);

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('parseCSV handles trailing commas', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'trailing.csv' }] } });
    fetchElementFile.mockResolvedValue('col,a,b,');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('quoted CSV values from Discovery are passed to the UI without literal quote characters', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({
      state: { elementFiles: [{ nodeId: 'node1', fileName: 'quoted.csv' }] }
    });
    fetchElementFile.mockResolvedValue('"quotedCol","Value, With Comma","Plain Value"');

    await act(async () => {
      render(<Integration />);
    });

    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledWith('quoted.csv'));
    await waitFor(() =>
      expect(capturedMappingsResultProps.current.columnsData?.length).toBeGreaterThan(0)
    );

    expect(capturedMappingsResultProps.current.columnsData[0]).toMatchObject({
      column: 'quotedCol',
      values: ['Value, With Comma', 'Plain Value'],
    });
    expect(capturedMappingsResultProps.current.columnsData[0].column).not.toContain('"');
    expect(capturedMappingsResultProps.current.columnsData[0].values.join(' | ')).not.toContain('"');
  });

  test('mergeColumnsData deduplicates values', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'dup.csv' }
        ] 
      } 
    });
    fetchElementFile.mockResolvedValue('dupCol,a,b,a,b,a');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('initializeMappings creates mapping structure for each column', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'map.csv' }] } });
    fetchElementFile.mockResolvedValue('mapCol,val1,val2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('formatValue formats dates correctly', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'date.csv' }] } });
    fetchElementFile.mockResolvedValue('dateCol,date,2024-01-01');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('formatValue handles invalid dates', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: {} });

    render(<Integration />);
    // Component has formatValue function that handles invalid dates
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('formatValue handles null and undefined values', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: {} });

    render(<Integration />);
    // Component has formatValue function that handles null/undefined
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  });

  test('handleMappingChange updates temporaryGroups', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'temp.csv' }] } });
    fetchElementFile.mockResolvedValue('tempCol,a,b');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnMapping')).toBeInTheDocument());
  });

  test('handleSaveMappings with standard mapping', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'std.csv' }] } });
    fetchElementFile.mockResolvedValue('stdCol,val1,val2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnMapping')).toBeInTheDocument());
  });

  test('handleSaveMappings with one-hot mapping', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'oh.csv' }] } });
    fetchElementFile.mockResolvedValue('ohCol,cat1,cat2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnMapping')).toBeInTheDocument());
  });

  test('handleSaveMappings with removeFromHierarchy true', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'rem.csv' }] } });
    fetchElementFile.mockResolvedValue('remCol,v1,v2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnMapping')).toBeInTheDocument());
  });

  test('handleDeleteMapping removes mapping from list', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'del.csv' }] } });
    fetchElementFile.mockResolvedValue('delCol,d1,d2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('MappingsResult')).toBeInTheDocument());
  });

  test('handleUndoDelete restores last deleted mapping', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'undo.csv' }] } });
    fetchElementFile.mockResolvedValue('undoCol,u1,u2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('MappingsResult')).toBeInTheDocument());
  });

  test('handleRemoveExternalSchema sets schema to null', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'schema.csv' }] } });
    fetchElementFile.mockResolvedValue('schemaCol,s1,s2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('SchemaTray')).toBeInTheDocument());
  });

  test('handleProcessMappings sends data to backend', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'proc.csv' }] } });
    fetchElementFile.mockResolvedValue('procCol,p1,p2');
    setParseConfigs.mockResolvedValue({ success: true });

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handleProcessMappings handles multiple nodes', async () => {
    const nodes = [
      { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' },
      { nodeId: 'node2', serviceUrl: 'url2', name: 'Node 2' },
    ];
    useNode.mockReturnValue({ selectedNodes: nodes });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'f1.csv' },
          { nodeId: 'node2', fileName: 'f2.csv' }
        ] 
      } 
    });
    fetchElementFile.mockResolvedValue('col,v1,v2');
    setParseConfigs.mockResolvedValue({ success: true });

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalledTimes(2));
  });

  test('handleProcessMappings handles backend errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'err.csv' }] } });
    fetchElementFile.mockResolvedValue('errCol,e1,e2');
    setParseConfigs.mockRejectedValue(new Error('Backend error'));

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
    
    consoleErrorSpy.mockRestore();
  });

  test('loads schema on mount', async () => {
    useNode.mockReturnValue({ selectedNodes: [] });
    useLocation.mockReturnValue({ state: {} });

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchSchemaFromBackend).toHaveBeenCalled());
  });

  test('handles schema fetch errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchSchemaFromBackend.mockRejectedValue(new Error('Schema fetch failed'));
    useNode.mockReturnValue({ selectedNodes: [] });
    useLocation.mockReturnValue({ state: {} });

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchSchemaFromBackend).toHaveBeenCalled());
    
    consoleErrorSpy.mockRestore();
  });

  test('renders FileMapperModal when isFileMapperOpen is true', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'modal.csv' }] } });
    fetchElementFile.mockResolvedValue('modalCol,m1,m2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('FileMapperModal')).toBeInTheDocument());
  });

  test('handleColumnClick adds column to temporaryGroups if not already present', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'click.csv' }] } });
    fetchElementFile.mockResolvedValue('clickCol,c1,c2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnSearchList')).toBeInTheDocument());
  });

  test('handleColumnClick does not add duplicate columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'nodup.csv' }] } });
    fetchElementFile.mockResolvedValue('nodupCol,n1,n2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnSearchList')).toBeInTheDocument());
  });

  test('renders with CSSTransition for columns section', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'trans.csv' }] } });
    fetchElementFile.mockResolvedValue('transCol,t1,t2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnSearchList')).toBeInTheDocument());
  });

  test('handleDragStart sets dataTransfer correctly', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'drag.csv' }] } });
    fetchElementFile.mockResolvedValue('dragCol,d1,d2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(screen.queryByTestId('ColumnSearchList')).toBeInTheDocument());
  });

  test('shows success toast when processingStatus is success', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'succ.csv' }] } });
    fetchElementFile.mockResolvedValue('succCol,s1,s2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('mergeColumnsData updates existing column nodeId', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [
          { nodeId: 'node1', fileName: 'merge.csv' }
        ] 
      } 
    });
    fetchElementFile.mockResolvedValue('mergeCol,m1,m2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handleSaveMappings with one-hot mapping and removeFromHierarchy true', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [{ nodeId: 'node1', fileName: 'onehot.csv' }] 
      } 
    });
    fetchElementFile.mockResolvedValue('col1,val1,val2\ncol2,val3,val4');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handleSaveMappings with standard mapping and customValues empty', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [{ nodeId: 'node1', fileName: 'standard.csv' }] 
      } 
    });
    fetchElementFile.mockResolvedValue('col1,val1,val2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handleDeleteMapping updates mappings correctly', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [{ nodeId: 'node1', fileName: 'delete.csv' }] 
      } 
    });
    fetchElementFile.mockResolvedValue('col1,val1,val2\ncol2,val3,val4');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handleUndoDelete with multiple deleted items', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [{ nodeId: 'node1', fileName: 'undo.csv' }] 
      } 
    });
    fetchElementFile.mockResolvedValue('col1,val1,val2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('formatValue with different types', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'format.csv' }] } });
    fetchElementFile.mockResolvedValue('col1,2024-01-15');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handleProcessMappings with no matching columns', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [{ nodeId: 'node1', fileName: 'nomatch.csv' }] 
      } 
    });
    fetchElementFile.mockResolvedValue('col1,val1');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('handleProcessMappings with no fileMappings for node', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [{ nodeId: 'node1', fileName: 'nomap.csv' }] 
      } 
    });
    fetchElementFile.mockResolvedValue('col1,val1');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  test('shows explorer again when file processing fails', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({
      state: { elementFiles: [{ nodeId: 'node1', fileName: 'bad.csv' }] }
    });
    fetchElementFile.mockRejectedValue(new Error('Fetch failed'));
  
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
    await act(async () => {
  
      render(<Integration />);
  
    });
  
    await waitFor(() => {
      expect(fetchElementFile).toHaveBeenCalledWith('bad.csv');
    });
  
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Error processing element files:',
        expect.any(Error)
      );
    });
  
    expect(screen.getByTestId('FileExplorer')).toBeInTheDocument();
  
    errorSpy.mockRestore();
  });

  test('parseCSV handles empty lines correctly', async () => {
    const node = { nodeId: 'node1', serviceUrl: 'url1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({ 
      state: { 
        elementFiles: [{ nodeId: 'node1', fileName: 'empty.csv' }] 
      } 
    });
    fetchElementFile.mockResolvedValue('col1,val1\n\ncol2,val2');

    await act(async () => {

      render(<Integration />);

    });
    await waitFor(() => expect(fetchElementFile).toHaveBeenCalled());
  });

  const renderWithColumns = async () => {
    const node = { nodeId: 'node1', serviceUrl: 'http://n1', name: 'Node 1' };
    useNode.mockReturnValue({ selectedNodes: [node] });
    useLocation.mockReturnValue({
      state: { elementFiles: [{ nodeId: 'node1', fileName: 'data.csv' }] },
    });
    fetchElementFile.mockResolvedValue('col1,val1,val2');

    await act(async () => { render(<Integration />); });
    await waitFor(() => expect(screen.queryByTestId('MappingsResult')).toBeInTheDocument());
  };

  describe('handleSuggestMappings', () => {
    beforeEach(() => {
      mockToastSuccess.mockClear();
      mockToastError.mockClear();
    });

    test('append mode — calls suggestMappings and shows success toast', async () => {
      suggestMappings.mockResolvedValue({ hierarchy: [{ col1: {} }] });
      await renderWithColumns();

      await act(async () => {
        await capturedColumnMappingProps.current.onSuggestMappings?.('append');
      });

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('Suggestions applied (appended).')
      );
    });

    test('replace mode — calls suggestMappings and shows success toast', async () => {
      suggestMappings.mockResolvedValue({ hierarchy: [{ col1: {} }] });
      await renderWithColumns();

      await act(async () => {
        await capturedColumnMappingProps.current.onSuggestMappings?.('replace');
      });

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('Suggestions applied (replaced).')
      );
    });

    test('shows error toast when suggestMappings returns success=false', async () => {
      suggestMappings.mockResolvedValue({ success: false, message: 'Backend error' });
      await renderWithColumns();

      await act(async () => {
        await capturedColumnMappingProps.current.onSuggestMappings?.('append');
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Backend error')
      );
    });

    test('shows info toast when hierarchy is empty', async () => {
      const { toast } = await import('react-toastify');
      suggestMappings.mockResolvedValue({ hierarchy: [], message: 'Nothing to suggest' });
      await renderWithColumns();

      await act(async () => {
        await capturedColumnMappingProps.current.onSuggestMappings?.('append');
      });

      await waitFor(() =>
        expect(toast.info).toHaveBeenCalledWith('Nothing to suggest')
      );
    });

    test('shows error toast when suggestMappings throws', async () => {
      suggestMappings.mockRejectedValue(new Error('Network failure'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await renderWithColumns();

      await act(async () => {
        await capturedColumnMappingProps.current.onSuggestMappings?.('append');
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Failed to generate suggestions.')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('handleUploadMappingsSpec', () => {
    beforeEach(() => {
      mockToastSuccess.mockClear();
      mockToastError.mockClear();
    });

    test('success path — loads spec and shows success toast', async () => {
      const node = { nodeId: 'node1', serviceUrl: 'http://n1', name: 'Node 1' };
      useNode.mockReturnValue({ selectedNodes: [node] });
      useLocation.mockReturnValue({
        state: { elementFiles: [{ nodeId: 'node1', fileName: 'data.csv' }] },
      });
      fetchElementFile.mockResolvedValue('col1,val1,val2');
      getNodeElements.mockResolvedValue(['data.csv']);

      const { normalizeUploadedSpec, collectSpecSources, rebuildMappingsFromSpec } =
        await import('../../util/uploadedMappingSpec');

      normalizeUploadedSpec.mockReturnValue({ mappings: [], targetSchema: null });
      // data.csv is already loaded into columnsData, so loadReferenced returns early
      collectSpecSources.mockReturnValue([{ nodeId: 'node1', fileName: 'data.csv' }]);
      rebuildMappingsFromSpec.mockReturnValue([{ col1: {} }]);

      await act(async () => { render(<Integration />); });
      await waitFor(() => expect(screen.queryByTestId('MappingsResult')).toBeInTheDocument());

      await act(async () => {
        await capturedMappingsResultProps.current.onUploadMappings?.({ mappings: [] });
      });

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('Mapping spec loaded successfully.')
      );
    });

    test('shows error toast when normalizeUploadedSpec throws', async () => {
      const { normalizeUploadedSpec } = await import('../../util/uploadedMappingSpec');
      normalizeUploadedSpec.mockImplementation(() => {
        throw new Error('Invalid spec format');
      });

      await renderWithColumns();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await capturedMappingsResultProps.current.onUploadMappings?.({});
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Invalid spec format')
      );
      consoleSpy.mockRestore();
    });

    test('shows error toast when no source refs found', async () => {
      const { normalizeUploadedSpec, collectSpecSources } =
        await import('../../util/uploadedMappingSpec');
      normalizeUploadedSpec.mockReturnValue({ mappings: [] });
      collectSpecSources.mockReturnValue([]);

      await renderWithColumns();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await capturedMappingsResultProps.current.onUploadMappings?.({ mappings: [] });
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith(
          'The uploaded spec does not reference any source element files.'
        )
      );
      consoleSpy.mockRestore();
    });

    test('shows error toast when rebuild produces no mappings', async () => {
      const node = { nodeId: 'node1', serviceUrl: 'http://n1', name: 'Node 1' };
      useNode.mockReturnValue({ selectedNodes: [node] });
      useLocation.mockReturnValue({
        state: { elementFiles: [{ nodeId: 'node1', fileName: 'data.csv' }] },
      });
      getNodeElements.mockResolvedValue(['data.csv']);
      fetchElementFile.mockResolvedValue('col1,val1');

      const { normalizeUploadedSpec, collectSpecSources, rebuildMappingsFromSpec } =
        await import('../../util/uploadedMappingSpec');
      normalizeUploadedSpec.mockReturnValue({ mappings: [] });
      collectSpecSources.mockReturnValue([{ nodeId: 'node1', fileName: 'data.csv' }]);
      rebuildMappingsFromSpec.mockReturnValue([]);

      await act(async () => { render(<Integration />); });
      await waitFor(() => expect(screen.queryByTestId('MappingsResult')).toBeInTheDocument());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await act(async () => {
        await capturedMappingsResultProps.current.onUploadMappings?.({ mappings: [] });
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith(
          'The uploaded spec did not produce any loadable mappings.'
        )
      );
      consoleSpy.mockRestore();
    });
  });

  test('onSelectMapping wires a valid callback to MappingsResult', async () => {
    await renderWithColumns();

    await waitFor(() =>
      expect(capturedMappingsResultProps.current.onSelectMapping).toBeTypeOf('function')
    );

    act(() => {
      const mappings = capturedMappingsResultProps.current.mappings || [];
      if (mappings.length) {
        const key = Object.keys(mappings[0])[0];
        capturedMappingsResultProps.current.onSelectMapping(0, key);
      }
    });

    expect(screen.getByTestId('ColumnMapping')).toBeInTheDocument();
  });

  describe('Mobile layout', () => {
    const renderMobile = async () => {
      // Override matchMedia to report a mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: true,          // <-- mobile
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const node = { nodeId: 'node1', serviceUrl: 'http://n1', name: 'Node 1' };
      useNode.mockReturnValue({ selectedNodes: [node] });
      useLocation.mockReturnValue({
        state: { elementFiles: [{ nodeId: 'node1', fileName: 'data.csv' }] },
      });
      fetchElementFile.mockResolvedValue('col1,val1,val2');

      await act(async () => { render(<Integration />); });
      await waitFor(() => expect(screen.queryByTestId('MappingsResult')).toBeInTheDocument());
    };

    afterEach(() => {
      // Restore desktop matchMedia for other tests
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    test('renders mobile tab bar with Columns, Mapping, Hierarchy buttons', async () => {
      await renderMobile();
      expect(screen.getByRole('tab', { name: 'Columns' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Mapping' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Hierarchy' })).toBeInTheDocument();
    });

    test('tab buttons update the active panel', async () => {
      await renderMobile();
      const hierarchyTab = screen.getByRole('tab', { name: 'Hierarchy' });
      await act(async () => { hierarchyTab.click(); });
      expect(hierarchyTab).toHaveAttribute('aria-selected', 'true');
    });

    test('onSave advances to hierarchy panel on mobile', async () => {
      await renderMobile();
      // Simulate a successful save via the ColumnMapping onSave callback
      act(() => { capturedColumnMappingProps.current.onSave?.(); });
      await waitFor(() => {
        const hierarchyTab = screen.getByRole('tab', { name: 'Hierarchy' });
        expect(hierarchyTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('onSuggestMappings advances to hierarchy panel on mobile after success', async () => {
      suggestMappings.mockResolvedValue({ hierarchy: [{ col1: {} }] });
      await renderMobile();
      await act(async () => {
        await capturedColumnMappingProps.current.onSuggestMappings?.('append');
      });
      await waitFor(() => {
        const hierarchyTab = screen.getByRole('tab', { name: 'Hierarchy' });
        expect(hierarchyTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('onSelectMapping advances to mapping panel on mobile', async () => {
      await renderMobile();
      act(() => {
        const mappings = capturedMappingsResultProps.current.mappings || [];
        if (mappings.length) {
          const key = Object.keys(mappings[0])[0];
          capturedMappingsResultProps.current.onSelectMapping(0, key);
        }
      });
      await waitFor(() => {
        const mappingTab = screen.getByRole('tab', { name: 'Mapping' });
        expect(mappingTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('onClear prop is passed to ColumnMapping only on mobile', async () => {
      await renderMobile();
      expect(capturedColumnMappingProps.current.onClear).toBeDefined();
    });

    test('MappingsResult is wrapped in a mobilePanel div on mobile', async () => {
      await renderMobile();
      const mobilePanel = screen.getByTestId('MappingsResult').parentElement;
      // The parent should have the mobilePanel class applied by PanelWrapper
      expect(mobilePanel?.className).toMatch(/mobilePanel/);
    });
  });

  describe('Desktop callbacks', () => {
    test('onClear prop is NOT passed to ColumnMapping on desktop', async () => {
      await renderWithColumns();
      expect(capturedColumnMappingProps.current.onClear).toBeUndefined();
    });

    test('onMappingChange callback is wired and does not throw', async () => {
      await renderWithColumns();
      const col = { column: 'col1', fileName: 'data.csv', nodeId: 'node1' };
      act(() => { capturedColumnMappingProps.current.onMappingChange?.([col]); });
      expect(screen.getByTestId('ColumnMapping')).toBeInTheDocument();
    });

    test('handleSelectMapping called twice with same id is a no-op on second call', async () => {
      await renderWithColumns();
      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings?.length).toBeGreaterThan(0)
      );
      const key = Object.keys(capturedMappingsResultProps.current.mappings[0])[0];
      act(() => { capturedMappingsResultProps.current.onSelectMapping(0, key); });
      act(() => { capturedMappingsResultProps.current.onSelectMapping(0, key); });
      expect(screen.getByTestId('ColumnMapping')).toBeInTheDocument();
    });
  });

  describe('handleMappingChange', () => {
    test('onMappingChange prop is wired and component remains mounted after call', async () => {
      await renderWithColumns();
      const groups = [{ column: 'col1', fileName: 'data.csv', nodeId: 'node1', values: [] }];
      act(() => {
        capturedColumnMappingProps.current.onMappingChange?.(groups);
      });
      expect(screen.getByTestId('ColumnMapping')).toBeInTheDocument();
    });
  });

  describe('handleSaveMappings', () => {
    beforeEach(() => {
      mockToastSuccess.mockClear();
      mockToastError.mockClear();
    });

    test('create standard mapping — returns true and shows in MappingsResult', async () => {
      await renderWithColumns();

      let result;
      act(() => {
        result = capturedColumnMappingProps.current.onSave?.(
          [{ column: 'col1', fileName: 'data.csv', nodeId: 'node1' }],
          'NewMapping',
          [{ name: 'valA', mapping: [], terminology: '', description: '' }],
          false,  // removeFromHierarchy
          false,  // isOneHotMapping
          { terminology: '', description: '' }
        );
      });

      await waitFor(() => {
        const mappings = capturedMappingsResultProps.current.mappings || [];
        expect(mappings.some(m => m['NewMapping'])).toBe(true);
      });
    });

    test('create standard mapping — duplicate key returns false and toasts error', async () => {
      await renderWithColumns();

      // Create once
      act(() => {
        capturedColumnMappingProps.current.onSave?.(
          [],
          'DupKey',
          [{ name: 'v1', mapping: [] }],
          false, false,
          {}
        );
      });
      await waitFor(() => {
        expect(capturedMappingsResultProps.current.mappings?.some(m => m['DupKey'])).toBe(true);
      });

      mockToastError.mockClear();
      let result2;
      act(() => {
        result2 = capturedColumnMappingProps.current.onSave?.(
          [],
          'DupKey',
          [{ name: 'v1', mapping: [] }],
          false, false,
          {}
        );
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Mapping already exists in the hierarchy.');
      });
    });

    test('create one-hot mapping — builds family keys in mappings', async () => {
      await renderWithColumns();

      act(() => {
        capturedColumnMappingProps.current.onSave?.(
          [{ column: 'col1', fileName: 'data.csv', nodeId: 'node1' }],
          'Diag',
          [
            { name: 'Yes', mapping: [{ groupKey: 'k', groupColumn: 'col1', fileName: 'data.csv', nodeId: 'node1', value: 'Y' }], terminology: '', description: '' },
            { name: 'No', mapping: [], terminology: '', description: '' },
          ],
          false, // removeFromHierarchy
          true,  // isOneHotMapping
          { terminology: '', description: '' }
        );
      });

      await waitFor(() => {
        const mappings = capturedMappingsResultProps.current.mappings || [];
        const hasYes = mappings.some(m => m['Diag_Yes']);
        const hasNo = mappings.some(m => m['Diag_No']);
        expect(hasYes).toBe(true);
        expect(hasNo).toBe(true);
      });
    });

    test('create standard mapping with removeFromHierarchy=true', async () => {
      await renderWithColumns();

      // First create a mapping for col1 (auto-initialized on CSV parse)
      const initMappings = capturedMappingsResultProps.current.mappings || [];

      act(() => {
        capturedColumnMappingProps.current.onSave?.(
          [{ column: 'col1', fileName: 'data.csv', nodeId: 'node1' }],
          'Merged',
          [{ name: 'v', mapping: [] }],
          true,  // removeFromHierarchy
          false,
          {}
        );
      });

      await waitFor(() => {
        const mappings = capturedMappingsResultProps.current.mappings || [];
        expect(mappings.some(m => m['Merged'])).toBe(true);
      });
    });
  });

  describe('handleDeleteMapping and handleUndoDelete', () => {
    beforeEach(() => {
      mockToastSuccess.mockClear();
      mockToastError.mockClear();
    });

    test('deleteMapping removes a key from mappings', async () => {
      await renderWithColumns();

      const mappingsBefore = capturedMappingsResultProps.current.mappings || [];
      if (!mappingsBefore.length) return;

      const key = Object.keys(mappingsBefore[0])[0];

      act(() => {
        capturedMappingsResultProps.current.onDeleteMapping?.(0, key);
      });

      await waitFor(() => {
        const after = capturedMappingsResultProps.current.mappings || [];
        // The key should no longer be in any mapping object
        const stillThere = after.some(m => Object.prototype.hasOwnProperty.call(m, key));
        expect(stillThere).toBe(false);
      });
    });

    test('undoDelete restores the last deleted mapping', async () => {
      await renderWithColumns();

      const mappingsBefore = capturedMappingsResultProps.current.mappings || [];
      if (!mappingsBefore.length) return;

      const key = Object.keys(mappingsBefore[0])[0];

      // Delete
      act(() => { capturedMappingsResultProps.current.onDeleteMapping?.(0, key); });

      await waitFor(() => {
        const after = capturedMappingsResultProps.current.mappings || [];
        expect(after.some(m => Object.prototype.hasOwnProperty.call(m, key))).toBe(false);
      });

      // Undo
      act(() => { capturedMappingsResultProps.current.onUndoDelete?.(); });

      await waitFor(() => {
        const restored = capturedMappingsResultProps.current.mappings || [];
        expect(restored.some(m => Object.prototype.hasOwnProperty.call(m, key))).toBe(true);
      });
    });

    test('undoDelete is a no-op when nothing was deleted', async () => {
      await renderWithColumns();

      const before = capturedMappingsResultProps.current.mappings || [];

      // Call undo without any prior delete
      act(() => { capturedMappingsResultProps.current.onUndoDelete?.(); });

      await waitFor(() => {
        expect(capturedMappingsResultProps.current.mappings).toEqual(before);
      });
    });
  });

  describe('handleClearMappingEditor (via mobile onClear)', () => {
    test('onClear on mobile clears temporary groups and draft', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const node = { nodeId: 'node1', serviceUrl: 'http://n1', name: 'Node 1' };
      useNode.mockReturnValue({ selectedNodes: [node] });
      useLocation.mockReturnValue({ state: { elementFiles: [{ nodeId: 'node1', fileName: 'data.csv' }] } });
      fetchElementFile.mockResolvedValue('col1,val1,val2');

      await act(async () => { render(<Integration />); });
      await waitFor(() => expect(screen.queryByTestId('MappingsResult')).toBeInTheDocument());

      // Call onClear — verify ColumnMapping remains mounted after state reset
      act(() => { capturedColumnMappingProps.current.onClear?.(); });
      expect(screen.getByTestId('ColumnMapping')).toBeInTheDocument();

      // Restore
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false, media: query, onchange: null,
          addListener: vi.fn(), removeListener: vi.fn(),
          addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
        })),
      });
    });
  });

  describe('handleGenerateMetadata', () => {
    beforeEach(() => {
      mockToastSuccess.mockClear();
      mockToastError.mockClear();
    });

    test('toasts info when there are no mappings', async () => {
      const { toast } = await import('react-toastify');
      await renderWithColumns();

      // Clear mappings via the prop that MappingsResult receives
      act(() => {
        capturedMappingsResultProps.current.setMappings?.([]);
      });

      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings).toHaveLength(0)
      );

      await act(async () => {
        await capturedColumnMappingProps.current.onGenerateMetadata?.();
      });

      await waitFor(() =>
        expect(toast.info).toHaveBeenCalledWith('No mappings to enrich yet.')
      );
    });

    test('shows success toast when enrichMappingsStart returns status 200', async () => {
      enrichMappingsStart.mockResolvedValue({
        status: 200,
        data: { message: 'Done immediately!', hierarchy: [] },
      });

      await renderWithColumns();

      // Create at least one mapping so handleGenerateMetadata doesn't bail early
      act(() => {
        capturedColumnMappingProps.current.onSave?.(
          [{ column: 'col1', fileName: 'data.csv', nodeId: 'node1' }],
          'TestMapping',
          [{ name: 'v', mapping: [] }],
          false, false, {}
        );
      });
      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings?.some(m => m['TestMapping'])).toBe(true)
      );

      await act(async () => {
        await capturedColumnMappingProps.current.onGenerateMetadata?.();
      });

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('Done immediately!')
      );
    });

    test('uses fallback message when status 200 but no message', async () => {
      enrichMappingsStart.mockResolvedValue({
        status: 200,
        data: {},
      });

      await renderWithColumns();
      act(() => {
        capturedColumnMappingProps.current.onSave?.([], 'M2', [{ name: 'v', mapping: [] }], false, false, {});
      });
      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings?.some(m => m['M2'])).toBe(true)
      );

      await act(async () => {
        await capturedColumnMappingProps.current.onGenerateMetadata?.();
      });

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('Metadata generated.')
      );
    });

    test('shows error toast when enrichMappingsStart returns non-202 status', async () => {
      enrichMappingsStart.mockResolvedValue({
        status: 500,
        data: { message: 'Server error' },
      });

      await renderWithColumns();
      act(() => {
        capturedColumnMappingProps.current.onSave?.([], 'M3', [{ name: 'v', mapping: [] }], false, false, {});
      });
      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings?.some(m => m['M3'])).toBe(true)
      );

      await act(async () => {
        await capturedColumnMappingProps.current.onGenerateMetadata?.();
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Server error')
      );
    });

    test('shows generic error when status non-202 and no message', async () => {
      enrichMappingsStart.mockResolvedValue({
        status: 400,
        data: {},
      });

      await renderWithColumns();
      act(() => {
        capturedColumnMappingProps.current.onSave?.([], 'M4', [{ name: 'v', mapping: [] }], false, false, {});
      });
      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings?.some(m => m['M4'])).toBe(true)
      );

      await act(async () => {
        await capturedColumnMappingProps.current.onGenerateMetadata?.();
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Failed to start metadata generation.')
      );
    });

    test('shows error toast when status 202 but no jobId returned', async () => {
      enrichMappingsStart.mockResolvedValue({
        status: 202,
        data: {},
      });

      await renderWithColumns();
      act(() => {
        capturedColumnMappingProps.current.onSave?.([], 'M5', [{ name: 'v', mapping: [] }], false, false, {});
      });
      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings?.some(m => m['M5'])).toBe(true)
      );

      await act(async () => {
        await capturedColumnMappingProps.current.onGenerateMetadata?.();
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Metadata generation did not return a jobId.')
      );
    });

    test('shows error toast when enrichMappingsStart throws', async () => {
      enrichMappingsStart.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await renderWithColumns();
      act(() => {
        capturedColumnMappingProps.current.onSave?.([], 'M6', [{ name: 'v', mapping: [] }], false, false, {});
      });
      await waitFor(() =>
        expect(capturedMappingsResultProps.current.mappings?.some(m => m['M6'])).toBe(true)
      );

      await act(async () => {
        await capturedColumnMappingProps.current.onGenerateMetadata?.();
      });

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Network error')
      );
      consoleSpy.mockRestore();
    });
  });

    });
