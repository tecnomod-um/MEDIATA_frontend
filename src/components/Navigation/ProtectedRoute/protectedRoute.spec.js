import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './protectedRoute';
import { useAuth } from '../../../context/authContext';
import { useNode } from '../../../context/nodeContext';

jest.mock('../../../context/authContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../../context/nodeContext', () => ({
  useNode: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  Outlet: () => <div data-testid="outlet" />,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuth.mockReset();
    useNode.mockReset();
  });

  it('renders an empty div while loading', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    useNode.mockReturnValue({ selectedNodes: null });
    const { container } = render(<ProtectedRoute />);
    expect(container.firstChild).toBeEmptyDOMElement();
    expect(screen.queryByTestId('navigate')).toBeNull();
    expect(screen.queryByTestId('outlet')).toBeNull();
  });

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    useNode.mockReturnValue({ selectedNodes: null });
    render(<ProtectedRoute />);
    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/login');
  });

  it('renders <Outlet> when authenticated and no nodeRequired', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    useNode.mockReturnValue({ selectedNodes: null });
    render(<ProtectedRoute />);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('redirects to /nodes when nodeRequired and no nodes selected', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    useNode.mockReturnValue({ selectedNodes: [] });
    render(<ProtectedRoute nodeRequired />);
    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/nodes');
  });

  it('renders <Outlet> when nodeRequired and nodes are selected', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    useNode.mockReturnValue({ selectedNodes: ['abc'] });
    render(<ProtectedRoute nodeRequired />);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });
});
