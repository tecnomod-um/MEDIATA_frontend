import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router-dom';
import { updateNodeAxiosBaseURL } from '../../../util/nodeAxiosSetup';
import { getNodeDatasets } from '../../../util/petitionHandler';
import { toast } from 'react-toastify';
import FileMapperModal from './fileMapperModal';

jest.mock('react-router-dom', () => ({ useNavigate: jest.fn() }));
jest.mock('../../../util/nodeAxiosSetup', () => ({ updateNodeAxiosBaseURL: jest.fn() }));
jest.mock('../../../util/petitionHandler', () => ({ getNodeDatasets: jest.fn() }));

jest.mock('react-switch', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ checked, onChange }) => (
      <input
        type="checkbox"
        data-testid="mock-switch"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    ),
  };
});

jest.mock('react-transition-group', () => ({ CSSTransition: ({ children }) => <>{children}</> }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));
jest.mock('../../Unused/OverlayWrapper/overlayWrapper', () => ({ isOpen, closeModal, children }) =>
  isOpen ? <div data-testid="overlay">{children}</div> : null
);

const defaultProps = {
  isOpen: true,
  closeModal: jest.fn(),
  mappings: {},
  columnsData: [
    { nodeId: 'n1', fileName: 'a.csv', color: '#111' },
    { nodeId: 'n2', fileName: 'b.xlsx', color: '#222' },
  ],
  nodes: [
    { nodeId: 'n1', name: 'Node1', serviceUrl: 'url1' },
    { nodeId: 'n2', name: 'Node2', serviceUrl: 'url2' },
  ],
  onSend: jest.fn().mockResolvedValue(),
};

describe('FileMapperModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getNodeDatasets.mockResolvedValue(['ds1.csv', 'ds2.csv']);
    useNavigate.mockReturnValue(jest.fn());
  });

  it('renders overlay and header', () => {
    render(<FileMapperModal {...defaultProps} />);
    expect(screen.getByTestId('overlay')).toBeInTheDocument();
    expect(screen.getByText(/Select datasets to change/i)).toBeInTheDocument();
  });

  it('shows empty-state when no processed files', () => {
    render(<FileMapperModal {...defaultProps} columnsData={[]} />);
    expect(screen.getByText(/No processed element files found/i)).toBeInTheDocument();
  });

  it('fetches datasets on open', async () => {
    render(<FileMapperModal {...defaultProps} />);
    await waitFor(() => {
      expect(updateNodeAxiosBaseURL).toHaveBeenCalledTimes(2);
      expect(getNodeDatasets).toHaveBeenCalledTimes(2);
    });
  });

  it('toggles a dataset on and off', async () => {
    render(<FileMapperModal {...defaultProps} />);
    await waitFor(() => expect(screen.getAllByText('ds1.csv').length).toBeGreaterThan(0));
    const dsItems = screen.getAllByText('ds1.csv');
    const firstItem = dsItems[0];
    fireEvent.click(firstItem);
    expect(firstItem.closest('div')).toHaveClass('selected');
    fireEvent.click(firstItem);
    expect(firstItem.closest('div')).not.toHaveClass('selected');
  });

  it('keeps Apply disabled when nothing is selected', () => {
    render(<FileMapperModal {...defaultProps} />);
    const applyBtn = screen.getByRole('button', { name: /^Apply$/i });
    expect(applyBtn).toBeDisabled();
  });

  it('enables buttons once a dataset is selected, calls onSend, closeModal, and navigate', async () => {
    const mockNav = jest.fn();
    useNavigate.mockReturnValue(mockNav);

    render(<FileMapperModal {...defaultProps} />);
    await waitFor(() => expect(screen.getAllByText('ds1.csv').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('ds1.csv')[0]);

    const applyBtn = screen.getByRole('button', { name: /^Apply$/i });
    expect(applyBtn).toBeEnabled();

    fireEvent.click(applyBtn);
    await waitFor(() => expect(defaultProps.onSend).toHaveBeenCalled());
    expect(defaultProps.closeModal).toHaveBeenCalled();

    const backBtn = screen.getByTestId('ArrowBackIcon').closest('button');
    fireEvent.click(backBtn);
    await waitFor(() => {
      expect(mockNav).toHaveBeenCalledWith(
        '/discovery',
        expect.objectContaining({ state: expect.any(Object) })
      );
    });
  });

  it('shows toast.error when onSend rejects', async () => {
    defaultProps.onSend.mockRejectedValue(new Error('fail'));
    render(<FileMapperModal {...defaultProps} />);
    await waitFor(() => expect(screen.getAllByText('ds1.csv').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('ds1.csv')[0]);

    const applyBtn = screen.getByRole('button', { name: /^Apply$/i });
    fireEvent.click(applyBtn);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('fail'));
  });

  it('opens clean menu and applies/removes cleaning settings', async () => {
    render(<FileMapperModal {...defaultProps} />);
    await waitFor(() => expect(screen.getAllByText('ds1.csv').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('ds1.csv')[0]);

    const cleanBtn = screen.getByText(/Data cleaning/i);
    fireEvent.click(cleanBtn);
    const confirmBtn = screen.getByRole('button', { name: /^Confirm$/i });
    expect(confirmBtn).toBeInTheDocument();
    const switchInput = screen.getAllByTestId('mock-switch')[0];
    fireEvent.click(switchInput);
    fireEvent.click(confirmBtn);
    expect(screen.getByRole('button', { name: /Remove Changes/i })).toBeInTheDocument();
  });
});
