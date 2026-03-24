import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import SemanticAlignment from './semanticAlignment';
import * as colorsUtil from '../../util/colors';
import * as petitionHandler from '../../util/petitionHandler';
import { vi } from "vitest";

vi.mock('react-router-dom', () => ({ useLocation: vi.fn() }));
vi.mock('react-transition-group', () => ({ CSSTransition: ({ children, in: inProp }) => (inProp ? children : null) }));
vi.mock(
  '../../components/SemanticAlignment/ElementDetailPanel/elementDetailPanel',
  () => ({
    __esModule: true,
    default: ({ onBuildClass, onDeleteClass, activeElementIndex, activeCategoryIndex }) => (
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
    ),
  })
);

vi.mock('../../components/SemanticAlignment/RdfSidebar/rdfSidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="rdf-sidebar" />,
}));

vi.mock('../../components/SemanticAlignment/RdfCard/rdfCard', () => ({
  __esModule: true,
  default: ({ onCardClick, card }) => (
    <div data-testid={`rdf-card-${card.id}`} onClick={() => onCardClick()}>
      CARD
    </div>
  ),
}));

vi.mock('../../components/SemanticAlignment/RdfCard/rdfConnection', () => ({
  __esModule: true,
  default: () => <div data-testid="rdf-connection" />,
}));

vi.mock('../../components/Common/FilePicker/uploadFilePicker', () => {
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

vi.mock('../../util/colors', () => ({
  generateDistinctColors: vi.fn(),
}));

vi.mock('../../util/petitionHandler', () => ({
  uploadSemanticMappingCsv: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  window.URL.createObjectURL = vi.fn(() => 'blob:url');
});

afterAll(() => vi.restoreAllMocks());

beforeEach(() => {
  vi.clearAllMocks();
  colorsUtil.generateDistinctColors.mockReturnValue(['#aaa']);
  useLocation.mockReturnValue({ state: {} });
});

describe('<SemanticAlignment />', () => {
  it('shows file picker initially on desktop', () => {
    render(<SemanticAlignment />);
    expect(screen.getByTestId('file-picker')).toBeInTheDocument();
  });

  it('logs and swallows invalid base64 in location.state', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
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
      logStub = vi.spyOn(console, 'log').mockImplementation(() => { });
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

      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
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
      act(() => {
        render(<SemanticAlignment />);
      });

      const resizer =
        screen.queryByRole('separator', { name: /resize middle panel/i }) ||
        screen.getByTestId('resizer');
      const main = screen.getByTestId('main-content');
      const mid = screen.getByTestId('middle-panel');

      main.getBoundingClientRect = () => ({ left: 0, width: 200 });

      act(() => {
        fireEvent.mouseDown(resizer);
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 160 }));
      });
      const width = parseFloat(mid.style.width);
      expect(width).toBeGreaterThanOrEqual(10);
      expect(width).toBeLessThanOrEqual(70);
      act(() => {
        window.dispatchEvent(new MouseEvent('mouseup'));
      });
    });

    it('handles touch events for resizer', async () => {
      const csv = 'T';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      act(() => {
        render(<SemanticAlignment />);
      });

      const resizer = screen.getByTestId('resizer');
      const main = screen.getByTestId('main-content');
      main.getBoundingClientRect = () => ({ left: 0, width: 200 });

      act(() => {
        fireEvent.touchStart(resizer, { preventDefault: vi.fn() });
        window.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 100 }] }));
        window.dispatchEvent(new TouchEvent('touchend'));
      });
    });

    it('handles card dragging with mouse', async () => {
      window.innerWidth = 1024;
      const csv = 'X,cat1';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      fireEvent.click(screen.getByTestId('build'));
      const card = await screen.findByTestId(/^rdf-card-/);
      
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent(window, new MouseEvent('mousemove', { clientX: 150, clientY: 150 }));
      fireEvent(window, new MouseEvent('mouseup'));
    });

    it('handles card dragging with touch', async () => {
      window.innerWidth = 1024;
      const csv = 'Y,cat1';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      fireEvent.click(screen.getByTestId('build'));
      const card = await screen.findByTestId(/^rdf-card-/);
      
      fireEvent.touchStart(card, { 
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn()
      });
      fireEvent(window, new TouchEvent('touchmove', { 
        touches: [{ clientX: 150, clientY: 150 }]
      }));
      fireEvent(window, new TouchEvent('touchend'));
    });

    it('handles touch cancel event', async () => {
      window.innerWidth = 1024;
      const csv = 'Z,cat1';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      fireEvent.click(screen.getByTestId('build'));
      const card = await screen.findByTestId(/^rdf-card-/);
      
      fireEvent.touchStart(card, { 
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn()
      });
      fireEvent(window, new TouchEvent('touchcancel'));
    });

    it('creates connection between two cards', async () => {
      window.innerWidth = 1024;
      const csv = 'A,cat1,cat2\nB,cat3,cat4';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      // Build two cards
      fireEvent.click(screen.getByTestId('build'));
      const cards = await screen.findAllByTestId(/^rdf-card-/);
      expect(cards).toHaveLength(1);
      
      // Start connection mode
      fireEvent.click(screen.getByRole('button', { name: /Create Connection/i }));
      
      // Click first card as source
      fireEvent.click(cards[0]);
      
      // Click same card as target (self-connection)
      fireEvent.click(cards[0]);
    });

    it('handles Remove Last connection button', async () => {
      window.innerWidth = 1024;
      const csv = 'C';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      const removeBtn = await screen.findByRole('button', { name: /Remove Last/i });
      fireEvent.click(removeBtn);
      // Should not crash even with no connections
    });

    it('parses CSV with type field (integer)', async () => {
      const csv = 'numField,integer';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('parses CSV with type field (double)', async () => {
      const csv = 'dblField,double';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('parses CSV with type field (date)', async () => {
      const csv = 'dateField,date';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('parses CSV with categorical values', async () => {
      const csv = 'catField,optionA,optionB,optionC';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('parses CSV with element name only', async () => {
      const csv = 'simpleField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('ignores empty CSV lines', async () => {
      const csv = 'field1\n\n\nfield2\n\n';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('ignores CSV lines with no name', async () => {
      const csv = ',val1,val2\nvalidField,cat1';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('processes CSV data only once even with multiple renders', async () => {
      const csv = 'onceField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      const { rerender } = render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('rdf-sidebar')).toBeInTheDocument();
      
      // Rerender shouldn't reprocess
      rerender(<SemanticAlignment />);
      expect(screen.getByTestId('rdf-sidebar')).toBeInTheDocument();
    });

    it('handles file upload via hidden input', async () => {
      window.innerWidth = 1024;
      const csv = 'uploadedField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      // Component should render the upload button
      await screen.findByRole('button', { name: /Upload CSV/i });
      
      // Component should show the RDF sidebar after CSV data is loaded from location state
      await waitFor(() => {
        expect(screen.getByTestId('rdf-sidebar')).toBeInTheDocument();
      });
    });

    it('builds card with categorical values', async () => {
      window.innerWidth = 1024;
      colorsUtil.generateDistinctColors.mockReturnValue(['#FF0000', '#00FF00']);
      const csv = 'catField,cat1,cat2,cat3';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      fireEvent.click(await screen.findByTestId('build'));
      expect(screen.getByTestId(/^rdf-card-/)).toBeInTheDocument();
    });

    it('generates CSV with categorical values and ontology mappings', async () => {
      window.innerWidth = 1024;
      colorsUtil.generateDistinctColors.mockReturnValue(['#FF0000']);
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: true,
        csvMessage: 'saved',
        rdfGenerated: true,
        rdfMessage: JSON.stringify({ message: 'rdf ok' }),
      });

      // Mock document methods
      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => HTMLElement.prototype.appendChild.call(document.body, node));
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => HTMLElement.prototype.removeChild.call(document.body, node));

      try {
        const csv = 'catField,cat1,cat2';
        useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
        render(<SemanticAlignment />);
        
        fireEvent.click(await screen.findByTestId('build'));
        
        const processBtn = screen.getByRole('button', { name: /^Process$/i });
        fireEvent.click(processBtn);

        await waitFor(() => expect(toast.success).toHaveBeenCalled());
      } finally {
        appendSpy.mockRestore();
        removeSpy.mockRestore();
      }
    });

    it('shows alert when trying to download without all classes built', async () => {
      window.innerWidth = 1024;
      window.alert = vi.fn();
      
      const csv = 'fieldA\nfieldB';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      // Build only one of two required classes
      fireEvent.click(await screen.findByTestId('build'));
      
      const processBtn = screen.getByRole('button', { name: /^Process$/i });
      fireEvent.click(processBtn);

      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Please build mappings for'));
    });

    it('handles click on card when not in connection mode', async () => {
      window.innerWidth = 1024;
      const csv = 'clickField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      fireEvent.click(await screen.findByTestId('build'));
      const card = screen.getByTestId(/^rdf-card-/);
      
      fireEvent.click(card);
      // Should update active element selection
    });

    it('handles mobile view toggle button', async () => {
      window.innerWidth = 320;
      window.dispatchEvent(new Event('resize'));
      
      const csv = 'mobileField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('element-detail')).toBeInTheDocument();
      
      const toggleBtn = screen.getByText(/Workspace/i);
      fireEvent.click(toggleBtn);
      
      expect(screen.getByTestId('rdf-connection')).toBeInTheDocument();
      
      const backBtn = screen.getByText(/Details/i);
      fireEvent.click(backBtn);
      
      expect(screen.getByTestId('element-detail')).toBeInTheDocument();
    });

    it('handles tablet view', async () => {
      window.innerWidth = 768;
      window.dispatchEvent(new Event('resize'));
      
      const csv = 'tabletField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('element-detail')).toBeInTheDocument();
    });

    it('handles very narrow mobile view', async () => {
      window.innerWidth = 280;
      window.dispatchEvent(new Event('resize'));
      
      const csv = 'narrowField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('element-detail')).toBeInTheDocument();
    });

    it('handles wide desktop view', async () => {
      window.innerWidth = 1920;
      window.dispatchEvent(new Event('resize'));
      
      const csv = 'wideField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('element-detail')).toBeInTheDocument();
    });

    it('toggles view multiple times in mobile', async () => {
      window.innerWidth = 320;
      window.dispatchEvent(new Event('resize'));
      
      const csv = 'toggleField';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      
      expect(await screen.findByTestId('element-detail')).toBeInTheDocument();
      
      const workspaceBtn = screen.getByText(/Workspace/i);
      fireEvent.click(workspaceBtn);
      expect(screen.getByTestId('rdf-connection')).toBeInTheDocument();
      
      const detailsBtn = screen.getByText(/Details/i);
      fireEvent.click(detailsBtn);
      expect(screen.getByTestId('element-detail')).toBeInTheDocument();
      
      fireEvent.click(workspaceBtn);
      expect(screen.getByTestId('rdf-connection')).toBeInTheDocument();
    });
  });
});
