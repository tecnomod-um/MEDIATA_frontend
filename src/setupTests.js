// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock canvas module to avoid native dependency issues in tests
// This needs to be done before jsdom tries to load it
jest.mock('canvas', () => ({
  createCanvas: jest.fn(),
  loadImage: jest.fn(),
}), { virtual: true });

// Suppress canvas-related errors in jsdom
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('canvas.node') || args[0].includes('Canvas'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
