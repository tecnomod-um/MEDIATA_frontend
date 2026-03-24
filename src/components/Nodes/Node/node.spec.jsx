import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import React from "react";
import { render, fireEvent, act, screen } from "@testing-library/react";
import { useFrame } from "@react-three/fiber";
import Node from "./node.jsx";

vi.mock("@react-three/fiber", () => ({
  useLoader: vi.fn(() => "mocked-texture"),
  useFrame: vi.fn(),
}));

vi.mock("@react-three/drei", async () => {
  const React = await import("react");

  const Text = React.forwardRef(({ children, onSync, ...props }, ref) => {
    React.useEffect(() => {
      if (onSync) {
        const mockBBox = { min: { x: -1, y: -0.5 }, max: { x: 1, y: 0.5 } };
        setTimeout(() => {
          onSync({
            geometry: {
              boundingBox: mockBBox,
              computeBoundingBox: vi.fn(),
            },
          });
        }, 0);
      }
    }, [onSync]);

    return (
      <text ref={ref} role="text" aria-label={children} {...props}>
        {children}
      </text>
    );
  });

  return {
    __esModule: true,
    Text,
  };
});

vi.mock("@react-spring/three", async () => {
  const React = await import("react");

  const makeSpringVal = (v) => ({
    to: (fn) => makeSpringVal(typeof fn === "function" ? fn(v) : v),
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

    return (render) =>
      entries.map((styles) => {
        const view = render(styles, styles.__item);
        const isRipple =
          view &&
          view.props &&
          Array.isArray(view.props.position) &&
          view.props.position.join(",") === "0,0,-0.04";

        const cloned = React.cloneElement(view, {
          key: styles.key,
          ...(isRipple ? { "data-testid": "ripple" } : null),
        });

        if (typeof onRest === "function") {
          setTimeout(onRest, 0);
        }

        return cloned;
      });
  };

  const to = (inputs, fn) => {
    const vals = (Array.isArray(inputs) ? inputs : [inputs]).map((v) =>
      v && typeof v.get === "function" ? v.get() : v
    );
    return makeSpringVal(fn(...vals));
  };

  const AMesh = React.forwardRef(({ position, scale, ...props }, forwardedRef) => {
    const innerRef = React.useRef(null);
  
    React.useImperativeHandle(forwardedRef, () => innerRef.current);
  
    React.useLayoutEffect(() => {
      const node = innerRef.current;
      if (!node) return;
  
      if (!node.userData) node.userData = {};
  
      if (!node.position) {
        node.position = {
          x: 0,
          y: 0,
          z: 0,
          set(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
            node.setAttribute("position", `${x},${y},${z}`);
          },
        };
      }
  
      if (!node.scale) {
        node.scale = {
          x: 1,
          y: 1,
          z: 1,
          set(x = 1, y = 1, z = 1) {
            this.x = x;
            this.y = y;
            this.z = z;
            node.setAttribute("scale", `${x},${y},${z}`);
          },
        };
      }
  
      if (Array.isArray(position)) {
        node.position.set(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0);
      }
  
      if (Array.isArray(scale)) {
        node.scale.set(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);
      }
    }, [position, scale]);
  
    return React.createElement("mesh", {
      role: "button",
      ref: innerRef,
      ...props,
    });
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
      onRest: vi.fn(),
    }),
    useTransition,
    to,
    a: {
      mesh: AMesh,
      group: "group",
      meshBasicMaterial: "meshBasicMaterial",
      meshStandardMaterial: "meshStandardMaterial",
    },
  };
});

vi.mock("../../../resources/images/node_image.png", () => ({
  __esModule: true,
  default: "node_image.png",
}));

let restoreConsoleError;

beforeAll(() => {
  const realError = console.error;
  const shouldIgnore = (msg) => {
    const s = String(msg);
    return (
      s.includes("is using incorrect casing. Use PascalCase for React components") ||
      s.includes("is unrecognized in this browser") ||
      s.includes("React does not recognize the") ||
      s.includes("non-boolean attribute") ||
      s.includes("Unknown event handler property")
    );
  };

  const spy = vi.spyOn(console, "error").mockImplementation((msg, ...rest) => {
    if (shouldIgnore(msg)) return;
    realError(msg, ...rest);
  });

  restoreConsoleError = () => spy.mockRestore();
});

afterAll(() => {
  restoreConsoleError?.();
  vi.useRealTimers();
});

if (!("userData" in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, "userData", {
    configurable: true,
    writable: true,
    value: {},
  });
}

if (!("traverse" in HTMLElement.prototype)) {
  HTMLElement.prototype.traverse = function (cb) {
    cb(this);
  };
}

describe("<Node /> component", () => {
  const nodeData = {
    nodeId: "node-123",
    name: "Test Node",
    description: "Hello World",
    position: { x: 5, y: 10 },
    color: "#ff00ff",
  };

  const baseProps = {
    node: nodeData,
    onNodeClick: vi.fn(),
    isDragging: false,
    globalIsDragging: false,
    nodeSize: 2,
    descriptionSize: [4, 1],
    fontSize: 0.5,
  };

  let frameCallbacks = [];
  let mockClock;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(() => {
    frameCallbacks = [];
    mockClock = { getElapsedTime: vi.fn().mockReturnValue(0) };
    vi.clearAllMocks();

    useFrame.mockImplementation((cb) => {
      frameCallbacks.push(cb);
    });
  });

  const renderNode = (props = {}) =>
    render(React.createElement(Node, { ...baseProps, ...props }));

  const runAnimationFrames = (count = 1) => {
    act(() => {
      for (let i = 0; i < count; i++) {
        const elapsedTimeFn = mockClock.getElapsedTime;
        frameCallbacks.forEach((cb) => cb({ clock: { getElapsedTime: elapsedTimeFn } }));
        mockClock.getElapsedTime.mockReturnValue(mockClock.getElapsedTime() + 0.1);
      }
    });
  };

  const getRootMesh = () => screen.getAllByRole("button")[0];

  it("sets nodeId in userData", () => {
    renderNode();
    const mesh = getRootMesh();
    expect(mesh.userData.nodeId).toBe(nodeData.nodeId);
  });

  it("handles dragging state in position updates", () => {
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
    expect(updatedMesh.position.x).toBe(6);
    expect(updatedMesh.position.y).toBe(12);
    expect(updatedMesh.position.z).toBe(0);
  });

  it("shows/hides description on non-touch interaction", () => {
    renderNode();
    const mesh = getRootMesh();

    fireEvent.click(mesh);
    const textElement = screen.getByRole("text", { name: /Hello World/i });
    expect(textElement).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1300));
    expect(textElement).toBeInTheDocument();
  });

  it("handles hover state interactions", () => {
    renderNode();
    const mesh = getRootMesh();

    fireEvent.pointerOver(mesh);
    const textElement = screen.getByRole("text", { name: /Hello World/i });
    expect(textElement).toBeInTheDocument();

    fireEvent.pointerOut(mesh);
  });

  it("renders all text elements", () => {
    renderNode();
    const nameElements = screen.getAllByText(nodeData.name);
    expect(nameElements.length).toBe(2);
    expect(screen.getByText(nodeData.description)).toBeInTheDocument();
  });

  it("renders a <mesh> at the correct position", () => {
    renderNode();
    const mesh = getRootMesh();
    expect(mesh).toBeInTheDocument();
    expect(mesh).toHaveAttribute("position", `${nodeData.position.x},${nodeData.position.y},0`);
  });

  it("ignores single clicks but fires on double-click", () => {
    renderNode();
    const mesh = getRootMesh();

    fireEvent.click(mesh);
    expect(baseProps.onNodeClick).not.toHaveBeenCalled();

    fireEvent.doubleClick(mesh);
    expect(baseProps.onNodeClick).toHaveBeenCalledTimes(1);
    expect(baseProps.onNodeClick).toHaveBeenCalledWith(nodeData.nodeId);
  });
});