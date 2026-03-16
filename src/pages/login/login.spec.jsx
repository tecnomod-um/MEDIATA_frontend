import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './login';
import { vi } from 'vitest';

vi.mock('./login.module.css', () => ({
  __esModule: true,
  default: {
    container: 'container',
    form: 'form',
    title: 'title',
    input: 'input',
    error: 'error',
    button: 'button',
  },
}));

const mockLoginUser = vi.fn();
vi.mock('../../util/petitionHandler', () => ({
  loginUser: (...args) => mockLoginUser(...args),
}));

const mockLoginAndLoadCaps = vi.fn();
vi.mock('../../context/authContext', () => ({
  useAuth: () => ({ loginAndLoadCaps: mockLoginAndLoadCaps }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-transition-group', () => ({
  CSSTransition: ({ children }) => <>{children}</>,
}));

describe('<Login />', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders username, password fields and login button', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeEnabled();
  });

  it('displays error on failed login and re-enables button', async () => {
    mockLoginUser.mockRejectedValueOnce(new Error('bad creds'));
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/Username/i), {
      target: { value: 'user1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'pass1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    expect(screen.getByRole('button', { name: /Logging in.../i })).toBeDisabled();

    await screen.findByText(/Login failed\. Please check your credentials\./i);
    expect(screen.getByRole('button', { name: /Login/i })).toBeEnabled();
  });

  it('calls login() and navigates on successful login', async () => {
    mockLoginUser.mockResolvedValueOnce({ token: 'T', tgt: 'G' });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/Username/i), {
      target: { value: 'user1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'pass1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() =>
      expect(mockLoginAndLoadCaps).toHaveBeenCalledWith('T', 'G')
    );
    expect(mockNavigate).toHaveBeenCalledWith('/projects');
  });
});