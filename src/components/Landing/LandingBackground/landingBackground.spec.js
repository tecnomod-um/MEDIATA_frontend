import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import Scene from './scene';
import * as r3f from '@react-three/fiber';
import LandingBackground from './landingBackground';

jest.mock('@react-three/fiber', () => {
  const React = require('react');
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
      React.createElement('canvas', { 'data-testid': 'r3f-canvas', ref, ...rest })
    ),
    useThree: () => ({ viewport: { width: 2, height: 2 } }),
    useFrame: (cb) => { __frameSubs.push(cb); },
    __advanceByTime,
  };
});

jest.mock('three', () => {
  const actual = jest.requireActual('three');
  return {
    ...actual,
    MathUtils: {
      ...actual.MathUtils,
      randFloatSpread: jest.fn(() => 0.5),
      lerp: jest.fn((a, b, t) => a + (b - a) * t),
    },
    Color: jest.fn(() => ({ setHSL: jest.fn() })),
    BoxGeometry: jest.fn(() => ({})),
  };
});

let consoleErrorSpy;
beforeAll(() => {
  const realError = console.error;
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((msg, ...args) => {
    const s = String(msg || '');
    if (s.includes('is using incorrect casing. Use PascalCase for React components')) return;
    realError(msg, ...args);
  });
});
afterAll(() => {
  consoleErrorSpy?.mockRestore();
});

const applyAriaLabels = () => {
  // eslint-disable-next-line testing-library/no-node-access
  document.querySelectorAll('[name]').forEach((el) => {
    const name = el.getAttribute('name');
    if (name && !el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', name);
    }
  });

  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  document.querySelectorAll('ambientlight').forEach((el) => {
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'ambient-light');
  });
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  document.querySelectorAll('directionallight').forEach((el) => {
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'directional-light');
  });
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  document.querySelectorAll('planegeometry').forEach((el) => {
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'plane-geometry');
  });
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  document.querySelectorAll('meshbasicmaterial').forEach((el) => {
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'mesh-basic-material');
  });
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  document.querySelectorAll('bufferattribute').forEach((el) => {
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'buffer-attribute');
  });
};

describe('<Scene /> rendering behavior', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

  it('renders 15 wavy lines and eventually spawns plus-signs', () => {
    render(<Scene />);
    applyAriaLabels();
    expect(screen.getAllByLabelText(/wave-line/i)).toHaveLength(15);

    act(() => {
      jest.advanceTimersByTime(1000);
      r3f.__advanceByTime(1000);
    });
    applyAriaLabels();
    expect(screen.getAllByLabelText(/^plus-sign$/i)).toHaveLength(1);
  });

  it('registers and handles mousedown events without throwing', () => {
    render(<Scene />);
    expect(() =>
      fireEvent.mouseDown(window, { clientX: 42, clientY: 84 })
    ).not.toThrow();
  });

  it('renders lights and background plane', () => {
    render(<Scene />);
    applyAriaLabels();

    expect(screen.getAllByLabelText(/ambient-light/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/directional-light/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/plane-geometry/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/mesh-basic-material/i)).toHaveLength(1);
  });

  it('creates one <bufferAttribute> per wavy line (15 total)', () => {
    render(<Scene />);
    applyAriaLabels();

    expect(screen.getAllByLabelText(/buffer-attribute/i)).toHaveLength(15);
  });
});

describe('<LandingBackground /> WebGL handling', () => {
  const createMockCanvas = ({ supportsWebGL = true } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.getContext = jest.fn(type => (supportsWebGL ? { type } : null));
    return canvas;
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders fallback message when WebGL is not supported', () => {
    jest.spyOn(React, 'useRef').mockReturnValueOnce({ current: createMockCanvas({ supportsWebGL: false }) });
    render(<LandingBackground />);
    expect(
      screen.getByText(/your browser or device does not support webgl/i)
    ).toBeInTheDocument();
  });
});
