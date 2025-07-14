// src/pages/harmonization/semanticAlignment.spec.js

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import SemanticAlignment from './semanticAlignment';
import * as colorsUtil from '../../util/colors';
import * as petitionHandler from '../../util/petitionHandler';

// --- Mocks ---
jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('react-transition-group', () => ({
  CSSTransition: ({ children, in: inProp }) => (inProp ? children : null),
}));
jest.mock(
  '../../components/SemanticAlignment/RdfSidebar/rdfSidebar',
  () => () => <div data-testid="rdf-sidebar" />
);
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
jest.mock(
  '../../components/SemanticAlignment/RdfCard/rdfCard',
  () =>
    ({ onCardClick, card }) => (
      <div data-testid={`rdf-card-${card.id}`} onClick={() => onCardClick()}>
        CARD
      </div>
    )
);
jest.mock(
  '../../components/SemanticAlignment/RdfCard/rdfConnection',
  () => () => <div data-testid="rdf-connection" />
);
jest.mock(
  '../../components/Common/FilePicker/uploadFilePicker',
  () => {
    const FileCtor = globalThis.File;
    return ({ onFileUpload }) => (
      <button
        data-testid="file-picker"
        onClick={() => onFileUpload(new FileCtor(['x,y'], 'test.csv'))}
      >
        PICK FILE
      </button>
    );
  }
);
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

// --- Global shims ---
beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  window.URL.createObjectURL = jest.fn(() => 'blob:url');
});
afterAll(() => jest.restoreAllMocks());

describe('<SemanticAlignment />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ensure colors always returns at least one color
    colorsUtil.generateDistinctColors.mockReturnValue(['#aaa']);
    useLocation.mockReturnValue({ state: {} });
  });

  it('shows file picker initially on desktop', () => {
    render(<SemanticAlignment />);
    expect(screen.getByTestId('file-picker')).toBeInTheDocument();
  });

  it('logs and swallows invalid base64 in location.state', () => {
    console.error = jest.fn();
    useLocation.mockReturnValue({ state: { csvData: '!!!invalid!!!' } });
    render(<SemanticAlignment />);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error loading CSV from navigation:'),
      expect.any(Error)
    );
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
    beforeEach(async () => {
      // preload a CSV so desktop layout appears
      const csv = 'A,cat1,cat2';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      await screen.findByTestId('rdf-sidebar');
    });

    it('allows building a class and then deleting it', () => {
      fireEvent.click(screen.getByTestId('build'));
      expect(screen.getAllByTestId(/^rdf-card-/)).toHaveLength(1);

      fireEvent.click(screen.getByTestId('delete'));
      expect(screen.queryByTestId(/^rdf-card-/)).toBeNull();
    });

    it('network error in downloadCsv triggers toast.error', async () => {
      petitionHandler.uploadSemanticMappingCsv.mockRejectedValueOnce(new Error('netfail'));
      fireEvent.click(screen.getByTestId('build'));
      fireEvent.click(screen.getByRole('button', { name: /Process/i }));
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Network error: netfail'))
      );
    });

    it('csvSaved=false triggers toast.error and does NOT download', async () => {
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: false,
        csvMessage: 'csv failed',
        rdfGenerated: false,
        rdfMessage: 'rdf failed',
      });

      // spy but still allow DOM insertion
      const origAppend = document.body.appendChild.bind(document.body);
      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => origAppend(node));
      const origRemove = document.body.removeChild.bind(document.body);
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => origRemove(node));

      fireEvent.click(screen.getByTestId('build'));
      fireEvent.click(screen.getByRole('button', { name: /Process/i }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('csv failed'));
      // since csvSaved=false, no download <a> was appended
      expect(appendSpy).not.toHaveBeenCalledWith(expect.any(HTMLAnchorElement));

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('csvSaved=true,rdfGenerated=false triggers two toasts and downloads CSV', async () => {
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: true,
        csvMessage: 'csv ok',
        rdfGenerated: false,
        rdfMessage: 'rdf fail',
      });

      const origAppend = document.body.appendChild.bind(document.body);
      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => origAppend(node));
      const origRemove = document.body.removeChild.bind(document.body);
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => origRemove(node));

      fireEvent.click(screen.getByTestId('build'));
      fireEvent.click(screen.getByRole('button', { name: /Process/i }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('csv ok'));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('rdf fail'));
      // download should have been attempted
      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('csvSaved=true,rdfGenerated=true with valid JSON', async () => {
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: true,
        csvMessage: 'csv ok',
        rdfGenerated: true,
        rdfMessage: JSON.stringify({ message: 'rdf ok' }),
      });

      const origAppend = document.body.appendChild.bind(document.body);
      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => origAppend(node));
      const origRemove = document.body.removeChild.bind(document.body);
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => origRemove(node));

      fireEvent.click(screen.getByTestId('build'));
      fireEvent.click(screen.getByRole('button', { name: /Process/i }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('csv ok'));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('rdf ok'));
      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('csvSaved=true,rdfGenerated=true with invalid JSON falls back to raw message', async () => {
      petitionHandler.uploadSemanticMappingCsv.mockResolvedValueOnce({
        csvSaved: true,
        csvMessage: 'csv ok',
        rdfGenerated: true,
        rdfMessage: 'not json',
      });

      const origAppend = document.body.appendChild.bind(document.body);
      const appendSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => origAppend(node));
      const origRemove = document.body.removeChild.bind(document.body);
      const removeSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => origRemove(node));

      fireEvent.click(screen.getByTestId('build'));
      fireEvent.click(screen.getByRole('button', { name: /Process/i }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('csv ok'));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('not json'));
      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('layout toggles & minor flows', () => {
    it('switches to mobile layout and back', async () => {
      window.innerWidth = 320;
      window.dispatchEvent(new Event('resize'));
      render(<SemanticAlignment />);
      expect(screen.getByTestId('file-picker')).toBeInTheDocument();

      // now load elements
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

    it('zoom in/out and resetZoom works without error', () => {

      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));
      const csv = 'Z';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      render(<SemanticAlignment />);
      const workspace = screen.getByTestId('rdf-connection').parentElement;
      fireEvent.wheel(workspace, { deltaY: -50 });
      fireEvent.wheel(workspace, { deltaY: 50 });
      fireEvent.click(screen.getByRole('button', { name: /Reset Zoom/i }));
    });

    it('resizer drag adjusts middle panel width', () => {
      const csv = 'W';
      useLocation.mockReturnValue({ state: { csvData: btoa(csv) } });
      const { container } = render(<SemanticAlignment />);
      const resizer = container.querySelector('.resizer');
      fireEvent.mouseDown(resizer);

      const main = container.querySelector('.mainContent');
      main.getBoundingClientRect = () => ({ left: 0, width: 200 });

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 160 }));
      const mid = container.querySelector('.middlePanel');
      const width = parseFloat(mid.style.width);
      expect(width).toBeGreaterThanOrEqual(10);
      expect(width).toBeLessThanOrEqual(70);

      window.dispatchEvent(new MouseEvent('mouseup'));
    });
  });
});
