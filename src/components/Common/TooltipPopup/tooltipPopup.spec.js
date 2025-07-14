import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import TooltipPopup from './tooltipPopup';

const realErr = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((msg, ...rest) => {
    if (/findDOMNode is deprecated/i.test(msg)) return;
    realErr(msg, ...rest);
  });
  jest.spyOn(window, 'addEventListener');
  jest.spyOn(window, 'removeEventListener');

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return 120; },
  });

  jest.useFakeTimers();
});

afterAll(() => {
  console.error.mockRestore();
  window.addEventListener.mockRestore();
  window.removeEventListener.mockRestore();
  delete HTMLElement.prototype.clientWidth;
  jest.useRealTimers();
});

let buttonRef;
beforeEach(() => {
  buttonRef = { current: document.createElement('button') };
  buttonRef.current.getBoundingClientRect = () => ({
    top: 100, left: 200, width: 40, height: 20, bottom: 120, right: 240,
  });
  document.body.appendChild(buttonRef.current);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  jest.clearAllTimers();
});

describe('TooltipPopup', () => {
  const MESSAGE = 'Hello Tooltip';

  it('shows, auto-hides after 3 s (+150 ms) and calls onClose once', () => {
    const onClose = jest.fn();

    const { unmount } = render(
      <TooltipPopup message={MESSAGE} buttonRef={buttonRef} onClose={onClose} />,
    );

    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(0));
    act(() => jest.advanceTimersByTime(3_150));
    act(() => jest.advanceTimersByTime(0));
    expect(onClose).not.toHaveBeenCalled();

    unmount();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
