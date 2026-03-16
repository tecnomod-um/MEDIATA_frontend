import React from 'react';
import { render, screen } from '@testing-library/react';
import About from './about';
import { vi } from "vitest";

describe('<About />', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the main header and team members', () => {
    render(<About />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Taniwha - About Us/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Catalina Martinez Costa/i).textContent
    ).toMatch(/Catalina Martinez Costa/i);
    expect(
      screen.getByText(/Daniel Ibáñez Molero/i).textContent
    ).toMatch(/Daniel Ibáñez Molero/i);
  });

  it('renders contact info and resource link', () => {
    render(<About />);
    expect(screen.getByText(/cmartinezcosta@um\.es/)).toBeInTheDocument();
    expect(screen.getByText(/danibanez\.info@gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText(/868 88 87 87/)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /GitHub page/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/tecnomod-um/MEDIATA_project'
    );
  });
});
