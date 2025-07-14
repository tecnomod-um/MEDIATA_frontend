jest.mock('@react-three/fiber', () => ({
  useLoader: jest.fn(() => 'mocked-texture'),
  useFrame: jest.fn(),
}));

jest.mock('@react-three/drei', () => ({
  Text: ({ children, onSync, ...props }) => {
    if (onSync) {
      const mockBBox = { min: { x: -1, y: -0.5 }, max: { x: 1, y: 0.5 } };
      setTimeout(() => {
        onSync({
          geometry: {
            boundingBox: mockBBox,
            computeBoundingBox: jest.fn(),
          }
        });
      }, 0);
    }
    return <text data-testid="node-text" {...props}>{children}</text>;
  },
}));

jest.mock('@react-spring/three', () => {
  const makeSpringVal = (v) => ({
    to: (fn) => makeSpringVal(fn(v)),
    get: () => v,
  });

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
    a: {
      mesh: 'mesh',
      group: 'group',
      meshBasicMaterial: 'meshBasicMaterial',
      meshStandardMaterial: 'meshStandardMaterial',
    },
  };
});

jest.mock('../../../resources/images/node_image.png', () => 'node_image.png');

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
const { render, fireEvent, act } = require('@testing-library/react');
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

  let frameCallbacks = [];
  let mockClock;

  beforeAll(() => {
    jest.useFakeTimers();
    require('@react-three/fiber').useFrame.mockImplementation(cb => {
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

  const renderNode = (props = {}) => {
    return render(React.createElement(Node, { ...baseProps, ...props }));
  };

  const runAnimationFrames = (count = 1) => {
    act(() => {
      for (let i = 0; i < count; i++) {
        frameCallbacks.forEach(cb => cb({ clock: mockClock }));
        mockClock.getElapsedTime.mockReturnValue(mockClock.getElapsedTime() + 0.1);
      }
    });
  };

  it('sets nodeId in userData', () => {
    const { container } = renderNode();
    const mesh = container.querySelector('mesh');
    expect(mesh.userData.nodeId).toBe(nodeData.nodeId);
  });

  it('handles dragging state in position updates', () => {
    const { container, rerender } = renderNode({ isDragging: true });
    const mesh = container.querySelector('mesh');

    rerender(React.createElement(Node, {
      ...baseProps,
      node: { ...nodeData, position: { x: 6, y: 12 } }
    }));

    runAnimationFrames(5);
    const updatedMesh = container.querySelector('mesh');
    expect(updatedMesh).toHaveAttribute('position', '6,12,0');
  });

  it('handles touch device single click', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, configurable: true });

    const { container } = renderNode();
    const mesh = container.querySelector('mesh');
    fireEvent.click(mesh);

    const rippleElements = container.querySelectorAll('mesh');
    expect(rippleElements.length).toBeGreaterThan(2); // Main mesh + aura + ripple
  });

  it('shows/hides description on non-touch interaction', () => {
    const { container } = renderNode();
    const mesh = container.querySelector('mesh');

    fireEvent.click(mesh);
    const textElement = container.querySelector('[data-testid="node-text"]');
    expect(textElement).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1300));
    expect(textElement).toBeInTheDocument();
  });

  it('renders ripple effect on double click', () => {
    const { container } = renderNode();
    const mesh = container.querySelector('mesh');
    fireEvent.doubleClick(mesh);
    const rippleElements = container.querySelectorAll('mesh');
    expect(rippleElements.length).toBeGreaterThan(2);
  });

  it('handles hover state interactions', () => {
    const { container } = renderNode();
    const mesh = container.querySelector('mesh');

    fireEvent.pointerOver(mesh);
    const textElement = container.querySelector('[data-testid="node-text"]');
    expect(textElement).toBeInTheDocument();
    fireEvent.pointerOut(mesh);
  });

  it('renders all text elements', () => {
    const { getAllByText, getByText } = renderNode();

    const nameElements = getAllByText(nodeData.name);
    expect(nameElements.length).toBe(2);
    expect(getByText(nodeData.description)).toBeInTheDocument();
  });

  it('renders a <mesh> at the correct position', () => {
    const { container } = renderNode();
    const mesh = container.querySelector('mesh');
    expect(mesh).toBeInTheDocument();
    expect(mesh).toHaveAttribute(
      'position',
      `${nodeData.position.x},${nodeData.position.y},0`
    );
  });

  it('ignores single clicks but fires on double-click', () => {
    const { container } = renderNode();
    const mesh = container.querySelector('mesh');

    fireEvent.click(mesh);
    expect(baseProps.onNodeClick).not.toHaveBeenCalled();

    fireEvent.doubleClick(mesh);
    expect(baseProps.onNodeClick).toHaveBeenCalledTimes(1);
    expect(baseProps.onNodeClick).toHaveBeenCalledWith(nodeData.nodeId);
  });
});