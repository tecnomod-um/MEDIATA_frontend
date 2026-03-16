import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClusterListPanel from './clusterListPanel';
import { vi } from "vitest";

vi.mock('./clusterListPanel.module.css', () => ({
  __esModule: true,
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

vi.mock('react-transition-group', () => {
  const React = require('react');
  return {
    __esModule: true,
    TransitionGroup: ({ children, component: Component = 'ul', className }) =>
      React.createElement(Component, { className }, children),
    CSSTransition: ({ children }) => children,
  };
});

describe('<ClusterListPanel />', () => {
  const clusters = [
    { id: 1, name: 'Cluster A', elements: [{ id: 10 }, { id: 11 }] },
    { id: 2, name: 'Cluster B', elements: [] },
  ];

  let onSelectCluster;
  let onMoveElement;

  beforeEach(() => {
    vi.clearAllMocks();
    onSelectCluster = vi.fn();
    onMoveElement = vi.fn();
  });

  it('renders each cluster name and its element count', () => {
    render(
      <ClusterListPanel
        clusters={clusters}
        onSelectCluster={onSelectCluster}
        onMoveElement={onMoveElement}
        isDragging={false}
      />
    );

    expect(screen.getByText('Cluster A')).toBeInTheDocument();
    expect(screen.getByText('Cluster B')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('calls onSelectCluster when a cluster is clicked', () => {
    render(
      <ClusterListPanel
        clusters={clusters}
        onSelectCluster={onSelectCluster}
        onMoveElement={onMoveElement}
        isDragging={false}
      />
    );

    fireEvent.click(screen.getByText('Cluster A'));
    expect(onSelectCluster).toHaveBeenCalledWith(clusters[0]);
  });

  it('onDrop calls onMoveElement with elementId and cluster.id', () => {
    render(
      <ClusterListPanel
        clusters={clusters}
        onSelectCluster={onSelectCluster}
        onMoveElement={onMoveElement}
        isDragging={false}
      />
    );

    const clusterBItem = screen.getByRole('listitem', { name: /Cluster B/i });
    const fakeData = JSON.stringify({ elementId: 42 });
    const dataTransfer = { getData: vi.fn().mockReturnValue(fakeData) };

    fireEvent.drop(clusterBItem, { dataTransfer });
    expect(onMoveElement).toHaveBeenCalledWith(42, 2);
  });

  it('applies dragOverlay class when isDragging is true', () => {
    render(
      <ClusterListPanel
        clusters={clusters}
        onSelectCluster={onSelectCluster}
        onMoveElement={onMoveElement}
        isDragging={true}
      />
    );

    const wrapperDiv = screen.getByTestId('wrapper');
    expect(wrapperDiv).toHaveClass('wrapper');
    expect(wrapperDiv).toHaveClass('dragOverlay');
  });

  it('renders the instructions text', () => {
    render(
      <ClusterListPanel
        clusters={clusters}
        onSelectCluster={onSelectCluster}
        onMoveElement={onMoveElement}
        isDragging={false}
      />
    );

    expect(
      screen.getByText(/Drag an element onto a cluster to add it\./i)
    ).toBeInTheDocument();
  });
});