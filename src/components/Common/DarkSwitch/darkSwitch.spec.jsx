import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DarkSwitch from './darkSwitch';
import { vi } from "vitest";

describe('DarkSwitch', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('dark-mode');
    
    // Mock getComputedStyle for CSS variables
    global.getComputedStyle = vi.fn(() => ({
      getPropertyValue: vi.fn((name) => {
        if (name === '--background-nav-and-headers-background-color') {
          return '#0b2a33';
        }
        if (name === '--background-nav-tool-background-color-active-light') {
          return '#1fb6d5';
        }
        return '';
      }),
    }));
  });

  afterEach(() => {
    localStorage.clear();
    document.body.classList.remove('dark-mode');
  });

  it('renders the switch', () => {
    render(<DarkSwitch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('initializes dark mode from localStorage when set to true', () => {
    localStorage.setItem('darkMode', 'true');
    render(<DarkSwitch />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeChecked();
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('initializes light mode from localStorage when set to false', () => {
    localStorage.setItem('darkMode', 'false');
    render(<DarkSwitch />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).not.toBeChecked();
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });

  it('defaults to light mode when no localStorage value', () => {
    render(<DarkSwitch />);
    
    const switchElement = screen.getByRole('switch');
    expect(switchElement).not.toBeChecked();
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });

  it('toggles dark mode on when clicked', async () => {
    render(<DarkSwitch />);
    
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    
    await waitFor(() => {
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });
    expect(localStorage.getItem('darkMode')).toBe('true');
  });

  it('toggles dark mode off when clicked from dark mode', async () => {
    localStorage.setItem('darkMode', 'true');
    render(<DarkSwitch />);
    
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    
    await waitFor(() => {
      expect(document.body.classList.contains('dark-mode')).toBe(false);
    });
    expect(localStorage.getItem('darkMode')).toBe('false');
  });

  it('has correct aria-label for light mode', () => {
    render(<DarkSwitch />);
    
    const switchElement = screen.getByLabelText('Switch to dark mode');
    expect(switchElement).toBeInTheDocument();
  });

  it('has correct aria-label for dark mode', () => {
    localStorage.setItem('darkMode', 'true');
    render(<DarkSwitch />);
    
    const switchElement = screen.getByLabelText('Switch to light mode');
    expect(switchElement).toBeInTheDocument();
  });

  it('updates localStorage on each toggle', async () => {
    render(<DarkSwitch />);
    const switchElement = screen.getByRole('switch');
    
    // Toggle to dark
    fireEvent.click(switchElement);
    await waitFor(() => {
      expect(localStorage.getItem('darkMode')).toBe('true');
    });
    
    // Toggle back to light
    fireEvent.click(switchElement);
    await waitFor(() => {
      expect(localStorage.getItem('darkMode')).toBe('false');
    });
  });

  it('applies dark-mode class to body when enabled', async () => {
    render(<DarkSwitch />);
    const switchElement = screen.getByRole('switch');
    
    fireEvent.click(switchElement);
    
    await waitFor(() => {
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });
  });

  it('removes dark-mode class from body when disabled', async () => {
    localStorage.setItem('darkMode', 'true');
    render(<DarkSwitch />);
    
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);
    
    await waitFor(() => {
      expect(document.body.classList.contains('dark-mode')).toBe(false);
    });
  });

  it('uses CSS variables for colors', () => {
    render(<DarkSwitch />);
    
    expect(global.getComputedStyle).toHaveBeenCalled();
  });

  it('uses fallback colors when CSS variables are not available', () => {
    global.getComputedStyle = vi.fn(() => ({
      getPropertyValue: vi.fn(() => ''),
    }));
    
    render(<DarkSwitch />);
    
    // Component should still render even without CSS variable values
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});
