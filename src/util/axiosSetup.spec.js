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
});