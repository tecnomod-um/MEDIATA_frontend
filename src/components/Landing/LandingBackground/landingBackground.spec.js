import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import Scene from './scene';
import LandingBackground from './landingBackground';

jest.mock('@react-three/fiber', () => {
  const React = require('react');
  return {
    Canvas: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement(
        'canvas',
        { 'data-testid': 'r3f-canvas', ref, ...props },
        children,
      )
    ),
    useThree: () => ({ viewport: { width: 2, height: 2 } }),
    useFrame: jest.fn(),
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

describe('<Scene /> rendering behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the expected 15 wavy lines and eventually spawns plus-signs', () => {
    const { container } = render(<Scene />);
    expect(container.querySelectorAll('line')).toHaveLength(15);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(container.querySelectorAll('group').length).toBeGreaterThan(0);
  });

  it('registers and handles mousedown events without throwing', () => {
    render(<Scene />);
    expect(() =>
      fireEvent.mouseDown(window, { clientX: 42, clientY: 84 })
    ).not.toThrow();
  });

  it('renders lights and background plane', () => {
    const { container } = render(<Scene />);
    expect(container.querySelectorAll('ambientlight')).toHaveLength(1);
    expect(container.querySelectorAll('directionallight')).toHaveLength(1);
    expect(container.querySelectorAll('planegeometry')).toHaveLength(1);
    expect(container.querySelectorAll('meshbasicmaterial')).toHaveLength(1);
  });

  it('creates one <bufferAttribute> per wavy line (15 total)', () => {
    const { container } = render(<Scene />);
    expect(container.querySelectorAll('bufferattribute')).toHaveLength(15);
  });
});

describe('<LandingBackground /> WebGL handling', () => {
  const createMockCanvas = ({ supportsWebGL = true } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.getContext = jest.fn((type) => {
      if (!supportsWebGL) return null;
      return { type };
    });
    return canvas;
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders fallback message when WebGL is not supported', () => {
    const ref = React.createRef();
    jest.spyOn(React, 'useRef').mockReturnValueOnce({ current: createMockCanvas({ supportsWebGL: false }) });

    const { getByText } = render(<LandingBackground />);
    expect(getByText(/your browser or device does not support webgl/i)).toBeInTheDocument();
  });
});
