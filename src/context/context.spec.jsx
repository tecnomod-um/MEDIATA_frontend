import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

const {
  mockNavigate,
  mockSetupNodeAxiosInterceptors,
  mockGetSystemCapabilities,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetupNodeAxiosInterceptors: vi.fn(),
  mockGetSystemCapabilities: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('jwt-decode', () => ({
  __esModule: true,
  jwtDecode: () => ({ exp: Date.now() / 1000 + 60 }),
}));

vi.mock('../util/nodeAxiosSetup', () => ({
  setupNodeAxiosInterceptors: mockSetupNodeAxiosInterceptors,
}));

vi.mock('../util/petitionHandler', () => ({
  getSystemCapabilities: mockGetSystemCapabilities,
}));

import { NodeProvider, useNode } from './nodeContext.jsx';
import { AuthProvider, useAuth } from './authContext.jsx';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
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

  it('loads initial state from localStorage on mount', () => {
    localStorage.setItem('selectedNodes', JSON.stringify([{ id: 10, name: 'Saved' }]));

    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    expect(screen.getByTestId('selected')).toHaveTextContent('10:Saved');
  });

  it('handles corrupt JSON in localStorage gracefully', () => {
    localStorage.setItem('selectedNodes', 'not-valid-json{');

    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    expect(screen.getByTestId('selected')).toHaveTextContent('');
  });

  it('persists nodes to localStorage when selecting', () => {
    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    fireEvent.click(screen.getByText('one'));
    const stored = JSON.parse(localStorage.getItem('selectedNodes'));
    expect(stored).toEqual([{ id: 1, name: 'One' }]);
  });

  it('removes localStorage entry when clearing nodes', () => {
    localStorage.setItem('selectedNodes', JSON.stringify([{ id: 1, name: 'Test' }]));

    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    fireEvent.click(screen.getByText('clear'));
    expect(localStorage.getItem('selectedNodes')).toBeNull();
  });

  it('handles selecting empty array', () => {
    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    fireEvent.click(screen.getByText('one'));
    fireEvent.click(screen.getByText('clear'));

    expect(localStorage.getItem('selectedNodes')).toBeNull();
    expect(screen.getByTestId('selected')).toHaveTextContent('');
  });

  it('listens to storage events and updates state', async () => {
    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    const event = new StorageEvent('storage', {
      key: 'selectedNodes',
      newValue: JSON.stringify([{ id: 99, name: 'External' }]),
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('99:External');
    });
  });

  it('ignores storage events for other keys', () => {
    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    fireEvent.click(screen.getByText('one'));

    const event = new StorageEvent('storage', {
      key: 'otherKey',
      newValue: 'something',
    });

    window.dispatchEvent(event);

    expect(screen.getByTestId('selected')).toHaveTextContent('1:One');
  });

  it('handles storage event with null newValue', async () => {
    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    fireEvent.click(screen.getByText('one'));

    const event = new StorageEvent('storage', {
      key: 'selectedNodes',
      newValue: null,
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('');
    });
  });

  it('handles corrupt JSON in storage event gracefully', async () => {
    render(
      <NodeProvider>
        <Tester />
      </NodeProvider>
    );

    fireEvent.click(screen.getByText('one'));

    const event = new StorageEvent('storage', {
      key: 'selectedNodes',
      newValue: 'invalid-json{',
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('');
    });
  });
});

describe('AuthProvider & useAuth', () => {
  beforeEach(() => {
    mockGetSystemCapabilities.mockResolvedValue({
      semanticAlignment: true,
      hl7fhir: true,
    });
  });

  function AuthTester() {
    const {
      isAuthenticated,
      isLoading,
      loginAndLoadCaps,
      logout,
      capabilities,
      capsLoaded,
    } = useAuth();
    const { selectedNodes, selectNode } = useNode();

    return (
      <>
        <div data-testid="loading">{String(isLoading)}</div>
        <div data-testid="auth">{String(isAuthenticated)}</div>
        <div data-testid="selectedCount">{selectedNodes.length}</div>
        <div data-testid="capsLoaded">{String(capsLoaded)}</div>
        <div data-testid="capabilities">{JSON.stringify(capabilities)}</div>
        <button onClick={() => loginAndLoadCaps('tok', 'tgt')}>login</button>
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

    expect(mockSetupNodeAxiosInterceptors).toHaveBeenCalled();
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

    await act(async () => {
      fireEvent.click(screen.getByText('login'));
    });

    await waitFor(() => {
      expect(localStorage.getItem('jwtToken')).toBe('tok');
      expect(localStorage.getItem('kerberosTGT')).toBe('tgt');
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
    });
  });

  it('logout() clears tokens, resets auth & nodes, and navigates to /login', async () => {
    localStorage.setItem('jwtToken', 'x');
    localStorage.setItem('kerberosTGT', 'y');

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByText('add-node'));
    expect(screen.getByTestId('selectedCount')).toHaveTextContent('1');

    await act(async () => {
      fireEvent.click(screen.getByText('logout'));
    });

    expect(localStorage.getItem('jwtToken')).toBeNull();
    expect(localStorage.getItem('kerberosTGT')).toBeNull();
    expect(localStorage.getItem('systemCapabilities')).toBeNull();
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(screen.getByTestId('selectedCount')).toHaveTextContent('0');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('on mount with no tokens, sets auth=false and loading=false', () => {
    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
  });

  it('on mount with only jwtToken but no TGT, sets auth=false', () => {
    localStorage.setItem('jwtToken', 'token-only');

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    expect(screen.getByTestId('auth')).toHaveTextContent('false');
  });

  it('on mount with only TGT but no jwtToken, sets auth=false', () => {
    localStorage.setItem('kerberosTGT', 'tgt-only');

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    expect(screen.getByTestId('auth')).toHaveTextContent('false');
  });

  it('login() clears jwtNodeTokens before setting new tokens', async () => {
    localStorage.setItem('jwtNodeTokens', 'old-tokens');

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('login'));
    });

    await waitFor(() => {
      expect(localStorage.getItem('jwtNodeTokens')).toBeNull();
    });
  });

  it('logout() clears jwtNodeTokens', async () => {
    localStorage.setItem('jwtToken', 'x');
    localStorage.setItem('kerberosTGT', 'y');
    localStorage.setItem('jwtNodeTokens', 'node-tokens');

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('logout'));
    });
    expect(localStorage.getItem('jwtNodeTokens')).toBeNull();
  });

  it('logout() clears selectedNodes from localStorage', async () => {
    localStorage.setItem('jwtToken', 'x');
    localStorage.setItem('kerberosTGT', 'y');
    localStorage.setItem('selectedNodes', JSON.stringify([{ id: 1, name: 'Node' }]));

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('logout'));
    });
    expect(localStorage.getItem('selectedNodes')).toBeNull();
  });

  it('loginAndLoadCaps fetches capabilities and sets capsLoaded', async () => {
    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    expect(screen.getByTestId('capsLoaded')).toHaveTextContent('false');

    await act(async () => {
      fireEvent.click(screen.getByText('login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('capsLoaded')).toHaveTextContent('true');
      expect(screen.getByTestId('capabilities')).toHaveTextContent(
        JSON.stringify({ semanticAlignment: true, hl7fhir: true })
      );
    });
  });

  it('uses default capabilities when getSystemCapabilities fails', async () => {
    mockGetSystemCapabilities.mockRejectedValueOnce(new Error('API error'));

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('capsLoaded')).toHaveTextContent('true');
      expect(screen.getByTestId('capabilities')).toHaveTextContent(
        JSON.stringify({ semanticAlignment: false, hl7fhir: false })
      );
    });
  });

  it('loads capabilities from localStorage cache on mount', () => {
    localStorage.setItem(
      'systemCapabilities',
      JSON.stringify({ semanticAlignment: true, hl7fhir: false })
    );

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    expect(screen.getByTestId('capsLoaded')).toHaveTextContent('true');
    expect(screen.getByTestId('capabilities')).toHaveTextContent(
      JSON.stringify({ semanticAlignment: true, hl7fhir: false })
    );
  });

  it('logout clears systemCapabilities from localStorage', () => {
    localStorage.setItem('jwtToken', 'x');
    localStorage.setItem('kerberosTGT', 'y');
    localStorage.setItem(
      'systemCapabilities',
      JSON.stringify({ semanticAlignment: true, hl7fhir: true })
    );

    render(
      <NodeProvider>
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      </NodeProvider>
    );

    fireEvent.click(screen.getByText('logout'));

    expect(localStorage.getItem('systemCapabilities')).toBeNull();
    expect(screen.getByTestId('capsLoaded')).toHaveTextContent('false');
  });
});