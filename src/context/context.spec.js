import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NodeProvider, useNode } from './nodeContext.js';
import { AuthProvider, useAuth } from './authContext.js';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('jwt-decode', () => ({
  __esModule: true,
  jwtDecode: () => ({ exp: Date.now() / 1000 + 60 }),
}));

jest.mock('../util/nodeAxiosSetup', () => ({
  setupNodeAxiosInterceptors: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('NodeProvider & useNode', () => {
  function Tester() {
    const { selectedNodes, selectNode, selectNodes, clearSelectedNodes } = useNode();
    return (
      <>
        <div data-testid="selected">
          {selectedNodes.map((n) => `${n.id}:${n.name}`).join(',')}
        </div>
        <button onClick={() => selectNode({ id: 1, name: 'One' })}>one</button>
        <button
          onClick={() =>
            selectNodes([
              { id: 2, name: 'Two' },
              { id: 3, name: 'Three' },
            ])
          }
        >
          many
        </button>
        <button onClick={clearSelectedNodes}>clear</button>
      </>
    );
  }

  it('initially empty, can add one, many, and clear', () => {
    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    expect(screen.getByTestId('selected')).toHaveTextContent('');
    fireEvent.click(screen.getByText('one'));
    expect(screen.getByTestId('selected')).toHaveTextContent('1:One');
    fireEvent.click(screen.getByText('many'));
    expect(screen.getByTestId('selected')).toHaveTextContent('2:Two,3:Three');
    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('selected')).toHaveTextContent('');
  });
});

describe('AuthProvider & useAuth', () => {
  const { setupNodeAxiosInterceptors } = require('../util/nodeAxiosSetup');

  function AuthTester() {
    const { isAuthenticated, isLoading, login, logout } = useAuth();
    const { selectedNodes, selectNode } = useNode();
    return (
      <>
        <div data-testid="loading">{String(isLoading)}</div>
        <div data-testid="auth">{String(isAuthenticated)}</div>
        <div data-testid="selectedCount">{selectedNodes.length}</div>
        <button onClick={() => login('tok', 'tgt')}>login</button>
        <button onClick={() => selectNode({ id: 5, name: 'Five' })}>add-node</button>
        <button onClick={logout}>logout</button>
      </>
    );
  }

  it('on mount with tokens in storage, sets auth=true and loading=false, and sets up axios', async () => {
    localStorage.setItem('jwtToken', 'dummy');
    localStorage.setItem('kerberosTGT', 'tgt');

    await act(async () => {
      render(
        <NodeProvider>
          <AuthProvider>
            <AuthTester />
          </AuthProvider>
        </NodeProvider>
      );
    });

    expect(setupNodeAxiosInterceptors).toHaveBeenCalled();
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
  });

  it('login() stores tokens and sets auth=true', async () => {
    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('login'));
    expect(localStorage.getItem('jwtToken')).toBe('tok');
    expect(localStorage.getItem('kerberosTGT')).toBe('tgt');
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
  });

  it('logout() clears tokens, resets auth & nodes, and navigates to /login', async () => {
    localStorage.setItem('jwtToken', 'x');
    localStorage.setItem('kerberosTGT', 'y');

    await act(async () => {
      render(
        <NodeProvider>
          <AuthProvider>
            <AuthTester />
          </AuthProvider>
        </NodeProvider>
      );
    });

    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('auth')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('add-node'));
    expect(screen.getByTestId('selectedCount')).toHaveTextContent('1');
    fireEvent.click(screen.getByText('logout'));

    expect(localStorage.getItem('jwtToken')).toBeNull();
    expect(localStorage.getItem('kerberosTGT')).toBeNull();
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(screen.getByTestId('selectedCount')).toHaveTextContent('0');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
