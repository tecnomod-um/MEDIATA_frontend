import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DraggableNodes from "./draggableNodes";

const { frameCallbacks, nodeRenderSpy, dragListeners, threeState } = vi.hoisted(() => ({
  frameCallbacks: [],
  nodeRenderSpy: vi.fn(),
  dragListeners: {},
  threeState: {
    camera: {},
    gl: {
      domElement: {
        style: {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      },
    },
    viewport: { width: 12, height: 8 },
  },
}));

vi.mock("@react-three/fiber", () => ({
  useFrame: (callback) => frameCallbacks.push(callback),
  useThree: () => threeState,
}));

vi.mock("three/examples/jsm/controls/DragControls", () => ({
  DragControls: class DragControls {
    addEventListener(name, callback) {
      dragListeners[name] = callback;
    }

    dispose() {}
  },
}));

vi.mock("../Node/node", () => ({
  default: React.memo(({ node, position }) => {
    nodeRenderSpy(node.nodeId);
    return <div data-testid={node.nodeId} data-position={`${position?.x},${position?.y}`} />;
  }),
}));

vi.mock("./connections", () => ({
  default: () => null,
}));

describe("DraggableNodes rendering", () => {
  const nodes = [
    { nodeId: "one", name: "One", position: { x: 0, y: 0 } },
    { nodeId: "two", name: "Two", position: { x: 1, y: 1 } },
  ];

  beforeEach(() => {
    frameCallbacks.length = 0;
    nodeRenderSpy.mockClear();
    Object.keys(dragListeners).forEach((key) => delete dragListeners[key]);
    if (!HTMLElement.prototype.traverse) {
      HTMLElement.prototype.traverse = function traverse(callback) {
        callback(this);
        Array.from(this.children).forEach((child) => child.traverse?.(callback));
      };
    }
  });

  it("does not rerender nodes during idle animation frames", () => {
    render(
      <DraggableNodes
        nodes={nodes}
        onNodeClick={vi.fn()}
        onJoinNodesDoubleClick={vi.fn()}
      />
    );

    nodeRenderSpy.mockClear();
    act(() => {
      for (let index = 0; index < 20; index += 1) {
        frameCallbacks.forEach((callback) => callback());
      }
    });

    expect(nodeRenderSpy).not.toHaveBeenCalled();
  });

  it("preserves stationary node props while one node moves", () => {
    render(
      <DraggableNodes
        nodes={nodes}
        onNodeClick={vi.fn()}
        onJoinNodesDoubleClick={vi.fn()}
      />
    );

    act(() => {
      dragListeners.dragstart({ object: { userData: { nodeId: "one" } } });
    });
    nodeRenderSpy.mockClear();

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 700, clientY: 200 }));
    });

    expect(nodeRenderSpy).toHaveBeenCalledWith("one");
    expect(nodeRenderSpy).not.toHaveBeenCalledWith("two");
  });
});
