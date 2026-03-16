import '@testing-library/jest-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockReqUse = vi.fn();
  const mockResUse = vi.fn();

  const mockAxios = {
    interceptors: {
      request: { use: mockReqUse },
      response: { use: mockResUse },
    },
  };

  const mockCreate = vi.fn(() => mockAxios);

  const def = {
    create: mockCreate,
    __m: { mockReqUse, mockResUse, mockCreate, mockAxios },
  };

  return {
    __esModule: true,
    default: def,
  };
});

vi.mock('../config', () => ({
  __esModule: true,
  backendUrl: 'https://api.example.com',
  default: {
    backendUrl: 'https://api.example.com',
  },
}));

let axiosInstance;
let setupAxiosInterceptors;
let mockResUse;
let mockReqUse;
let mockAxios;
let requestHandler;
let errorHandler;

beforeAll(async () => {
  ({ mockResUse, mockReqUse, mockAxios } = axios.__m);

  const mod = await import('../util/axiosSetup');
  axiosInstance = mod.default;
  setupAxiosInterceptors = mod.setupAxiosInterceptors;

  requestHandler = mockReqUse.mock.calls[0]?.[0];
  errorHandler = mockReqUse.mock.calls[0]?.[1];
});

beforeEach(() => {
  localStorage.clear();
  mockResUse.mockClear();
});

describe('axiosSetup utility', () => {
  it('creates axios instance with expected defaults', () => {
    expect(axiosInstance).toBe(mockAxios);
  });

  describe('response interceptor', () => {
    let successHandler;
    let errHandler;
    let logoutSpy;

    beforeEach(() => {
      logoutSpy = vi.fn();
      setupAxiosInterceptors(logoutSpy);
      successHandler = mockResUse.mock.calls.at(-1)[0];
      errHandler = mockResUse.mock.calls.at(-1)[1];
    });

    it('returns response unchanged on success', () => {
      const response = { data: 'test', status: 200 };
      expect(successHandler(response)).toBe(response);
    });

    it.each([401, 403])('invokes logout on HTTP %p', async (status) => {
      const err = { response: { status } };
      await expect(errHandler(err)).rejects.toBe(err);
      expect(logoutSpy).toHaveBeenCalled();
    });

    it('ignores non-auth errors', async () => {
      const err = { response: { status: 500 } };
      await expect(errHandler(err)).rejects.toBe(err);
      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it('handles errors without response object', async () => {
      const err = { message: 'Network Error' };
      await expect(errHandler(err)).rejects.toBe(err);
      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it('handles 404 errors without logout', async () => {
      const err = { response: { status: 404 } };
      await expect(errHandler(err)).rejects.toBe(err);
      expect(logoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('request interceptor', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('adds Authorization header when JWT token exists', () => {
      expect(requestHandler).toBeTypeOf('function');

      localStorage.setItem('jwtToken', 'test-token-123');

      const config = { url: '/test', headers: {} };
      const result = requestHandler(config);

      expect(result.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('does not add Authorization header when JWT token is missing', () => {
      expect(requestHandler).toBeTypeOf('function');

      const config = { url: '/test', headers: {} };
      const result = requestHandler(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('adds Kerberos-TGT header for connect/info endpoint', () => {
      expect(requestHandler).toBeTypeOf('function');

      localStorage.setItem('kerberosTGT', 'kerberos-tgt-token');

      const config = { url: '/nodes/connect/info', headers: {} };
      const result = requestHandler(config);

      expect(result.headers['Kerberos-TGT']).toBe('kerberos-tgt-token');
    });

    it('adds Kerberos-TGT header for node/validate endpoint', () => {
      expect(requestHandler).toBeTypeOf('function');

      localStorage.setItem('kerberosTGT', 'kerberos-tgt-token');

      const config = { url: '/node/validate', headers: {} };
      const result = requestHandler(config);

      expect(result.headers['Kerberos-TGT']).toBe('kerberos-tgt-token');
    });

    it('does not add Kerberos-TGT header for other endpoints', () => {
      expect(requestHandler).toBeTypeOf('function');

      localStorage.setItem('kerberosTGT', 'kerberos-tgt-token');

      const config = { url: '/other/endpoint', headers: {} };
      const result = requestHandler(config);

      expect(result.headers['Kerberos-TGT']).toBeUndefined();
    });

    it('does not add Kerberos-TGT header when TGT is missing', () => {
      expect(requestHandler).toBeTypeOf('function');

      const config = { url: '/nodes/connect/info', headers: {} };
      const result = requestHandler(config);

      expect(result.headers['Kerberos-TGT']).toBeUndefined();
    });

    it('adds both JWT and Kerberos-TGT headers when both exist for connect endpoint', () => {
      expect(requestHandler).toBeTypeOf('function');

      localStorage.setItem('jwtToken', 'jwt-token');
      localStorage.setItem('kerberosTGT', 'kerberos-token');

      const config = { url: '/nodes/connect/info', headers: {} };
      const result = requestHandler(config);

      expect(result.headers.Authorization).toBe('Bearer jwt-token');
      expect(result.headers['Kerberos-TGT']).toBe('kerberos-token');
    });

    it('handles request errors', async () => {
      expect(errorHandler).toBeTypeOf('function');

      const error = new Error('Request error');
      await expect(errorHandler(error)).rejects.toThrow('Request error');
    });
  });
});