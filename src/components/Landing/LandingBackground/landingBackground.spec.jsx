import React from "react";
import { render, fireEvent, act, screen } from "@testing-library/react";
import Scene from "./scene";
import * as r3f from "@react-three/fiber";
import LandingBackground from "./landingBackground";
import { vi } from "vitest";

vi.mock("@react-three/fiber", () => {
  const React = require("react");
  const __frameSubs = [];

  const __advanceByTime = (ms = 16) => {
    const frames = Math.max(1, Math.round((ms / 1000) * 60));
    for (let i = 0; i < frames; i++) {
      __frameSubs.forEach((cb) =>
        cb({ clock: { getElapsedTime: () => i / 60 } }, 1 / 60)
      );
    }
  };

  return {
    Canvas: React.forwardRef(({ children, ...rest }, ref) =>
      React.createElement(
        "canvas",
        { "data-testid": "r3f-canvas", ref, ...rest },
        children
      )
    ),
    useThree: () => ({ viewport: { width: 2, height: 2 } }),
    useFrame: (cb) => {
      __frameSubs.push(cb);
    },
    __advanceByTime,
  };
});

vi.mock("three", async () => {
  const actual = await vi.importActual("three");

  const MockColor = vi.fn(function MockColor() {
    this.setHSL = vi.fn();
  });

  const MockBoxGeometry = vi.fn(function MockBoxGeometry() {
    return {};
  });

  return {
    ...actual,
    MathUtils: {
      ...actual.MathUtils,
      randFloatSpread: vi.fn(() => 0.5),
      lerp: vi.fn((a, b, t) => a + (b - a) * t),
    },
    Color: MockColor,
    BoxGeometry: MockBoxGeometry,
  };
});

let consoleErrorSpy;
beforeAll(() => {
  const realError = console.error;
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((msg, ...args) => {
    const s = String(msg || "");
    if (
      s.includes("is using incorrect casing. Use PascalCase for React components")
    ) {
      return;
    }
    realError(msg, ...args);
  });
});

afterAll(() => {
  consoleErrorSpy?.mockRestore();
});

const applyAriaLabels = () => {
  document.querySelectorAll("[name]").forEach((el) => {
    const name = el.getAttribute("name");
    if (name && !el.getAttribute("aria-label")) {
      el.setAttribute("aria-label", name);
    }
  });

  document.querySelectorAll("ambientlight").forEach((el) => {
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "ambient-light");
  });
  document.querySelectorAll("directionallight").forEach((el) => {
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "directional-light");
  });
  document.querySelectorAll("planegeometry").forEach((el) => {
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "plane-geometry");
  });
  document.querySelectorAll("meshbasicmaterial").forEach((el) => {
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "mesh-basic-material");
  });
  document.querySelectorAll("bufferattribute").forEach((el) => {
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "buffer-attribute");
  });
};

describe("<Scene /> rendering behavior", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders 15 wavy lines and eventually spawns plus-signs", () => {
    render(<Scene />);
    applyAriaLabels();

    expect(screen.getAllByLabelText(/wave-line/i)).toHaveLength(15);

    act(() => {
      vi.advanceTimersByTime(1000);
      r3f.__advanceByTime(1000);
    });

    applyAriaLabels();
    expect(screen.getAllByLabelText(/^plus-sign$/i)).toHaveLength(1);
  });

  it("registers and handles mousedown events without throwing", () => {
    render(<Scene />);
    expect(() =>
      fireEvent.mouseDown(window, { clientX: 42, clientY: 84 })
    ).not.toThrow();
  });

  it("renders lights and background plane", () => {
    render(<Scene />);
    applyAriaLabels();

    expect(screen.getAllByLabelText(/ambient-light/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/directional-light/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/plane-geometry/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/mesh-basic-material/i)).toHaveLength(1);
  });

  it("creates one <bufferAttribute> per wavy line (15 total)", () => {
    render(<Scene />);
    applyAriaLabels();

    expect(screen.getAllByLabelText(/buffer-attribute/i)).toHaveLength(15);
  });
});

describe("<LandingBackground /> WebGL handling", () => {
  const createMockCanvas = ({ supportsWebGL = true } = {}) => {
    const canvas = document.createElement("canvas");
    canvas.getContext = vi.fn((type) => (supportsWebGL ? { type } : null));
    return canvas;
  };

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders fallback message when WebGL is not supported", () => {
    vi.spyOn(React, "useRef").mockReturnValueOnce({
      current: createMockCanvas({ supportsWebGL: false }),
    });

    render(<LandingBackground />);

    expect(
      screen.getByText(/your browser or device does not support webgl/i)
    ).toBeInTheDocument();
  });
});