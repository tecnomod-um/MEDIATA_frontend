import "@testing-library/jest-dom";
import { afterEach, vi, beforeAll, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Temporary Jest-compat alias for migrated CRA/Jest tests
globalThis.jest = vi;

// Suppress React warnings for Three.js components used with React Three Fiber  
// and known CSSTransition-related warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("The tag <") ||
        args[0].includes("is unrecognized in this browser") ||
        args[0].includes("React does not recognize the") ||
        args[0].includes("Received `true` for a non-boolean attribute") ||
        args[0].includes("Cannot update a component (`ProjectPicker`) while rendering a different component (`CSSTransition`)") ||
        (args[0].includes("An update to ProjectPicker") && args[0].includes("was not wrapped in act")) ||
        (args[0].includes("An update to Integration") && args[0].includes("was not wrapped in act")))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});