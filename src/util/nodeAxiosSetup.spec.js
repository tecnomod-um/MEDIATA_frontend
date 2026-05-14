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
let storeNodeRoutingEntry;
let getResolvedNodeBaseURL;
let mockReqUse;
let mockResUse;
let requestInterceptor;
let proxiedNodeBaseUrl;

beforeAll(async () => {
  mockReqUse = axios.__m.mockReqUse;
  mockResUse = axios.__m.mockResUse;

  const mod = await import('../util/nodeAxiosSetup');
  const config = (await import('../config')).default;
  nodeAxiosInstance = mod.default;
  setupNodeAxiosInterceptors = mod.setupNodeAxiosInterceptors;
  updateNodeAxiosBaseURL = mod.updateNodeAxiosBaseURL;
  storeNodeRoutingEntry = mod.storeNodeRoutingEntry;
  getResolvedNodeBaseURL = mod.getResolvedNodeBaseURL;
  proxiedNodeBaseUrl = new URL('nodes/proxy/n1', config.backendUrl).toString();

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

    it('uses node token when available', () => {
      localStorage.setItem('jwtNodeTokens', '{"http://node":"node-token"}');
      const config = { baseURL: 'http://node', headers: {} };
      requestInterceptor(config);

      expect(config.headers.Authorization).toBe('Bearer node-token');
    });

    it('uses central auth plus X-Node-Authorization for proxied requests', () => {
      localStorage.setItem('jwtToken', 'session-token');
      localStorage.setItem(
        'jwtNodeTokens',
        JSON.stringify({ [proxiedNodeBaseUrl]: 'node-token' })
      );
      const config = {
        baseURL: proxiedNodeBaseUrl,
        url: '/taniwha/api/files/datasets',
        headers: {}
      };

      requestInterceptor(config);

      expect(config.headers.Authorization).toBe('Bearer session-token');
      expect(config.headers['X-Node-Authorization']).toBe('Bearer node-token');
    });

    it('recognizes proxied requests under the /taniwha backend context path', () => {
      const proxiedContextPathUrl = 'http://localhost:18088/taniwha/nodes/proxy/n1';
      localStorage.setItem('jwtToken', 'session-token');
      localStorage.setItem(
        'jwtNodeTokens',
        JSON.stringify({ [proxiedContextPathUrl]: 'node-token' })
      );
      const config = {
        baseURL: proxiedContextPathUrl,
        url: '/taniwha/api/files/datasets',
        headers: {}
      };

      requestInterceptor(config);

      expect(config.headers.Authorization).toBe('Bearer session-token');
      expect(config.headers['X-Node-Authorization']).toBe('Bearer node-token');
    });

    it('does not attach X-Node-Authorization during proxied node validation', () => {
      localStorage.setItem('jwtToken', 'session-token');
      localStorage.setItem(
        'jwtNodeTokens',
        JSON.stringify({ [proxiedNodeBaseUrl]: 'node-token' })
      );
      const config = {
        baseURL: proxiedNodeBaseUrl,
        url: '/taniwha/node/validate',
        headers: {}
      };

      requestInterceptor(config);

      expect(config.headers.Authorization).toBe('Bearer session-token');
      expect(config.headers['X-Node-Authorization']).toBeUndefined();
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

    it('does not logout on Unauthorized node-validate response', () => {
      const response = {
        config: { url: '/taniwha/node/validate' },
        data: { jwtNodeToken: 'Unauthorized' },
      };

      const result = successHandler(response);

      expect(result).toBe(response);
      expect(logoutMock).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
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

    it('does not logout on 401 from node validate', async () => {
      const error = {
        config: { url: '/taniwha/node/validate' },
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
      expect(logoutMock).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    it('does not logout on proxied 403 responses', async () => {
      const error = {
        config: {
          baseURL: proxiedNodeBaseUrl,
          url: '/taniwha/api/files/datasets'
        },
        response: { status: 403, headers: { 'x-node-proxy': 'true' } },
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

    it('resolves proxied base URLs from stored routing config', () => {
      storeNodeRoutingEntry('http://node-http', {
        proxyRequired: true,
        proxyBasePath: '/nodes/proxy/node-http',
      });

      const expectedProxyBaseUrl = proxiedNodeBaseUrl.replace('/n1', '/node-http');

      expect(getResolvedNodeBaseURL('http://node-http'))
        .toBe(expectedProxyBaseUrl);

      updateNodeAxiosBaseURL('http://node-http');
      expect(nodeAxiosInstance.defaults.baseURL)
        .toBe(expectedProxyBaseUrl);
    });
  });
});
