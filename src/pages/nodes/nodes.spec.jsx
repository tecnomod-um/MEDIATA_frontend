import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nodes from './nodes';
import { toast } from 'react-toastify';
import { vi } from 'vitest';

vi.useFakeTimers();

const mockGetNodeList = vi.fn();
const mockGetNodeMetadata = vi.fn();
const mockGetNodeInfo = vi.fn();
const mockNodeAuth = vi.fn();
const mockNavigate = vi.fn();
const mockSelectNode = vi.fn();
const mockSelectNodes = vi.fn();

vi.mock('../../util/petitionHandler', () => ({
  getNodeList: (...args) => mockGetNodeList(...args),
  getNodeMetadata: (...args) => mockGetNodeMetadata(...args),
  getNodeInfo: (...args) => mockGetNodeInfo(...args),
  nodeAuth: (...args) => mockNodeAuth(...args),
}));

vi.mock('../../config', () => ({
  __esModule: true,
  default: { pollingInterval: 999999 },
}));

vi.mock('../../util/colors', () => ({
  lightenColor: (c, amt) => `${c}-light-${amt}`,
}));

vi.mock('./nodes.module.css', () => ({
  default: {
    container: 'container',
    error: 'error',
    fadeIn: 'fadeIn',
    fadeOut: 'fadeOut',
    noNodes: 'noNodes',
    toast: 'toast',
  },
}));

vi.mock('react-toastify', () => {
  const t = {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  };

  return {
    toast: t,
    ToastContainer: () => <div data-testid="toast-container" />,
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../context/nodeContext', () => ({
  useNode: () => ({
    selectNode: mockSelectNode,
    selectNodes: mockSelectNodes,
  }),
}));

vi.mock('../../components/Nodes/NodeScene/nodeScene', () => ({
  default: ({ nodes, onNodeClick, onJoinNodesDoubleClick }) =>
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
          onClick={() => onJoinNodesDoubleClick(nodes.map((n) => n.nodeId))}
        >
          Join
        </button>
      </div>
    ) : null,
}));

vi.mock('../../components/Nodes/MetadataDisplay/metadataDisplay', () => ({
  default: ({ isOpen, loadingMetadata, metadata, onAccessNode }) =>
    isOpen ? (
      <div
        data-testid="metadata-display"
        data-loading={String(loadingMetadata)}
        data-metadata={
          typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
        }
      >
        <button data-testid="access-node" onClick={onAccessNode}>
          Access
        </button>
      </div>
    ) : null,
}));

vi.mock(
  '../../components/Nodes/JoinedNodesDisplay/joinedNodesDisplay',
  () => ({
    default: ({ isOpen, joinedNodes, onAccessJoinedNodes }) =>
      isOpen ? (
        <div
          data-testid="joined-nodes-display"
          data-joined={JSON.stringify(joinedNodes)}
        >
          <button data-testid="access-joined" onClick={onAccessJoinedNodes}>
            Access Joined
          </button>
        </div>
      ) : null,
  })
);

vi.mock('../../components/Common/SchemaTray/schemaTray', () => ({
  default: ({ externalSchema }) => (
    <div data-testid="schema-tray">{externalSchema ?? 'no-schema'}</div>
  ),
}));

describe('<Nodes />', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  });

  afterEach(async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('fetches nodes, renders NodeScene, and calls toast.info', async () => {
    mockGetNodeList.mockResolvedValueOnce([
      { nodeId: 'a', name: 'A' },
      { nodeId: 'b', name: 'B' },
    ]);

    render(<Nodes />);

    await screen.findByTestId('node-scene');

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledTimes(1);
    });

    expect(toast.info.mock.calls[0][0]).toMatch(
      /Double click nodes to enter them/i
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

      await user.click(screen.getByTestId('click-node'));

      await waitFor(() => {
        expect(screen.getByTestId('metadata-display')).toHaveAttribute(
          'data-loading',
          'false'
        );
      });

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

      await user.click(screen.getByTestId('click-node'));
      await screen.findByTestId('metadata-display');

      await user.click(screen.getByTestId('access-node'));

      await waitFor(() => {
        expect(mockSelectNode).toHaveBeenCalledWith({
          serviceUrl: 'URL',
          id: 'x',
        });
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

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

      await user.click(screen.getByTestId('join-nodes'));

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

      await user.click(screen.getByTestId('join-nodes'));
      await screen.findByTestId('joined-nodes-display');

      await user.click(screen.getByTestId('access-joined'));

      await waitFor(() => {
        expect(mockSelectNodes).toHaveBeenCalledWith([
          { serviceUrl: 'URL-x', id: 'x', jwtNodeToken: 'JWT-T-x' },
          { serviceUrl: 'URL-y', id: 'y', jwtNodeToken: 'JWT-T-y' },
        ]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/discovery');
    });
  });

  it('always renders SchemaTray and ToastContainer', async () => {
    mockGetNodeList.mockResolvedValueOnce([]);

    await act(async () => {
      render(<Nodes />);
    });

    expect(await screen.findByTestId('schema-tray')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  it('handles metadata loading error gracefully', async () => {
    mockGetNodeList.mockResolvedValue([{ nodeId: 'x', name: 'X' }]);
    mockGetNodeMetadata.mockRejectedValueOnce(new Error('Metadata error'));

    render(<Nodes />);
    await screen.findByTestId('node-scene');

    await user.click(screen.getByTestId('click-node'));

    await waitFor(() => {
      expect(screen.queryByTestId('metadata-display')).toBeInTheDocument();
    });
  });

  it('handles node auth error gracefully', async () => {
    mockGetNodeList.mockResolvedValue([{ nodeId: 'x', name: 'X' }]);
    mockGetNodeMetadata.mockResolvedValue({ metadata: {} });
    mockGetNodeInfo.mockResolvedValue({
      token: 'T',
      nodeInfo: { serviceUrl: 'URL', id: 'x' },
    });
    mockNodeAuth.mockRejectedValueOnce(new Error('Auth failed'));

    render(<Nodes />);
    await screen.findByTestId('node-scene');

    await user.click(screen.getByTestId('click-node'));
    await screen.findByTestId('metadata-display');
    await user.click(screen.getByTestId('access-node'));

    await waitFor(() => {
      expect(mockNodeAuth).toHaveBeenCalled();
    });
  });

  it('handles joined nodes with partial auth failure', async () => {
    mockGetNodeList.mockResolvedValue([
      { nodeId: 'x', name: 'X' },
      { nodeId: 'y', name: 'Y' },
    ]);

    mockGetNodeInfo.mockImplementation((nodeId) =>
      nodeId === 'x'
        ? Promise.resolve({
            token: 'T',
            nodeInfo: { serviceUrl: 'URL', id: 'x' },
          })
        : Promise.reject(new Error('Failed for y'))
    );

    render(<Nodes />);
    await screen.findByTestId('node-scene');

    await user.click(screen.getByTestId('join-nodes'));
    await screen.findByTestId('joined-nodes-display');
    await user.click(screen.getByTestId('access-joined'));

    await waitFor(() => {
      expect(mockGetNodeInfo).toHaveBeenCalled();
    });
  });

  it('shows loading state while fetching metadata', async () => {
    mockGetNodeList.mockResolvedValue([{ nodeId: 'x', name: 'X' }]);
    mockGetNodeMetadata.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ metadata: 'DATA' }), 100)
        )
    );

    render(<Nodes />);
    await screen.findByTestId('node-scene');

    await user.click(screen.getByTestId('click-node'));

    const metadataDisplay = await screen.findByTestId('metadata-display');
    expect(metadataDisplay).toHaveAttribute('data-loading', 'true');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(metadataDisplay).toHaveAttribute('data-loading', 'false');
    });
  });

  it('can open both metadata and joined nodes modals simultaneously', async () => {
    mockGetNodeList.mockResolvedValue([
      { nodeId: 'x', name: 'X' },
      { nodeId: 'y', name: 'Y' },
    ]);
    mockGetNodeMetadata.mockResolvedValue({ metadata: 'DATA' });

    render(<Nodes />);
    await screen.findByTestId('node-scene');

    await user.click(screen.getByTestId('click-node'));
    await screen.findByTestId('metadata-display');

    await user.click(screen.getByTestId('join-nodes'));
    await screen.findByTestId('joined-nodes-display');

    expect(screen.getByTestId('metadata-display')).toBeInTheDocument();
    expect(screen.getByTestId('joined-nodes-display')).toBeInTheDocument();
  });

  it('handles single node list', async () => {
    mockGetNodeList.mockResolvedValueOnce([{ nodeId: 'single', name: 'Single' }]);

    render(<Nodes />);

    await screen.findByTestId('node-scene');

    expect(toast.info).toHaveBeenCalled();
  });

  it('handles very long node names', async () => {
    mockGetNodeList.mockResolvedValueOnce([
      { nodeId: 'a', name: 'A'.repeat(100) },
    ]);

    render(<Nodes />);

    await screen.findByTestId('node-scene');
  });
});