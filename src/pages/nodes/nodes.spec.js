import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nodes from './nodes.js';
import { toast } from 'react-toastify';
jest.useFakeTimers();

const mockGetNodeList = jest.fn();
const mockGetNodeMetadata = jest.fn();
const mockGetNodeInfo = jest.fn();
const mockNodeAuth = jest.fn();

jest.mock('../../util/petitionHandler', () => ({
  getNodeList: (...args) => mockGetNodeList(...args),
  getNodeMetadata: (...args) => mockGetNodeMetadata(...args),
  getNodeInfo: (...args) => mockGetNodeInfo(...args),
  nodeAuth: (...args) => mockNodeAuth(...args),
}));

jest.mock('../../config', () => ({ pollingInterval: 999999 }));
jest.mock('../../util/colors', () => ({
  lightenColor: (c, amt) => `${c}-light-${amt}`,
}));
jest.mock('./nodes.module.css', () => ({
  container: 'container',
  error: 'error',
  fadeIn: 'fadeIn',
  fadeOut: 'fadeOut',
  noNodes: 'noNodes',
  toast: 'toast',
}));
jest.mock('react-toastify', () => {
  const t = { info: jest.fn() };
  const ToastContainer = () => <div data-testid="toast-container" />;
  return { toast: t, ToastContainer };
});
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
const mockSelectNode = jest.fn();
const mockSelectNodes = jest.fn();
jest.mock('../../context/nodeContext', () => ({
  useNode: () => ({
    selectNode: mockSelectNode,
    selectNodes: mockSelectNodes,
  }),
}));
jest.mock(
  '../../components/Nodes/NodeScene/nodeScene',
  () =>
    ({ nodes, onNodeClick, onJoinNodesDoubleClick }) =>
      nodes.length > 0 ? (
        <div data-testid="node-scene">
          <button
            data-testid="click-node"
            onClick={() => onNodeClick(nodes[0].nodeId)}
          >
            Click
          </button>
          <button
            data-testid="join-nodes"
            onClick={() => onJoinNodesDoubleClick(nodes.map(n => n.nodeId))}
          >
            Join
          </button>
        </div>
      ) : null
);

jest.mock(
  '../../components/Nodes/MetadataDisplay/metadataDisplay',
  () =>
    ({ isOpen, loadingMetadata, metadata, onAccessNode }) =>
      isOpen ? (
        <div
          data-testid="metadata-display"
          data-loading={String(loadingMetadata)}
          data-metadata={String(metadata)}
        >
          <button data-testid="access-node" onClick={onAccessNode}>
            Access
          </button>
        </div>
      ) : null
);

jest.mock(
  '../../components/Nodes/JoinedNodesDisplay/joinedNodesDisplay',
  () =>
    ({ isOpen, joinedNodes, onAccessJoinedNodes }) =>
      isOpen ? (
        <div
          data-testid="joined-nodes-display"
          data-joined={JSON.stringify(joinedNodes)}
        >
          <button data-testid="access-joined" onClick={onAccessJoinedNodes}>
            Access Joined
          </button>
        </div>
      ) : null
);

jest.mock(
  '../../components/Common/SchemaTray/schemaTray',
  () => ({ externalSchema }) => (
    <div data-testid="schema-tray">{externalSchema ?? 'no-schema'}</div>
  )
);
describe('<Nodes />', () => {
  beforeEach(() => jest.clearAllMocks());
  afterAll(() => jest.useRealTimers());

  it('fetches nodes, renders NodeScene, and calls toast.info', async () => {
    mockGetNodeList.mockResolvedValueOnce([
      { nodeId: 'a', name: 'A' },
      { nodeId: 'b', name: 'B' },
    ]);

    render(<Nodes />);
    await screen.findByTestId('node-scene');
    await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(1));
    expect(toast.info.mock.calls[0][0]).toMatch(
      /Double click nodes to enter them/
    );
  });

  it('shows "No nodes connected to the system" on empty list', async () => {
    mockGetNodeList.mockResolvedValueOnce([]);
    render(<Nodes />);
    expect(
      await screen.findByText('No nodes connected to the system')
    ).toBeInTheDocument();
  });

  it('displays error if getNodeList throws', async () => {
    mockGetNodeList.mockRejectedValueOnce(new Error('fail'));
    render(<Nodes />);
    expect(await screen.findByText('Failed to fetch nodes')).toBeInTheDocument();
  });

  describe('metadata flow', () => {
    beforeEach(() => {
      mockGetNodeList.mockResolvedValue([{ nodeId: 'x', name: 'X' }]);
    });

    it('opens metadata modal and loads details', async () => {
      mockGetNodeMetadata.mockResolvedValueOnce({ metadata: 'DETAILS' });

      render(<Nodes />);
      await screen.findByTestId('node-scene');
      userEvent.click(screen.getByTestId('click-node'));
      await waitFor(() =>
        expect(screen.getByTestId('metadata-display')).toHaveAttribute(
          'data-loading',
          'false'
        )
      );
      expect(screen.getByTestId('metadata-display')).toHaveAttribute(
        'data-metadata',
        'DETAILS'
      );
    });

    it('access-node selects node and navigates', async () => {
      mockGetNodeMetadata.mockResolvedValue({ metadata: {} });
      mockGetNodeInfo.mockResolvedValue({
        token: 'T',
        nodeInfo: { serviceUrl: 'URL', id: 'x' },
      });
      mockNodeAuth.mockResolvedValue({ jwtNodeToken: 'JWT' });

      render(<Nodes />);
      await screen.findByTestId('node-scene');

      userEvent.click(screen.getByTestId('click-node'));
      await screen.findByTestId('metadata-display');

      userEvent.click(screen.getByTestId('access-node'));

      await waitFor(() =>
        expect(mockSelectNode).toHaveBeenCalledWith({ serviceUrl: 'URL', id: 'x' })
      );

      act(() => jest.advanceTimersByTime(200));
      expect(mockNavigate).toHaveBeenCalledWith('/discovery');
    });
  });

  describe('join-nodes flow', () => {
    beforeEach(() => {
      mockGetNodeList.mockResolvedValue([
        { nodeId: 'x', name: 'X' },
        { nodeId: 'y', name: 'Y' },
      ]);
    });

    it('opens joined-nodes modal with correct IDs and names', async () => {
      render(<Nodes />);
      await screen.findByTestId('node-scene');

      userEvent.click(screen.getByTestId('join-nodes'));

      const joinedEl = await screen.findByTestId('joined-nodes-display');
      const data = JSON.parse(joinedEl.getAttribute('data-joined'));

      expect(data).toHaveLength(2);
      expect(data.map((n) => n.nodeId)).toEqual(['x', 'y']);
      expect(data.map((n) => n.name)).toEqual(['X', 'Y']);
    });

    it('access-joined calls selectNodes and navigates', async () => {
      mockGetNodeInfo.mockImplementation((nodeId) =>
        Promise.resolve({
          token: `T-${nodeId}`,
          nodeInfo: { serviceUrl: `URL-${nodeId}`, id: nodeId },
        })
      );
      mockNodeAuth.mockImplementation((url, token) =>
        Promise.resolve({ jwtNodeToken: `JWT-${token}` })
      );

      render(<Nodes />);
      await screen.findByTestId('node-scene');

      userEvent.click(screen.getByTestId('join-nodes'));
      await screen.findByTestId('joined-nodes-display');

      userEvent.click(screen.getByTestId('access-joined'));

      await waitFor(() =>
        expect(mockSelectNodes).toHaveBeenCalledWith([
          { serviceUrl: 'URL-x', id: 'x', jwtNodeToken: 'JWT-T-x' },
          { serviceUrl: 'URL-y', id: 'y', jwtNodeToken: 'JWT-T-y' },
        ])
      );
      expect(mockNavigate).toHaveBeenCalledWith('/discovery');
    });
  });

  it('always renders SchemaTray and ToastContainer', async () => {
    mockGetNodeList.mockResolvedValueOnce([]);
    render(<Nodes />);
    expect(await screen.findByTestId('schema-tray')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });
});
