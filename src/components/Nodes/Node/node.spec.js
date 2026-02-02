jest.mock('@react-three/fiber', () => ({
  useLoader: jest.fn(() => 'mocked-texture'),
  useFrame: jest.fn(),
}));

// ---- drei Text mock (keeps onSync behavior & testable role) ----
jest.mock('@react-three/drei', () => ({
  Text: ({ children, onSync, ...props }) => {
    if (onSync) {
      const mockBBox = { min: { x: -1, y: -0.5 }, max: { x: 1, y: 0.5 } };
      setTimeout(() => {
        onSync({
          geometry: {
            boundingBox: mockBBox,
            computeBoundingBox: jest.fn(),
          },
        });
      }, 0);
    }
    return (
      <text role="text" aria-label={children} {...props}>
        {children}
      </text>
    );
  },
}));

// ---- react-spring/three mock: useSpring + useTransition + to + a.mesh as role=button ----
jest.mock('@react-spring/three', () => {
  const React = require('react');

  const makeSpringVal = (v) => ({
    to: (fn) => makeSpringVal(typeof fn === 'function' ? fn(v) : v),
    get: () => v,
    value: v,
  });

  const useTransition = (items, { enter = {}, from = {}, keys, onRest } = {}) => {
    const arr = Array.isArray(items) ? items : [];
    const entries = arr.map((item, i) => ({
      key: keys ? keys(item) : i,
      ...Object.fromEntries(
        Object.entries({ ...from, ...enter }).map(([k, v]) => [k, makeSpringVal(v)])
      ),
      __item: item,
    }));

    // Renderer that tags ripple meshes with data-testid="ripple"
    return (render) =>
      entries.map((styles) => {
        const view = render(styles, styles.__item);
        // Heuristic: the ripple mesh in your component has position={[0,0,-0.04]}
        const isRipple =
          view &&
          view.props &&
          Array.isArray(view.props.position) &&
          view.props.position.join(',') === '0,0,-0.04';

        const cloned = React.cloneElement(view, {
          ...(isRipple ? { 'data-testid': 'ripple' } : null),
        });

        if (typeof onRest === 'function') {
          setTimeout(onRest, 0);
        }
        return cloned;
      });
  };

  const to = (inputs, fn) => {
    const vals = (Array.isArray(inputs) ? inputs : [inputs]).map((v) =>
      v && typeof v.get === 'function' ? v.get() : v
    );
    return makeSpringVal(fn(...vals));
  };

  // a.mesh as a functional component -> renders a <mesh role="button" ... />
  const AMesh = React.forwardRef((props, ref) =>
    React.createElement('mesh', { role: 'button', ref, ...props })
  );

  return {
    __esModule: true,
    useSpring: () => ({
      opacity: makeSpringVal(1),
      scale: makeSpringVal([1, 1, 1]),
      rippleScale: makeSpringVal(1),
      rippleOpacity: makeSpringVal(1),
      from: { opacity: 0 },
      to: { opacity: 1 },
      onRest: jest.fn(),
    }),
    useTransition,
    to,
    a: {
      mesh: AMesh,
      group: 'group',
      meshBasicMaterial: 'meshBasicMaterial',
      meshStandardMaterial: 'meshStandardMaterial',
    },
  };
});

jest.mock('../../../resources/images/node_image.png', () => 'node_image.png');

// ---- Console error filter (keep from your original) ----
let restoreConsoleError;
beforeAll(() => {
  const realError = console.error;
  const shouldIgnore = (msg) =>
    String(msg).includes('is using incorrect casing. Use PascalCase for React components');

  const spy = jest.spyOn(console, 'error').mockImplementation((msg, ...rest) => {
    if (shouldIgnore(msg)) return;
    realError(msg, ...rest);
  });

  restoreConsoleError = () => spy.mockRestore();
});

afterAll(() => {
  restoreConsoleError?.();
});

// ---- Minimal polyfills for .userData and .traverse on DOM elements ----
if (!('userData' in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, 'userData', {
    configurable: true,
    writable: true,
    value: {},
  });
}
if (!('traverse' in HTMLElement.prototype)) {
  HTMLElement.prototype.traverse = function (cb) {
    cb(this);
  };
}

const React = require('react');
const { render, fireEvent, act, screen } = require('@testing-library/react');
const Node = require('./node').default;

describe('<Node /> component', () => {
  const nodeData = {
    nodeId: 'node-123',
    name: 'Test Node',
    description: 'Hello World',
    position: { x: 5, y: 10 },
    color: '#ff00ff',
  };

  const baseProps = {
    node: nodeData,
    onNodeClick: jest.fn(),
    isDragging: false,
    globalIsDragging: false,
    nodeSize: 2,
    descriptionSize: [4, 1],
    fontSize: 0.5,
  };

  // Drive useFrame manually
  let frameCallbacks = [];
  let mockClock;

  beforeAll(() => {
    jest.useFakeTimers();
    require('@react-three/fiber').useFrame.mockImplementation((cb) => {
      frameCallbacks.push(cb);
    });
  });

  beforeEach(() => {
    mockClock = { getElapsedTime: jest.fn().mockReturnValue(0) };
    frameCallbacks = [];
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const renderNode = (props = {}) => render(React.createElement(Node, { ...baseProps, ...props }));

  const runAnimationFrames = (count = 1) => {
    act(() => {
      for (let i = 0; i < count; i++) {
        const elapsedTime = mockClock.getElapsedTime;
        frameCallbacks.forEach((cb) => cb({ clock: { getElapsedTime: elapsedTime } }));
        mockClock.getElapsedTime.mockReturnValue(mockClock.getElapsedTime() + 0.1);
      }
    });
  };

  // Helper: first mesh rendered is the root (we gave meshes role="button")
  const getRootMesh = () => screen.getAllByRole('button')[0];

  it('sets nodeId in userData', () => {
    renderNode();
    const mesh = getRootMesh();
    expect(mesh.userData.nodeId).toBe(nodeData.nodeId);
  });

  it('handles dragging state in position updates', () => {
    const { rerender } = renderNode({ isDragging: true });
    rerender(
      React.createElement(Node, {
        ...baseProps,
        isDragging: true,
        node: { ...nodeData, position: { x: 6, y: 12 } },
      })
    );

    runAnimationFrames(5);
    const updatedMesh = getRootMesh();
    expect(updatedMesh).toHaveAttribute('position', '6,12,0');
  });

  it('shows/hides description on non-touch interaction', () => {
    renderNode();
    const mesh = getRootMesh();

    fireEvent.click(mesh);
    const textElement = screen.getByRole('text', { name: /Hello World/i });
    expect(textElement).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1300));
    expect(textElement).toBeInTheDocument();
  });

  it('handles hover state interactions', () => {
    renderNode();
    const mesh = getRootMesh();

    fireEvent.pointerOver(mesh);
    const textElement = screen.getByRole('text', { name: /Hello World/i });
    expect(textElement).toBeInTheDocument();
    fireEvent.pointerOut(mesh);
  });

  it('renders all text elements', () => {
    renderNode();
    const nameElements = screen.getAllByText(nodeData.name);
    expect(nameElements.length).toBe(2);
    expect(screen.getByText(nodeData.description)).toBeInTheDocument();
  });

  it('renders a <mesh> at the correct position', () => {
    renderNode();
    const mesh = getRootMesh();
    expect(mesh).toBeInTheDocument();
    expect(mesh).toHaveAttribute('position', `${nodeData.position.x},${nodeData.position.y},0`);
  });

  it('ignores single clicks but fires on double-click', () => {
    renderNode();
    const mesh = getRootMesh();

    fireEvent.click(mesh);
    expect(baseProps.onNodeClick).not.toHaveBeenCalled();

    fireEvent.doubleClick(mesh);
    expect(baseProps.onNodeClick).toHaveBeenCalledTimes(1);
    expect(baseProps.onNodeClick).toHaveBeenCalledWith(nodeData.nodeId);
  });
});
