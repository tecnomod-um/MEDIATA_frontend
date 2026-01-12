import React from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TooltipPopup from "./tooltipPopup";

const realErr = console.error;

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation((msg, ...rest) => {
    if (/findDOMNode is deprecated/i.test(msg)) return;
    realErr(msg, ...rest);
  });

  global.ResizeObserver = class ResizeObserver {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return 120;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return 40;
    },
  });

  jest.spyOn(window, "addEventListener");
  jest.spyOn(window, "removeEventListener");
  jest.useFakeTimers();
});

afterAll(() => {
  console.error.mockRestore();
  window.addEventListener.mockRestore();
  window.removeEventListener.mockRestore();

  delete global.ResizeObserver;
  delete HTMLElement.prototype.offsetWidth;
  delete HTMLElement.prototype.offsetHeight;

  jest.useRealTimers();
});

let buttonRef;

beforeEach(() => {
  buttonRef = { current: document.createElement("button") };
  buttonRef.current.getBoundingClientRect = () => ({
    top: 100,
    left: 200,
    width: 40,
    height: 20,
    bottom: 120,
    right: 240,
  });
  document.body.appendChild(buttonRef.current);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  jest.clearAllTimers();
});

describe("TooltipPopup", () => {
  const MESSAGE = "Hello Tooltip";

  it("shows, auto-hides after 3 s (+150 ms) and calls onClose once", () => {
    const onClose = jest.fn();

    render(<TooltipPopup message={MESSAGE} buttonRef={buttonRef} onClose={onClose} />);
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
