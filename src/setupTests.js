import "@testing-library/jest-dom";
import { afterEach, vi, beforeAll, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Temporary Jest-compat alias for migrated CRA/Jest tests
globalThis.jest = vi;

// Suppress React warnings for Three.js components used with React Three Fiber  
// and known CSSTransition-related warnings in tests that can't be fixed without major refactoring
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const message = String(args[0] || "");
    if (
      message.includes("The tag <") ||
      message.includes("is unrecognized in this browser") ||
      message.includes("React does not recognize the") ||
      message.includes("Received `true` for a non-boolean attribute") ||
      message.includes("Cannot update a component") ||
      (message.includes("An update to") && message.includes("was not wrapped in act"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});