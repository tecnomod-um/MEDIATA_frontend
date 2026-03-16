import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Temporary Jest-compat alias for migrated CRA/Jest tests
globalThis.jest = vi;