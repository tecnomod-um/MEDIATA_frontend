import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import SemanticAlignment from './semanticAlignment';
import * as colorsUtil from '../../util/colors';
import * as petitionHandler from '../../util/petitionHandler';

jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('react-transition-group', () => ({ CSSTransition: ({ children, in: inProp }) => (inProp ? children : null) }));
jest.mock('../../components/SemanticAlignment/RdfSidebar/rdfSidebar', () => () => (<div data-testid="rdf-sidebar" />));
jest.mock(
  '../../components/SemanticAlignment/ElementDetailPanel/elementDetailPanel',
  () =>
    ({ onBuildClass, onDeleteClass, activeElementIndex, activeCategoryIndex }) => (
      <div data-testid="element-detail">
        <button data-testid="build" onClick={() => onBuildClass([{ name: 'f1' }])}>
          Build
        </button>
        <button
          data-testid="delete"
          onClick={() =>
            onDeleteClass(
              activeCategoryIndex != null
                ? `${activeElementIndex}-cat-${activeCategoryIndex}`
                : `${activeElementIndex}`
            )
          }
        >
          Delete
        </button>
      </div>
    )
);

jest.mock('../../components/SemanticAlignment/RdfCard/rdfCard', () => ({ onCardClick, card }) => (
  <div data-testid={`rdf-card-${card.id}`} onClick={() => onCardClick()}>
    CARD
  </div>
));

jest.mock('../../components/SemanticAlignment/RdfCard/rdfConnection', () => () => (
  <div data-testid="rdf-connection" />
));

jest.mock('../../components/Common/FilePicker/uploadFilePicker', () => {
  class MockFile extends Blob {
    constructor(parts, name, opts) {
      super(parts, opts);
      this.name = name;
      this.lastModified = Date.now();
      this.webkitRelativePath = '';
    }
  }

  return {
    __esModule: true,
    default: ({ onFileUpload }) => (
      <button
        data-testid="file-picker"
        onClick={() =>
          onFileUpload(new MockFile(['x,y'], 'test.csv', { type: 'text/csv' }))
        }
      >
        PICK FILE
      </button>
    ),
  };
});

jest.mock('../../util/colors', () => ({
  generateDistinctColors: jest.fn(),
}));

jest.mock('../../util/petitionHandler', () => ({
  uploadSemanticMappingCsv: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  window.URL.createObjectURL = jest.fn(() => 'blob:url');
});

afterAll(() => jest.restoreAllMocks());

beforeEach(() => {
  jest.clearAllMocks();
  colorsUtil.generateDistinctColors.mockReturnValue(['#aaa']);
  useLocation.mockReturnValue({ state: {} });
});

describe('<SemanticAlignment />', () => {
  it('shows file picker initially on desktop', () => {
    render(<SemanticAlignment />);
    expect(screen.getByTestId('file-picker')).toBeInTheDocument();
  });

  it('logs and swallows invalid base64 in location.state', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
    useLocation.mockReturnValue({ state: { csvData: '!!!invalid!!!' } });
    render(<SemanticAlignment />);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Error loading CSV from navigation:'),
      expect.any(Error)
    );
    spy.mockRestore();
  });

  it('parses valid base64 CSV from location.state and shows panels', async () => {
    const csv = 'A,integer\nB,foo,bar';
    useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
    render(<SemanticAlignment />);
    expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('element-detail')).toBeInTheDocument();
  });

  it('handles file upload via FilePicker', async () => {
    render(<SemanticAlignment />);
    fireEvent.click(screen.getByTestId('file-picker'));
    expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
  });

  describe('desktop controls and stateful flows', () => {
    const renderWithCsv = async (csv) => {
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      await screen.findByTestId('rdf-sidebar');
    };

    let clickStub;
    let logStub;

    beforeEach(() => {
      clickStub = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => { });
      logStub = jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
      clickStub?.mockRestore();
      logStub?.mockRestore();
    });

    it('allows building a class and then deleting it', async () => {
      await renderWithCsv('A,cat1,cat2');
      fireEvent.click(screen.getByTestId('build'));
      expect(screen.getAllByTestId(/^rdf-card-/)).toHaveLength(1);

      fireEvent.click(screen.getByTestId('delete'));
      expect(screen.queryByTestId(/^rdf-card-/)).toBeNull();
    });

    it('network error in downloadCsv triggers toast.error', async () => {
      await renderWithCsv('A,cat1,cat2');
      petitionHandler.uploadSemanticMappingCsv.mockRejectedValueOnce(new Error('netfail'));
      fireEvent.click(screen.getByTestId('build'));

      const processBtn = screen.getByRole('button', { name: /^Process$/i });
      fireEvent.click(processBtn);

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Network error: netfail'))
      );
    });

    it('csvSaved=false triggers toast.error and does NOT download', async () => {
      await renderWithCsv('A,cat1,cat2');
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: false,
        csvMessage: 'csv failed',
        rdfGenerated: false,
        rdfMessage: 'rdf failed',
      });

      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => HTMLElement.prototype.appendChild.call(document.body, node));
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => HTMLElement.prototype.removeChild.call(document.body, node));

      try {
        fireEvent.click(screen.getByTestId('build'));
        const processBtn = screen.getByRole('button', { name: /^Process$/i });
        fireEvent.click(processBtn);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('csv failed'));
        expect(appendSpy).not.toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
      } finally {
        appendSpy.mockRestore();
        removeSpy.mockRestore();
      }
    });

    it('csvSaved=true,rdfGenerated=false triggers two toasts and downloads CSV', async () => {
      await renderWithCsv('A,cat1,cat2');
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: true,
        csvMessage: 'csv ok',
        rdfGenerated: false,
        rdfMessage: 'rdf fail',
      });

      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => HTMLElement.prototype.appendChild.call(document.body, node));
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => HTMLElement.prototype.removeChild.call(document.body, node));

      try {
        fireEvent.click(screen.getByTestId('build'));
        const processBtn = screen.getByRole('button', { name: /^Process$/i });
        fireEvent.click(processBtn);

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('csv ok'));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('rdf fail'));
        expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
      } finally {
        appendSpy.mockRestore();
        removeSpy.mockRestore();
      }
    });

    it('csvSaved=true,rdfGenerated=true with valid JSON', async () => {
      await renderWithCsv('A,cat1,cat2');
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: true,
        csvMessage: 'csv ok',
        rdfGenerated: true,
        rdfMessage: JSON.stringify({ message: 'rdf ok' }),
      });

      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => HTMLElement.prototype.appendChild.call(document.body, node));
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => HTMLElement.prototype.removeChild.call(document.body, node));

      try {
        fireEvent.click(screen.getByTestId('build'));
        const processBtn = screen.getByRole('button', { name: /^Process$/i });
        fireEvent.click(processBtn);

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('csv ok'));
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('rdf ok'));
        expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
      } finally {
        appendSpy.mockRestore();
        removeSpy.mockRestore();
      }
    });

    it('csvSaved=true,rdfGenerated=true with invalid JSON falls back to raw message', async () => {
      await renderWithCsv('A,cat1,cat2');
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: true,
        csvMessage: 'csv ok',
        rdfGenerated: true,
        rdfMessage: 'not json',
      });

      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => HTMLElement.prototype.appendChild.call(document.body, node));
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => HTMLElement.prototype.removeChild.call(document.body, node));

      try {
        fireEvent.click(screen.getByTestId('build'));
        const processBtn = screen.getByRole('button', { name: /^Process$/i });
        fireEvent.click(processBtn);

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('csv ok'));
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('not json'));
        expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
      } finally {
        appendSpy.mockRestore();
        removeSpy.mockRestore();
      }
    });
  });

  describe('layout toggles & minor flows', () => {
    it('switches to mobile layout and back', async () => {
      window.innerWidth = 320;
      window.dispatchEvent(new Event('resize'));
      render(<SemanticAlignment />);
      expect(screen.getByTestId('file-picker')).toBeInTheDocument();
      const csv = 'X';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      expect(await screen.findByTestId('element-detail')).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Workspace/i));
      expect(screen.getByTestId('rdf-connection')).toBeInTheDocument();
    });

    it('clicking "Upload CSV" calls hidden file input click', () => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));

      const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click');
      const csv = 'Y';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      fireEvent.click(screen.getByRole('button', { name: /Upload CSV/i }));
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('zoom in/out and resetZoom works without error', async () => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));
      const csv = 'Z';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);

      const workspace = await screen.findByTestId('rdf-connection');
      fireEvent.wheel(workspace, { deltaY: -50 });
      fireEvent.wheel(workspace, { deltaY: 50 });
      fireEvent.click(screen.getByRole('button', { name: /Reset Zoom/i }));
    });

    it('resizer drag adjusts middle panel width (ARIA first, testid fallback)', async () => {
      const csv = 'W';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);

      const resizer =
        screen.queryByRole('separator', { name: /resize middle panel/i }) ||
        screen.getByTestId('resizer');
      const main = screen.getByTestId('main-content');
      const mid = screen.getByTestId('middle-panel');

      main.getBoundingClientRect = () => ({ left: 0, width: 200 });

      fireEvent.mouseDown(resizer);
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 160 }));
      const width = parseFloat(mid.style.width);
      expect(width).toBeGreaterThanOrEqual(10);
      expect(width).toBeLessThanOrEqual(70);
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
  });
});
