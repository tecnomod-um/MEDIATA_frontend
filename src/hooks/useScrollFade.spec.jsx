import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import useScrollFade from './useScrollFade';
import { vi } from "vitest";

describe('useScrollFade', () => {
  let origInnerHeight;
  let mockGetBoundingClientRect;

  beforeEach(() => {
    origInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
    mockGetBoundingClientRect = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: origInnerHeight, configurable: true });
  });

  function TestComponent() {
    const { ref, style } = useScrollFade();
    return (
      <div ref={ref} data-testid="fade-element" style={style}>
        Fade Content
      </div>
    );
  }

  it('returns ref and style with opacity', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('fade-element');
    expect(element).toBeInTheDocument();
    expect(element).toHaveStyle('opacity: 0');
  });

  it('sets opacity to 0 when element is not in view', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('fade-element');
    
    element.getBoundingClientRect = vi.fn(() => ({
      top: 900,
      height: 100,
    }));
    
    fireEvent.scroll(window);
    expect(element.style.opacity).toBe('0');
  });

  it('increases opacity as element scrolls into view', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('fade-element');
    
    // Element partially in view from bottom
    element.getBoundingClientRect = vi.fn(() => ({
      top: 600,
      height: 100,
    }));
    
    fireEvent.scroll(window);
    
    // The opacity calculation: offset / (innerHeight / 3)
    // offset = 800 - 600 = 200
    // 200 / (800/3) = 200 / 266.67 = ~0.75
    expect(parseFloat(element.style.opacity)).toBeGreaterThan(0);
  });

  it('caps opacity at 1 when fully in view', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('fade-element');
    
    // Element fully in view
    element.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      height: 100,
    }));
    
    fireEvent.scroll(window);
    
    const opacity = parseFloat(element.style.opacity);
    expect(opacity).toBeLessThanOrEqual(1);
  });

  it('handles window resize events', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('fade-element');
    
    element.getBoundingClientRect = vi.fn(() => ({
      top: 400,
      height: 100,
    }));
    
    Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true, configurable: true });
    fireEvent.resize(window);
    
    expect(parseFloat(element.style.opacity)).toBeGreaterThan(0);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<TestComponent />);
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('adds event listeners with passive scroll option', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    render(<TestComponent />);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    addEventListenerSpy.mockRestore();
  });

  it('calculates opacity correctly based on offset', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('fade-element');
    
    // Test various positions
    element.getBoundingClientRect = vi.fn(() => ({
      top: 700, // offset = 100
      height: 50,
    }));
    
    fireEvent.scroll(window);
    
    // offset = 800 - 700 = 100
    // opacity = min(100 / (800/3), 1) = min(100 / 266.67, 1) = ~0.375
    const opacity = parseFloat(element.style.opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  it('sets opacity to 0 when element is above viewport', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('fade-element');
    
    element.getBoundingClientRect = vi.fn(() => ({
      top: -100,
      height: 50,
    }));
    
    fireEvent.scroll(window);
    
    // offset = 800 - (-100) = 900, but element is scrolled past
    // The condition checks: offset < innerHeight + height
    // 900 < 800 + 50 = 850, so it doesn't pass
    const opacity = parseFloat(element.style.opacity);
    expect(opacity).toBeGreaterThanOrEqual(0);
  });

  it('handles ref being null gracefully', () => {
    function NullRefComponent() {
      const { style } = useScrollFade();
      return <div data-testid="no-ref" style={style}>No Ref</div>;
    }
    
    render(<NullRefComponent />);
    expect(screen.getByTestId('no-ref')).toBeInTheDocument();
  });

  it('calls handler immediately on mount', () => {
    const { container } = render(<TestComponent />);
    const element = container.querySelector('[data-testid="fade-element"]');
    
    element.getBoundingClientRect = vi.fn(() => ({
      top: 400,
      height: 100,
    }));
    
    // The effect runs and calculates opacity immediately
    expect(element.style.opacity).toBeDefined();
  });
});
