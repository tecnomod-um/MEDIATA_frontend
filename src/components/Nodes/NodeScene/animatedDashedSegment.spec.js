import React from 'react';
import { render } from '@testing-library/react';
import AnimatedDashedSegment from './animatedDashedSegment';

// Mock the three.js related modules
jest.mock('three', () => ({
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  },
}));

jest.mock('@react-spring/three', () => ({
  animated: (Component) => Component,
}));

jest.mock('@react-three/drei', () => ({
  Line: jest.fn(({ points, color }) => <mesh data-testid="line" data-color={color} data-points-length={points?.length} />),
}));

describe('AnimatedDashedSegment', () => {
  const mockStart = { x: 0, y: 0 };
  const mockEnd = { x: 10, y: 10 };
  const mockRegisterLine = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <AnimatedDashedSegment
        start={mockStart}
        end={mockEnd}
        opacity={1}
        registerLine={mockRegisterLine}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with partial opacity', () => {
    const { container } = render(
      <AnimatedDashedSegment
        start={mockStart}
        end={mockEnd}
        opacity={0.5}
        registerLine={mockRegisterLine}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with different start and end positions', () => {
    const { container } = render(
      <AnimatedDashedSegment
        start={{ x: 5, y: 5 }}
        end={{ x: 15, y: 15 }}
        opacity={1}
        registerLine={mockRegisterLine}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders without registerLine callback', () => {
    const { container } = render(
      <AnimatedDashedSegment
        start={mockStart}
        end={mockEnd}
        opacity={1}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('handles zero opacity', () => {
    const { container } = render(
      <AnimatedDashedSegment
        start={mockStart}
        end={mockEnd}
        opacity={0}
        registerLine={mockRegisterLine}
      />
    );
    expect(container).toBeInTheDocument();
  });
});
