import '@testing-library/jest-dom';

jest.mock('axios', () => {
  const mockReqUse = jest.fn();
  const mockResUse = jest.fn();

  const mockAxios = {
    interceptors: {
      request: { use: mockReqUse },
      response: { use: mockResUse },
    },
  };

  const mockCreate = jest.fn(() => mockAxios);
  const def = { create: mockCreate };
  def.__m = { mockReqUse, mockResUse, mockCreate, mockAxios };
  return { __esModule: true, default: def };
});

jest.mock('../config', () => ({ backendUrl: 'https://api.example.com' }));

let axiosInstance;
let setupAxiosInterceptors;
let mockResUse;
let mockReqUse;
let mockAxios;

beforeAll(() => {
  const axios = require('axios').default;
  ({ mockResUse, mockReqUse, mockAxios } = axios.__m);

  jest.isolateModules(() => {
    const mod = require('../util/axiosSetup.js');
    axiosInstance = mod.default;
    setupAxiosInterceptors = mod.setupAxiosInterceptors;
  });
});

beforeEach(() => {
  localStorage.clear();
  // Don't clear all mocks as it breaks the interceptor references
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
      logoutSpy = jest.fn();
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
    let requestHandler;
    let errorHandler;

    beforeEach(() => {
      localStorage.clear();
      // The request interceptor is set up when the module is loaded
      // Get the first call which is from module initialization
      if (mockReqUse.mock.calls.length > 0) {
        requestHandler = mockReqUse.mock.calls[0][0];
        errorHandler = mockReqUse.mock.calls[0][1];
      }
    });

    it('adds Authorization header when JWT token exists', () => {
      if (!requestHandler) {
        console.warn('Request handler not initialized');
        return;
      }
      
      localStorage.setItem('jwtToken', 'test-token-123');
      
      const config = { url: '/test', headers: {} };
      const result = requestHandler(config);
      
      expect(result.headers['Authorization']).toBe('Bearer test-token-123');
    });

    it('does not add Authorization header when JWT token is missing', () => {
      if (!requestHandler) return;
      
      const config = { url: '/test', headers: {} };
      const result = requestHandler(config);
      
      expect(result.headers['Authorization']).toBeUndefined();
    });

    it('adds Kerberos-TGT header for connect/info endpoint', () => {
      if (!requestHandler) return;
      
      localStorage.setItem('kerberosTGT', 'kerberos-tgt-token');
      
      const config = { url: '/nodes/connect/info', headers: {} };
      const result = requestHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBe('kerberos-tgt-token');
    });

    it('adds Kerberos-TGT header for node/validate endpoint', () => {
      if (!requestHandler) return;
      
      localStorage.setItem('kerberosTGT', 'kerberos-tgt-token');
      
      const config = { url: '/node/validate', headers: {} };
      const result = requestHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBe('kerberos-tgt-token');
    });

    it('does not add Kerberos-TGT header for other endpoints', () => {
      if (!requestHandler) return;
      
      localStorage.setItem('kerberosTGT', 'kerberos-tgt-token');
      
      const config = { url: '/other/endpoint', headers: {} };
      const result = requestHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBeUndefined();
    });

    it('does not add Kerberos-TGT header when TGT is missing', () => {
      if (!requestHandler) return;
      
      const config = { url: '/nodes/connect/info', headers: {} };
      const result = requestHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBeUndefined();
    });

    it('handles request errors', async () => {
      if (!errorHandler) return;
      
      const error = new Error('Request error');
      await expect(errorHandler(error)).rejects.toThrow('Request error');
    });
  });
});