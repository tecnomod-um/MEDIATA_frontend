import '@testing-library/jest-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockReqUse = vi.fn();
  const mockResUse = vi.fn();

  const mockAxiosInstance = {
    interceptors: {
      request: { use: mockReqUse },
      response: { use: mockResUse },
    },
    defaults: { baseURL: '' },
  };

  const mockCreate = vi.fn(() => mockAxiosInstance);
  const def = {
    create: mockCreate,
    __m: { mockReqUse, mockResUse, mockCreate, mockAxiosInstance },
  };

  return {
    __esModule: true,
    default: def,
  };
});

const localStorageMock = (() => {
  let store = {};

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

let nodeAxiosInstance;
let setupNodeAxiosInterceptors;
let updateNodeAxiosBaseURL;
let mockReqUse;
let mockResUse;
let requestInterceptor;

beforeAll(async () => {
  mockReqUse = axios.__m.mockReqUse;
  mockResUse = axios.__m.mockResUse;

  const mod = await import('../util/nodeAxiosSetup');
  nodeAxiosInstance = mod.default;
  setupNodeAxiosInterceptors = mod.setupNodeAxiosInterceptors;
  updateNodeAxiosBaseURL = mod.updateNodeAxiosBaseURL;

  requestInterceptor = mockReqUse.mock.calls[0]?.[0];
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('nodeAxiosSetup', () => {
  describe('request interceptor', () => {
    it('leaves headers unchanged when no tokens available', () => {
      const config = { baseURL: 'https://no-token-api', headers: {} };
      requestInterceptor(config);

      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    let successHandler;
    let errorHandler;
    let logoutMock;

    beforeEach(() => {
      logoutMock = vi.fn();
      setupNodeAxiosInterceptors(logoutMock);

      const lastCallIndex = mockResUse.mock.calls.length - 1;
      successHandler = mockResUse.mock.calls[lastCallIndex][0];
      errorHandler = mockResUse.mock.calls[lastCallIndex][1];
    });

    it('handles Unauthorized response in success interceptor', () => {
      const response = { data: { jwtNodeToken: 'Unauthorized' } };

      successHandler(response);

      expect(localStorage.removeItem).toHaveBeenCalledWith('jwtToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('kerberosTGT');
      expect(localStorage.removeItem).toHaveBeenCalledWith('jwtNodeTokens');
      expect(logoutMock).toHaveBeenCalled();
    });

    it('passes through normal responses', () => {
      const response = { data: { valid: true } };
      expect(successHandler(response)).toBe(response);
    });

    it('handles 401/403 errors', async () => {
      const error = {
        response: { status: 401 },
        isAxiosError: true,
      };

      let caughtError;
      try {
        await errorHandler(error);
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBe(error);

      expect(localStorage.removeItem).toHaveBeenCalledWith('jwtToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('kerberosTGT');
      expect(localStorage.removeItem).toHaveBeenCalledWith('jwtNodeTokens');
      expect(logoutMock).toHaveBeenCalled();
    });

    it('ignores non-401/403 errors', async () => {
      const error = {
        response: { status: 500 },
        isAxiosError: true,
      };

      let caughtError;
      try {
        await errorHandler(error);
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBe(error);

      expect(logoutMock).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('updateNodeAxiosBaseURL', () => {
    it('updates baseURL correctly', () => {
      const newUrl = 'https://new-node-api';
      updateNodeAxiosBaseURL(newUrl);

      expect(nodeAxiosInstance.defaults.baseURL).toBe(newUrl);
    });
  });
});