import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './navbar';
import CustomLink from './customLink';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    Link: ({ to, children, ...props }) =>
      React.createElement('a', { href: to, ...props }, children),
    useNavigate: jest.fn(),
    useMatch: jest.fn(),
    useResolvedPath: jest.fn(),
  };
});

jest.mock('../../../context/authContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../../context/nodeContext', () => ({
  useNode: jest.fn(),
}));

describe('CustomLink', () => {
  const { useMatch, useResolvedPath } = require('react-router-dom');

  beforeEach(() => {
    useResolvedPath.mockReturnValue({ pathname: '/current' });
    useMatch.mockReturnValue(false);
  });

  it('renders its children inside an <a> with correct href', () => {
    render(<CustomLink to="/foo">Bar</CustomLink>);
    const a = screen.getByText('Bar').closest('a');
    expect(a).toHaveAttribute('href', '/foo');
  });

  it('adds active class when current path matches', () => {
    useResolvedPath.mockReturnValue({ pathname: '/foo' });
    useMatch.mockReturnValue(true);
    const { container } = render(<CustomLink to="/foo">Active</CustomLink>);
    expect(container.firstChild).toHaveClass('active');
  });

  it('calls onClick when clicked, unless noToggle is true', () => {
    const onClick = jest.fn();
    render(<CustomLink to="/x" onClick={onClick}>X</CustomLink>);
    fireEvent.click(screen.getByText('X'));
    expect(onClick).toHaveBeenCalled();

    onClick.mockClear();
    render(<CustomLink to="/y" onClick={onClick} noToggle>Y</CustomLink>);
    fireEvent.click(screen.getByText('Y'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Navbar', () => {
  const {
    useNavigate,
    useMatch,
    useResolvedPath
  } = require('react-router-dom');
  const { useAuth } = require('../../../context/authContext');
  const { useNode } = require('../../../context/nodeContext');

  let navigateMock;

  beforeEach(() => {
    useResolvedPath.mockReturnValue({ pathname: '/' });
    useMatch.mockReturnValue(false);
    navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    useAuth.mockReturnValue({ isAuthenticated: false, logout: jest.fn() });
    useNode.mockReturnValue({ selectedNodes: null });
  });

  it('shows Home, Login, About when unauthenticated', () => {
    render(<Navbar />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.queryByText('Nodes')).toBeNull();
    expect(screen.queryByText('Discovery')).toBeNull();
  });

  it('toggles mobile menu animate class when checkbox clicked', () => {
    render(<Navbar />);
    const checkbox = screen.getByRole('checkbox');
    const menu = document.querySelector(`.${require('./navbar.module.css').menu}`);
    expect(menu).not.toHaveClass(require('./navbar.module.css').animate);
    fireEvent.click(checkbox);
    expect(menu).toHaveClass(require('./navbar.module.css').animate);
  });

  it('renders extra nav items when authenticated and nodes selected', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() });
    useNode.mockReturnValue({ selectedNodes: ['abc'] });
    render(<Navbar />);
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Integration')).toBeInTheDocument();
    expect(screen.getByText('Semantic-Alignment')).toBeInTheDocument();
    expect(screen.getByText('HL7 FHIR')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('Nodes')).toBeInTheDocument();
  });

  it('calls logout + navigate on Logout click', () => {
    const logoutMock = jest.fn();
    useAuth.mockReturnValue({ isAuthenticated: true, logout: logoutMock });
    useNode.mockReturnValue({ selectedNodes: ['n1'] });
    render(<Navbar />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Logout'));
    expect(logoutMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('renders the University logo with correct attrs', () => {
    render(<Navbar />);
    const logo = screen.getByAltText('University of Murcia logo');
    expect(logo).toHaveAttribute('src', expect.stringContaining('/umu_coat.svg'));
    expect(logo).toHaveAttribute('loading', 'eager');
    expect(logo).toHaveAttribute('fetchpriority', 'high');
  });

  it('includes FileSearchIcon inside Discovery desktop label', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() });
    useNode.mockReturnValue({ selectedNodes: ['n1'] });
    render(<Navbar />);
    expect(
      screen.getByTitle('Dataset analysis and exploration')
    ).toBeInTheDocument();
  });
});
