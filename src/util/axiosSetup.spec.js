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
  jest.clearAllMocks();
});

describe('axiosSetup utility', () => {
  it('creates axios instance with expected defaults', () => {
    expect(axiosInstance).toBe(mockAxios);
  });

  describe('response interceptor', () => {
    let errHandler;
    let logoutSpy;

    beforeEach(() => {
      logoutSpy = jest.fn();
      setupAxiosInterceptors(logoutSpy);
      errHandler = mockResUse.mock.calls.at(-1)[1];
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
  });

  describe('request interceptor', () => {
    let reqHandler;

    beforeEach(() => {
      // Get the first call which is the initial setup from the module load
      reqHandler = mockReqUse.mock.calls[0]?.[0];
    });

    it('adds JWT token from localStorage to headers', () => {
      if (!reqHandler) {
        throw new Error('Request handler not found');
      }
      localStorage.setItem('jwtToken', 'test-token-123');
      
      const config = { headers: {}, url: '/api/test' };
      const result = reqHandler(config);
      
      expect(result.headers['Authorization']).toBe('Bearer test-token-123');
    });

    it('does not add Authorization header when no token exists', () => {
      if (!reqHandler) {
        throw new Error('Request handler not found');
      }
      const config = { headers: {}, url: '/api/test' };
      const result = reqHandler(config);
      
      expect(result.headers['Authorization']).toBeUndefined();
    });

    it('adds Kerberos-TGT header for node connect info requests', () => {
      if (!reqHandler) {
        throw new Error('Request handler not found');
      }
      localStorage.setItem('kerberosTGT', 'kerberos-tgt-value');
      
      const config = { headers: {}, url: '/nodes/connect/info' };
      const result = reqHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBe('kerberos-tgt-value');
    });

    it('adds Kerberos-TGT header for node validate requests', () => {
      if (!reqHandler) {
        throw new Error('Request handler not found');
      }
      localStorage.setItem('kerberosTGT', 'kerberos-tgt-value');
      
      const config = { headers: {}, url: '/node/validate' };
      const result = reqHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBe('kerberos-tgt-value');
    });

    it('does not add Kerberos-TGT for other requests', () => {
      if (!reqHandler) {
        throw new Error('Request handler not found');
      }
      localStorage.setItem('kerberosTGT', 'kerberos-tgt-value');
      
      const config = { headers: {}, url: '/api/other' };
      const result = reqHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBeUndefined();
    });

    it('does not add Kerberos-TGT when not in localStorage', () => {
      if (!reqHandler) {
        throw new Error('Request handler not found');
      }
      const config = { headers: {}, url: '/nodes/connect/info' };
      const result = reqHandler(config);
      
      expect(result.headers['Kerberos-TGT']).toBeUndefined();
    });

    it('handles request errors', async () => {
      const errHandler = mockReqUse.mock.calls[0]?.[1];
      if (!errHandler) {
        throw new Error('Error handler not found');
      }
      const error = new Error('Request error');
      
      await expect(errHandler(error)).rejects.toBe(error);
    });
  });
});