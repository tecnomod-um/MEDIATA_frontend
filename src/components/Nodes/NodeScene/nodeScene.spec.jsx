import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NodeScene from './nodeScene';
import { vi, beforeAll, afterAll } from "vitest";
vi.mock('@react-three/fiber', () => {
  const React = require('react');

  const mockEl = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    })),
  };
  const mockGl = {
    domElement: mockEl,
    setPixelRatio: vi.fn()
  };

  return {
    Canvas: ({ children, onCreated }) => {
      React.useEffect(() => {
        if (onCreated) {
          act(() => { onCreated({ gl: mockGl }); });
        }
      }, [onCreated]);
      return <div data-testid="canvas">{children}</div>;
    },
    useFrame: vi.fn(),
    useThree: () => ({
      camera: { position: [0, 0, 15] },
      gl: mockGl,
      viewport: { width: 800, height: 600 },
    }),
  };
});

vi.mock('@react-three/drei', () => {
  const React = require('react');
  return {
    Text: ({ children }) => <div>{children}</div>,
  };
});

vi.mock('./draggableNodes', () => {
  const React = require('react');

  return {
    __esModule: true,
    default: React.forwardRef(({ nodes, onNodeClick, onJoinNodesDoubleClick }, ref) => (
      <div data-testid="draggable-nodes" ref={ref}>
        {nodes.map(node => (
          <div
            key={node.nodeId}
            data-testid={`node-${node.nodeId}`}
            onDoubleClick={() => onNodeClick(node.nodeId)}
            data-position={JSON.stringify(node.position)}
          >
            {node.name}
            {node.color && <span data-testid={`color-${node.nodeId}`} style={{ backgroundColor: node.color }} />}
          </div>
        ))}
        <div
          data-testid="join-nodes-dot"
          onDoubleClick={() => onJoinNodesDoubleClick?.(['n1', 'n2'])}
        >
          Join nodes
        </div>
      </div>
    )),
  };
});

describe('NodeScene', () => {
  let restoreConsoleError;

  beforeAll(() => {
    const realError = console.error;
    const spy = vi.spyOn(console, 'error').mockImplementation((msg, ...rest) => {
      const s = String(msg);
      if (
        s.includes('is using incorrect casing. Use PascalCase for React components') ||
        s.includes('is unrecognized in this browser')
      ) {
        return;
      }
      realError(msg, ...rest);
    });
    restoreConsoleError = () => spy.mockRestore();
  });

  afterAll(() => {
    restoreConsoleError?.();
  });

  const baseNodes = [
    { nodeId: 'n1', name: 'Node One', color: '#f00', position: { x: 0, y: 0 } },
    { nodeId: 'n2', name: 'Node Two', color: '#0f0', position: { x: 100, y: 100 } },
  ];

  it('renders canvas with no nodes', () => {
    render(<NodeScene nodes={[]} onNodeClick={vi.fn()} />);
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.queryByText('Node One')).not.toBeInTheDocument();
  });

  it('renders nodes with correct properties', () => {
    render(<NodeScene nodes={baseNodes} onNodeClick={vi.fn()} />);

    baseNodes.forEach(node => {
      expect(screen.getByText(node.name)).toBeInTheDocument();
      expect(screen.getByTestId(`color-${node.nodeId}`)).toHaveStyle(`background-color: ${node.color}`);
    });
  });

  it('handles node double-click interactions', async () => {
    const onNodeClick = vi.fn();
    render(<NodeScene nodes={baseNodes} onNodeClick={onNodeClick} />);

    const nodeOne = screen.getByText('Node One');
    await userEvent.dblClick(nodeOne);
    expect(onNodeClick).toHaveBeenCalledWith('n1');

    const nodeTwo = screen.getByText('Node Two');
    await userEvent.dblClick(nodeTwo);
    expect(onNodeClick).toHaveBeenCalledWith('n2');
  });

  it('handles join nodes double-click interaction', async () => {
    const onJoinNodesDoubleClick = vi.fn();
    render(
      <NodeScene
        nodes={baseNodes}
        onNodeClick={vi.fn()}
        onJoinNodesDoubleClick={onJoinNodesDoubleClick}
      />
    );

    const joinButton = screen.getByText('Join nodes');
    await userEvent.dblClick(joinButton);
    expect(onJoinNodesDoubleClick).toHaveBeenCalledWith(['n1', 'n2']);
  });

  it('handles multiple consecutive interactions', async () => {
    const onNodeClick = vi.fn();
    const onJoinNodesDoubleClick = vi.fn();

    render(
      <NodeScene
        nodes={baseNodes}
        onNodeClick={onNodeClick}
        onJoinNodesDoubleClick={onJoinNodesDoubleClick}
      />
    );
    await userEvent.dblClick(screen.getByText('Node One'));
    await userEvent.dblClick(screen.getByText('Node One'));
    expect(onNodeClick).toHaveBeenCalledTimes(2);
    expect(onNodeClick).toHaveBeenNthCalledWith(1, 'n1');
    expect(onNodeClick).toHaveBeenNthCalledWith(2, 'n1');
    await userEvent.dblClick(screen.getByText('Join nodes'));
    expect(onJoinNodesDoubleClick).toHaveBeenCalledWith(['n1', 'n2']);
    await userEvent.dblClick(screen.getByText('Node Two'));
    expect(onNodeClick).toHaveBeenCalledWith('n2');
  });

  it('handles node position changes', () => {
    const nodesWithPositions = [
      { nodeId: 'n1', name: 'Node One', position: { x: 50, y: 50 } },
      { nodeId: 'n2', name: 'Node Two', position: { x: 150, y: 150 } },
    ];

    render(<NodeScene nodes={nodesWithPositions} onNodeClick={vi.fn()} />);

    nodesWithPositions.forEach(node => {
      const nodeElement = screen.getByTestId(`node-${node.nodeId}`);
      expect(nodeElement.dataset.position).toBe(JSON.stringify(node.position));
    });
  });

  it('handles large number of nodes', () => {
    const manyNodes = Array.from({ length: 20 }, (_, i) => ({
      nodeId: `node-${i}`,
      name: `Node ${i + 1}`,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      position: { x: i * 10, y: i * 10 }
    }));

    render(<NodeScene nodes={manyNodes} onNodeClick={vi.fn()} />);

    manyNodes.forEach(node => {
      expect(screen.getByText(node.name)).toBeInTheDocument();
    });
  });

  it('handles missing node properties gracefully', () => {
    const incompleteNodes = [
      { nodeId: 'n1', name: 'Node One' },
      { nodeId: 'n2', name: 'Node Two' },
    ];

    render(<NodeScene nodes={incompleteNodes} onNodeClick={vi.fn()} />);

    incompleteNodes.forEach(node => {
      expect(screen.getByText(node.name)).toBeInTheDocument();
    });
  });
});