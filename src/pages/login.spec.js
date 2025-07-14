import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './login.js';

jest.mock('./login.module.css', () => ({
  container: 'container',
  form: 'form',
  title: 'title',
  input: 'input',
  error: 'error',
  button: 'button',
}));

const mockLoginUser = jest.fn();
jest.mock('../util/petitionHandler', () => ({
  loginUser: (...args) => mockLoginUser(...args),
}));

const mockLogin = jest.fn();
jest.mock('../context/authContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('react-transition-group', () => ({
  CSSTransition: ({ children }) => <>{children}</>,
}));

describe('<Login />', () => {
  beforeEach(() => jest.clearAllMocks());

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

    await waitFor(() =>
      expect(screen.getByText(/Login failed\. Please check your credentials\./i)).toBeInTheDocument()
    );
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

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('T', 'G'));
    expect(mockNavigate).toHaveBeenCalledWith('/nodes');
  });
});
